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
from visualizer import plot_12_lead_ecg, convert_plot_to_image
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
    st.header("Patient Data")
    
    # Configurable Download
    # Calculate current offset based on what we already have
    existing_patients = get_available_patients(data_dir=active_data_dir)
    current_count = len(existing_patients)
    
    num_to_add = st.number_input("Number of New Records to Add", min_value=1, max_value=100, value=50, step=10)
    
    btn_label = "Download Sample Data" if current_count == 0 else f"Download {num_to_add} More (Total: {current_count})"
    
    if st.button(btn_label):
        with st.spinner(f"Downloading {num_to_add} new records (randomly sampled)..."):
            try:
                # Use random_shuffle to get diverse data
                records = download_sample_data(num_records=num_to_add, random_shuffle=True, data_dir=active_data_dir)
                
                if not records:
                    st.warning("No more new records available to download (or all downloaded).")
                else:
                    st.success(f"Successfully added {len(records)} new records!")
                    st.rerun()
            except Exception as e:
                st.error(f"Download failed: {e}")

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
        fig = plot_12_lead_ecg(signals, fields)
        st.pyplot(fig)
        
        st.divider()
        
        st.subheader("Diagnosis Challenge")
        col_input, col_ai = st.columns([1, 1])
        
        common_diagnoses = [
            "Select a diagnosis...",
            "Normal Sinus Rhythm",
            "Atrial Fibrillation",
            "Atrial Flutter",
            "Ventricular Fibrillation",
            "Ventricular Tachycardia",
            "Myocardial Infarction",
            "Bundle Branch Block",
            "Sinus Bradycardia",
            "Sinus Tachycardia"
        ]
        
        with col_input:
            user_guess = st.selectbox("What is your diagnosis?", common_diagnoses)
            analyze_btn = st.button("Consult DeepPulse AI")
            
        with col_ai:
            if analyze_btn:
                if user_guess == "Select a diagnosis...":
                    st.warning("Please select a diagnosis first.")
                elif not os.path.exists(".streamlit/secrets.toml") and not os.getenv("GOOGLE_API_KEY"):
                    st.error("Please set up your .streamlit/secrets.toml with GOOGLE_API_KEY first.")
                else:
                    with st.spinner("DeepPulse AI is analyzing the waveform..."):
                        # Convert plot to image for AI
                        img_buf = convert_plot_to_image(fig)
                        
                        # Gather metadata for context
                        meta_str = f"Age: {age}, Sex: {sex}"
                        
                        response = analyze_ecg(img_buf, user_guess, patient_metadata=meta_str)
                        st.markdown(response)

    except Exception as e:
        st.error(f"Error loading record: {e}")
else:
    st.info("👈 Please download sample data and select a patient to begin.")
