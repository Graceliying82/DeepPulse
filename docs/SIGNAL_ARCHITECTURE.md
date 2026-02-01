# DeepPulse Signal Processing Architecture

## Overview

DeepPulse uses a **modular, extensible architecture** for handling different types of medical waveform data. This design cleanly separates three concerns:

1. **Data Loading** - Raw data fetching and format conversion (backend)
2. **Data Interpretation** - Understanding what the data means (frontend interpreters)
3. **Data Visualization** - How to display the data (frontend visualization configs)

This separation allows:
- Multiple visualization options for the same data type
- Easy addition of new signal types
- Signal-specific domain knowledge without coupling to display logic
- Reusable visualization components

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        data_service.py                               │   │
│  │  • load_record() - Loads WFDB and EDF formats                       │   │
│  │  • Returns: { signals, fs, sig_name, units, comments }              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ JSON API
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SignalRegistry                                  │   │
│  │  • Central hub mapping signal types to handlers                     │   │
│  │  • Auto-detection of signal type from data characteristics          │   │
│  │  • Category mapping (cardiac → ecg, neurological → eeg)            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                    │                             │
│            ┌─────────────┴─────────┐         │                             │
│            ▼                       ▼         ▼                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│  │   Interpreter   │     │   Interpreter   │     │   Interpreter   │      │
│  │     (ECG)       │     │     (EEG)       │     │   (Future...)   │      │
│  ├─────────────────┤     ├─────────────────┤     ├─────────────────┤      │
│  │ • parse()       │     │ • parse()       │     │ • parse()       │      │
│  │ • getChannels() │     │ • getChannels() │     │ • getChannels() │      │
│  │ • getMetadata() │     │ • getMetadata() │     │ • getMetadata() │      │
│  │ • normalize()   │     │ • organize()    │     │                 │      │
│  │ • educatInfo()  │     │ • educatInfo()  │     │                 │      │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘      │
│            │                       │                    │                  │
│            ▼                       ▼                    ▼                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│  │  Visualization  │     │  Visualization  │     │  Visualization  │      │
│  │    (ECG)        │     │    (EEG)        │     │   (Future...)   │      │
│  ├─────────────────┤     ├─────────────────┤     ├─────────────────┤      │
│  │ layout: overlay │     │ layout: stacked │     │                 │      │
│  │ grid: ECG paper │     │ grid: EEG style │     │                 │      │
│  │ colors: red     │     │ montage order   │     │                 │      │
│  │ scale: mV       │     │ scale: μV       │     │                 │      │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘      │
│                          │                                                 │
│                          ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SignalViewer (React)                           │   │
│  │  • Receives parsed data + visualization config                      │   │
│  │  • Renders appropriate layout (overlay vs stacked)                  │   │
│  │  • Handles interactions (zoom, pan, crosshair)                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
frontend/src/signals/
├── index.js                 # Main entry point, exports and registration
├── SignalRegistry.js        # Central registry for signal types
│
├── interpreters/
│   ├── BaseInterpreter.js   # Abstract base class
│   ├── ECGInterpreter.js    # ECG/Cardiac signal interpreter
│   └── EEGInterpreter.js    # EEG/Neurological signal interpreter
│
└── visualizations/
    ├── BaseVisualization.js # Abstract base class
    ├── ECGVisualization.js  # ECG display configuration
    └── EEGVisualization.js  # EEG display configuration
```

---

## Core Components

### 1. SignalRegistry

The central hub that maps signal types to their handlers.

```javascript
import { SignalRegistry } from './signals';

// Register a new signal type
SignalRegistry.register('ppg', ppgInterpreter, ppgVisualization, ['respiration']);

// Get handlers for a signal type
const { interpreter, visualization } = SignalRegistry.get('neurological');

// Auto-detect signal type
const type = SignalRegistry.detectSignalType(rawData);
```

**Key Features:**
- Maps multiple category names to same signal type (e.g., 'cardiac', 'Cardiac' → 'ecg')
- Auto-detection based on channel names and sampling rate
- Fallback to default handler for unknown types

### 2. Interpreters

Interpreters understand the **domain knowledge** of a signal type.

```javascript
class ECGInterpreter extends BaseInterpreter {
    // What type is this?
    getType() { return 'ecg'; }

