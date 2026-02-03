import wfdb
import os
import shutil
import logging
import random
import numpy as np

logger = logging.getLogger(__name__)

# Data dir is at DeepPulse/data. 
# This file is at DeepPulse/backend/app/services/data_service.py
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DEFAULT_DATA_DIR = os.path.join(BASE_DIR, 'data')

# Category mapping
CATEGORY_MAPPING = {
    "cardiac": "Cardiac Electrical Signals",
    "hemodynamic": "Hemodynamic Signals",
    "neurological": "Neurological Signals",
    "respiration": "Oxygenation & Respiration",
    "motion": "Mechanical & Motion Data"
}

# Database to category mapping (expandable)
DB_CATEGORY_MAP = {
    'ptbdb': 'cardiac',
    'mitdb': 'cardiac',
    'afdb': 'cardiac',
    'iafdb': 'cardiac',
    'eegmmidb': 'neurological',
    'chbmit': 'neurological',
    'emgdb': 'neurological',
    'fantasia': 'respiration',
    'gaitndd': 'motion',
    'mitbih': 'cardiac',
    'nsrdb': 'cardiac',
}

def get_category_from_db(db_slug):
    """Infer category from database slug."""
    return DB_CATEGORY_MAP.get(db_slug, 'cardiac')  # Default to cardiac

def get_category_dir(category, base_dir=None):
    """Get the directory path for a specific category."""
    base = base_dir if base_dir else DEFAULT_DATA_DIR
    return os.path.join(base, category)

def ensure_data_dir(data_dir=None):
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

def clean_data_directory(data_dir=None, category=None):
    """
    Safely removes content from the data directory.
    If category is specified, only clears that category.
    """
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    
    if category:
        target_dir = get_category_dir(category, target_dir)
    
    if os.path.exists(target_dir):
        # Safety check
        abs_path = os.path.abspath(target_dir)
        if "DeepPulse" not in abs_path:
             logger.warning(f"Safety Check Failed: Refusing to delete potentially unsafe directory: {target_dir}")
             return False

        shutil.rmtree(target_dir)
        os.makedirs(target_dir)
        logger.info(f"Data directory cleared: {target_dir}")
        return True
    return False

def list_categories(data_dir=None):
    """List all available categories with data."""
    base_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    ensure_data_dir(base_dir)
    
    categories = []
    for cat_key in CATEGORY_MAPPING.keys():
        cat_dir = get_category_dir(cat_key, base_dir)
        if os.path.exists(cat_dir) and os.listdir(cat_dir):
            categories.append({
                "key": cat_key,
                "name": CATEGORY_MAPPING[cat_key],
                "record_count": len(list_patients(category=cat_key))
            })
    
    return categories

def list_patients(data_dir=None, category=None):
    """
    Returns a list of record names.
    If category is specified, only returns records from that category.
    Supports both wfdb (.hea) and EDF (.edf) formats.
    """
    if category:
        target_dir = get_category_dir(category, data_dir or DEFAULT_DATA_DIR)
    else:
        target_dir = data_dir if data_dir else DEFAULT_DATA_DIR

    ensure_data_dir(target_dir)

    records = []
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            # Support both wfdb (.hea) and EDF (.edf) formats
            if file.endswith(".hea") or file.endswith(".edf"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, target_dir)
                records.append(os.path.splitext(rel_path)[0])

    return sorted(records)

from app.services import db_service

def sync_database_index(db_slug):
    """
    Fetches the full list of records from PhysioNet and updates the local DB inventory.
    Returns the updated inventory.
    """
    try:
        logger.info(f"Syncing index for {db_slug}...")
        # Get list from PhysioNet
        all_records = wfdb.get_record_list(db_slug)
        
        # In DB service, this uses INSERT OR IGNORE, preserving 'downloaded' status
        db_service.add_or_update_records(db_slug, all_records)
        
        return db_service.get_inventory(db_slug)
    except Exception as e:
        logger.error(f"Failed to sync database index: {e}")
        # If offline, just return what we have
        return db_service.get_inventory(db_slug)

