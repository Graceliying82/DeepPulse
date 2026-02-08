from google import genai
from PIL import Image
import os
import logging
import time
import json
import base64
import io

from .knowledge_base import get_relevant_knowledge, generate_suggestions as kb_generate_suggestions
from .domain_expertise import format_expertise_for_analysis, format_expertise_for_chat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# PULSE - THE DEEPPULSE AI ASSISTANT
# =============================================================================

PULSE_SYSTEM_PROMPT = """
You are **Pulse**, the friendly DeepPulse assistant! 🩺

## Your Audience Persona: {user_role}
{persona_instruction}

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
- Claim features that aren't listed in your knowledge
- Make up database names or signal types not in your knowledge

## Response Guidelines
- Start responses with a brief, direct answer
- Then provide helpful context or next steps
- End with a suggestion or question to keep the conversation going
- Keep responses focused and scannable
"""

PERSONA_INSTRUCTIONS = {
    "Hobbyist": "Keep explanations simple, high-level, and analogies-driven. Avoid heavy medical jargon. Focus on general curiosity.",
    "Student": "Focus on educational concepts. Explain 'why' and 'how' to interpret signals. Use academic but accessible medical terminology.",
    "Researcher": "Provide technical, data-driven responses. Focus on signal processing details, morphology, and available literature/databases.",
    "Expert": "Be professional, concise, and clinical. Focus on diagnostic criteria, clinical significance, and technical accuracy for experts."
}

def call_genai_with_retry(client, model_name, contents, retries=3, delay=2):
    """Call GenAI with retry and model fallback."""
    current_model = model_name
    for attempt in range(retries):
        try:
            response = client.models.generate_content(model=current_model, contents=contents)
            return response
        except Exception as e:
            err_str = str(e)
            logger.warning(f"AI Call Attempt {attempt+1} failed ({current_model}): {err_str}")
            
            # If after 3 attempts or specific failure, try fallback model
            if attempt == retries - 1 and current_model == "gemini-3-flash-preview":
                logger.info("Switching to fallback model: gemini-2.5-flash")
                current_model = "gemini-2.5-flash"
                # Reset attempt counter for fallback model if desired, but 1-off is safer
                try:
                    return client.models.generate_content(model=current_model, contents=contents)
                except Exception as e2:
                    raise e2
                    
            if "503" in err_str or "Overloaded" in err_str or "UNAVAILABLE" in err_str or "429" in err_str:
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

def analyze_signal(image_bytes, user_notes=None, patient_metadata=None, mode="full", signal_type="Cardiac", api_key=None, user_role="Hobbyist"):
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
    
    # Domain-specific clinical knowledge
    clinical_knowledge = format_expertise_for_analysis(signal_type)

    instruction_segment = ""
    if mode == "hints":
        instruction_segment = f"""You are guiding a learner through this {signal_type} signal. Provide exactly 3 progressive hints that help the learner discover the diagnosis on their own. Do NOT reveal the diagnosis directly.

Write each hint as a short paragraph (2-4 sentences). Use the clinical reference above to ground your observations.

Format your response exactly like this:

Hint 1 (General): [A broad observation about rhythm, rate, or overall morphology that the learner should notice first.]

Hint 2 (Specific): [A more targeted finding - point to a specific interval, wave, or pattern that narrows the differential.]

Hint 3 (Diagnostic Clue): [The most telling feature that, combined with the previous hints, should lead the learner to the correct diagnosis.]

Do not number them any other way. Do not add extra sections or summaries."""
    elif mode == "quiz":
        instruction_segment = """Generate exactly 10 multiple-choice questions about this signal.

Each question tests a different aspect: rhythm, rate, morphology, axis, intervals, clinical significance, pathophysiology, treatment implications, etc.

Progress from basic observations (questions 1-3) to intermediate interpretation (4-7) to advanced clinical reasoning (8-10).

CRITICAL OUTPUT RULES:
- Your ENTIRE response must be a single valid JSON array. Nothing else.
- Do NOT wrap in markdown code fences. Do NOT add any text before or after the JSON.
- Do NOT include comments inside the JSON.

Each element in the array must follow this exact schema:
{"question": "...", "options": [{"text": "...", "is_correct": true, "explanation": "..."}, {"text": "...", "is_correct": false, "explanation": "..."}, {"text": "...", "is_correct": false, "explanation": "..."}, {"text": "...", "is_correct": false, "explanation": "..."}]}

Requirements:
- 10 question objects total.
- Each question has exactly 4 options, exactly 1 with "is_correct": true.
- Keep question text to one sentence.
- Explanations should reference specific findings visible in the signal (1-2 sentences).
- Use double quotes for all JSON strings. Escape any internal quotes."""
    else:
        # Advanced/Full mode
        if user_notes:
            instruction_segment = f"""
            The user provided their diagnosis: "{user_notes}"

            RESPOND IN THIS EXACT ORDER:
            1. VERDICT: Start with "CORRECT!" or "INCORRECT." on its own line.
            2. If incorrect, immediately state: "The correct diagnosis is: [diagnosis]"
            3. Then provide a brief explanation of why (2-3 sentences), referencing the clinical criteria.
            4. Finally, provide detailed clinical analysis using the systematic interpretation framework above.

            Be encouraging but accurate.
            """
        else:
            instruction_segment = f"""
            Perform full clinical analysis of this {signal_type} signal using the systematic interpretation framework above.

            RESPOND IN THIS ORDER:
            1. DIAGNOSIS: State the primary diagnosis clearly on the first line.
            2. CONFIDENCE: High/Medium/Low
            3. KEY FINDINGS: List 2-3 most important observations with reference to normal values.
            4. DETAILED ANALYSIS: Follow the interpretation framework step by step.
            """
    
    prompt = f"""You are an {expert_persona} responding to a {user_role}.
{PERSONA_INSTRUCTIONS.get(user_role, "")}

{clinical_knowledge}

Patient Metadata: {patient_metadata or 'None'}
{notes_segment}

## Task
{instruction_segment}
"""
    
    model_name = "gemini-3-flash-preview"

    try:
        response = call_genai_with_retry(client, model_name, [prompt, img])
        
        if mode == "quiz":
            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```json"): text = text[7:]
            elif text.startswith("```"): text = text[3:]
            if text.endswith("```"): text = text[:-3]
            text = text.strip()
            # Extract the JSON array if surrounded by extra text
            start = text.find('[')
            end = text.rfind(']')
            if start != -1 and end != -1:
                text = text[start:end + 1]
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse quiz JSON. Raw text: {text[:200]}")
                return {"error": "json_error", "message": "Failed to parse quiz response. Please try again."}
        
        return {"response": response.text}

    except Exception as e:
        err_str = str(e)
        if "429" in err_str: return {"error": "quota_exceeded", "message": "Daily quota exceeded."}
        if "503" in err_str: return {"error": "overloaded", "message": "AI Service Overloaded."}
        return {"error": "api_error", "message": str(e)}

