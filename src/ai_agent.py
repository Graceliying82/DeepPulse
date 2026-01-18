"""
DeepPulse - AI Agent Module
Author: Grace Li
Date: 2026
Description: Handles interaction with Google Gemini 3 API for ECG analysis and interpretation.
"""
from google import genai
from google.genai import types
import os
import streamlit as st
from PIL import Image

def get_genai_client():
    """Configures and returns the Gemini API Client."""
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

    # Check User Session State (Public Demo Mode)
    if not api_key:
        api_key = st.session_state.get("USER_GOOGLE_API_KEY")
        
    if not api_key:
        return None, "API Key missing. Please set it in secrets or enter it in the sidebar."
        
    try:
        client = genai.Client(api_key=api_key)
        return client, "Success"
    except Exception as e:
        return None, f"Configuration Error: {str(e)}"

def analyze_ecg(image_bytes, user_notes=None, patient_metadata=None, mode="full"):
    """
    Sends the ECG image and optional user notes to Gemini 3 for analysis.
    mode: "full" (default) for complete diagnosis, "hints" for educational guidance.
    """
    
    client, msg = get_genai_client()
    if not client:
        return f"Error: {msg}"
    
    img = Image.open(image_bytes)
    
    notes_segment = f'The user has provided the following observations/hints: "{user_notes}"' if user_notes else "The user has provided no specific observations."
    
    if mode == "hints":
        instruction_segment = """
        The user is a student who is unsure where to start. 
        Please provide **HINTS ONLY**.
        1. Point out 3 specific visual features in the ECG that are abnormal or noteworthy (e.g., "Look closely at the PR interval in Lead II").
        2. Ask a guiding question to help the user figure out the diagnosis.
        3. **DO NOT** state the final diagnosis or conclusion. Keep it open-ended.
        """
    elif mode == "quiz":
        instruction_segment = """
        The user wants to test their knowledge with a multiple-choice quiz.
        Please provide exactly 3 potential diagnoses:
        - 1 must be the Correct diagnosis.
        - 2 must be plausible Distractors (incorrect but tricky).
        
        Return the response as a **VALID JSON ARRAY** of objects. Each object must have:
        - "diagnosis": (string) The name of the condition.
        - "is_correct": (boolean) true if correct, false otherwise.
        - "explanation": (string) A short explanation of why it fits or why it doesn't (don't reveal "this is correct" in the text, just explain the features).
        
        Do NOT wrap the JSON in markdown code blocks. Just return the raw JSON string.
        """
    else:
        instruction_segment = """
        Please perform the full clinical analysis:
        1. Analyze the visual features of the standard 12-lead ECG provided in the image.
        2. detailed findings on Rhythm, Rate, Axis, Hypertrophy, Ischemia/Infarction.
        3. Provide your primary diagnosis and differential diagnosis.
        4. Address any observations mentioned by the user if relevant.
        5. Be concise, educational, and supportive.
        """
    
    prompt = f"""
    You are an expert cardiologist AI assistant.
    
    I have an ECG recording from a patient.
    Patient Metadata: {patient_metadata if patient_metadata else 'None provided'}
    
    {notes_segment}
    
    {instruction_segment}
    
    Disclaimer: This is for educational purposes only and not for clinical diagnosis.
    """
    

    try:
        # New SDK usage
        response = client.models.generate_content(
            model='gemini-3-flash-preview', 
            contents=[prompt, img]
        )
        
        if mode == "quiz":
            import json
            text = response.text.strip()
            # Clean potential markdown
            if text.startswith("```json"): text = text[7:]
            if text.startswith("```"): text = text[3:]
            if text.endswith("```"): text = text[:-3]
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"error": "json_error", "message": "Failed to parse AI quiz response."}

        return response.text
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
            msg = "⚠️ AI Daily Quota Exceeded. You have used up your free tier requests for today. Please try again tomorrow or upgrade your plan."
            if mode == "quiz":
                return {"error": "quota_exceeded", "message": msg}
            return msg
        return f"AI Analysis Failed: {err_str}"

def recommend_databases(user_interest):
    """
    Asks Gemini to recommend 3 PhysioNet databases based on the user's interest.
    Returns a list of dicts: {'name': str, 'slug': str, 'description': str}
    """
    client, msg = get_genai_client()
    if not client:
        return [{"name": "Error", "slug": "error", "description": msg}]
        
    prompt = f"""
    You are an expert on PhysioNet databases. The user is interested in: "{user_interest}".
    
    Please recommend exactly 3 open-access PhysioNet databases that are most relevant to this interest.
    For each database, provide:
    1. The Full Name
    2. The Short Slug (used for wfdb, e.g., 'mitdb', 'ptbdb', 'iafdb', 'cudb')
    3. A 1-sentence description of why it fits.
    
    Return the response as a valid JSON array of objects with keys: "name", "slug", "description".
    Do not wrap the JSON in markdown code blocks. Just return the raw JSON string.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-3-flash-preview',
            contents=prompt
        )
        import json
        text = response.text.strip()
        # Clean potential markdown
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        
        return json.loads(text)
    except Exception as e:
        return [{"name": "Error", "slug": "error", "description": f"AI Recommendation failed: {e}"}]