def get_db_inventory(db_slug):
    """Get current inventory from local DB (without syncing)."""
    return db_service.get_inventory(db_slug)

def download_data(db_slug, record_list=None, num_records=25, random_shuffle=True, category=None, data_dir=None):
    """
    Downloads data to a category-specific directory.
    If record_list is provided, downloads those specific records.
    Otherwise, falls back to random/all selection.
    """
    if not category:
        category = get_category_from_db(db_slug)

    # Build target directory: data/{category}/{db_slug}/
    base_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    target_dir = os.path.join(get_category_dir(category, base_dir), db_slug)
    ensure_data_dir(target_dir)

    # If record_list provided, usage is explicit
    target_records = []
    is_edf_database = False

    if record_list:
        target_records = record_list
        # Quick check for EDF heuristic
        # We assume caller knows what they are doing, but we can verify against DB or name
        # For now, just try downloading
        logger.info(f"Downloading explicit list: {target_records}")
    else:
        # Legacy behavior: Fetch list and pick random
        logger.info(f"Downloading {num_records} records from {db_slug} (Random Selection)...")
        # Optimization: Check local DB first to avoid slow PhysioNet list fetching
        local_inventory = db_service.get_inventory(db_slug)
        if local_inventory and len(local_inventory) > 0:
            logger.info(f"Using cached record list for {db_slug} ({len(local_inventory)} records)")
            all_records = [item['record_name'] for item in local_inventory]
        else:
            # Fallback to network if cache empty
            logger.info(f"Fetching record list from PhysioNet for {db_slug}...")
            try:
                all_records = wfdb.get_record_list(db_slug)
                # Sync implicitly
                db_service.add_or_update_records(db_slug, all_records)
            except (FileNotFoundError, ValueError) as e:
                logger.error(f"Error fetching record list: {e}")
                raise e

        is_edf_database = all_records and all_records[0].endswith('.edf')
        logger.info(f"Database format: {'EDF' if is_edf_database else 'WFDB'}")

        # Check existing records in this specific db directory
        existing = set(list_patients(data_dir=target_dir))

        if is_edf_database:
            candidates = [r for r in all_records if os.path.splitext(r)[0] not in existing]
        else:
            candidates = [r for r in all_records if r not in existing]
        
        if not candidates:
            # If everything is downloaded, we should ensure DB knows it
            # (Just in case files exist but DB is stale)
            for r in existing:
                db_service.mark_record_downloaded(db_slug, r, os.path.join(target_dir, r))
            return []

        if random_shuffle:
            random.shuffle(candidates)
            target_records = candidates[:num_records]
        else:
            target_records = candidates[:num_records]

    if not target_records:
        return []

    downloaded = []
    # Sequential download
    for rec in target_records:
        try:
            logger.info(f"Downloading record: {rec}")
            
            # Simple heuristic for EDF if not detected above
            # (WFDB library handles extensions strictly, so we try standard first)
            # Actually, `dl_database` adds extension automatically.
            # `dl_files` is for explicit files.
            
            # If we don't know it's EDF yet, try to guess or catch error?
            # For simplicity, we stick to `dl_database` for most, `dl_files` for explicit EDF names
            
            if rec.endswith('.edf'):
                 wfdb.dl_files(db_slug, target_dir, [rec], overwrite=False)
                 pure_name = os.path.splitext(rec)[0]
            else:
                 wfdb.dl_database(db_slug, target_dir, records=[rec], overwrite=False)
                 pure_name = rec

            downloaded.append(rec)
            
            # Update DB
            db_service.mark_record_downloaded(db_slug, pure_name, os.path.join(target_dir, pure_name))
            
        except Exception as e:
            logger.error(f"Failed to download record {rec}: {e}")

    return downloaded

