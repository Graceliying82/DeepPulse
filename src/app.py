import streamlit as st
import pandas as pd
import numpy as np
from data_loader import download_sample_data, get_available_patients, load_patient_data
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
    st.header("Patient Data")
    
    if st.button("Download Sample Data (PTB-DB)"):
        with st.spinner("Downloading from PhysioNet..."):
            try:
                records = download_sample_data(num_records=5)
                st.success(f"Downloaded {len(records)} records.")
                st.rerun()
            except Exception as e:
                st.error(f"Download failed: {e}")

    patients = get_available_patients()
    
    if not patients:
        st.warning("No data found. Please click 'Download Sample Data'.")
        selected_patient = None
    else:
        selected_patient = st.selectbox("Select Patient Record", patients)

# Main Content
if selected_patient:
    try:
        signals, fields = load_patient_data(selected_patient)
        
        # Display Metadata nicely
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Sampling Rate", f"{fields['fs']} Hz")
        with col2:
            comments = fields.get('comments', [])
            age = "N/A"
            sex = "N/A"
            for c in comments:
                if "age" in c: age = c.split(":")[1].strip()
                if "sex" in c: sex = c.split(":")[1].strip()
            st.metric("Patient Age", age)
            st.metric("Patient Sex", sex)

        with col3:
             # Extract diagnosis from comments if available for "Answer Key" (hidden by default maybe?)
             diagnosis = "Unknown"
             for c in comments:
                 if "clinical diagnosis" in c.lower():
                     diagnosis = c.split(":")[1].strip()
             
             with st.expander("Show Clinical Diagnosis (Answer Key)"):
                 st.info(diagnosis)

        st.subheader("12-Lead ECG Viewer")
        fig = plot_12_lead_ecg(signals, fields)
        st.pyplot(fig)
        
        st.divider()
        
        st.subheader("Diagnosis Challenge")
        col_input, col_ai = st.columns([1, 1])
        
        with col_input:
            user_guess = st.text_area("What is your diagnosis?", placeholder="e.g., Atrial Fibrillation, Myocardial Infarction...")
            analyze_btn = st.button("Consult DeepPulse AI")
            
        with col_ai:
            if analyze_btn and user_guess:
                if not os.path.exists(".streamlit/secrets.toml") and not os.getenv("GOOGLE_API_KEY"):
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