    // Parse raw data into structured format
    parse(rawData) {
        return {
            type: 'ecg',
            channels: [...],      // Channel info with lead names, regions
            metadata: {...},      // Sampling rate, duration, etc.
            displayConfig: {...}  // Suggested display settings
        };
    }

    // Get channel information
    getChannels(rawData) {
        // Returns: [{ name, displayName, region, color, unit }]
    }

    // Educational content for Learn mode
    getEducationalInfo() {
        return {
            description: '...',
            waveforms: {...},
            normalRanges: {...}
        };
    }
}
```

**ECG Interpreter Features:**
- Standard 12-lead ECG lead information
- Lead-to-region mapping (V1-V2 = Septal, II/III/aVF = Inferior)
- PhysioNet lead name normalization
- Statistics calculation (min, max, mean, std)

**EEG Interpreter Features:**
- 10-20 system electrode positions
- Bipolar montage parsing (FP1-F7 format)
- Anatomical ordering (left temporal → left parasagittal → right → midline)
- Frequency band definitions (delta, theta, alpha, beta, gamma)
- Phase reversal detection support

### 3. Visualizations

Visualizations define **how to render** the data.

```javascript
class EEGVisualization extends BaseVisualization {
    constructor() {
        super({
            layout: 'stacked',        // All channels stacked vertically
            channelHeight: 40,        // Pixels per channel
            showChannelLabels: true,  // Labels on left
            showGrid: true,           // Time grid
            showScaleBar: true,       // μV/time scale
            // ...
        });
    }

    // Calculate dimensions for rendering
    calculateDimensions(containerWidth, containerHeight, numChannels) { ... }

    // Get channel layout for stacked view
    getChannelLayout(channels, dimensions) { ... }

    // Get grid configuration
    getGridConfig(dimensions, timeScale, fs) { ... }
}
```

**ECG Visualization Features:**
- Overlay or strip layout
- ECG paper-style grid (red, 5mm major boxes)
- 25mm/s standard speed
- 10mm/mV standard gain
- mV scale bar

**EEG Visualization Features:**
- **Stacked montage view** (essential for neurological interpretation)
- 30mm/s paper speed
- 7μV/mm sensitivity
- Channel labels on left
- Montage chain separators
- Region color coding
- μV scale bar

---

## Usage Examples

### Basic Usage

```javascript
import { processSignalData } from './signals';

// In a React component
const MyComponent = ({ rawData, signalType }) => {
    const { parsed, displayConfig, interpreter } = processSignalData(rawData, signalType);

    // parsed.channels - Processed channel data
    // parsed.metadata - Signal metadata
    // displayConfig - How to render

    return <SignalViewer data={parsed} config={displayConfig} />;
};
```

### Auto-Detection

```javascript
import { processSignalData } from './signals';

// Signal type is auto-detected from channel names
const { signalType, parsed, displayConfig } = processSignalData(rawData);
// signalType: 'eeg' (detected from FP1-F7 channel names)
```

### Educational Content

```javascript
import { getEducationalInfo } from './signals';

const eegInfo = getEducationalInfo('eeg');
// eegInfo.frequencyBands - Delta, theta, alpha, beta definitions
// eegInfo.keyFindings - Spike, sharp wave, slowing definitions
// eegInfo.montageExplanation - Bipolar vs referential
```

---

## Adding a New Signal Type

### Step 1: Create Interpreter

```javascript
// signals/interpreters/PPGInterpreter.js
import { BaseInterpreter } from './BaseInterpreter';

export class PPGInterpreter extends BaseInterpreter {
    getType() { return 'ppg'; }
    getDisplayName() { return 'PPG / Pulse Oximetry'; }

    parse(rawData) {
        // PPG-specific parsing logic
        return {
            type: 'ppg',
            channels: this.getChannels(rawData),
            metadata: this.getMetadata(rawData),
            // ...
        };
    }

