"""
DeepPulse - AI-Powered ECG Analysis Platform
Author: Grace Li
Date: 2026
Description: Main Streamlit application entry point. Handles UI layout, patient selection, and interaction flow.
"""
import streamlit as st
import pandas as pd
import numpy as np
from data_loader import download_sample_data, get_available_patients, load_patient_data, clean_data_directory, DEFAULT_DATA_DIR
from visualizer import plot_generic_signals, convert_plot_to_image
from ai_agent import analyze_signal
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress verbose matplotlib font_manager logs
logging.getLogger('matplotlib.font_manager').setLevel(logging.ERROR)

# "Human Readable" Constants for Emojis
# "Human Readable" Constants for Emojis
HEART_ICON = ":heart:" 
WARNING_ICON = ":warning:"
KEY_ICON = ":key:"
TRASH_ICON = ":wastebasket:"
SEARCH_ICON = ":mag:"
BULB_ICON = ":bulb:"
POINTER_RIGHT_ICON = ":point_right:"
POINTER_LEFT_ICON = ":point_left:"
ROCKET_ICON = ":rocket:"
QUESTION_ICON = ":question:"

st.set_page_config(page_title="DeepPulse", page_icon=HEART_ICON, layout="wide")

# Custom CSS for "Premium" feel
st.markdown("""
<style>
    .reportview-container {
        background: #0e1117;
    }
    .main {
        background: #0e1117;
        color: #fafafa;
    }
    h1 {
        font-family: 'Helvetica Neue', sans-serif;
        font-weight: 700;
        color: #FF4B4B;
    }
    .stButton>button {
        color: white;
        background-color: #FF4B4B;
        border-radius: 8px;
        border: none;
        padding: 10px 24px;
        font-weight: 600;
    }
    .stSelectbox {
        color: white;
    }
</style>
""", unsafe_allow_html=True)

st.title(f"{HEART_ICON} DeepPulse: Physiological Explorer")
st.markdown("### AI-Powered Multi-Signal Analysis Platform")

