"""
DeepPulse - ECG Visualizer
Author: Grace Li
Date: 2026
Description: Renders 12-lead ECG signals using Matplotlib with professional medical grid styling.
"""
import matplotlib.pyplot as plt
import numpy as np
import io

def plot_12_lead_ecg(signals, fields):
    """
    Plots a 12-lead ECG from the given signals and fields.
    signals: numpy array of shape (samples, channels)
    fields: dict containing metadata (fs, sig_name, units, etc.)
    returns: matplotlib figure
    """
    
    # Standard 12-lead order usually: I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6
    # PTBDB usually has 15 leads: I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6, Vx, Vy, Vz
    # We will try to find the standard 12 leads by name.
    
    lead_names = fields.get('sig_name', [])
    standard_leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
    
    # Map standard leads to indices
    lead_indices = []
    found_leads = []
    
    for lead in standard_leads:
        try:
            # Case insensitive search or exact match
            # specific to PTBDB, names are usually exact
            idx = lead_names.index(lead)
            lead_indices.append(idx)
            found_leads.append(lead)
        except ValueError:
            continue
            
    if not found_leads:
        # Fallback: just plot first 12 if available, or all
        lead_indices = list(range(min(12, signals.shape[1])))
        found_leads = [lead_names[i] for i in lead_indices]

    num_leads = len(lead_indices)
    
    # Create Layout: 6 rows, 2 columns for 12 leads
    cols = 2
    rows = 6
    
    # Make it wider: (Width, Height). Standard paper aspect ratio is important.
    # 10 seconds of data at 25mm/s = 250mm long. 
    # We want it to be wide on screen.
    fig, axes = plt.subplots(rows, cols, figsize=(20, 12), sharex=True)
    axes = axes.flatten()
    
    fs = fields.get('fs', 1000)
    time = np.arange(signals.shape[0]) / fs
    
    # Limit to 10 seconds if too long, as standard ECG is 10s
    max_samples = int(10 * fs)
    if signals.shape[0] > max_samples:
        plot_signals = signals[:max_samples, :]
        plot_time = time[:max_samples]
    else:
        plot_signals = signals
        plot_time = time

    # ECG Grid Styling with Dynamic Range
    # We need to center the signal because PTBDB data might have offsets.
    
    for i, lead_idx in enumerate(lead_indices):
        if i >= len(axes): break
        ax = axes[i]
        
        raw_signal = plot_signals[:, lead_idx]
        # Baseline correction: subtract media/mean to center around 0
        signal = raw_signal - np.mean(raw_signal)
        
        lead_name = found_leads[i]
        
        # Determine Y-limits based on data spread to ensure visibility
        # Standard ECG is usually +/- 2mV, but let's be safe.
        y_min = np.min(signal)
        y_max = np.max(signal)
        y_range = max(abs(y_min), abs(y_max), 1.5) # Ensure at least 1.5mV range
        
        limit = np.ceil(y_range * 1.2 * 2) / 2 # Round up to nearest 0.5
        ax.set_ylim(-limit, limit)
        
        # Create grid ticks covering the visible area
        curr_x_max = plot_time[-1]
        
        # X-axis ticks (Time)
        major_ticks_x = np.arange(0, curr_x_max + 0.2, 0.2)
        minor_ticks_x = np.arange(0, curr_x_max + 0.04, 0.04)
        
        # Y-axis ticks (Voltage)
        major_ticks_y = np.arange(-limit, limit + 0.5, 0.5)
        minor_ticks_y = np.arange(-limit, limit + 0.1, 0.1)
        
        ax.set_xticks(major_ticks_x)
        ax.set_xticks(minor_ticks_x, minor=True)
        ax.set_yticks(major_ticks_y)
        ax.set_yticks(minor_ticks_y, minor=True)
        
        ax.grid(which='major', linestyle='-', linewidth=0.7, color='red', alpha=0.3)
        ax.grid(which='minor', linestyle=':', linewidth=0.5, color='red', alpha=0.2)
        
        ax.plot(plot_time, signal, color='black', linewidth=0.9)
        ax.set_title(lead_name, x=0.01, y=0.8, loc='left', fontsize=12, fontweight='bold', bbox=dict(facecolor='white', alpha=0.7, edgecolor='none'))
        
        # Remove spines but keep grid
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_visible(False)
        ax.spines['left'].set_visible(False)
        ax.tick_params(axis='both', which='both', length=0, labelsize=0) # Hide tick marks/labels generally 
        
        # Minimal labels only on bottom/left-most to avoid clutter
        if i >= num_leads - 2:
           ax.tick_params(axis='x', labelsize=8) # Show time on bottom
           ax.set_xlabel('Time (s)', fontsize=8)

    # Hide unused subplots
    for i in range(num_leads, len(axes)):
        axes[i].axis('off')

    plt.tight_layout()
    return fig

def convert_plot_to_image(fig):
    """Converts a matplotlib figure to a BytesIO object (PNG)."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    return buf
