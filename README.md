# 🫀 DeepPulse

**DeepPulse** is an advanced educational platform designed to democratize access to expert-level ECG interpretation. By combining medical signal processing with the reasoning capabilities of the Google Gemini 3 AI, DeepPulse acts as an interactive tutor for medical students and cardiology enthusiasts.

## 🌟 Mission
Electrocardiograms (ECGs) are the standard for diagnosing cardiac anomalies but are notoriously difficult to master. DeepPulse aims to bridge the gap between raw data and clinical understanding by providing:
1.  **High-fidelity visualization** of 12-lead ECGs.
2.  **AI-driven analysis** that mimics a cardiologist's reasoning.
3.  **Interactive learning modes** including Socratic hints and diagnostic quizzes.

## 📚 Data Sources
DeepPulse integrates directly with **PhysioNet**, the world's largest archive of open-source physiologic data.
- **Library**: Uses the `wfdb` (Waveform Database) Python package to fetch real patient data.
- **Databases**: Validated with:
    - **PTB Diagnostic ECG Database (`ptbdb`)**: High-quality 12-lead recordings with validated clinical diagnoses.
    - **MIT-BIH Arrhythmia Database (`mitdb`)**.
    - And many others available via the "Ask AI" search feature.

## 🏗️ Architecture
The application is built on a modern Python stack:

### Frontend & UI
- **Streamlit**: Powers the interactive web interface, allowing for real-time data selection and visualization.
- **Matplotlib**: Renders clinically accurate 12-lead ECG plots with standard grid calibration.

### AI & Logic
- **Google Gemini 3 Flash**: The reasoning engine. We use the latest `google-genai` SDK to send visual ECG data (converted to images) and patient metadata to the multimodal model.
- **Agentic Workflow**:
    - **Full Mode**: Comprehensive clinical report.
    - **Hints Mode**: Educational, Socratic guidance without revealing the answer.
    - **Quiz Mode**: Generates multiple-choice questions based on the waveform, complete with explainable AI feedback.

### Key Modules
- `src/app.py`: Main application entry point and UI logic.
- `src/ai_agent.py`: Handles communication with the Gemini API, prompt engineering, and error handling (including rate limit protection).
- `src/data_loader.py`: Manages `wfdb` downloads and local caching to ensure data persistence.
- `src/visualizer.py`: Custom plotting logic to match standard ECG paper aesthetics.

## 🚀 Installation & Usage

### Prerequisites
- Python 3.10+
- A Google Cloud API Key for Gemini.

### Setup
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/DeepPulse.git
    cd DeepPulse
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure API Key**:
    Create a file at `.streamlit/secrets.toml`:
    ```toml
    GOOGLE_API_KEY = "your_api_key_here"
    ```
    *(Alternatively, set `GOOGLE_API_KEY` as an environment variable)*

### Running the App
```bash
streamlit run src/app.py
```

## ✨ Key Features
- **Dynamic Data Loading**: Download specific numbers of records from any PhysioNet database.
- **AI Tutor**: Switch between "Full Analysis" and "Hints Only" to test your own skills.
- **Interactive Quiz**: Challenge yourself—click "More Hints" to generate a diagnosis quiz.
- **Privacy & Safety**: Data is stored locally. AI analysis is performed statelessly.

---
*Disclaimer: DeepPulse is for educational purposes only and is not a medical device. Always consult a qualified professional for clinical diagnosis.*
