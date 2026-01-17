import sys
import os
import shutil

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from data_loader import download_sample_data, get_available_patients, ensure_data_dir
from ai_agent import recommend_databases

TEST_DIR = os.path.join(os.path.dirname(__file__), 'test_multi_db')

def main():
    print("1. Testing AI Recommendation Logic...")
    # Mocking or calling real AI? Let's try calling real AI if key is set, 
    # but for safety/speed if key missing, we might see error. 
    # (Assuming user has key since they are using the app)
    
    try:
        recs = recommend_databases("Atrial Fibrillation")
        print("AI Recommendations:")
        for r in recs:
            print(f" - {r.get('name')} ({r.get('slug')})")
    except Exception as e:
        print(f"AI Step Failed (Expected if NO API KEY in env): {e}")

    print("\n2. Testing Multi-DB Download Logic...")
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)
    ensure_data_dir(TEST_DIR)
    
    # Try downloading from a small, known DB other than ptbdb if possible, 
    # or just use ptbdb again to verify slug passing works.
    # Let's try 'mitdb' (MIT-BIH Arrhythmia Database) - very standard.
    print("Downloading 2 records from 'mitdb'...")
    records = download_sample_data(db_slug='mitdb', num_records=2, random_shuffle=True, data_dir=TEST_DIR)
    
    print(f"Downloaded: {records}")
    
    available = get_available_patients(data_dir=TEST_DIR)
    print(f"Available in dir: {available}")
    
    if len(available) >= 1: # mitdb usually has 2 files per record (.dat, .hea)
        print("SUCCESS: Downloaded and discovered records.")
    else:
        print("FAIL: No records found.")

    # Cleanup
    shutil.rmtree(TEST_DIR)

if __name__ == "__main__":
    main()
