"""
DeepPulse - Data Loading Module
Author: Grace Li
Date: 2026
Description: Manages downloading and loading of ECG data from PhysioNet (PTB Diagnostic Database) using wfdb.
"""
import wfdb
import os
import pandas as pd
import numpy as np
import random
import shutil

DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

def ensure_data_dir(data_dir=None):
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

def clean_data_directory(data_dir=None):
    """
    Safely removes all content from the data directory.
    """
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    if os.path.exists(target_dir):
        # Safety check to prevent accidental deletion of critical system paths
        # Ensure path looks like our safe data directory
        abs_path = os.path.abspath(target_dir)
        if "DeepPulse" not in abs_path or "data" not in os.path.basename(abs_path):
             # Allow test_data_temp for tests
             if "test_data_temp" not in abs_path:
                print(f"Safety Check Failed: Refusing to delete potentially unsafe directory: {target_dir}")
                return

        shutil.rmtree(target_dir)
        os.makedirs(target_dir) # Recreate empty dir
        print(f"Data directory cleared: {target_dir}")

def download_sample_data(db_slug='ptbdb', num_records=5, start_index=0, random_shuffle=True, data_dir=None):
    """
    Downloads sample records from a specified PhysioNet Database.
    Args:
        db_slug: The unique identifier of the database (e.g., 'ptbdb', 'mitdb').
        num_records: Number of new records to download.
        start_index: Deprecated if random_shuffle is True.
        random_shuffle: If True, randomly samples from records not yet downloaded.
        data_dir: Optional custom directory to download data to.
    """
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    ensure_data_dir(target_dir)
    print(f"Downloading {num_records} records from {db_slug} to {target_dir}...")
    
    try:
        # Get a list of all available records in the database
        all_records = wfdb.get_record_list(db_slug)
    except Exception as e:
        print(f"Error fetching record list for {db_slug}. Check your internet connection or database slug. Details: {e}")
        return []
    
    # Identify which ones we already have
    existing_records = set(get_available_patients(target_dir))
    
    # Filter out existing to find candidates
    # Note: different DBs have different naming conventions, but get_available_patients returns relative paths
    # We might need to handle subdirectories if wfdb downloads them that way.
    candidates = [r for r in all_records if r not in existing_records]
    
    if not candidates:
        print("All records have already been downloaded (or none found).")
        return []
        
    # Select records to download
    if random_shuffle:
        print(f"Randomly selecting from {len(candidates)} available records...")
        random.shuffle(candidates)
        target_records = candidates[:num_records]
    else:
        print(f"Selecting sequentially starting from {start_index}...")
        target_records = all_records[start_index : start_index + num_records]
    
    if not target_records:
        return []
        
    wfdb.dl_database(db_slug, target_dir, target_records, overwrite=False)
    
    print(f"Download of {len(target_records)} records complete.")
    return target_records

def get_available_patients(data_dir=None):
    """
    Scans the data directory for header files (.hea) to list available records.
    Returns a list of record names relative to data_dir.
    """
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    ensure_data_dir(target_dir)
    
    records = []
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith(".hea"):
                # Get relative path without extension
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, target_dir)
                records.append(os.path.splitext(rel_path)[0])
    
    return sorted(records)

def load_patient_data(record_name, data_dir=None):
    """
    Loads signal and metadata for a given record.
    record_name is relative to data_dir.
    """
    target_dir = data_dir if data_dir else DEFAULT_DATA_DIR
    record_path = os.path.join(target_dir, record_name)
    
    # Read the record
    signals, fields = wfdb.rdsamp(record_path)
    
    return signals, fields
