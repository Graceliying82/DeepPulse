import sys
import os

# Add src to python path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

import pandas as pd
from collections import Counter
from data_loader import get_available_patients, load_patient_data

def main():
    print("Fetching available patient records...")
    patients = get_available_patients()
    
    if not patients:
        print("No patient data found. Please run the app and download sample data first.")
        return

    print(f"Found {len(patients)} records. Analyzing diagnoses...")
    
    diagnoses = []
    sample_printed = False

    for i, p_id in enumerate(patients):
        try:
            signals, fields = load_patient_data(p_id)
            comments = fields.get('comments', [])
            
            # Logic similar to app.py to extract diagnosis
            diagnosis = "Unknown"
            for c in comments:
                if "clinical diagnosis" in c.lower():
                    diagnosis = c.split(":")[1].strip()
                elif "reason for admission" in c.lower() and diagnosis == "Unknown":
                    diagnosis = c.split(":")[1].strip()
            
            diagnoses.append(diagnosis)
            
            # Print one sample for debugging purpose
            if not sample_printed:
                print("\n" + "="*50)
                print(f"SAMPLE PATIENT DATA (Record: {p_id})")
                print("="*50)
                print(f"Sampling Rate: {fields['fs']} Hz")
                print(f"Signal Shape: {signals.shape}")
                print("Metadata Fields:")
                for k, v in fields.items():
                    print(f"  - {k}: {v}")
                print("="*50 + "\n")
                sample_printed = True
                
        except Exception as e:
            print(f"Error reading record {p_id}: {e}")

    # Summary
    print(f"Analyzed {len(diagnoses)} records.")
    
    print("\nDiagnosis Categories Summary:")
    print("-" * 60)
    print(f"{'Diagnosis':<40} | {'Count':<10}")
    print("-" * 60)
    
    counts = Counter(diagnoses)
    for diagnosis, count in counts.most_common():
        print(f"{diagnosis:<40} | {count:<10}")
    print("-" * 60)

if __name__ == "__main__":
    main()
