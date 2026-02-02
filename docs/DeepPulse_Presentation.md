# DeepPulse: Product Overview & Architecture

## 1. Executive Summary

**DeepPulse** is an advanced educational and research platform designed for the visualization and AI-powered analysis of physiological signals (ECG, EEG, etc.). By combining medical-grade signal processing with Google's Gemini 2.0 Flash AI, DeepPulse democratizes access to expert-level interpretation for medical students and researchers.

---

## 2. Product Overview

### Core Value Proposition
- **Medical-Grade Precision:** True calibration (e.g., 25mm/s, 10mm/mV for ECG) ensuring clinical relevance.
- **AI-Augmented Learning:** Interactive "Socratic" hints and full diagnostic explanations powered by Gemini.
- **Data Accessibility:** Direct integration with PhysioNet's massive repository of open-source physiological data.

### Key Features
| Feature | Description |
| :--- | :--- |
| **Signal Visualization** | SVG-based rendering with professional grids, standard time scales, and amplitude scaling. |
| **Interactive Analysis** | Three modes: **Full Analysis** (Clinical report), **Hints** (Educational guidance), and **Quiz** (Diagnostic challenges). |
| **Multi-Modality** | Support for Cardiac (ECG), Neurological (EEG), Respiratory, and other biosignals. |
| **Data Management** | Smart caching, automatic metadata extraction, and batch downloading from PhysioNet. |

---

## 3. High-Level Architecture

DeepPulse employs a **Modern Web Application** architecture with a clean separation of concerns between data sourcing, domain interpretation, and visualization.

### Architecture Diagram
```mermaid
graph TD
    User[User] --> Frontend[React 19 Frontend]
    Frontend -- API Requests --> Backend[FastAPI Backend]
    Backend -- Fetch Data --> PhysioNet[PhysioNet Database (WFDB)]
    Backend -- AI Analysis --> Gemini[Google Gemini 2.0 Flash]
    Backend -- Cache Data --> LocalStorage[Local File Storage]
```

### Component Breakdown

#### Frontend (Client-Side)
- **Framework:** React 19 + Vite
- **Responsibility:** User Interface, Interactive Visualization, Signal Parsing.
- **Key Modules:**
  - `SignalViewer`: SVG-based renderer optimizing for 60fps scrolling.
  - `SignalRegistry`: Factory pattern for managing diverse signal types (ECG, EEG).
  - `Interpreters`: Domain logic that normalizes raw data into structured signal objects.
  - `Visualizations`: Configuration objects defining layouts (Overlay vs. Stacked) and grids.

#### Backend (Server-Side)
- **Framework:** FastAPI (Python)
- **Responsibility:** Data Orchestration, AI Proxy, Formatting.
- **Key Modules:**
  - `data_service`: Handles `wfdb` (Waveform Database) operations to fetch/convert PhysioNet data.
  - `ai_service`: Manages prompt engineering and context windowing for Gemini AI interactions.

---

## 4. Detailed Signal Architecture

The platform uses a **Modular Extensible Architecture** to handle the complexity of different medical domains without creating a monolithic mess.

### The "Triad" Pattern
For every supported signal type (e.g., ECG, EEG), DeepPulse defines a triad:

1.  **Interpreter:** Pure domain logic.
    *   *Example (ECG):* Knows that Lead II, III, and aVF represent the "Inferior" surface of the heart.
    *   *Example (EEG):* Knows standard 10-20 electrode placement and "Bipolar Montage" chains.
2.  **Visualization Config:** Rendering specifications.
    *   *Example (ECG):* Red grid, 25mm/s speed, overlay layout.
    *   *Example (EEG):* Stacked layout, 30mm/s speed, 7μV/mm sensitivity.
3.  **Registry:** Maps raw data metadata to the correct Triad.

start logic:
```
Raw Data -> SignalRegistry -> (Selects Interpreter) -> Structured Data -> (Selects Vis Config) -> SignalViewer
```

---

## 5. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TailwindCSS, D3.js (concepts adapted for SVG), Lucide React |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic |
| **Data Engineering** | WFDB (Waveform Database Library), NumPy, Pandas |
| **AI / LLM** | Google Gemini 2.0 Flash (Multimodal capabilities) |
| **DevOps / Tooling** | Git, Pytest, ESLint |

---

## 6. Future Roadmap

- **Expanded Signal Support:** Adding PPG (Pulse Oximetry) and EMG (Electromyography).
- **Real-Time Streaming:** WebSocket integration for live device monitoring.
- **Annotation Tools:** Allow users to manually mark P-waves, QRS complexes, and Seizures.
- **Export Capabilities:** Generate PDF reports or DICOM compatible files for clinical review.