def chat_with_ai(messages, signal_context=None, api_key=None, user_role="Hobbyist",
                  signal_image_b64=None, signal_metadata=None):
    """
    Enhanced chat interface with Pulse personality, knowledge grounding,
    and optional signal image context.

    Args:
        messages: list of {"role": "user"|"assistant", "content": "..."}
        signal_context: Current signal context (e.g., "Cardiac", "Neurological")
        api_key: Optional API key override
        user_role: The selected user persona (Hobbyist, Student, Researcher, Expert)
        signal_image_b64: Optional base64-encoded PNG of the current signal view
        signal_metadata: Optional dict with signal info (channels, sampling rate, etc.)

    Returns:
        AI response text
    """
    client, msg = get_genai_client(api_key)
    if not client:
        return "Hi! I'm Pulse, but I can't connect right now. Please check that your API key is configured in the settings."

    # Get the user's latest message for knowledge retrieval
    user_message = messages[-1]['content'] if messages else ""

    # Retrieve relevant knowledge based on query and context
    knowledge_context = get_relevant_knowledge(user_message, signal_context)

    # Get domain-specific clinical expertise if a signal is loaded
    domain_context = ""
    if signal_context and signal_context != "No signal loaded":
        # Extract signal type from context string like "Active Signal Domain: Cardiac"
        sig_type = signal_context.replace("Active Signal Domain: ", "").strip()
        domain_context = format_expertise_for_chat(sig_type)

    # Build signal metadata context
    metadata_context = ""
    if signal_metadata:
        meta_parts = []
        if signal_metadata.get("channel_names"):
            meta_parts.append(f"Channels: {', '.join(signal_metadata['channel_names'][:10])}")
        if signal_metadata.get("sampling_frequency"):
            meta_parts.append(f"Sampling Rate: {signal_metadata['sampling_frequency']} Hz")
        if signal_metadata.get("record_name"):
            meta_parts.append(f"Record: {signal_metadata['record_name']}")
        if signal_metadata.get("database"):
            meta_parts.append(f"Database: {signal_metadata['database']}")
        if signal_metadata.get("comments"):
            comments = signal_metadata["comments"]
            if isinstance(comments, list):
                meta_parts.append(f"Clinical Notes: {'; '.join(comments[:5])}")
            else:
                meta_parts.append(f"Clinical Notes: {comments}")
        if meta_parts:
            metadata_context = "\n".join(meta_parts)

    # Build the system prompt with knowledge and persona
    persona_instruction = PERSONA_INSTRUCTIONS.get(user_role, PERSONA_INSTRUCTIONS["Hobbyist"])
    system_prompt = PULSE_SYSTEM_PROMPT.format(
        knowledge_context=knowledge_context,
        user_role=user_role,
        persona_instruction=persona_instruction
    )

    # Build conversation history (limit to last 10 messages for context window)
    recent_messages = messages[-10:] if len(messages) > 10 else messages
    history_text = "\n".join([
        f"{'User' if m['role'] == 'user' else 'Pulse'}: {m['content']}"
        for m in recent_messages[:-1]  # Exclude last message, it goes separately
    ])

    # Construct the full prompt
    signal_section = f"Signal Type: {signal_context or 'No signal loaded'}"
    if metadata_context:
        signal_section += f"\n\nLoaded Signal Info:\n{metadata_context}"
    if domain_context:
        signal_section += f"\n\n{domain_context}"

    image_instruction = ""
    if signal_image_b64:
        image_instruction = "\nA screenshot of the user's current signal view is attached. Reference it when answering signal-related questions."

    prompt = f"""{system_prompt}

## Current Context
{signal_section}
{image_instruction}

## Conversation History
{history_text if history_text else '(This is the start of the conversation)'}

## User's Message
{user_message}

## Your Response (as Pulse)
"""

    # Build contents array: text prompt + optional image
    contents = [prompt]
    if signal_image_b64:
        try:
            img_bytes = base64.b64decode(signal_image_b64)
            img = Image.open(io.BytesIO(img_bytes))
            contents.append(img)
        except Exception as e:
            logger.warning(f"Failed to decode signal image for chat: {e}")

    try:
        model_name = "gemini-3-flash-preview"
        response = call_genai_with_retry(client, model_name, contents)
        return response.text
    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            return "Oops! I've hit my daily limit. Try again tomorrow, or check your API quota."
        if "503" in err_str or "Overloaded" in err_str:
            return "The AI service is busy right now. Please try again in a moment!"
        logger.error(f"Chat error: {e}")
        return f"Something went wrong: {str(e)[:100]}. Please try again."

