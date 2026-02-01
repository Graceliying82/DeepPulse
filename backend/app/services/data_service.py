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

def download_data(db_slug, num_records=5, random_shuffle=True, category=None, data_dir=None):
    """
    Downloads data to a category-specific directory.
    Category is auto-detected from db_slug if not provided.
    Supports both wfdb format and EDF format databases.
    """
    if not category:
        category = get_category_from_db(db_slug)

    # Build target directory: data/{category}/{db_slug}/
    base_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    target_dir = os.path.join(get_category_dir(category, base_dir), db_slug)
    ensure_data_dir(target_dir)

    logger.info(f"Downloading {num_records} records from {db_slug} to category '{category}'...")

    try:
        all_records = wfdb.get_record_list(db_slug)
    except (FileNotFoundError, ValueError) as e:
        logger.error(f"Error fetching record list: {e}")
        raise e

    # Detect if this is an EDF-only database
    is_edf_database = all_records and all_records[0].endswith('.edf')
    logger.info(f"Database format: {'EDF' if is_edf_database else 'WFDB'}")

    # Check existing records in this specific db directory
    existing = set(list_patients(data_dir=target_dir))

    # For EDF databases, strip the .edf extension for comparison
    if is_edf_database:
        candidates = [r for r in all_records if os.path.splitext(r)[0] not in existing]
    else:
        candidates = [r for r in all_records if r not in existing]

    if not candidates:
        logger.info("All records already downloaded or none available.")
        return []

    if random_shuffle:
        random.shuffle(candidates)
        target_records = candidates[:num_records]
    else:
        target_records = candidates[:num_records]

    if not target_records:
        return []

    downloaded = []
    # Sequential download to avoid multiprocessing issues
    for rec in target_records:
        try:
            logger.info(f"Downloading record: {rec}")
            if is_edf_database:
                # Use dl_files for EDF format (no .hea companion files)
                wfdb.dl_files(db_slug, target_dir, [rec], overwrite=False)
            else:
                # Use dl_database for standard wfdb format
                wfdb.dl_database(db_slug, target_dir, records=[rec], overwrite=False)
            downloaded.append(rec)
        except Exception as e:
            logger.error(f"Failed to download record {rec}: {e}")

    return downloaded

def load_record(record_name, data_dir=None, category=None):
    """
    Loads signal and metadata.
    If category is provided, looks in category directory.
    Supports both wfdb format (.hea/.dat) and EDF format (.edf).
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
        return _load_edf_record(edf_path)
    elif os.path.exists(hea_path):
        # Load standard wfdb format
        return _load_wfdb_record(record_path)
    else:
        raise FileNotFoundError(f"Record not found: {record_name}")


def _load_wfdb_record(record_path):
    """Load a standard wfdb format record."""
    try:
        signals, fields = wfdb.rdsamp(record_path)

        return {
            "signals": signals,
            "fs": fields['fs'],
            "comments": fields.get('comments', []),
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
