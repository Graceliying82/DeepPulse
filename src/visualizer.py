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
    
    # Create Layout: 6 rows, 2 columns for 12 leads, or dynamic
    cols = 2
    rows = (num_leads + 1) // 2
    
    fig, axes = plt.subplots(rows, cols, figsize=(15, 2 * rows), sharex=True)
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

    for i, lead_idx in enumerate(lead_indices):
        ax = axes[i]
        signal = plot_signals[:, lead_idx]
        lead_name = found_leads[i]
        
        ax.plot(plot_time, signal, color='black', linewidth=0.8)
        ax.set_title(lead_name, loc='left', fontsize=10, fontweight='bold')
        ax.grid(True, which='both', linestyle='--', linewidth=0.5, alpha=0.7)
        
        # Remove spines to look cleaner
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_visible(False)
        ax.spines['left'].set_visible(False)
        
        # Minimal ticks
        if i >= num_leads - 2:
            ax.set_xlabel('Time (s)')

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
