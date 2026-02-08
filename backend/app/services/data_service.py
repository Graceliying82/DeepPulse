"""
Data service -- loads signal files from Supabase Storage, caches locally,
and parses them with wfdb / pyedflib.
"""

import os
import logging
import tempfile

import wfdb
import numpy as np

from app.services.supabase_client import get_client
from app.services import db_service

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CATEGORY_MAPPING = {
    "cardiac": "Cardiac Electrical Signals",
    "hemodynamic": "Hemodynamic Signals",
    "neurological": "Neurological Signals",
    "respiration": "Oxygenation & Respiration",
    "motion": "Mechanical & Motion Data",
}

DB_CATEGORY_MAP = {
    "ptbdb": "cardiac",
    "mitdb": "cardiac",
    "afdb": "cardiac",
    "iafdb": "cardiac",
    "eegmmidb": "neurological",
    "chbmit": "neurological",
    "emgdb": "neurological",
    "fantasia": "respiration",
    "gaitndd": "motion",
    "mitbih": "cardiac",
    "nsrdb": "cardiac",
    "mghdb": "hemodynamic",
}

STORAGE_BUCKET = "signal-files"
CACHE_DIR = os.path.join(tempfile.gettempdir(), "deeppulse_cache")

# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------


def _ensure_cache_dir(subpath: str = "") -> str:
    """Return (and create) a local cache directory."""
    target = os.path.join(CACHE_DIR, subpath)
    os.makedirs(target, exist_ok=True)
    return target


def _cached_file(storage_path: str) -> str | None:
    """Return local path if already cached, else None."""
    local = os.path.join(CACHE_DIR, storage_path)
    if os.path.exists(local):
        return local
    return None


def _download_from_storage(storage_path: str) -> str:
    """Download a file from Supabase Storage into the local cache. Returns local path."""
    local_path = os.path.join(CACHE_DIR, storage_path)
    if os.path.exists(local_path):
        return local_path

    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    data = get_client().storage.from_(STORAGE_BUCKET).download(storage_path)
    with open(local_path, "wb") as f:
        f.write(data)

    return local_path


def _parse_hea_data_files(hea_path: str) -> list[str]:
    """Read a WFDB .hea file and return the unique data filenames it references."""
    filenames: set[str] = set()
    with open(hea_path, "r") as f:
        lines = f.readlines()

    if not lines:
        return []

    # First line: record_name num_signals [fs ...]
    first = lines[0].strip().split()
    num_signals = int(first[1]) if len(first) >= 2 else 0

    # Signal lines follow (one per signal). First field is the data filename.
    for line in lines[1 : 1 + num_signals]:
        parts = line.strip().split()
        if parts:
            filenames.add(parts[0])

    return sorted(filenames)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_category_from_db(db_slug: str) -> str:
    return DB_CATEGORY_MAP.get(db_slug, "cardiac")


def list_categories():
    """List categories that have data in Supabase."""
    databases = db_service.list_databases()

    # Group by category
    cat_counts: dict[str, int] = {}
    for db in databases:
        cat = db["category"]
        cat_counts[cat] = cat_counts.get(cat, 0) + (db.get("record_count") or 0)

    categories = []
    for key, name in CATEGORY_MAPPING.items():
        count = cat_counts.get(key, 0)
        if count > 0:
            categories.append({"key": key, "name": name, "record_count": count})

    return categories


def list_patients(category: str | None = None):
    """
    Return a sorted list of record name strings.
    If category is given, filter by that category.
    """
    if category:
        records = db_service.get_records_by_category(category)
    else:
        # All records across every database
        records = []
        for db in db_service.list_databases():
            records.extend(db_service.get_inventory(db["slug"]))

    # Build the relative path the frontend expects: {db_slug}/{record_name}
    return sorted(
        f"{r['database_slug']}/{r['record_name']}" for r in records
    )


