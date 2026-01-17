"""
DeepPulse - AI Agent Module
Author: Grace Li
Date: 2026
Description: Handles interaction with Google Gemini 3 API for ECG analysis and interpretation.
"""
import google.generativeai as genai
import os
import streamlit as st
from PIL import Image

def configure_genai():
    """Configures the Gemini API using streamlit secrets or env variables."""
    api_key = None
    
    # Check Streamlit secrets
    try:
        api_key = st.secrets["GOOGLE_API_KEY"]
    except FileNotFoundError:
        pass
    except KeyError:
        pass
        
    # Check Environment Variable
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY")
        
    if not api_key:
        return False, "API Key not found. Please add GOOGLE_API_KEY to .streamlit/secrets.toml"
        
    genai.configure(api_key=api_key)
    return True, "Success"

def analyze_ecg(image_bytes, user_guess, patient_metadata=None):
    """
    Sends the ECG image and user guess to Gemini Pro Vision (or 1.5 Pro) for analysis.
    """
    
    success, msg = configure_genai()
    if not success:
        return f"Error: {msg}"
    
    # Use gemini-3-flash-preview as requested by user
    model = genai.GenerativeModel('gemini-3-flash-preview')
    
    img = Image.open(image_bytes)
    
    prompt = f"""
    You are an expert cardiologist AI assistant.
    
    I have an ECG recording from a patient.
    Patient Metadata: {patient_metadata if patient_metadata else 'None provided'}
    
    The user (a student or practitioner) has analyzed this ECG and guessed the diagnosis is: "{user_guess}"
    
    Please perform the following:
    1. Analyze the visual features of the standard 12-lead ECG provided in the image.
    2. detailed findings on Rhythm, Rate, Axis, Hypertrophy, Ischemia/Infarction.
    3. Evaluate if the user's guess ("{user_guess}") is likely correct or incorrect based on the visual evidence.
    4. Provide your own primary diagnosis and differential diagnosis.
    5. Be concise, educational, and supportive.
    
    Disclaimer: This is for educational purposes only and not for clinical diagnosis.
    """
    
    try:
        response = model.generate_content([prompt, img])
        return response.text
    except Exception as e:
        return f"AI Analysis Failed: {str(e)}"
