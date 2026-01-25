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

def ensure_data_dir(data_dir=None):
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

def clean_data_directory(data_dir=None):
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    if os.path.exists(target_dir):
        # Safety check
        abs_path = os.path.abspath(target_dir)
        if "DeepPulse" not in abs_path or "data" not in os.path.basename(abs_path):
             logger.warning(f"Safety Check Failed: Refusing to delete potentially unsafe directory: {target_dir}")
             return False

        shutil.rmtree(target_dir)
        os.makedirs(target_dir)
        logger.info(f"Data directory cleared: {target_dir}")
        return True
    return False

def list_patients(data_dir=None):
    """
    Returns a list of record names relative to data_dir.
    """
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

def download_data(db_slug, num_records=5, random_shuffle=True, data_dir=None):
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    ensure_data_dir(target_dir)
    logger.info(f"Downloading {num_records} records from {db_slug}...")
    
    try:
        all_records = wfdb.get_record_list(db_slug)
    except (FileNotFoundError, ValueError) as e:
        logger.error(f"Error fetching record list: {e}")
        raise e
    
    existing = set(list_patients(target_dir))
    candidates = [r for r in all_records if r not in existing]
    
    if not candidates:
        return []
        
    if random_shuffle:
        random.shuffle(candidates)
        target_records = candidates[:num_records]
    else:
        target_records = candidates[:num_records] # simplistic sequential fallback
    
    if not target_records:
        return []
        
    # Sequential download to avoid multiprocessing issues with pandas/wfdb on some platforms
    for rec in target_records:
        try:
            logger.info(f"Downloading record: {rec}")
            # Download specific record (and associated files like .dat/.hea)
            wfdb.dl_database(db_slug, target_dir, records=[rec], overwrite=False)
        except Exception as e:
            logger.error(f"Failed to download record {rec}: {e}")
            
    return target_records

def load_record(record_name, data_dir=None):
    """
    Loads signal and metadata.
    Returns: dict with 'signals', 'fs', 'comments', 'fields'
    """
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    record_path = os.path.join(target_dir, record_name)
    
    try:
        # wfdb returns signals as numpy array, fields as dict
        signals, fields = wfdb.rdsamp(record_path)
        
        # Convert numpy to list for JSON serialization if needed, 
        # but for internal use usually keep as numpy/dict. 
        # API layer will handle serialization.
        return {
            "signals": signals,
            "fs": fields['fs'],
            "comments": fields.get('comments', []),
            "sig_name": fields.get('sig_name', []),
            "units": fields.get('units', [])
        }
    except Exception as e:
        logger.error(f"Failed to load record {record_name}: {e}")
        # Explicitly check for empty file error
        if "sampto must be greater than sampfrom" in str(e):
             raise ValueError("Corrupted Record: File appears empty.")
        raise e