def stream_chat_with_ai(messages, signal_context=None, api_key=None, user_role="Hobbyist",
                        signal_image_b64=None, signal_metadata=None):
    """
    Streaming version of chat interface with optional image context.
    """
    client, msg = get_genai_client(api_key)
    if not client:
        yield "API Key missing. Please check your settings."
        return

    user_message = messages[-1]['content'] if messages else ""
    knowledge_context = get_relevant_knowledge(user_message, signal_context)
    persona_instruction = PERSONA_INSTRUCTIONS.get(user_role, PERSONA_INSTRUCTIONS["Hobbyist"])

    # Get domain expertise
    domain_context = ""
    if signal_context and signal_context != "No signal loaded":
        sig_type = signal_context.replace("Active Signal Domain: ", "").strip()
        domain_context = format_expertise_for_chat(sig_type)

    # Build metadata context
    metadata_context = ""
    if signal_metadata:
        meta_parts = []
        if signal_metadata.get("channel_names"):
            meta_parts.append(f"Channels: {', '.join(signal_metadata['channel_names'][:10])}")
        if signal_metadata.get("sampling_frequency"):
            meta_parts.append(f"Sampling Rate: {signal_metadata['sampling_frequency']} Hz")
        if signal_metadata.get("record_name"):
            meta_parts.append(f"Record: {signal_metadata['record_name']}")
        if signal_metadata.get("comments"):
            comments = signal_metadata["comments"]
            if isinstance(comments, list):
                meta_parts.append(f"Clinical Notes: {'; '.join(comments[:5])}")
        if meta_parts:
            metadata_context = "\n".join(meta_parts)

    system_prompt = PULSE_SYSTEM_PROMPT.format(
        knowledge_context=knowledge_context,
        user_role=user_role,
        persona_instruction=persona_instruction
    )

    recent_messages = messages[-10:] if len(messages) > 10 else messages
    history_text = "\n".join([
        f"{'User' if m['role'] == 'user' else 'Pulse'}: {m['content']}"
        for m in recent_messages[:-1]
    ])

    signal_section = f"Signal Type: {signal_context or 'No signal loaded'}"
    if metadata_context:
        signal_section += f"\n\nLoaded Signal Info:\n{metadata_context}"
    if domain_context:
        signal_section += f"\n\n{domain_context}"

    image_instruction = ""
    if signal_image_b64:
        image_instruction = "\nA screenshot of the user's current signal view is attached. Reference it when answering signal-related questions."

    prompt = f"""{system_prompt}
## Current Context
{signal_section}
{image_instruction}

## Conversation History
{history_text if history_text else '(This is the start of the conversation)'}

## User's Message
{user_message}

## Your Response (as Pulse)
"""

    contents = [prompt]
    if signal_image_b64:
        try:
            img_bytes = base64.b64decode(signal_image_b64)
            img = Image.open(io.BytesIO(img_bytes))
            contents.append(img)
        except Exception as e:
            logger.warning(f"Failed to decode signal image for stream chat: {e}")

    try:
        model_name = "gemini-3-flash-preview"
        responses = client.models.generate_content_stream(model=model_name, contents=contents)
        for chunk in responses:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\nError during streaming: {str(e)[:100]}"


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
        model_name = "gemini-3-flash-preview"
        response = call_genai_with_retry(client, model_name, [prompt])
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
        err_str = str(e)
        if "429" in err_str: return [{"error": "quota_exceeded", "message": "Daily quota exceeded. Try again tomorrow, or check your API quota."}]
        if "503" in err_str: return [{"error": "overloaded", "message": "AI Service Overloaded. Please try again."}]
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
        model_name = "gemini-3-flash-preview"
        response = call_genai_with_retry(client, model_name, [prompt])
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