# Sidebar
with st.sidebar:
    st.header("Settings")
    
    # Initialize active data directory from session state (needed for download/list logic)
    active_data_dir = st.session_state.get('custom_data_path', None)
    if active_data_dir == '': active_data_dir = None
    if not active_data_dir:
        logging.info("Using default data directory for initialization.")
    else:
        logging.info(f"Using custom data directory: {active_data_dir}")
    
    # Check if system key exists
    has_system_key = False

    # Try to read key from secrets and environment variables first
    try:
        if st.secrets.get("GOOGLE_API_KEY"): has_system_key = True
    except (FileNotFoundError, KeyError):
        logging.info("No system API key found from secrets. Trying environment variable.")

    if os.getenv("GOOGLE_API_KEY"): has_system_key = True

    if not has_system_key:
        st.warning(f"{WARNING_ICON} Demo Mode: No system API key found.")
        user_key = st.text_input(f"{KEY_ICON} Enter Google API Key", type="password", help="Get a free key at https://aistudio.google.com/")
        if user_key:
            st.session_state['USER_GOOGLE_API_KEY'] = user_key
            st.success("Key saved!")
    
    st.divider()
    
    # --- NEW: Domain Selector ---
    st.header("Signal Domain")
    signal_type = st.selectbox(
        "Select Analysis Mode",
        ["Cardiac", "Neuro", "Hemodynamic", "Respiration", "Motion", "General"],
        index=0,
        help="Selects the AI specialist persona and visualization template."
    )
    st.caption(f"Activating {signal_type} Analysis Protocols...")
    


    st.divider()
    st.header("Database & Downloads")
    
    # 1. Ask AI for Recommendation
    st.markdown("#### 1. Find Data")
    
    # Dynamic Suggestions based on domain
    suggestions = {
        "Cardiac": ["Atrial Fibrillation", "Myocardial Infarction", "Heart Failure", "PVC"],
        "Neuro": ["Epilepsy", "Sleep Stages", "Motor Imagery", "Seizure"],
        "Hemodynamic": ["Hypertension", "ICU Monitoring", "Blood Pressure"],
        "Respiration": ["Sleep Apnea", "COPD", "Breath Rate"],
        "Motion": ["Gait Analysis", "Parkinson's", "Tremor"],
        "General": ["Physiological Stress", "Polygraph"]
    }
    
    topic_list = suggestions.get(signal_type, [])
    st.info(f"Welcome to the {signal_type} Workspace. Try searching for topics like:")
    st.markdown(f"_{', '.join(topic_list)}_")
    
    user_interest = st.text_input("I am interested in...", placeholder=f"e.g. {topic_list[0] if topic_list else 'Data'}")
    
    if st.button(f"{SEARCH_ICON} Ask AI for Databases"):
        if not user_interest:
            st.warning("Please enter a topic first.")
        else:
            with st.spinner(f"Consulting {signal_type} Expert..."):
                from ai_agent import recommend_databases
                # Append context to search
                search_query = f"{signal_type} data: {user_interest}"
                recs = recommend_databases(search_query)
                st.session_state['db_recommendations'] = recs
    
    # 2. Select Database
    recs = st.session_state.get('db_recommendations', [])
    
    # Standard defaults based on type
    if signal_type == "Cardiac":
        default_db = {'name': 'PTB Diagnostic ECG Database', 'slug': 'ptbdb', 'description': 'Standard 12-lead ECGs'}
    elif signal_type == "Neuro":
        default_db = {'name': 'EEG Motor Movement/Imagery Dataset', 'slug': 'eegmmidb', 'description': 'Standard EEG clips'}
    elif signal_type == "Motion":
        default_db = {'name': 'Gait in Neurodegenerative Disease', 'slug': 'gaitndd', 'description': 'Force platform data'}
    else:
        default_db = {'name': 'Fantasia Database', 'slug': 'fantasia', 'description': 'ECG and Respiration'}
    
    # Flatten options for selectbox
    db_options = [default_db] + [r for r in recs if r['slug'] != 'error']
    
    def format_db_func(db):
        return f"{db['name']} ({db['slug']})"
        
    selected_db_obj = st.selectbox("Select Database", db_options, format_func=format_db_func)
    selected_slug = selected_db_obj['slug']
    
    if recs and selected_db_obj in recs:
        st.caption(f"{BULB_ICON} {selected_db_obj['description']}")

    # 3. Download
    st.markdown("#### 2. Download Data")
    
    # Calculate current offset based on what we already have for this specific download
    # (Note: mixing DBs in one folder is okay if names are unique, but ideal to separate. 
    # For now, we dump all in same data dir or user custom dir)
    existing_patients = get_available_patients(data_dir=active_data_dir)
    current_count = len(existing_patients)
    
    num_to_add = st.number_input("Count", min_value=1, max_value=100, value=10, step=10)
    
    if st.button(f"Download {num_to_add} Samples"):
        with st.spinner(f"Downloading from {selected_slug}..."):
            try:
                # Use random_shuffle to get diverse data name
                records = download_sample_data(db_slug=selected_slug, num_records=num_to_add, random_shuffle=True, data_dir=active_data_dir)
                
                if not records:
                    st.warning("No records found or download failed.")
                else:
                    st.success(f"Added {len(records)} records from {selected_slug}!")
                    st.rerun()
            except Exception as e:
                st.error(f"Download failed: {e}")
    
    if current_count > 0:
        st.markdown(f"*Total Local Patients: {current_count}*")

    patients = existing_patients # reuse the list we fetched
    
    if not patients:
        st.warning("No data found. Please download sample data or provide a valid custom path.")
        selected_patient = None
    else:
        selected_patient = st.selectbox("Select Patient Record", patients)

    st.divider()
    st.header("Data Settings")
    
    # Custom Data Path
    custom_path = st.text_input("Custom Data Directory (Optional)", 
                              value=st.session_state.get('custom_data_path', ''),
                              placeholder="e.g. /Users/name/my_ecg_data")
    
    if custom_path:
        st.session_state['custom_data_path'] = custom_path
        active_data_dir = custom_path
        logging.info(f"Using custom data: {custom_path}")
    else:
        active_data_dir = None # Use default
        logging.info(f"Using default data directory: {DEFAULT_DATA_DIR}")
    
    # Data Management
    with st.popover(f"{TRASH_ICON} Clear All Downloaded Data"):
        st.write("Are you sure you want to clear all downloaded data?")
        if st.button("Yes, delete everything", type="primary"):
            clean_data_directory(data_dir=active_data_dir)
            st.success("Data directory cleared.")
            st.rerun()

