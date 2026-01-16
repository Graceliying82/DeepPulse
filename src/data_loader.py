import wfdb
import os
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def download_sample_data(num_records=5):
    """
    Downloads sample records from the PTB Diagnostic ECG Database (ptbdb).
    """
    ensure_data_dir()
    print(f"Downloading {num_records} records from 'ptbdb' to {DATA_DIR}...")
    
    # Get a list of records
    records = wfdb.get_record_list('ptbdb')
    
    # Download the first N records
    # records are paths like 'patient001/s0010_re'
    # we need to be careful with structure. 
    # wfdb.dl_database automates this better but getting individual records is safer for a demo.
    
    target_records = records[:num_records]
    
    wfdb.dl_database('ptbdb', DATA_DIR, target_records, overwrite=False)
    
    print("Download complete.")
    return target_records

def get_available_patients():
    """
    Scans the data directory for header files (.hea) to list available records.
    Returns a list of record names relative to DATA_DIR.
    """
    ensure_data_dir()
    # ptbdb structure is data/patientXXX/sXXXX_re.hea
    # We want to find all .hea files
    
    records = []
    for root, dirs, files in os.walk(DATA_DIR):
        for file in files:
            if file.endswith(".hea"):
                # Get relative path without extension
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, DATA_DIR)
                records.append(os.path.splitext(rel_path)[0])
    
    return sorted(records)

def load_patient_data(record_name):
    """
    Loads signal and metadata for a given record.
    record_name is relative to DATA_DIR, e.g., 'patient001/s0010_re'
    """
    # wfdb.rdsamp expects the path without extension
    # It searches in the current directory or specified directory.
    # We need to construct the full path prefix
    
    record_path = os.path.join(DATA_DIR, record_name)
    
    # Read the record
    # signals is a numpy array, fields is a dict
    signals, fields = wfdb.rdsamp(record_path)
    
    return signals, fields
