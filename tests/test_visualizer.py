import unittest
import sys
import os
import numpy as np
import matplotlib.pyplot as plt

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from visualizer import plot_ecg_signals

class TestVisualizer(unittest.TestCase):
    
    def test_plot_12_lead_structure(self):
        # Test 12-lead (12 channels)
        signals = np.random.randn(500, 12)
        fields = {'fs': 100, 'sig_name': []}
        
        fig = plot_ecg_signals(signals, fields)
        
        self.assertIsInstance(fig, plt.Figure)
        # Should have axes. Standard logic creates 12 axes (6x2)
        # Actually our logic creates 12 subplots.
        self.assertGreaterEqual(len(fig.axes), 12)
        plt.close(fig)

    def test_plot_2_lead_structure(self):
        # Test 2-lead (dynamic resize)
        signals = np.random.randn(500, 2)
        fields = {'fs': 100, 'sig_name': ['I', 'II']}
        
        fig = plot_ecg_signals(signals, fields)
        
        self.assertIsInstance(fig, plt.Figure)
        # Should have at least 2 axes (or more if sharex magic creates hidden ones, but visible ones matter)
        self.assertGreaterEqual(len(fig.axes), 2)
        plt.close(fig)

    def test_plot_1_lead_structure(self):
        # Test 1-lead
        signals = np.random.randn(500, 1)
        fields = {'fs': 100, 'sig_name': ['I']}
        
        fig = plot_ecg_signals(signals, fields)
        
        self.assertIsInstance(fig, plt.Figure)
        plt.close(fig)

if __name__ == '__main__':
    unittest.main()
