"""
DeepPulse - Spectral Analysis Service
Author: Grace Li
Date: 2026
Description: FFT-based frequency band analysis for EEG/ECG signals
"""

import numpy as np
from scipy import signal as scipy_signal
from scipy.fft import rfft, rfftfreq
import logging

logger = logging.getLogger(__name__)

# EEG Frequency Bands (Hz)
EEG_BANDS = {
    "delta": (0.5, 4),
    "theta": (4, 8),
    "alpha": (8, 13),
    "beta": (13, 30),
    "gamma": (30, 100)
}

# Clinical interpretations
BAND_INTERPRETATIONS = {
    "delta": "Deep sleep / Pathology if awake",
    "theta": "Drowsiness / Normal in children",
    "alpha": "Relaxed wakefulness (posterior dominant rhythm)",
    "beta": "Active thinking / Alertness",
    "gamma": "Cognitive processing (rare on scalp EEG)"
}

def compute_band_power(signals, fs, bands=None):
    """
    Compute relative power in each frequency band for all channels.
    
    Args:
        signals: numpy array (samples x channels)
        fs: sampling frequency (Hz)
        bands: dict of (low, high) tuples for each band (uses EEG_BANDS if None)
    
    Returns:
        dict: {
            "band_powers": {channel_idx: {band_name: power_percentage}},
            "dominant_frequency": {channel_idx: frequency},
            "flags": {channel_idx: [warning_messages]}
        }
    """
    if bands is None:
        bands = EEG_BANDS
    
    if signals.ndim == 1:
        signals = signals.reshape(-1, 1)
    
    n_channels = signals.shape[1]
    results = {
        "band_powers": {},
        "dominant_frequency": {},
        "spectral_edge": {},
        "flags": {}
    }
    
    for ch_idx in range(n_channels):
        channel_data = signals[:, ch_idx]
        
        # Compute power spectral density using Welch's method
        freqs, psd = scipy_signal.welch(
            channel_data, 
            fs=fs, 
            nperseg=min(2048, len(channel_data)),
            scaling='density'
        )
        
        # Compute power in each band
        band_powers = {}
        total_power = np.trapz(psd, freqs)
        
        for band_name, (low, high) in bands.items():
            # Find frequencies in this band
            band_mask = (freqs >= low) & (freqs <= high)
            band_power = np.trapz(psd[band_mask], freqs[band_mask])
            
            # Convert to percentage of total power
            band_powers[band_name] = {
                "absolute": float(band_power),
                "relative": float((band_power / total_power) * 100) if total_power > 0 else 0.0
            }
        
        # Find dominant frequency (peak in spectrum)
        peak_idx = np.argmax(psd)
        dominant_freq = float(freqs[peak_idx])
        
        # Compute spectral edge frequency (95% power threshold)
        cumulative_power = np.cumsum(psd)
        threshold_95 = 0.95 * cumulative_power[-1]
        edge_idx = np.where(cumulative_power >= threshold_95)[0]
        spectral_edge = float(freqs[edge_idx[0]]) if len(edge_idx) > 0 else float(freqs[-1])
        
        results["band_powers"][ch_idx] = band_powers
        results["dominant_frequency"][ch_idx] = dominant_freq
        results["spectral_edge"][ch_idx] = spectral_edge
        
        # Clinical flags
        flags = []
        delta_rel = band_powers["delta"]["relative"]
        alpha_rel = band_powers["alpha"]["relative"]
        
        if delta_rel > 40:
            flags.append("⚠️ Excessive slow-wave activity (delta > 40%)")
        if alpha_rel > 60:
            flags.append("✓ Strong alpha rhythm detected")
        if spectral_edge < 10:
            flags.append("⚠️ Low spectral edge - consider artifact or pathology")
        
        results["flags"][ch_idx] = flags
    
    return results


def compute_spectrogram(signals, fs, channel_idx=0, window_sec=2.0):
    """
    Compute time-frequency spectrogram for visualization.
    
    Args:
        signals: numpy array (samples x channels)
        fs: sampling frequency
        channel_idx: which channel to compute (default 0)
        window_sec: length of analysis window in seconds
    
    Returns:
        dict: {
            "frequencies": list,
            "times": list,
            "power": 2D array (freq x time)
        }
    """
    if signals.ndim == 1:
        signals = signals.reshape(-1, 1)
    
    channel_data = signals[:, channel_idx]
    
    # Compute spectrogram
    nperseg = int(window_sec * fs)
    freqs, times, Sxx = scipy_signal.spectrogram(
        channel_data,
        fs=fs,
        nperseg=nperseg,
        noverlap=nperseg // 2,
        scaling='density'
    )
    
    # Convert to dB scale for visualization
    Sxx_db = 10 * np.log10(Sxx + 1e-10)  # Add small value to avoid log(0)
    
    # Limit to clinically relevant frequencies (0-50 Hz for EEG)
    freq_mask = freqs <= 50
    
    return {
        "frequencies": freqs[freq_mask].tolist(),
        "times": times.tolist(),
        "power": Sxx_db[freq_mask, :].tolist(),
        "unit": "dB"
    }


def detect_alpha_rhythm(signals, fs, threshold_power=30):
    """
    Detect presence of posterior dominant alpha rhythm (8-13 Hz).
    
    Args:
        signals: numpy array
        fs: sampling frequency
        threshold_power: minimum relative power % to consider significant
    
    Returns:
        dict: {
            "detected": bool,
            "channels": [list of channel indices with strong alpha],
            "peak_frequency": float (Hz)
        }
    """
    band_analysis = compute_band_power(signals, fs)
    
    alpha_channels = []
    peak_freqs = []
    
    for ch_idx, powers in band_analysis["band_powers"].items():
        alpha_power = powers["alpha"]["relative"]
        if alpha_power > threshold_power:
            alpha_channels.append(ch_idx)
            
            # Get peak frequency in alpha range
            dom_freq = band_analysis["dominant_frequency"][ch_idx]
            if 8 <= dom_freq <= 13:
                peak_freqs.append(dom_freq)
    
    return {
        "detected": len(alpha_channels) > 0,
        "channels": alpha_channels,
        "peak_frequency": float(np.mean(peak_freqs)) if peak_freqs else None,
        "interpretation": "Posterior dominant rhythm present" if len(alpha_channels) > 0 else "No clear alpha rhythm"
    }


def get_clinical_summary(signals, fs, signal_type="EEG"):
    """
    Generate comprehensive clinical summary of spectral features.
    
    Args:
        signals: numpy array
        fs: sampling frequency
        signal_type: "EEG" or "ECG"
    
    Returns:
        dict: Complete spectral analysis with interpretations
    """
    results = {
        "signal_type": signal_type,
        "sampling_frequency": fs,
        "duration_sec": len(signals) / fs,
        "num_channels": signals.shape[1] if signals.ndim > 1 else 1
    }
    
    if signal_type == "EEG":
        # Full EEG analysis
        results["band_powers"] = compute_band_power(signals, fs)
        results["alpha_rhythm"] = detect_alpha_rhythm(signals, fs)
        results["interpretations"] = BAND_INTERPRETATIONS
        
        # Overall assessment
        flags = []
        for ch_flags in results["band_powers"]["flags"].values():
            flags.extend(ch_flags)
        
        results["clinical_flags"] = list(set(flags))  # Remove duplicates
    
    else:  # ECG or other
        # Basic spectral analysis without band interpretation
        results["band_powers"] = compute_band_power(signals, fs)
        results["clinical_flags"] = ["Standard spectral analysis - not EEG-specific"]
    
    return results
