import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from data_loader import clean_data_directory, ensure_data_dir, get_available_patients

TEST_CUSTOM_DIR = os.path.join(os.path.dirname(__file__), 'test_data_env')

def main():
    print(f"Testing custom directory: {TEST_CUSTOM_DIR}")
    
    # 1. Ensure Setup
    ensure_data_dir(TEST_CUSTOM_DIR)
    
    # Create a fake header file to simulate a record
    fake_record_dir = os.path.join(TEST_CUSTOM_DIR, 'patient_test')
    os.makedirs(fake_record_dir, exist_ok=True)
    with open(os.path.join(fake_record_dir, 'test_rec.hea'), 'w') as f:
        f.write("Fake Header")
        
    # 2. Test Discovery
    patients = get_available_patients(data_dir=TEST_CUSTOM_DIR)
    print(f"Patients found in custom dir: {patients}")
    
    if 'patient_test/test_rec' not in patients:
        print("FAIL: Custom directory discovery failed.")
        return

    # 3. Test Deletion
    print("Testing cleanup...")
    clean_data_directory(data_dir=TEST_CUSTOM_DIR)
    
    if os.path.exists(os.path.join(fake_record_dir, 'test_rec.hea')):
        print("FAIL: File still exists after cleanup.")
    else:
        print("SUCCESS: Data directory cleaned.")

    # Cleanup the test dir itself
    import shutil
    shutil.rmtree(TEST_CUSTOM_DIR)
    print("Test verification complete.")

if __name__ == "__main__":
    main()
