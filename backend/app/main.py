from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import os
import io

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
        records = data_service.download_data(req.db_slug, req.num_records)
        return {"status": "success", "downloaded": len(records), "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/{record_id:path}")
def get_record(record_id: str):
    """Load specific record data."""
    try:
        data = data_service.load_record(record_id)
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
    """Chat with AI Agent."""
    msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]
    response = ai_service.chat_with_ai(msg_dicts, req.signal_context)
    return {"role": "assistant", "content": response}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
