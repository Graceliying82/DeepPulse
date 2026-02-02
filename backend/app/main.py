from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import os
import io
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.services import data_service, ai_service

app = FastAPI(title="DeepPulse API", version="2.0")

# CORS Setup
origins = [
    "http://localhost:3000", # Vite default
    "http://localhost:5173", # Vite alternate
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class DownloadRequest(BaseModel):
    db_slug: str
    num_records: int = 5
    category: Optional[str] = None  # Auto-detected if not provided

class DatabaseRecommendationRequest(BaseModel):
    user_role: str
    category: str
    user_interest: Optional[str] = None

class AnalyzeRequest(BaseModel):
    # For file uploads we usually use Form data, but for metadata we use models.
    # We'll define simple models here.
    user_notes: Optional[str] = None
    mode: str = "full"
    signal_type: str = "Cardiac"
    patient_metadata: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    signal_context: Optional[str] = None
    include_suggestions: bool = True  # Return contextual suggestions with response
    api_key: Optional[str] = None  # User's own Gemini API key (BYOK)

class FormatNotesRequest(BaseModel):
    notes: List[str]


# --- Routes ---

@app.get("/")
def health_check():
    return {"status": "ok", "message": "DeepPulse Backend Running"}

@app.get("/api/data")
def list_data():
    """List available patient records."""
    try:
        records = data_service.list_patients()
        return {"count": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/data/download")
def download_data(req: DownloadRequest):
    """Download data from PhysioNet."""
    try:
        records = data_service.download_data(
            req.db_slug,
            req.num_records,
            category=req.category
        )
        return {"status": "success", "downloaded": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/category/{category}")
def list_data_by_category(category: str):
    """List patient records in a specific category."""
    try:
        records = data_service.list_patients(category=category)
        return {"category": category, "count": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/{category}/{record_id:path}")
def get_record(category: str, record_id: str):
    """Load specific record data from a category."""
    try:
        data = data_service.load_record(record_id, category=category)
        # Convert numpy arrays to list for JSON
        signals = data["signals"]
        if hasattr(signals, "tolist"):
            data["signals"] = signals.tolist()
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) # Corrupted
    except Exception as e:
        raise HTTPException(status_code=404, detail="Record not found or error loading.")

@app.post("/api/analyze")
async def analyze_signal(
    file: UploadFile = File(...),
    user_notes: Optional[str] = Form(None),
    mode: str = Form("full"),
    signal_type: str = Form("Cardiac"),
    metadata: Optional[str] = Form(None)
):
    """Run AI Analysis on uploaded image."""
    try:
        contents = await file.read()
        image_io = io.BytesIO(contents)
        
        result = ai_service.analyze_signal(image_io, user_notes, metadata, mode, signal_type)
        if "error" in result:
             # Pass generic error structure
             return result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
def chat(req: ChatRequest):
    """Chat with Pulse, the DeepPulse AI assistant."""
    msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]
    response = ai_service.chat_with_ai(msg_dicts, req.signal_context, api_key=req.api_key)

    result = {"role": "assistant", "content": response}

    # Include contextual suggestions if requested
    if req.include_suggestions:
        last_message = req.messages[-1].content if req.messages else ""
        result["suggestions"] = ai_service.get_chat_suggestions(
            req.signal_context,
            last_message
        )

    return result

@app.post("/api/ai/format-notes")
def format_clinical_notes(req: FormatNotesRequest, api_key: Optional[str] = None):
    """Format clinical notes using AI for human readability."""
    try:
        formatted = ai_service.format_clinical_notes(req.notes, api_key=api_key)
        return {"formatted": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories")
def list_categories():
    """List available data categories."""
    try:
        categories = data_service.list_categories()
        all_categories = [
            {"key": "cardiac", "name": "Cardiac Electrical Signals", "icon": "heart"},
            {"key": "hemodynamic", "name": "Hemodynamic Signals", "icon": "droplet"},
            {"key": "neurological", "name": "Neurological Signals", "icon": "brain"},
            {"key": "respiration", "name": "Oxygenation & Respiration", "icon": "wind"},
            {"key": "motion", "name": "Mechanical & Motion Data", "icon": "activity"}
        ]
        # Enhance with count data
        for cat in all_categories:
            matching = [c for c in categories if c["key"] == cat["key"]]
            cat["record_count"] = matching[0]["record_count"] if matching else 0
        return {"categories": all_categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend-databases")
def recommend_databases(req: DatabaseRecommendationRequest, api_key: Optional[str] = None):
    """Get AI-powered database recommendations."""
    try:
        recommendations = ai_service.recommend_databases(
            req.user_role, 
            req.category, 
            req.user_interest,
            api_key=api_key
        )
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