def load_record(record_name, data_dir=None, category=None, max_duration=60):
    """
    Loads signal and metadata.
    If category is provided, looks in category directory.
    Supports both wfdb format (.hea/.dat) and EDF format (.edf).
    max_duration: Limit loading to this many seconds (default 60s).
    """
    if category:
        target_dir = get_category_dir(category, data_dir or DEFAULT_DATA_DIR)
    else:
        target_dir = data_dir if data_dir else DEFAULT_DATA_DIR

    record_path = os.path.join(target_dir, record_name)

    # Check if this is an EDF file
    edf_path = record_path + '.edf'
    hea_path = record_path + '.hea'

    if os.path.exists(edf_path):
        # Load EDF format using pyedflib
        return _load_edf_record(edf_path, max_duration=max_duration)
    elif os.path.exists(hea_path):
        # Load standard wfdb format
        return _load_wfdb_record(record_path, max_duration=max_duration)
    else:
        raise FileNotFoundError(f"Record not found: {record_name}")


def _load_wfdb_record(record_path, max_duration=60):
    """Load a standard wfdb format record with duration limit."""
    try:
        # First read header to get sampling frequency
        header = wfdb.rdheader(record_path)
        fs = header.fs
        
        # Calculate samples to read
        calculated_sampto = int(fs * max_duration)
        sampto = min(calculated_sampto, header.sig_len)
        
        # Read signals with limit
        signals, fields = wfdb.rdsamp(record_path, sampto=sampto)

        # Add note about truncation or full view
        comments = fields.get('comments', [])
        if sampto < header.sig_len:
            comments.append(f"Standard View: First {max_duration}s of data shown")
        else:
            comments.append("Complete Record Shown")

        # Sanitize signals (replace NaN/Inf with 0) to prevent JSON errors
        # Check if signals is a numpy array or valid list
        if signals is not None:
             signals = np.nan_to_num(signals, nan=0.0, posinf=0.0, neginf=0.0)

        return {
            "signals": signals,
            "fs": fields['fs'],
            "comments": comments,
            "sig_name": fields.get('sig_name', []),
            "units": fields.get('units', [])
        }
    except Exception as e:
        logger.error(f"Failed to load wfdb record {record_path}: {e}")
        if "sampto must be greater than sampfrom" in str(e):
            raise ValueError("Corrupted Record: File appears empty.")
        raise e


def _load_edf_record(edf_path, max_duration=30):
    """
    Load an EDF format record using pyedflib.
    max_duration: Maximum duration in seconds to load (EDF files can be very long).
    """
    try:
        import pyedflib

        f = pyedflib.EdfReader(edf_path)

        n_signals = f.signals_in_file
        signal_labels = f.getSignalLabels()

        # Get sample frequencies (may vary per channel)
        sample_freqs = [f.getSampleFrequency(i) for i in range(n_signals)]
        fs = sample_freqs[0]  # Use first channel's frequency as primary

        # Calculate samples to read (limit to max_duration for performance)
        samples_to_read = int(fs * max_duration)

        # Read signals (limit to reasonable number of channels for display)
        max_channels = min(n_signals, 8)  # Limit to 8 channels for UI
        signals = []
        for i in range(max_channels):
            signal = f.readSignal(i, 0, samples_to_read)
            signals.append(signal)

        f.close()

        # Stack into numpy array (samples x channels)
        signals_array = np.column_stack(signals) if signals else np.array([])

        return {
            "signals": signals_array,
            "fs": fs,
            "comments": [f"EDF File: {os.path.basename(edf_path)}", f"Duration: {max_duration}s of data shown"],
            "sig_name": signal_labels[:max_channels],
            "units": ['uV'] * max_channels  # EDF typically uses microvolts for EEG
        }
    except Exception as e:
        logger.error(f"Failed to load EDF record {edf_path}: {e}")
        raise e
