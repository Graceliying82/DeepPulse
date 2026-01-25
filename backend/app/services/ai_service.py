from google import genai
from PIL import Image
import os
import logging
import time
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def call_genai_with_retry(client, model, contents, retries=3, delay=2):
    for attempt in range(retries):
        try:
            response = client.models.generate_content(model=model, contents=contents)
            return response
        except Exception as e:
            err_str = str(e)
            if "503" in err_str or "Overloaded" in err_str or "UNAVAILABLE" in err_str:
                if attempt < retries - 1:
                    time.sleep(delay * (attempt + 1))
                    continue
            raise e

def get_genai_client(api_key=None):
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY")
    
    if not api_key:
        return None, "API Key missing."
        
    try:
        client = genai.Client(api_key=api_key)
        return client, "Success"
    except Exception as e:
        return None, f"Configuration Error: {str(e)}"

def analyze_signal(image_bytes, user_notes=None, patient_metadata=None, mode="full", signal_type="Cardiac", api_key=None):
    client, msg = get_genai_client(api_key)
    if not client:
        return {"error": "config_error", "message": msg}
    
    try:
        img = Image.open(image_bytes)
    except Exception as e:
        return {"error": "image_error", "message": f"Invalid image: {e}"}
    
    notes_segment = f'User observations: "{user_notes}"' if user_notes else "No specific observations."
    
    personas = {
        "Cardiac": "expert cardiologist",
        "Neuro": "expert neurologist",
        "Hemodynamic": "critical care specialist",
        "Respiration": "pulmonologist",
        "Motion": "biomechanist",
        "General": "physiological data scientist"
    }
    expert_persona = personas.get(signal_type, personas["General"])
    
    instruction_segment = ""
    if mode == "hints":
        instruction_segment = f"Provide 3 HINTS only for this {signal_type} signal. Do not reveal diagnosis."
    elif mode == "quiz":
        instruction_segment = """
        Provide exactly 3 potential conclusions: 1 Correct, 2 Distractors.
        Return raw JSON array: [{"diagnosis": "...", "is_correct": bool, "explanation": "..."}]
        """
    else:
        instruction_segment = f"Perform full clinical analysis of this {signal_type} signal. Include rhythm, morphology, and conclusion."
    
    prompt = f"""
    You are an {expert_persona}.
    Patient Metadata: {patient_metadata or 'None'}
    {notes_segment}
    {instruction_segment}
    Disclaimer: Educational purposes only.
    """

    try:
        response = call_genai_with_retry(client, 'gemini-3-flash-preview', [prompt, img])
        
        if mode == "quiz":
            text = response.text.strip()
            if text.startswith("```json"): text = text[7:]
            if text.startswith("```"): text = text[3:]
            if text.endswith("```"): text = text[:-3]
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"error": "json_error", "message": "Failed to parse quiz JSON."}
        
        return {"response": response.text}

    except Exception as e:
        err_str = str(e)
        if "429" in err_str: return {"error": "quota_exceeded", "message": "Daily quota exceeded."}
        if "503" in err_str: return {"error": "overloaded", "message": "AI Service Overloaded."}
        return {"error": "api_error", "message": str(e)}

def chat_with_ai(messages, signal_context=None, api_key=None):
    """
    Simple chat interface.
    messages: list of {"role": "user"|"assistant", "content": "..."}
    """
    client, msg = get_genai_client(api_key)
    if not client:
        return "System: API Key missing."

    # Construct history
    # For MVP, just concatenation or using simple chat structure
    # Gemini 3 might verify specific structure.
    # We will just do a generic generation for now with history text.
    
    history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages])
    
    prompt = f"""
    You are DeepPulse Research Assistant.
    Context: {signal_context or 'No active signal context.'}
    
    Conversation History:
    {history_text}
    
    USER: {messages[-1]['content'] if messages else ''}
    ASSISTANT:
    """
    
    try:
        response = call_genai_with_retry(client, 'gemini-3-flash-preview', [prompt])
        return response.text
    except Exception as e:
        return f"Error: {str(e)}"

def recommend_databases(user_role, category, user_interest=None, api_key=None):
    """
    Recommends PhysioNet databases based on user role, category, and interest.
    Returns a list of database recommendations with slug, name, and description.
    """
    client, msg = get_genai_client(api_key)
    if not client:
        return [{"error": "config_error", "message": msg}]
    
    category_descriptions = {
        "cardiac": "Cardiac Electrical Signals (ECG, EGM, Fetal ECG, VCG)",
        "hemodynamic": "Hemodynamic Signals (ABP, PAP, CVP, ICP)",
        "neurological": "Neurological Signals (EEG, Evoked Potentials, EMG)",
        "respiration": "Oxygenation & Respiration (PPG, Respiration Waveforms)",
        "motion": "Mechanical & Motion Data (Gait Dynamics, Accelerometry)"
    }
    
    prompt = f"""
    You are an expert on PhysioNet databases.
    
    User Profile:
    - Role: {user_role} (e.g., medical student, researcher, clinician)
    - Category of Interest: {category_descriptions.get(category, category)}
    - Specific Interest: {user_interest or 'General exploration in this category'}
    
    Please recommend exactly 3 high-quality, open-access PhysioNet databases that:
    1. Match the category "{category}"
    2. Are appropriate for the user's role and expertise level
    3. Are relevant to their specific interest (if provided)
    
    For each database, provide:
    - "name": Full database name
    - "slug": Short identifier used for wfdb (e.g., 'ptbdb', 'mitdb', 'eegmmidb')
    - "description": 1-2 sentence explanation of why it's suitable for this user
    - "category": The category key (cardiac, neurological, hemodynamic, respiration, or motion)
    
    Return as a valid JSON array. Do NOT wrap in markdown code blocks.
    """
    
    try:
        response = call_genai_with_retry(client, 'gemini-3-flash-preview', [prompt])
        text = response.text.strip()
        
        # Clean markdown
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        
        recommendations = json.loads(text)
        return recommendations
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI recommendation: {e}")
        return [{"error": "parse_error", "message": "AI returned invalid JSON"}]
    except Exception as e:
        logger.error(f"Database recommendation failed: {e}")
        return [{"error": "api_error", "message": str(e)}]
