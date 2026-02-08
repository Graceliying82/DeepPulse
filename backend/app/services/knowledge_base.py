"""
DeepPulse Knowledge Base
========================
Structured knowledge about DeepPulse features, databases, and capabilities.
Used by the AI assistant to provide accurate, grounded responses.

This module implements a RAG-lite approach where all knowledge is embedded
in code, avoiding hallucinations by constraining AI responses to documented facts.
"""

# =============================================================================
# CORE APPLICATION KNOWLEDGE
# =============================================================================

DEEPPULSE_KNOWLEDGE = {
    "app_overview": {
        "name": "DeepPulse",
        "tagline": "Medical Signal Visualization & AI-Assisted Learning",
        "purpose": "DeepPulse helps medical students, researchers, and clinicians explore physiological signals from PhysioNet databases with AI-powered educational tools.",
        "key_features": [
            "Browse and visualize ECG, EEG, and other physiological signals",
            "AI-powered signal analysis with educational modes (Hints, Quiz, Advanced)",
            "Download real patient data from PhysioNet databases",
            "Generate AI-formatted clinical notes",
            "Interactive learning for medical signal interpretation"
        ]
    },

    # =========================================================================
    # SIGNAL CATEGORIES
    # =========================================================================
    "categories": {
        "cardiac": {
            "display_name": "Cardiac Electrical Signals",
            "description": "Electrocardiogram (ECG/EKG) recordings showing heart electrical activity",
            "signal_type": "ECG",
            "typical_channels": ["Lead I", "Lead II", "Lead III", "aVR", "aVL", "aVF", "V1-V6"],
            "sampling_rates": "250-500 Hz typical",
            "clinical_use": "Detect arrhythmias, ischemia, conduction abnormalities",
            "visualization": "Red ECG paper grid (25mm/s, 10mm/mV standard)",
            "databases": ["mitdb", "ptbdb", "afdb", "iafdb"]
        },
        "neurological": {
            "display_name": "Neurological Signals",
            "description": "Electroencephalogram (EEG) recordings showing brain electrical activity",
            "signal_type": "EEG",
            "typical_channels": ["FP1-F7", "F7-T7", "T7-P7", "P7-O1", "and 19+ electrodes"],
            "sampling_rates": "256 Hz typical",
            "clinical_use": "Detect seizures, sleep disorders, encephalopathy",
            "visualization": "Stacked montage view with anatomical ordering",
            "frequency_bands": {
                "delta": "0.5-4 Hz - Deep sleep, encephalopathy if awake",
                "theta": "4-8 Hz - Drowsiness, focal dysfunction",
                "alpha": "8-13 Hz - Relaxed awake state (posterior)",
                "beta": "13-30 Hz - Alert, anxiety, medications",
                "gamma": "30-100 Hz - Cognitive processing"
            },
            "databases": ["eegmmidb", "chbmit"]
        },
        "hemodynamic": {
            "display_name": "Hemodynamic Signals",
            "description": "Blood pressure and cardiovascular flow measurements",
            "signal_type": "ABP/BP",
            "clinical_use": "Monitor blood pressure, cardiac output",
            "databases": ["mghdb"]
        },
        "respiration": {
            "display_name": "Oxygenation & Respiration",
            "description": "Breathing patterns and oxygen saturation data",
            "signal_type": "Respiratory/SpO2",
            "clinical_use": "Monitor breathing, detect apnea, oxygen levels",
            "databases": ["fantasia"]
        },
        "motion": {
            "display_name": "Mechanical & Motion Data",
            "description": "Movement and gait analysis signals",
            "signal_type": "Accelerometry/Gait",
            "clinical_use": "Analyze walking patterns, movement disorders",
            "databases": ["gaitndd"]
        }
    },

    # =========================================================================
    # PHYSIONET DATABASES
    # =========================================================================
    "databases": {
        "mitdb": {
            "full_name": "MIT-BIH Arrhythmia Database",
            "abbreviation": "mitdb",
            "category": "cardiac",
            "records": 48,
            "description": "Classic ECG database with annotated arrhythmias. Gold standard for arrhythmia detection algorithms.",
            "signal_duration": "30 minutes per record",
            "channels": 2,
            "use_cases": ["Arrhythmia detection", "Beat classification", "Algorithm validation"]
        },
        "ptbdb": {
            "full_name": "PTB Diagnostic ECG Database",
            "abbreviation": "ptbdb",
            "category": "cardiac",
            "records": 549,
            "description": "Large diagnostic ECG database with 15-lead recordings from patients with various cardiac conditions.",
            "channels": 15,
            "use_cases": ["Myocardial infarction detection", "Diagnostic ECG analysis"]
        },
        "afdb": {
            "full_name": "MIT-BIH Atrial Fibrillation Database",
            "abbreviation": "afdb",
            "category": "cardiac",
            "records": 25,
            "description": "Long-term ECG recordings with atrial fibrillation episodes.",
            "signal_duration": "10 hours per record",
            "use_cases": ["AF detection", "Rhythm analysis"]
        },
        "eegmmidb": {
            "full_name": "EEG Motor Movement/Imagery Dataset",
            "abbreviation": "eegmmidb",
            "category": "neurological",
            "records": 109,
            "description": "64-channel EEG recordings during motor movement and imagery tasks. Great for brain-computer interface research.",
            "channels": 64,
            "sampling_rate": "160 Hz",
            "use_cases": ["Motor imagery classification", "BCI development", "Movement-related EEG"]
        },
        "chbmit": {
            "full_name": "CHB-MIT Scalp EEG Database",
            "abbreviation": "chbmit",
            "category": "neurological",
            "records": 23,
            "description": "Pediatric epilepsy EEG recordings with annotated seizures. Essential for seizure detection research.",
            "channels": 23,
            "sampling_rate": "256 Hz",
            "format": "EDF",
            "use_cases": ["Seizure detection", "Epilepsy research", "Pediatric neurology"]
        },
        "fantasia": {
            "full_name": "Fantasia Database",
            "abbreviation": "fantasia",
            "category": "respiration",
            "records": 40,
            "description": "ECG and respiration recordings from healthy subjects watching the movie Fantasia.",
            "use_cases": ["Heart rate variability", "Respiration analysis"]
        },
        "gaitndd": {
            "full_name": "Gait in Neurodegenerative Disease Database",
            "abbreviation": "gaitndd",
            "category": "motion",
            "records": 64,
            "description": "Gait analysis from patients with Parkinson's, Huntington's, and ALS.",
            "use_cases": ["Gait analysis", "Movement disorder detection"]
        }
    },

    # =========================================================================
    # FEATURES & HOW-TO GUIDES
    # =========================================================================
    "features": {
        "signal_viewer": {
            "name": "Signal Viewer",
            "description": "Interactive visualization of physiological signals with medical-standard display",
            "how_to_use": [
                "1. Select a category (Cardiac, Neurological, etc.) from the sidebar",
                "2. Choose a database from the dropdown",
                "3. Select a patient record to load",
                "4. Use Window control to adjust time display (5s, 10s, 20s, 30s)",
                "5. For EEG: Use Zoom control to adjust display speed (15, 30, 60 mm/s)"
            ],
            "ecg_features": [
                "Red ECG paper grid (5mm major boxes, 1mm minor)",
                "Standard 25mm/s paper speed",
                "Multiple lead display with color coding"
            ],
            "eeg_features": [
                "Stacked montage view (each channel in separate row)",
                "Anatomical channel ordering (temporal → parasagittal → midline)",
                "Region color coding (left temporal, right temporal, etc.)",
                "50μV scale bar reference"
            ]
        },
        "learn_mode": {
            "name": "Learn Mode",
            "description": "AI-powered educational tool with three learning approaches",
            "how_to_access": "Click the 'Learn' button (graduation cap icon) when a signal is loaded",
            "modes": {
                "hints": {
                    "name": "Hints Mode",
                    "description": "Get progressive hints about the signal without revealing the diagnosis",
                    "approach": "Socratic method - guides you to discover findings yourself",
                    "best_for": "Building diagnostic reasoning skills"
                },
                "quiz": {
                    "name": "Quiz Mode",
                    "description": "Multiple-choice questions with one correct answer and two distractors",
                    "approach": "Test your knowledge with immediate feedback",
                    "best_for": "Self-assessment and exam preparation"
                },
                "advanced": {
                    "name": "Advanced Mode",
                    "description": "Enter your own diagnosis and get detailed AI feedback",
                    "approach": "Compare your interpretation against AI analysis",
                    "best_for": "Experienced learners validating their interpretations"
                }
            }
        },
        "clinical_notes": {
            "name": "Clinical Notes",
            "description": "AI-powered formatting of clinical observations",
            "how_to_use": [
                "1. Click the 'Notes' button (document icon)",
                "2. Enter your observations in the text area",
                "3. Click 'Format with AI' to structure your notes",
                "4. Review and copy the formatted output"
            ],
            "output_includes": ["Patient metadata", "Signal findings", "Structured observations"]
        },
        "download_modal": {
            "name": "Download Data",
            "description": "Download real patient data from PhysioNet databases",
            "how_to_use": [
                "1. Click the 'Download' button in the workspace",
                "2. Tell the AI what you're interested in (e.g., 'I want to study arrhythmias')",
                "3. Review AI recommendations for relevant databases",
                "4. Select a database and click Download",
                "5. Wait for download to complete, then refresh to see new records"
            ],
            "note": "Downloads real anonymized patient data from PhysioNet - an open medical database"
        }
    },

    # =========================================================================
    # FREQUENTLY ASKED QUESTIONS
    # =========================================================================
    "faq": [
        {
            "question": "How do I get started?",
            "answer": "Start by selecting a signal category (like Cardiac) from the left sidebar. If no data is loaded, click 'Download' to get some PhysioNet databases. Then select a record to visualize."
        },
        {
            "question": "What is PhysioNet?",
            "answer": "PhysioNet is a free online repository of medical research data. DeepPulse connects to PhysioNet to download real, anonymized patient recordings for educational purposes."
        },
        {
            "question": "How do I practice reading ECGs?",
            "answer": "Load a cardiac signal, then click the 'Learn' button. Try Hints mode first - it will guide you through the interpretation without giving away the answer."
        },
        {
            "question": "What do the EEG frequency bands mean?",
            "answer": "EEG signals are analyzed by frequency: Delta (0.5-4Hz) = deep sleep; Theta (4-8Hz) = drowsiness; Alpha (8-13Hz) = relaxed awake; Beta (13-30Hz) = alert/thinking; Gamma (30+Hz) = cognitive processing."
        },
        {
            "question": "Why is my EEG showing as stacked channels?",
            "answer": "This is the standard montage view used by neurologists! Each channel shows the voltage difference between two electrodes. This layout helps identify where abnormalities originate by looking for phase reversals across channels."
        },
        {
            "question": "Can I use this for real patient diagnosis?",
            "answer": "DeepPulse is built for educational and research use with anonymized PhysioNet data. AI-generated analyses should be verified independently before any clinical application."
        },
        {
            "question": "How do I download more data?",
            "answer": "Click the 'Download' button, describe what you're interested in studying, and I'll recommend relevant PhysioNet databases. You can then download them directly."
        }
    ]
}


