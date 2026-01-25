from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "DeepPulse Backend Running"}

def test_list_data_empty():
    # Assuming initial state might be empty or have some data. 
    # Just checking 200 OK and structure.
    response = client.get("/api/data")
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "records" in data
    assert isinstance(data["records"], list)

# We can mock the data_service to test specific scenarios without relying on actual files
from unittest.mock import patch

@patch("app.services.data_service.list_patients")
def test_list_data_mocked(mock_list):
    mock_list.return_value = ["patient_1", "patient_2"]
    response = client.get("/api/data")
    assert response.status_code == 200
    assert response.json()["count"] == 2
    assert "patient_1" in response.json()["records"]

@patch("app.services.ai_service.chat_with_ai")
def test_chat_endpoint(mock_chat):
    mock_chat.return_value = "I am a mocked AI response."
    
    payload = {
        "messages": [{"role": "user", "content": "Hello"}],
        "signal_context": "test_context"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    assert response.json()["role"] == "assistant"
    assert response.json()["content"] == "I am a mocked AI response."
