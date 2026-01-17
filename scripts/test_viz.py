import sys
import os
import numpy as np
import matplotlib.pyplot as plt

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from visualizer import plot_ecg_signals

def test_visualization():
    print("Testing Dynamic Visualization...")
    output_dir = os.path.dirname(__file__)
    
    # Case 1: 12-lead mock data
    print("1. Testing 12-Lead layout...")
    signals_12 = np.random.randn(1000, 12)
    fields_12 = {'fs': 100, 'sig_name': ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']}
    try:
        fig = plot_ecg_signals(signals_12, fields_12)
        plt.close(fig)
        print("  - Success (12-lead)")
    except Exception as e:
        print(f"  - Failed (12-lead): {e}")

    # Case 2: 2-lead mock data (like mitdb)
    print("2. Testing 2-Lead layout...")
    signals_2 = np.random.randn(1000, 2)
    fields_2 = {'fs': 100, 'sig_name': ['MLII', 'V5']}
    try:
        fig = plot_ecg_signals(signals_2, fields_2)
        # Check layout logic (just that it ran is mostly enough, but we want no error)
        plt.close(fig)
        print("  - Success (2-lead)")
    except Exception as e:
        print(f"  - Failed (2-lead): {e}")

    # Case 3: 1-lead mock data
    print("3. Testing 1-Lead layout...")
    signals_1 = np.random.randn(1000, 1)
    fields_1 = {'fs': 100, 'sig_name': ['Lead I']}
    try:
        fig = plot_ecg_signals(signals_1, fields_1)
        plt.close(fig)
        print("  - Success (1-lead)")
    except Exception as e:
        print(f"  - Failed (1-lead): {e}")

if __name__ == "__main__":
    test_visualization()
