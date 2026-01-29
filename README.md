# 🫀 DeepPulse: AI-Powered Physiological Signal Analysis Platform

**DeepPulse** is an advanced educational and research platform for visualizing and analyzing physiological signals. Combining medical-grade signal processing with AI-powered interpretation using Google Gemini, DeepPulse provides interactive learning and analysis tools for medical students, researchers, and healthcare professionals.

## 🌟 Overview

DeepPulse provides professional-grade visualization and AI-assisted analysis of physiological signals including:
- **Cardiac signals**: ECG (electrocardiogram), heart rate variability
- **Respiratory signals**: Respiration waveforms, breathing patterns
- **Neural signals**: EEG (electroencephalogram) and other biosignals
- **Other physiological data**: Blood pressure, pulse oximetry, and more

### Key Capabilities
1. **Medical-grade visualization** with TRUE calibration (25mm/s, 10mm/mV for ECG)
2. **AI-driven analysis** powered by Google Gemini 2.0 Flash
3. **Interactive learning modes** including hints and diagnostic quizzes
4. **Multi-signal support** for comprehensive physiological analysis

## 📚 Data Sources

DeepPulse integrates with **PhysioNet**, the world's largest repository of open-source physiological data.

**Supported Databases:**
- **PTB Diagnostic ECG Database (`ptbdb`)**: 12-lead ECG recordings with clinical diagnoses
- **MIT-BIH Arrhythmia Database (`mitdb`)**: Benchmark arrhythmia database
- **European ST-T Database (`edb`)**: ST and T-wave changes
- **MIMIC-III Waveform Database**: ICU patient monitoring data
- And many more via PhysioNet search

**Data Access:**
- Uses `wfdb` (Waveform Database) Python library
- Local caching for fast repeated access
- Automatic signal categorization and metadata extraction

## 🏗️ Architecture

Modern web application built with:

### Frontend
- **React 19** with Vite for fast development
- **SVG-based rendering** for medical-grade signal visualization
- **Medical calibration standards**: Pixel-perfect 1mm/5mm grids
- **Responsive design** with horizontal scrolling for long recordings
- **Real-time updates** and interactive controls

### Backend
- **FastAPI**: Modern Python web framework
- **RESTful API**: Clean separation of concerns
- **Google Gemini 2.0 Flash**: Multimodal AI for signal interpretation
- **wfdb Integration**: Direct PhysioNet database access
- **Smart caching**: Persistent local storage

### Key Components
- `backend/app/main.py`: FastAPI application and API endpoints
- `backend/app/services/ai_service.py`: Gemini AI integration and prompt engineering
- `backend/app/services/data_service.py`: PhysioNet data loading and management
- `frontend/src/components/SignalViewer.jsx`: Medical-grade SVG signal renderer
- `frontend/src/components/Dashboard.jsx`: Main application interface

## 🚀 Installation & Usage

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and npm
- **Google Gemini API Key** (get from [Google AI Studio](https://aistudio.google.com/apikey))

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Graceliying82/DeepPulse.git
   cd DeepPulse
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure API Key:**
   Create `backend/.env` file:
   ```bash
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

4. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

**Start Backend (Terminal 1):**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## ✨ Features

### Medical-Grade Visualization
- **TRUE calibration**: 25mm/s time scale, 10mm/mV amplitude (ECG standard)
- **Professional grid**: 1mm minor lines, 5mm major lines matching medical paper
- **DPI-normalized**: Accurate pixel-to-millimeter conversion (96 DPI standard)
- **Calibration pulse**: Standard 1mV reference marker
- **Multi-lead display**: Synchronized scrolling across all channels
- **Print-ready**: SVG vector format for documentation

### AI-Powered Analysis
- **Full Analysis Mode**: Comprehensive clinical interpretation
- **Hints Mode**: Educational guidance using Socratic method
- **Quiz Mode**: Interactive diagnostic challenges with explanations
- **Multi-signal support**: Cardiac, respiratory, neural, and other physiological signals
- **Context-aware**: Considers patient metadata and signal characteristics

### Data Management
- **Database discovery**: AI-powered PhysioNet database recommendations
- **Smart downloads**: Automatic categorization and validation
- **Local storage**: Persistent caching with `data/` directory
- **Record browser**: Easy navigation through downloaded signals
- **Batch processing**: Download multiple records efficiently

### Interactive Learning
- **Switch analysis modes** on the fly (Full/Hints/Quiz)
- **Progressive hints** that don't reveal the diagnosis
- **Multiple-choice quizzes** with detailed explanations
- **Real patient data** for authentic learning experiences
- **Instant feedback** from AI tutor

## 🔬 Technical Highlights

### Signal Visualization
- SVG patterns for consistent 1mm/5mm medical grid
- Independent minor/major grid layers for precise styling
- Automatic baseline centering and amplitude scaling
- Downsampling for performance (500 points/second target)
- Horizontal scrolling for recordings of any length
- Time markers every 1 second with clear labels

### Medical Standards Compliance
- **Time axis**: 25 mm/s (1 small square = 0.04s = 40ms)
- **Amplitude axis**: 10 mm/mV (1 small square = 0.1 mV)
- **Grid**: Major lines every 5mm (bold), minor lines every 1mm (thin)
- **Calibration**: 1mV pulse, 0.2s duration (standard reference)

### Performance Optimizations
- Client-side SVG rendering (no server round-trips)
- Efficient downsampling prevents DOM bloat
- React memos and optimized re-renders
- Smart caching reduces repeated downloads
- Lazy loading for large datasets

## 📖 Project Structure

```
DeepPulse/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # API endpoints
│   │   └── services/       # Business logic
│   │       ├── ai_service.py    # Gemini AI integration
│   │       └── data_service.py  # PhysioNet data access
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Dashboard.jsx      # Main UI
│   │   │   └── SignalViewer.jsx   # Medical signal renderer
│   │   ├── App.jsx        # Root component
│   │   └── main.jsx       # Entry point
│   └── package.json       # Node dependencies
│
├── data/                   # Local signal storage
│   ├── cardiac/           # ECG and heart data
│   ├── respiratory/       # Breathing signals
│   └── neural/            # EEG and brain data
│
└── README.md              # This file
```

## 🧪 Development

### Running Tests

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm run lint
```

### API Documentation
FastAPI provides automatic interactive API docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 Contributing

Contributions welcome! Areas of interest:
- Additional signal types and visualizations
- Enhanced AI analysis prompts
- Interactive measurement tools
- Export formats (PDF, DICOM, etc.)
- Real-time monitoring capabilities

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**DeepPulse is for educational and research purposes only and is not a medical device.**

The AI-generated analyses should not be used for clinical diagnosis or treatment decisions. Always consult qualified healthcare professionals for medical advice.

## 🙏 Acknowledgments

- **PhysioNet** for providing open-access physiological data
- **Google Gemini** for multimodal AI capabilities
- **wfdb** library maintainers for PhysioNet integration
- Medical signal processing community for standards and best practices

---

**Built with ❤️ for medical education and research**
