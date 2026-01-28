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

def plot_generic_signals(signals, fields, signal_type="Cardiac", start_time=0, duration=10):
    """
    Plots signals using strict medical styling for Cardiac (ECG) or generic styling for others.
    """
    if signal_type == "Cardiac":
        return plot_ecg_standard(signals, fields, start_time, duration)
    else:
        return plot_generic_layout(signals, fields, start_time, duration)

def plot_ecg_standard(signals, fields, start_time=0, duration=10):
    """
    Strict 12-Lead ECG Layout: 25mm/s, 10mm/mV.
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
        figsize = (15, 3 * rows)
    else:
        # General case (e.g. 15-lead): 2 columns
        cols = 2
        rows = int(np.ceil(num_signals / 2))
        figsize = (SUBPLOT_WIDTH, SUBPLOT_HEIGHT_PER_ROW * rows)

    fig, axes = plt.subplots(rows, cols, figsize=figsize, sharex=True)
    if num_signals > 1:
        axes = axes.flatten()
    else:
        axes = [axes] 
    
    fs = fields.get('fs', 1000)
    
    # Slice data based on start_time and duration
    start_idx = int(start_time * fs)
    end_idx = int((start_time + duration) * fs)
    
    # Clamp to available data range
    start_idx = max(0, min(start_idx, signals.shape[0]))
    end_idx = min(end_idx, signals.shape[0])
    
    plot_signals = signals[start_idx:end_idx, :]
    plot_time = np.arange(start_idx, end_idx) / fs

    if len(plot_time) == 0:
        fig, ax = plt.subplots(figsize=(10, 2))
        ax.text(0.5, 0.5, "No data available in this time range", ha='center', va='center')
        ax.axis('off')
        return fig

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
        is_bottom = False
        if cols == 1:
            if i == num_signals - 1: is_bottom = True
        else:
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

def plot_generic_layout(signals, fields, start_time=0, duration=10):
    """
    Flexible layout for non-standard signals (EEG, Gait, etc.)
    Independent scaling, simple grid.
    """
    num_signals = signals.shape[1]
    
    # Try to identify channel names
    ch_names = fields.get('sig_name', [])
    if not ch_names:
        ch_names = [f"Ch {i+1}" for i in range(num_signals)]
    
    # Stack vertically (standard for EEG/Polygraphy)
    rows = num_signals
    cols = 1
    # Limit to max 16 rows to prevent crashing display, page if needed
    if rows > 16: rows = 16 
    
    figsize = (15, 1.5 * rows) # Smaller height per row for high channel count

    fig, axes = plt.subplots(rows, cols, figsize=figsize, sharex=True)
    if num_signals > 1:
        axes = axes.flatten()
    else:
        axes = [axes]
    
    fs = fields.get('fs', 256)
    
    # Slice data based on start_time and duration
    start_idx = int(start_time * fs)
    end_idx = int((start_time + duration) * fs)
    
    # Clamp to available data range
    start_idx = max(0, min(start_idx, signals.shape[0]))
    end_idx = min(end_idx, signals.shape[0])
    
    plot_signals = signals[start_idx:end_idx, :]
    plot_time = np.arange(start_idx, end_idx) / fs
    
    if len(plot_time) == 0:
        fig, ax = plt.subplots(figsize=(10, 2))
        ax.text(0.5, 0.5, "No data available in this time range", ha='center', va='center')
        ax.axis('off')
        return fig
    
    # Plot each signal
    for i in range(min(num_signals, 16)):
        ax = axes[i]
        
        signal = plot_signals[:, i]
        ch_name = ch_names[i] if i < len(ch_names) else f"Ch {i+1}"
        
        # Auto-scale
        ax.plot(plot_time, signal, color='navy', linewidth=0.8)
        
        # Simple Grid
        ax.grid(linestyle='--', linewidth=0.5, alpha=0.5)
        
        # Label to the left of the plot
        ax.set_ylabel(ch_name, rotation=0, labelpad=50, fontsize=9, fontweight='bold')
        
        # Remove top/right spines
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        
        if i == min(num_signals, 16) - 1:
            ax.set_xlabel('Time (s)')

    plt.tight_layout()
    return fig

def convert_plot_to_image(fig):
    """Converts a matplotlib figure to a BytesIO object (PNG)."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    plt.close(fig) # Close the figure to free memory
    return buf
