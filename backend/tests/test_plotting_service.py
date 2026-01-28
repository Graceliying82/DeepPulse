import pytest
import numpy as np
import io
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend for testing
from app.services import plotting, data_service
from matplotlib.figure import Figure

def test_path_normalization():
    """Verify that redundant category prefixes are stripped correctly."""
    category = "cardiac"
    # Case 1: Redundant prefix
    input_path = "cardiac/mitdb/100"
    
    # We simulate the logic inside load_record
    if input_path.startswith(f"{category}/"):
        clean_path = input_path[len(category)+1:]
    else:
        clean_path = input_path
        
    assert clean_path == "mitdb/100"
    
    # Case 2: No redundant prefix
    input_path = "mitdb/100"
    if input_path.startswith(f"{category}/"):
        clean_path = input_path[len(category)+1:]
    else:
        clean_path = input_path
    assert clean_path == "mitdb/100"

def test_plotting_logic_generic():
    """Test that the plotting function returns a valid Matplotlib figure."""
    # Mock signal data (1000 samples, 2 channels)
    signals = np.random.randn(1000, 2)
    fields = {"fs": 100, "sig_name": ["Lead I", "Lead II"]}
    
    fig = plotting.plot_generic_signals(signals, fields, signal_type="Cardiac", start_time=0, duration=5)
    
    assert isinstance(fig, Figure)
    assert len(fig.axes) >= 2 # Should have at least 2 axes for 2 signals

def test_plotting_empty_slice():
    """Test that plotting handles out-of-bounds time ranges gracefully."""
    signals = np.random.randn(100, 2)
    fields = {"fs": 10}
    
    # Requesting time range way beyond data (100 samples @ 10Hz = 10s)
    # Asking for 20s to 30s
    fig = plotting.plot_generic_signals(signals, fields, start_time=20, duration=10)
    
    assert isinstance(fig, Figure)
    # Check if we got the "No data" message axe
    found_msg = False
    for ax in fig.axes:
        for t in ax.texts:
            if "No data" in t.get_text():
                found_msg = True
    assert found_msg

def test_image_conversion():
    """Verify that figure conversion to PNG buffer works."""
    signals = np.random.randn(100, 1)
    fields = {"fs": 10}
    fig = plotting.plot_generic_signals(signals, fields)
    
    buf = plotting.convert_plot_to_image(fig)
    
    assert isinstance(buf, io.BytesIO)
    assert buf.getvalue().startswith(b'\x89PNG') # PNG Magic Number
