from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import io
import logging
from dotenv import load_dotenv

load_dotenv()

from app.services import data_service, ai_service, db_service

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="DeepPulse API", version="3.0")

# CORS -- read allowed origins from env, fall back to local dev defaults
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class DatabaseRecommendationRequest(BaseModel):
    user_role: str
    category: str
    user_interest: Optional[str] = None
    api_key: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class SignalMetadata(BaseModel):
    channel_names: Optional[List[str]] = None
    sampling_frequency: Optional[float] = None
    record_name: Optional[str] = None
    database: Optional[str] = None
    comments: Optional[List[str]] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    signal_context: Optional[str] = None
    include_suggestions: bool = True
    api_key: Optional[str] = None
    user_role: Optional[str] = "Hobbyist"
    signal_image: Optional[str] = None  # base64-encoded PNG
    signal_metadata: Optional[SignalMetadata] = None


class FormatNotesRequest(BaseModel):
    notes: List[str]
    api_key: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/")
def health_check():
    return {"status": "ok", "message": "DeepPulse Backend Running"}


@app.get("/api/key-status")
def key_status():
    """Check whether a server-side Gemini API key is configured."""
    has_server_key = bool(os.getenv("GOOGLE_API_KEY"))
    return {"has_server_key": has_server_key}


@app.get("/api/data")
def list_data():
    """List all available records."""
    try:
        records = data_service.list_patients()
        return {"count": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/inventory/{db_slug}")
def get_inventory(db_slug: str):
    """Get record inventory for a database."""
    try:
        inventory = db_service.get_inventory(db_slug)
        return {"database": db_slug, "records": inventory}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/category/{category}")
def list_data_by_category(category: str):
    """List records in a specific category."""
    try:
        records = data_service.list_patients(category=category)
        return {"category": category, "count": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/{category}/{record_id:path}")
def get_record(category: str, record_id: str):
    """Load a specific record's signal data."""
    try:
        data = data_service.load_record(record_id, category=category)
        signals = data["signals"]
        if hasattr(signals, "tolist"):
            data["signals"] = signals.tolist()
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=404, detail="Record not found or error loading.")


@app.post("/api/analyze")
async def analyze_signal(
    file: UploadFile = File(...),
    user_notes: Optional[str] = Form(None),
    mode: str = Form("full"),
    signal_type: str = Form("Cardiac"),
    metadata: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None),
    user_role: Optional[str] = Form("Hobbyist"),
):
    """Run AI analysis on an uploaded signal image."""
    try:
        contents = await file.read()
        image_io = io.BytesIO(contents)
        result = ai_service.analyze_signal(
            image_io, user_notes, metadata, mode, signal_type,
            api_key=api_key, user_role=user_role,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
def chat(req: ChatRequest):
    """Chat with AI Agent, optionally with signal image and metadata."""
    msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]
    meta_dict = req.signal_metadata.model_dump() if req.signal_metadata else None
    response = ai_service.chat_with_ai(
        msg_dicts, req.signal_context,
        api_key=req.api_key, user_role=req.user_role,
        signal_image_b64=req.signal_image,
        signal_metadata=meta_dict,
    )
    return {"role": "assistant", "content": response}


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    """Chat with AI Agent (streaming), optionally with signal image and metadata."""
    msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]
    meta_dict = req.signal_metadata.model_dump() if req.signal_metadata else None
    return StreamingResponse(
        ai_service.stream_chat_with_ai(
            msg_dicts, req.signal_context,
            api_key=req.api_key, user_role=req.user_role,
            signal_image_b64=req.signal_image,
            signal_metadata=meta_dict,
        ),
        media_type="text/plain",
    )


@app.post("/api/ai/format-notes")
def format_clinical_notes(req: FormatNotesRequest):
    """Format clinical notes using AI."""
    try:
        formatted = ai_service.format_clinical_notes(req.notes, api_key=req.api_key)
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
            {"key": "motion", "name": "Mechanical & Motion Data", "icon": "activity"},
        ]
        for cat in all_categories:
            matching = [c for c in categories if c["key"] == cat["key"]]
            cat["record_count"] = matching[0]["record_count"] if matching else 0
        return {"categories": all_categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recommend-databases")
def recommend_databases(req: DatabaseRecommendationRequest):
    """Get AI-powered database recommendations."""
    try:
        recommendations = ai_service.recommend_databases(
            req.user_role, req.category, req.user_interest, api_key=req.api_key,
        )
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