    getChannels(rawData) {
        // PPG channel definitions
    }

    getEducationalInfo() {
        return {
            description: 'Photoplethysmography measures blood volume changes...',
            // ...
        };
    }
}

export const ppgInterpreter = new PPGInterpreter();
```

### Step 2: Create Visualization Config

```javascript
// signals/visualizations/PPGVisualization.js
import { BaseVisualization } from './BaseVisualization';

export class PPGVisualization extends BaseVisualization {
    constructor() {
        super({
            layout: 'overlay',
            channelHeight: 150,
            gridColor: '#e5e7eb',
            // PPG-specific settings
        });
    }

    // Override methods as needed
}

export const ppgVisualization = new PPGVisualization();
```

### Step 3: Register

```javascript
// signals/index.js
import { ppgInterpreter } from './interpreters/PPGInterpreter';
import { ppgVisualization } from './visualizations/PPGVisualization';

SignalRegistry.register(
    'ppg',
    ppgInterpreter,
    ppgVisualization,
    ['respiration', 'Respiration', 'ppg', 'PPG', 'spo2']
);
```

---

## Signal Type Comparison

| Feature | ECG | EEG |
|---------|-----|-----|
| **Layout** | Overlay/Strip | Stacked (Montage) |
| **Channels** | 1-12 leads | 19-23 electrodes |
| **Grid** | ECG paper (red, 5mm) | Time-only grid |
| **Speed** | 25 mm/s | 30 mm/s |
| **Scale** | mV | μV |
| **Key Info** | Lead regions, intervals | Electrode positions, montage chains |
| **Ordering** | By lead number | By anatomical region |

---

## Future Extensions

### Planned Signal Types

1. **PPG/SpO2** (Respiration category)
   - Plethysmograph waveform display
   - Oxygen saturation trending

2. **ABP/Hemodynamic** (Hemodynamic category)
   - Arterial blood pressure waveforms
   - Cardiac output parameters

3. **EMG** (Motion category)
   - Electromyography signals
   - Muscle activation patterns

4. **Gait/Accelerometry** (Motion category)
   - Movement data visualization
   - Gait analysis plots

### Extension Points

- **Custom renderers**: Create custom React components for specialized visualizations
- **Analysis plugins**: Add automated signal analysis (QRS detection, seizure detection)
- **Export formats**: Signal-specific export configurations
- **Annotation layers**: Domain-specific annotation types

---

## Best Practices

### When Adding New Signal Types

1. **Study the domain** - Understand how experts interpret the signal
2. **Follow medical standards** - Use standard units, scales, and terminology
3. **Include educational content** - Help users learn to interpret the signal
4. **Test with real data** - Use PhysioNet databases for validation

### Code Organization

1. **Interpreters** handle data logic only (no React/UI code)
2. **Visualizations** are configuration objects (no data transformation)
3. **SignalViewer** consumes both to render (React component)

### Performance

1. Downsample signals for display (keep detail for zoom)
2. Use appropriate channel limits (8 for EEG, 12 for ECG)
3. Lazy-load educational content

---

## API Reference

### SignalRegistry

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `register()` | `type, interpreter, visualization, categories` | void | Register a signal type |
| `get()` | `type` | `{ interpreter, visualization }` | Get handlers |
| `has()` | `type` | boolean | Check if registered |
| `detectSignalType()` | `rawData` | string | Auto-detect from data |

### BaseInterpreter

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getType()` | - | string | Signal type identifier |
| `parse()` | `rawData` | Object | Parse raw data |
| `getChannels()` | `rawData` | Array | Channel information |
| `getMetadata()` | `rawData` | Object | Signal metadata |
| `getEducationalInfo()` | - | Object | Educational content |

### BaseVisualization

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getType()` | - | string | Visualization type |
| `getConfig()` | - | Object | Full configuration |
| `calculateDimensions()` | `width, height, channels` | Object | SVG dimensions |
| `getGridConfig()` | `dimensions, timeScale, fs` | Array | Grid lines |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-02 | Initial architecture with ECG and EEG support |
