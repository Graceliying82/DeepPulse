# DeepPulse Project Context

## Overview
**DeepPulse** is an AI-powered educational and analytical platform for physiological signals (ECG, EEG, etc.). It leverages Google's **Gemini 3.0** multimodal AI to interpret waveform data, providing expert-level reasoning, clinical insights, and educational content for medical students and researchers.

The project is built as a modern **full-stack web application**.

## Architecture

### 1. Frontend (Client-Side)
*   **Framework:** React 19 (via Vite 7)
*   **Styling:** CSS Modules / Standard CSS
*   **Visualization:** Recharts (for high-performance signal plotting)
*   **Icons:** Lucide-React
*   **State/Network:** Axios for API requests
*   **Location:** `frontend/`

### 2. Backend (Server-Side)
*   **Framework:** FastAPI (Python 3.10+)
*   **Server:** Uvicorn (ASGI)
*   **AI Engine:** Google Gemini (via `google-genai` SDK)
*   **Data Source:** PhysioNet (via `wfdb`), Local File Cache
*   **Signal Processing:** NumPy, SciPy, PyEDFlib (for EDF/Signal parsing)
*   **Location:** `backend/`
*   **Entry Point:** `backend/app/main.py`

## Key Features
1.  **AI Signal Analysis:** Upload signal images or data files to generic detailed clinical analysis using Gemini.
2.  **PhysioNet Integration:** Browse, search, and download real clinical datasets (ECG, EEG, etc.) directly from PhysioNet.
3.  **Spectral Analysis:** Perform frequency domain analysis (FFT, PSD) on signals (managed by `spectral_service.py`).
4.  **Interactive Chat:** Context-aware chat with an AI agent about specific signals or general medical queries.
5.  **Database Recommender:** AI-driven detailed recommendations for research databases based on user role and interest.
6.  **Clinical Note Formatting:** Auto-format raw clinical notes into structured, readable reports.
7.  **Educational Mode:** dedicated interface for medical students to practice diagnostics via:
    *   **Progressive Hints:** Get guided clues without spoilers.
    *   **AI Quizzes:** Generate real-time multiple-choice questions based on the active signal.
    *   **Advanced Feedback:** Verify your own diagnosis against an expert AI "persona" (Cardiologist, Neurologist, etc.).

## Project Structure

```mermaid
graph TD
    Root[DeepPulse Root] --> Backend[backend/]
    Root --> Frontend[frontend/]
    Root --> Scripts[dev.sh]

    Backend --> App[app/]
    App --> Main[main.py (FastAPI App)]
    App --> Services[services/]
    Services --> AIService[ai_service.py]
    Services --> DataService[data_service.py]
    Services --> Spectral[spectral_service.py]

    Frontend --> Src[src/]
    Src --> Components[components/]
    Src --> Signals[signals/ (Visualization Logic)]
    Src --> Utils[utils/]
```

### Educational & Quiz Architecture
The **Educational Panel** (`EducationalPanel.jsx`) enables interactive learning by capturing the live signal visualization and sending it to the AI for analysis.

#### Frontend Features
*   **Signal Snapshot:** Automatically captures specific SVG elements of the signal chart to send to the AI model.
*   **Session Context:** Tracks user interactions (hints seen, quiz attempts) to build a "Learning Journey" context for the AI, preventing repetitive advice.
*   **Three Learning Modes:**
    1.  **Hints:** Progressive disclosure (Reveal Hint 1 -> Hint 2 -> Hint 3).
    2.  **Quiz:** Interactive MCQ with immediate feedback and explanations.
    3.  **Advanced:** Free-text input where the user types a diagnosis and receives expert validation.

#### Backend Implementation (`ai_service.py`)
*   **Persona Switching:** Dynamically adopts expert personas (e.g., "Expert Cardiologist" for ECGs, "Pulmonologist" for Respiration) based on signal type.
*   **Structured Output:**
    *   *Quiz Mode:* Forces Gemini to return strict JSON `[{ "diagnosis": "...", "is_correct": true, "explanation": "..." }]`.
    *   *Feedback Mode:* Returns a structured "VERDICT" (CORRECT/INCORRECT) followed by clinical reasoning.

## Development Setup

### Automated Setup (Recommended)
Use the included helper script to set up both environments:
```bash
./dev.sh
```

### Manual Setup

#### 1. Backend
```bash
cd backend
# Create Virtual Environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt

# Configure Environment
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY=your_key_here

# Run Server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:3000 (or http://localhost:5173)
```

## API Endpoints Overview
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/data` | List available patient records |
| `POST` | `/api/analyze` | Upload file for AI Analysis |
| `POST` | `/api/chat` | Chat with AI Context |
| `POST` | `/api/recommend-databases` | Get database suggestions |
| `POST` | `/api/data/download` | Download records from PhysioNet |

## Key Conventions
*   **Environment Variables:** Backend secrets (API keys) must be in `backend/.env`.
*   **CORS:** The backend is configured to accept requests from `http://localhost:3000` and `http://localhost:5173`.
*   **Data Caching:** PhysioNet data is cached locally in `backend/data` to minimize network usage.