# =============================================================================
# KNOWLEDGE RETRIEVAL FUNCTIONS
# =============================================================================

def get_relevant_knowledge(user_message: str, signal_context: str = None) -> str:
    """
    Retrieve relevant knowledge based on user query and context.
    Uses keyword matching to find applicable sections.

    Args:
        user_message: The user's current message
        signal_context: Current signal context (e.g., "Cardiac", "Neurological")

    Returns:
        Formatted string of relevant knowledge for AI context
    """
    message_lower = user_message.lower()
    knowledge_parts = []

    # Always include app overview
    overview = DEEPPULSE_KNOWLEDGE["app_overview"]
    knowledge_parts.append(f"**DeepPulse Overview**: {overview['purpose']}")

    # Check for feature-related queries
    feature_keywords = {
        "signal_viewer": ["viewer", "visualization", "display", "show", "see", "look", "waveform", "chart"],
        "learn_mode": ["learn", "practice", "study", "quiz", "hints", "education", "teach", "training"],
        "clinical_notes": ["notes", "documentation", "clinical", "write", "format", "observe"],
        "download_modal": ["download", "get data", "physionet", "database", "install", "add data"]
    }

    for feature_key, keywords in feature_keywords.items():
        if any(kw in message_lower for kw in keywords):
            feature = DEEPPULSE_KNOWLEDGE["features"][feature_key]
            knowledge_parts.append(f"\n**{feature['name']}**: {feature['description']}")
            if "how_to_use" in feature:
                steps = "\n".join(feature["how_to_use"]) if isinstance(feature["how_to_use"], list) else feature["how_to_use"]
                knowledge_parts.append(f"How to use:\n{steps}")

    # Check for category-related queries
    category_keywords = {
        "cardiac": ["cardiac", "ecg", "ekg", "heart", "arrhythmia", "rhythm"],
        "neurological": ["neurological", "eeg", "brain", "seizure", "epilepsy", "neuro"],
        "respiration": ["respiration", "breathing", "oxygen", "spo2", "respiratory"],
        "motion": ["motion", "gait", "walking", "movement", "parkinson"]
    }

    for cat_key, keywords in category_keywords.items():
        if any(kw in message_lower for kw in keywords) or (signal_context and cat_key in signal_context.lower()):
            cat = DEEPPULSE_KNOWLEDGE["categories"].get(cat_key)
            if cat:
                knowledge_parts.append(f"\n**{cat['display_name']}**: {cat['description']}")
                if "frequency_bands" in cat:
                    bands = "\n".join([f"  - {k}: {v}" for k, v in cat["frequency_bands"].items()])
                    knowledge_parts.append(f"Frequency bands:\n{bands}")
                # Add related databases
                db_names = [DEEPPULSE_KNOWLEDGE["databases"][db]["full_name"]
                           for db in cat.get("databases", [])
                           if db in DEEPPULSE_KNOWLEDGE["databases"]]
                if db_names:
                    knowledge_parts.append(f"Available databases: {', '.join(db_names)}")

    # Check for database-specific queries
    if any(kw in message_lower for kw in ["database", "data", "records", "patients", "download"]):
        db_list = []
        for db_key, db in DEEPPULSE_KNOWLEDGE["databases"].items():
            db_list.append(f"  - {db['full_name']} ({db['abbreviation']}): {db['description'][:80]}...")
        knowledge_parts.append(f"\n**Available Databases**:\n" + "\n".join(db_list))

    # Check for FAQ matches
    for faq in DEEPPULSE_KNOWLEDGE["faq"]:
        # Simple keyword matching for FAQ
        q_words = faq["question"].lower().split()
        if any(word in message_lower for word in q_words if len(word) > 3):
            knowledge_parts.append(f"\n**FAQ - {faq['question']}**\n{faq['answer']}")
            break  # Only include one FAQ to avoid overwhelming

    # Add current context info
    if signal_context:
        knowledge_parts.append(f"\n**Current Context**: User is viewing {signal_context} signals")

    return "\n".join(knowledge_parts)


