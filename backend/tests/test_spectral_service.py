"""
Tests for spectral analysis service
"""
import numpy as np
import pytest
from app.services import spectral_service

def test_compute_band_power_single_channel():
    """Test band power computation on synthetic signal."""
    # Create synthetic 10 Hz sine wave (alpha band)
    fs = 256  # Sampling frequency
    duration = 10  # seconds
    t = np.linspace(0, duration, fs * duration)
    
    # 10 Hz alpha wave
    signal = np.sin(2 * np.pi * 10 * t)
    
    result = spectral_service.compute_band_power(signal, fs)
    
    # Should have strong alpha power
    assert 0 in result["band_powers"]
    alpha_power = result["band_powers"][0]["alpha"]["relative"]
    
    # Alpha should dominate (>50% of power)
    assert alpha_power > 50, f"Expected strong alpha, got {alpha_power}%"
    
    # Dominant frequency should be ~10 Hz
    dom_freq = result["dominant_frequency"][0]
    assert 9 < dom_freq < 11, f"Expected ~10 Hz, got {dom_freq} Hz"


def test_compute_band_power_multi_channel():
    """Test band power with multiple channels."""
    fs = 256
    duration = 5
    t = np.linspace(0, duration, fs * duration)
    
    # Channel 0: 10 Hz (alpha)
    # Channel 1: 5 Hz (theta)
    signals = np.column_stack([
        np.sin(2 * np.pi * 10 * t),
        np.sin(2 * np.pi * 5 * t)
    ])
    
    result = spectral_service.compute_band_power(signals, fs)
    
    # Check both channels analyzed
    assert 0 in result["band_powers"]
    assert 1 in result["band_powers"]
    
    # Channel 0 should show alpha dominance
    alpha_ch0 = result["band_powers"][0]["alpha"]["relative"]
    assert alpha_ch0 > 40
    
    # Channel 1 should show theta dominance
    theta_ch1 = result["band_powers"][1]["theta"]["relative"]
    assert theta_ch1 > 40


def test_detect_alpha_rhythm():
    """Test alpha rhythm detection."""
    fs = 256
    duration = 10
    t = np.linspace(0, duration, fs * duration)
    
    # Strong 10 Hz signal
    signal = np.sin(2 * np.pi * 10 * t)
    
    result = spectral_service.detect_alpha_rhythm(signal, fs)
    
    assert result["detected"] == True
    assert len(result["channels"]) > 0
    assert result["peak_frequency"] is not None
    assert 8 < result["peak_frequency"] < 13


def test_clinical_summary():
    \"\"\"Test comprehensive clinical summary generation.\"\"\"
    fs = 256
    duration = 5
    t = np.linspace(0, duration, fs * duration)
    
    signal = np.sin(2 * np.pi * 10 * t)  # Alpha wave
    
    result = spectral_service.get_clinical_summary(signal, fs, signal_type="EEG")
    
    assert "band_powers" in result
    assert "alpha_rhythm" in result
    assert "clinical_flags" in result
    assert result["signal_type"] == "EEG"
    assert result["sampling_frequency"] == fs


def test_spectrogram_generation():
    \"\"\"Test spectrogram computation.\"\"\"
    fs = 256
    duration = 10
    t = np.linspace(0, duration, fs * duration)
    
    # Frequency modulated signal (sweep from 5 to 15 Hz)
    signal = np.sin(2 * np.pi * (5 + 10 * t / duration) * t)
    
    result = spectral_service.compute_spectrogram(signal, fs)
    
    assert "frequencies" in result
    assert "times" in result
    assert "power" in result
    assert len(result["frequencies"]) > 0
    assert len(result["times"]) > 0


def test_clinical_flags():
    \"\"\"Test that clinical flags are generated appropriately.\"\"\"
    fs = 256
    duration = 10
    t = np.linspace(0, duration, fs * duration)
    
    # Pathological slow wave (2 Hz delta)
    slow_signal = np.sin(2 * np.pi * 2 * t)
    
    result = spectral_service.compute_band_power(slow_signal, fs)
    
    # Should flag excessive slow-wave activity
    flags = result["flags"][0]
    assert any("delta" in flag.lower() for flag in flags), "Expected delta warning"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
