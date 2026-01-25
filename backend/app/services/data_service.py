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
    """
    if category:
        target_dir = get_category_dir(category, data_dir or DEFAULT_DATA_DIR)
    else:
        target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    
    ensure_data_dir(target_dir)
    
    records = []
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith(".hea"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, target_dir)
                records.append(os.path.splitext(rel_path)[0])
    
    return sorted(records)

def download_data(db_slug, num_records=5, random_shuffle=True, category=None, data_dir=None):
    """
    Downloads data to a category-specific directory.
    Category is auto-detected from db_slug if not provided.
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
    
    # Check existing records in this specific db directory
    existing = set(list_patients(data_dir=target_dir))
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
        
    # Sequential download to avoid multiprocessing issues
    for rec in target_records:
        try:
            logger.info(f"Downloading record: {rec}")
            wfdb.dl_database(db_slug, target_dir, records=[rec], overwrite=False)
        except Exception as e:
            logger.error(f"Failed to download record {rec}: {e}")
            
    return target_records

def load_record(record_name, data_dir=None, category=None):
    """
    Loads signal and metadata.
    If category is provided, looks in category directory.
    """
    if category:
        target_dir = get_category_dir(category, data_dir or DEFAULT_DATA_DIR)
    else:
        target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
        
    record_path = os.path.join(target_dir, record_name)
    
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
        logger.error(f"Failed to load record {record_name}: {e}")
        if "sampto must be greater than sampfrom" in str(e):
             raise ValueError("Corrupted Record: File appears empty.")
        raise e
