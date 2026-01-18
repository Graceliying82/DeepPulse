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
from visualizer import plot_ecg_signals, convert_plot_to_image
from ai_agent import analyze_ecg
import os

st.set_page_config(page_title="DeepPulse", page_icon="🫀", layout="wide")

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

st.title("🫀 DeepPulse: AI ECG Assistant")
st.markdown("### 12-Lead ECG Analysis & Educational Platform")

# Sidebar
with st.sidebar:
    st.header("Data Settings")
    
    # Custom Data Path
    custom_path = st.text_input("Custom Data Directory (Optional)", 
                              value=st.session_state.get('custom_data_path', ''),
                              placeholder="e.g. /Users/name/my_ecg_data")
    
    if custom_path:
        st.session_state['custom_data_path'] = custom_path
        active_data_dir = custom_path
        st.info(f"Using custom data: {custom_path}")
    else:
        active_data_dir = None # Use default
    
    # Data Management
    if st.button("🗑️ Clear All Downloaded Data"):
        clean_data_directory(data_dir=active_data_dir)
        st.success("Data directory cleared.")
        st.rerun()

    st.divider()
    st.header("Database & Downloads")
    
    # 1. Ask AI for Recommendation
    st.markdown("#### 1. Find Data")
    user_interest = st.text_input("I am interested in...", placeholder="e.g. Tachycardia, Ablation, Atrial Fibrillation")
    
    if st.button("🔍 Ask AI for Databases"):
        if not user_interest:
            st.warning("Please enter a topic first.")
        else:
            with st.spinner("Consulting PhysioNet Expert..."):
                from ai_agent import recommend_databases
                recs = recommend_databases(user_interest)
                st.session_state['db_recommendations'] = recs
    
    # 2. Select Database
    recs = st.session_state.get('db_recommendations', [])
    
    # Standard choice if no AI results yet
    default_db = {'name': 'PTB Diagnostic ECG Database', 'slug': 'ptbdb', 'description': 'Standard 12-lead ECGs'}
    
    # Flatten options for selectbox
    db_options = [default_db] + [r for r in recs if r['slug'] != 'error']
    
    def format_db_func(db):
        return f"{db['name']} ({db['slug']})"
        
    selected_db_obj = st.selectbox("Select Database", db_options, format_func=format_db_func)
    selected_slug = selected_db_obj['slug']
    
    if recs and selected_db_obj in recs:
        st.caption(f"💡 {selected_db_obj['description']}")

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

        st.subheader("12-Lead ECG Viewer")
        fig = plot_ecg_signals(signals, fields)
        st.pyplot(fig, use_container_width=True)
        
        st.divider()
        
        st.subheader("Diagnosis Challenge / Analysis")
        col_input, col_ai = st.columns([1, 1])
        
        with col_input:
            user_notes = st.text_input("Add your hints or observations (Optional)", placeholder="e.g. Looks like ST elevation in V2...")
            
            col_hint, col_quiz, col_full = st.columns(3)
            with col_hint:
                hint_btn = st.button("💡 Get Hints")
            with col_quiz:
                quiz_btn = st.button("❓ More Hints")
            with col_full:
                analyze_btn = st.button("🚀 Full Analysis")
            
        with col_ai:
                if not os.path.exists(".streamlit/secrets.toml") and not os.getenv("GOOGLE_API_KEY"):
                    st.error("Please set up your .streamlit/secrets.toml with GOOGLE_API_KEY first.")
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
                        st.subheader("Select the most likely diagnosis:")
                        
                        # Generate or retrieve options
                        if 'quiz_options' not in st.session_state:
                            with st.spinner("Generating quiz options..."):
                                response = analyze_ecg(img_buf, user_notes=user_notes, patient_metadata=meta_str, mode="quiz")
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
                            # Use a container for visual grouping
                            with st.container():
                                # Unique key required for buttons in loop
                                if st.button(f"👉 {item['diagnosis']}", key=f"quiz_btn_{item['diagnosis']}"):
                                    # 1. Feedback
                                    if item['is_correct']:
                                        st.balloons()
                                        st.success(f"**Correct!** {item['explanation']}")
                                    else:
                                        st.error(f"**Incorrect.** {item['explanation']}")
                                    
                                    # 2. Trigger Full Analysis automatically
                                    st.markdown("---")
                                    st.subheader(f"🚀 Detailed Analysis for *{item['diagnosis']}*")
                                    with st.spinner("Analyzing details..."):
                                        # Pass the user's choice as the 'note'
                                        notes_context = f"User selected '{item['diagnosis']}' in quiz mode. User notes: {user_notes}"
                                        full_analysis = analyze_ecg(img_buf, user_notes=notes_context, patient_metadata=meta_str, mode="full")
                                        st.markdown(full_analysis)

                    elif active_mode in ["hints", "full"]:
                        # Standard single-shot analysis
                        label = "Providing hints..." if active_mode == "hints" else "DeepPulse AI is analyzing the waveform..."
                        with st.spinner(label):
                             response = analyze_ecg(img_buf, user_notes=user_notes, patient_metadata=meta_str, mode=active_mode)
                             st.markdown(response)

    except Exception as e:
        st.error(f"Error loading record: {e}")
else:
    st.info("👈 Please download sample data and select a patient to begin.")