def load_record(record_name: str, category: str | None = None, max_duration: int = 60):
    """
    Load a signal record.

    record_name comes from the frontend as "{db_slug}/{actual_record_name}" or
    just the raw record_name when category is already resolved.

    Steps:
      1. Look up the record row in Supabase.
      2. Download the file(s) from Supabase Storage into the local cache.
      3. Parse with wfdb or pyedflib exactly like before.
    """
    # Split db_slug from the record path
    parts = record_name.split("/", 1)
    if len(parts) == 2 and parts[0] in DB_CATEGORY_MAP:
        db_slug, rec_name = parts
    else:
        # Fallback: try to find it across all databases
        db_slug = None
        rec_name = record_name

    # Look up the row
    row = None
    if db_slug:
        row = db_service.get_record(db_slug, rec_name)

    if row is None:
        raise FileNotFoundError(f"Record not found in database: {record_name}")

    fmt = row.get("format", "wfdb")
    storage_path = row["storage_path"]
    # storage_path looks like: cardiac/ptbdb/patient001/s0001 (or .edf for EDF)

    if fmt == "edf":
        local_path = _download_from_storage(storage_path)
        return _load_edf_record(local_path, max_duration=max_duration)
    else:
        # WFDB: download .hea first, then parse it for all referenced data files
        base = storage_path  # e.g. cardiac/ptbdb/patient001/s0001
        hea_local = _download_from_storage(base + ".hea")
        for dat_file in _parse_hea_data_files(hea_local):
            parent = storage_path.rsplit("/", 1)[0]  # directory part
            _download_from_storage(f"{parent}/{dat_file}")
        local_base = os.path.join(CACHE_DIR, base)
        return _load_wfdb_record(local_base, max_duration=max_duration)


# ---------------------------------------------------------------------------
# Parsers (kept from original code)
# ---------------------------------------------------------------------------


def _load_wfdb_record(record_path: str, max_duration: int = 60):
    """Load a standard wfdb format record with duration limit."""
    try:
        header = wfdb.rdheader(record_path)
        fs = header.fs
        calculated_sampto = int(fs * max_duration)
        sampto = min(calculated_sampto, header.sig_len)

        signals, fields = wfdb.rdsamp(record_path, sampto=sampto)

        comments = fields.get("comments", [])
        if sampto < header.sig_len:
            comments.append(f"Standard View: First {max_duration}s of data shown")
        else:
            comments.append("Complete Record Shown")

        if signals is not None:
            signals = np.nan_to_num(signals, nan=0.0, posinf=0.0, neginf=0.0)

        return {
            "signals": signals,
            "fs": fields["fs"],
            "comments": comments,
            "sig_name": fields.get("sig_name", []),
            "units": fields.get("units", []),
        }
    except Exception as e:
        logger.error(f"Failed to load wfdb record {record_path}: {e}")
        if "sampto must be greater than sampfrom" in str(e):
            raise ValueError("Corrupted Record: File appears empty.")
        raise e


def _load_edf_record(edf_path: str, max_duration: int = 30):
    """Load an EDF format record using pyedflib."""
    try:
        import pyedflib

        f = pyedflib.EdfReader(edf_path)
        n_signals = f.signals_in_file
        signal_labels = f.getSignalLabels()
        sample_freqs = [f.getSampleFrequency(i) for i in range(n_signals)]
        fs = sample_freqs[0]

        samples_to_read = int(fs * max_duration)
        max_channels = min(n_signals, 8)

        signals = []
        for i in range(max_channels):
            signal = f.readSignal(i, 0, samples_to_read)
            signals.append(signal)
        f.close()

        signals_array = np.column_stack(signals) if signals else np.array([])

        return {
            "signals": signals_array,
            "fs": fs,
            "comments": [
                f"EDF File: {os.path.basename(edf_path)}",
                f"Duration: {max_duration}s of data shown",
            ],
            "sig_name": signal_labels[:max_channels],
            "units": ["uV"] * max_channels,
        }
    except Exception as e:
        logger.error(f"Failed to load EDF record {edf_path}: {e}")
        raise e
