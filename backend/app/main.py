from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import uvicorn
import os
import io
import logging
import threading
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.services import data_service, ai_service
from app.services import db_service

logger = logging.getLogger(__name__)

def preload_datasets_background():
    """Preload 25 records per database in background thread."""
    target_count = 25
    dbs = data_service.DB_CATEGORY_MAP
    
    logger.info(f"[Startup Preload] Checking {len(dbs)} databases for minimum {target_count} records...")
    
    for db_slug, category in dbs.items():
        try:
            # Check current downloaded count
            cat_dir = data_service.get_category_dir(category)
            db_dir = os.path.join(cat_dir, db_slug)
            
            current_count = 0
            if os.path.exists(db_dir):
                files = [f for f in os.listdir(db_dir) if f.endswith('.hea') or f.endswith('.edf')]
                current_count = len(files)
            
            if current_count < target_count:
                needed = target_count - current_count
                logger.info(f"[Startup Preload] {db_slug}: {current_count}/{target_count} - Downloading {needed} more...")
                data_service.download_data(
                    db_slug=db_slug,
                    num_records=needed,
                    random_shuffle=True,
                    category=category
                )
            else:
                logger.info(f"[Startup Preload] {db_slug}: {current_count}/{target_count} - OK")
        except Exception as e:
            logger.error(f"[Startup Preload] {db_slug}: Failed - {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch preload in background thread
    logger.info("[Startup] DeepPulse API starting...")
    preload_thread = threading.Thread(target=preload_datasets_background, daemon=True)
    preload_thread.start()
    yield
    # Shutdown
    logger.info("[Shutdown] DeepPulse API shutting down...")

app = FastAPI(title="DeepPulse API", version="2.0", lifespan=lifespan)

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
    num_records: int = 25
    random_shuffle: bool = True  # Randomly select records from database
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
            db_slug=req.db_slug,
            num_records=req.num_records,
            random_shuffle=req.random_shuffle,
            category=req.category
        )
        return {"status": "success", "downloaded": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DownloadRecordRequest(BaseModel):
    db_slug: str
    record_name: str
    category: Optional[str] = None

@app.post("/api/data/download-record")
def download_specific_record(req: DownloadRecordRequest):
    """Download a single specific record."""
    try:
        downloaded = data_service.download_data(
            db_slug=req.db_slug,
            record_list=[req.record_name],
            category=req.category
        )
        if not downloaded:
            raise HTTPException(status_code=404, detail="Record download failed or not found.")
            
        return {"status": "success", "downloaded": downloaded}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/inventory/{db_slug}")
def get_inventory(db_slug: str, sync: bool = False):
    """Get record inventory for a database."""
    try:
        if sync:
            inventory = data_service.sync_database_index(db_slug)
        else:
            inventory = data_service.get_db_inventory(db_slug)
            if not inventory:
                inventory = data_service.sync_database_index(db_slug)
                
        return {"database": db_slug, "records": inventory}
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
def chat(req: ChatRequest, api_key: Optional[str] = None):
    """Chat with AI Agent."""
    msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]
    response = ai_service.chat_with_ai(msg_dicts, req.signal_context, api_key=api_key)
    return {"role": "assistant", "content": response}

from fastapi.responses import StreamingResponse

@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest, api_key: Optional[str] = None):
    """Chat with AI Agent (Streaming)."""
    msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]
    
    return StreamingResponse(
        ai_service.stream_chat_with_ai(msg_dicts, req.signal_context, api_key=api_key),
        media_type="text/plain"
    )

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
