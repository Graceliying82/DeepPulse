import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from data_loader import download_sample_data, get_available_patients

if __name__ == "__main__":
    print("Pre-download count:", len(get_available_patients()))
    print("Triggering random download of 10 records...")
    download_sample_data(num_records=10, random_shuffle=True)
    print("Post-download count:", len(get_available_patients()))
