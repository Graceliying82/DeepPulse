from google import genai
from PIL import Image
import os
import logging
import time
import json

from .knowledge_base import get_relevant_knowledge, generate_suggestions as kb_generate_suggestions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# PULSE - THE DEEPPULSE AI ASSISTANT
# =============================================================================

PULSE_SYSTEM_PROMPT = """
You are **Pulse**, the friendly DeepPulse assistant! 🩺

## Your Personality
- Warm, encouraging, and educational
- Use occasional emojis to be engaging (but not excessive - max 2-3 per response)
- Celebrate user progress ("Great question!", "You're getting the hang of it!")
- Be concise but helpful - aim for 2-4 short paragraphs max
- Use markdown formatting for clarity (bold for emphasis, lists for steps)

## Your Knowledge Boundaries (CRITICAL)
You ONLY know about DeepPulse features provided in your context below.
**NEVER make up features, databases, or capabilities that aren't listed.**
If asked about something not in your knowledge, say:
"I'm not sure about that specific feature. Here's what I can help you with in DeepPulse..."

## Your Role
1. Help users understand medical signals (ECG, EEG, etc.)
2. Guide them through DeepPulse features step-by-step
3. Suggest relevant next actions
4. Answer questions about available PhysioNet databases
5. Explain how to use the software effectively

## What You Can Discuss
{knowledge_context}

## What You CANNOT Do
- Give actual medical diagnoses (always add "for educational purposes only")
- Claim features that aren't listed in your knowledge
- Make up database names or signal types not in your knowledge
- Provide specific clinical advice for real patients

## Response Guidelines
- Start responses with a brief, direct answer
- Then provide helpful context or next steps
- End with a suggestion or question to keep the conversation going
- Keep responses focused and scannable
"""

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

        IMPORTANT for explanations:
        - For the CORRECT answer: Start with "CORRECT!" then explain why this is the right diagnosis.
        - For INCORRECT answers: Start with "INCORRECT." then briefly explain why this is wrong and what to look for instead.
        """
    else:
        # Advanced/Full mode - conclusion first, then details
        if user_notes:
            instruction_segment = f"""
            The user provided their diagnosis: "{user_notes}"

            RESPOND IN THIS EXACT ORDER:
            1. VERDICT: Start with "CORRECT!" or "INCORRECT." on its own line.
            2. If incorrect, immediately state: "The correct diagnosis is: [diagnosis]"
            3. Then provide a brief explanation of why (2-3 sentences).
            4. Finally, provide detailed clinical analysis including rhythm, morphology, and supporting evidence.

            Be encouraging but accurate. This is for educational purposes.
            """
        else:
            instruction_segment = f"""
            Perform full clinical analysis of this {signal_type} signal.

            RESPOND IN THIS ORDER:
            1. DIAGNOSIS: State the primary diagnosis clearly on the first line.
            2. CONFIDENCE: High/Medium/Low
            3. KEY FINDINGS: List 2-3 most important observations.
            4. DETAILED ANALYSIS: Include rhythm, morphology, intervals, and clinical significance.

            Educational purposes only.
            """
    
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
    Enhanced chat interface with Pulse personality and knowledge grounding.

    Args:
        messages: list of {"role": "user"|"assistant", "content": "..."}
        signal_context: Current signal context (e.g., "Cardiac", "Neurological")
        api_key: Optional API key override

    Returns:
        AI response text
    """
    client, msg = get_genai_client(api_key)
    if not client:
        return "👋 Hi! I'm Pulse, but I can't connect right now. Please check that your API key is configured in the settings."

    # Get the user's latest message for knowledge retrieval
    user_message = messages[-1]['content'] if messages else ""

    # Retrieve relevant knowledge based on query and context
    knowledge_context = get_relevant_knowledge(user_message, signal_context)

    # Build the system prompt with knowledge
    system_prompt = PULSE_SYSTEM_PROMPT.format(knowledge_context=knowledge_context)

    # Build conversation history (limit to last 10 messages for context window)
    recent_messages = messages[-10:] if len(messages) > 10 else messages
    history_text = "\n".join([
        f"{'User' if m['role'] == 'user' else 'Pulse'}: {m['content']}"
        for m in recent_messages[:-1]  # Exclude last message, it goes separately
    ])

    # Construct the full prompt
    prompt = f"""{system_prompt}

## Current Context
Signal Type: {signal_context or 'No signal loaded'}

## Conversation History
{history_text if history_text else '(This is the start of the conversation)'}

## User's Message
{user_message}

## Your Response (as Pulse)
"""

    try:
        response = call_genai_with_retry(client, 'gemini-3-flash-preview', [prompt])
        return response.text
    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            return "😅 Oops! I've hit my daily limit. Try again tomorrow, or check your API quota."
        if "503" in err_str or "Overloaded" in err_str:
            return "🔄 The AI service is busy right now. Please try again in a moment!"
        logger.error(f"Chat error: {e}")
        return f"❌ Something went wrong: {str(e)[:100]}. Please try again."


def get_chat_suggestions(signal_context=None, last_message=""):
    """
    Get contextual suggestions for the chat interface.

    Args:
        signal_context: Current signal context
        last_message: User's last message

    Returns:
        List of suggestion strings
    """
    return kb_generate_suggestions(signal_context, last_message)

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

def format_clinical_notes(notes, api_key=None):
    """
    Use AI to format raw clinical notes into human-readable format.
    Returns a list of formatted note objects with labels and values.
    """
    client, msg = get_genai_client(api_key)
    if not client:
        # Fallback to raw display
        return [{"label": "Clinical Note", "value": note} for note in notes]

    prompt = f"""Parse these medical notes from a PhysioNet ECG database and format them as JSON.

Notes: {json.dumps(notes)}

Rules:
- "##_F" or "## M" → {{"label": "Patient Demographics", "value": "## years old, Female/Male"}}
- "### ### x#" (numbers with x) → {{"label": "Record ID", "value": keep as-is}}
- Medical terms (Diapres, MI, etc.) → {{"label": "Diagnosis", "value": expand abbreviation}}
- Other text → {{"label": "Clinical Note", "value": original text}}

Return ONLY valid JSON array. Example:
[{{"label":"Patient Demographics","value":"84 years old, Female"}},{{"label":"Record ID","value":"1525 167 x1"}}]

JSON output:"""

    try:
        response = call_genai_with_retry(client, 'gemini-3-flash-preview', [prompt])
        text = response.text.strip()

        logger.info(f"AI raw response: {text}")

        # Clean markdown and whitespace
        text = text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        text = text.strip()

        logger.info(f"Cleaned text: {text}")

        formatted_notes = json.loads(text)
        logger.info(f"Successfully parsed {len(formatted_notes)} notes")
        return formatted_notes
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse formatted notes: {e}")
        logger.error(f"Raw AI response was: {text if 'text' in locals() else 'N/A'}")
        # Fallback to raw display
        return [{"label": "Clinical Note", "value": note} for note in notes]
    except Exception as e:
        logger.error(f"Note formatting failed: {e}")
        # Fallback to raw display
        return [{"label": "Clinical Note", "value": note} for note in notes]