def get_all_databases() -> list:
    """Return list of all available databases with details."""
    return [
        {
            "id": key,
            "name": db["full_name"],
            "category": db["category"],
            "description": db["description"],
            "records": db.get("records", "Unknown")
        }
        for key, db in DEEPPULSE_KNOWLEDGE["databases"].items()
    ]


def get_feature_list() -> list:
    """Return list of all features."""
    return [
        {
            "id": key,
            "name": feature["name"],
            "description": feature["description"]
        }
        for key, feature in DEEPPULSE_KNOWLEDGE["features"].items()
    ]


def generate_suggestions(signal_context: str = None, last_message: str = "") -> list:
    """
    Generate contextual action suggestions based on current state.

    Args:
        signal_context: Current signal context
        last_message: User's last message

    Returns:
        List of suggestion strings (max 3)
    """
    suggestions = []
    message_lower = last_message.lower() if last_message else ""

    # No data loaded
    if not signal_context or "no" in signal_context.lower():
        suggestions.append("📂 How do I load data?")
        suggestions.append("🔍 What databases are available?")
        suggestions.append("🎯 Help me get started")

    # Cardiac context
    elif "cardiac" in signal_context.lower():
        suggestions.append("🎓 How do I practice ECG reading?")
        suggestions.append("💓 Explain the ECG grid")
        suggestions.append("📝 How do I use Clinical Notes?")

    # Neurological context
    elif "neurological" in signal_context.lower():
        suggestions.append("🧠 What do the frequency bands mean?")
        suggestions.append("🎓 Try Learn mode for EEG practice")
        suggestions.append("📊 Why are channels stacked?")

    # Generic suggestions
    else:
        suggestions.append("❓ What can you help me with?")
        suggestions.append("📚 Show me the features")
        suggestions.append("🔬 Tell me about the databases")

    # Topic-specific additions based on message
    if "arrhythmia" in message_lower:
        suggestions.insert(0, "📥 Download MIT-BIH Arrhythmia Database")
    elif "seizure" in message_lower or "epilepsy" in message_lower:
        suggestions.insert(0, "📥 Download CHB-MIT Epilepsy Database")

    return suggestions[:3]  # Max 3 suggestions