# Main Content
if selected_patient:
    try:
        signals, fields = load_patient_data(selected_patient, data_dir=active_data_dir)
        
        # Display Metadata nicely
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Sampling Rate", f"{fields['fs']} Hz")
        with col2:
            comments = fields.get('comments', [])
            age = "N/A"
            sex = "N/A"
            for c in comments:
                if c.lower().startswith("age:"): age = c.split(":")[1].strip()
                if c.lower().startswith("sex:"): sex = c.split(":")[1].strip()
            st.metric("Patient Age", age)
            st.metric("Patient Sex", sex)

        with col3:
             # Extract diagnosis from comments if available for "Answer Key"
             # PTBDB often has "clinical diagnosis: X" or "reason for admission: Y"
             diagnosis = "Unknown"
             full_history = []
             for c in comments:
                 full_history.append(c)
                 if "clinical diagnosis" in c.lower():
                     diagnosis = c.split(":")[1].strip()
                 elif "reason for admission" in c.lower() and diagnosis == "Unknown":
                     diagnosis = c.split(":")[1].strip()
             
             
             with st.expander("Show Clinical Diagnosis (Answer Key)"):
                 st.subheader("Primary Diagnosis")
                 st.info(diagnosis)
                 st.divider()
                 st.write("Full Clinical Notes:")
                 for note in full_history:
                     st.caption(f"- {note}")

        st.subheader(f"{signal_type} Signal Viewer")
        
        # --- NEW: Use Generic Plotter ---
        fig = plot_generic_signals(signals, fields, signal_type=signal_type)
        st.pyplot(fig)
        
        st.divider()
        
        st.subheader("Diagnosis Challenge / Analysis")
        col_input, col_ai = st.columns([1, 1])
        
        with col_input:
            user_notes = st.text_input("Add your hints or observations (Optional)", placeholder="e.g. Looks like ST elevation in V2...")
            
            col_hint, col_quiz, col_full = st.columns(3)
            with col_hint:
                hint_btn = st.button(f"{BULB_ICON} Get Hints")
            with col_quiz:
                quiz_btn = st.button(f"{QUESTION_ICON} More Hints")
            with col_full:
                analyze_btn = st.button(f"{ROCKET_ICON} Full Analysis")
            
        with col_ai:
                api_ready = False
                try:
                    if st.secrets.get("GOOGLE_API_KEY"): api_ready = True
                except: pass
                if os.getenv("GOOGLE_API_KEY"): api_ready = True
                if st.session_state.get("USER_GOOGLE_API_KEY"): api_ready = True

                if not api_ready:
                    st.error("Please enter your Google API Key in the sidebar to use AI features.")
                else:
                    # Determine intent
                    if quiz_btn:
                        st.session_state['active_mode'] = 'quiz'
                        # Clear specific quiz options to force regeneration only if desired, 
                        # but user might just want to see the quiz. 
                        # Let's assume hitting the button means "New Quiz"
                        if 'quiz_options' in st.session_state:
                            del st.session_state['quiz_options']
                    elif hint_btn:
                        st.session_state['active_mode'] = 'hints'
                    elif analyze_btn:
                        st.session_state['active_mode'] = 'full'
                    
                    # NOTE: We can't rely solely on buttons because clicking a quiz answer re-runs script
                    # and the 'quiz_btn' is no longer True. We need persistence.
                    active_mode = st.session_state.get('active_mode', None)

                    # Prepare Data
                    img_buf = convert_plot_to_image(fig)
                    meta_str = f"Age: {age}, Sex: {sex}"

                    if active_mode == "quiz":
                        st.subheader("Select the most likely conclusion:")
                        
                        # Generate or retrieve options
                        if 'quiz_options' not in st.session_state:
                            with st.spinner("Generating quiz options..."):
                                # --- NEW: Pass signal_type ---
                                response = analyze_signal(img_buf, user_notes=user_notes, patient_metadata=meta_str, mode="quiz", signal_type=signal_type)
                                if isinstance(response, dict) and "error" in response:
                                    st.warning(response['message'])
                                    st.session_state['quiz_options'] = []
                                elif isinstance(response, list):
                                    import random
                                    random.shuffle(response)
                                    st.session_state['quiz_options'] = response
                                else:
                                    st.error(f"Failed to generate quiz: {response}")
                                    st.session_state['quiz_options'] = []
                        
                        # Render Options
                        options = st.session_state.get('quiz_options', [])
                        for item in options:
                            with st.container():
                                if st.button(f"{POINTER_RIGHT_ICON} {item['diagnosis']}", key=f"quiz_btn_{item['diagnosis']}"):
                                    # Feedback
                                    if item['is_correct']:
                                        st.balloons()
                                        st.success(f"**Correct!** {item['explanation']}")
                                    else:
                                        st.error(f"**Incorrect.** {item['explanation']}")
                                    
                                    # Trigger Full Analysis
                                    st.markdown("---")
                                    st.subheader(f"{ROCKET_ICON} Detailed Analysis")
                                    with st.spinner("Analyzing details..."):
                                        notes_context = f"User selected '{item['diagnosis']}' in quiz mode. User notes: {user_notes}"
                                        # --- NEW: Pass signal_type ---
                                        full_analysis = analyze_signal(img_buf, user_notes=notes_context, patient_metadata=meta_str, mode="full", signal_type=signal_type)
                                        st.markdown(full_analysis)

                    elif active_mode in ["hints", "full"]:
                        # Standard single-shot analysis
                        label = "Providing hints..." if active_mode == "hints" else f"DeepPulse AI ({signal_type} Specialist) is analyzing..."
                        with st.spinner(label):
                             # --- NEW: Pass signal_type ---
                             response = analyze_signal(img_buf, user_notes=user_notes, patient_metadata=meta_str, mode=active_mode, signal_type=signal_type)
                             st.markdown(response)

    except Exception as e:
        if "sampto must be greater than sampfrom" in str(e):
            st.error(f"{WARNING_ICON} Error: This record appears to be corrupted or empty. It may have failed to download completely.")
            st.info("Try deleting the data using the 'Clear All Data' button in the sidebar and downloading again.")
        else:
            st.error(f"Error loading record: {e}")
else:
    st.info(f"{POINTER_LEFT_ICON} Please download sample data and select a patient to begin.")
