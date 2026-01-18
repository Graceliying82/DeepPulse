"""
DeepPulse - ECG Visualizer
Author: Grace Li
Date: 2026
Description: Renders 12-lead ECG signals using Matplotlib with professional medical grid styling.
"""
import matplotlib.pyplot as plt
import numpy as np
import io

SUBPLOT_WIDTH = 20
SUBPLOT_HEIGHT_PER_ROW = 2.5 # Default for dynamic rows
SUBPLOT_HEIGHT_12_LEAD = 12

def plot_ecg_signals(signals, fields):
    """
    Plots ECG signals with a dynamic layout based on channel count.
    signals: numpy array of shape (samples, channels)
    fields: dict containing metadata (fs, sig_name, units, etc.)
    returns: matplotlib figure
    """
    num_signals = signals.shape[1]
    
    # Try to identify standard leads if present
    lead_names = fields.get('sig_name', [])
    if not lead_names:
        lead_names = [f"Lead {i+1}" for i in range(num_signals)]
        
    # Determine Layout
    if num_signals == 12:
        # Standard 12-lead layout: 6 rows, 2 columns
        rows = 6
        cols = 2
        figsize = (SUBPLOT_WIDTH, SUBPLOT_HEIGHT_12_LEAD)
    elif num_signals <= 6:
         # Stack vertically for small number of leads (e.g., 1, 2, 3)
        rows = num_signals
        cols = 1
        figsize = (15, 3 * rows) # Keep this custom for single col for now or use constant ratio
    else:
        # General case: 2 columns
        cols = 2
        rows = int(np.ceil(num_signals / 2))
        figsize = (SUBPLOT_WIDTH, SUBPLOT_HEIGHT_PER_ROW * rows)

    fig, axes = plt.subplots(rows, cols, figsize=figsize, sharex=True)
    if num_signals > 1:
        axes = axes.flatten()
    else:
        axes = [axes] # Ensure it's substantial
    
    fs = fields.get('fs', 1000)
    time = np.arange(signals.shape[0]) / fs
    
    # Limit to 10 seconds default
    max_samples = int(10 * fs)
    if signals.shape[0] > max_samples:
        plot_signals = signals[:max_samples, :]
        plot_time = time[:max_samples]
    else:
        plot_signals = signals
        plot_time = time

    # Plot each signal
    for i in range(num_signals):
        if i >= len(axes): break
        ax = axes[i]
        
        raw_signal = plot_signals[:, i]
        signal = raw_signal - np.mean(raw_signal)
        lead_name = lead_names[i] if i < len(lead_names) else f"Ch {i+1}"
        
        # Determine Y-limits based on data
        y_min = np.min(signal)
        y_max = np.max(signal)
        y_range = max(abs(y_min), abs(y_max), 1.0) 
        limit = np.ceil(y_range * 1.2 * 2) / 2 # Round up
        ax.set_ylim(-limit, limit)
        
        # Grid
        curr_x_max = plot_time[-1]
        major_ticks_x = np.arange(0, curr_x_max + 0.2, 0.2)
        minor_ticks_x = np.arange(0, curr_x_max + 0.04, 0.04)
        major_ticks_y = np.arange(-limit, limit + 0.5, 0.5)
        minor_ticks_y = np.arange(-limit, limit + 0.1, 0.1)
        
        ax.set_xticks(major_ticks_x)
        ax.set_xticks(minor_ticks_x, minor=True)
        ax.set_yticks(major_ticks_y)
        ax.set_yticks(minor_ticks_y, minor=True)
        
        ax.grid(which='major', linestyle='-', linewidth=0.7, color='red', alpha=0.3)
        ax.grid(which='minor', linestyle=':', linewidth=0.5, color='red', alpha=0.2)
        
        ax.plot(plot_time, signal, color='black', linewidth=0.9)
        
        # Label
        ax.set_title(lead_name, x=0.01, y=0.8, loc='left', fontsize=12, fontweight='bold', bbox=dict(facecolor='white', alpha=0.7, edgecolor='none'))
        
        # Spines
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_visible(False)
        ax.spines['left'].set_visible(False)
        ax.tick_params(axis='both', which='both', length=0, labelsize=0)

        # X-label on bottom plot(s)
        # Logic depends on col count.
        is_bottom = False
        if cols == 1:
            if i == num_signals - 1: is_bottom = True
        else:
            # If 2 cols, bottom ones are last 2 indices (or if odd, last 1)
            row_idx = i // cols
            if row_idx == rows - 1: is_bottom = True
            
        if is_bottom:
            ax.tick_params(axis='x', labelsize=8)
            ax.set_xlabel('Time (s)', fontsize=8)

    # Hide unused axes
    for i in range(num_signals, len(axes)):
        axes[i].axis('off')

    plt.tight_layout()
    return fig

def convert_plot_to_image(fig):
    """Converts a matplotlib figure to a BytesIO object (PNG)."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    return buf
