import unittest
import sys
import os
import numpy as np
import matplotlib.pyplot as plt

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from visualizer import plot_generic_signals

class TestVisualizer(unittest.TestCase):
    
    def test_plot_cardiac_structure(self):
        # Test 12-lead (12 channels) for Cardiac
        signals = np.random.randn(500, 12)
        fields = {'fs': 100, 'sig_name': []}
        
        fig = plot_generic_signals(signals, fields, signal_type="Cardiac")
        
        self.assertIsInstance(fig, plt.Figure)
        self.assertGreaterEqual(len(fig.axes), 12)
        plt.close(fig)

    def test_plot_generic_structure(self):
        # Test Generic (Neuro)
        signals = np.random.randn(500, 4)
        fields = {'fs': 100, 'sig_name': ['C3', 'C4', 'O1', 'O2']}
        
        fig = plot_generic_signals(signals, fields, signal_type="Neuro")
        
        self.assertIsInstance(fig, plt.Figure)
        # Generic layout uses 1 col, 4 rows = 4 axes
        self.assertGreaterEqual(len(fig.axes), 4)
        plt.close(fig)

if __name__ == '__main__':
    unittest.main()
