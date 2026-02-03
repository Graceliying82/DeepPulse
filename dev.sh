#!/bin/bash

# DeepPulse Local Development Script

echo "🚀 Starting DeepPulse Local Development Environment..."

# 1. Backend Setup
echo "🔹 Setting up Backend..."
cd backend

# Check for .env
if [ ! -f .env ]; then
    echo "⚠️  backend/.env not found! Creating from .env.example..."
    cp .env.example .env
    echo "❗ Please edit backend/.env and add your GOOGLE_API_KEY."
    exit 1
fi

# Activate venv or create it
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment..."
    uv venv
fi

source .venv/bin/activate

# Install dependencies
echo "⬇️  Installing backend dependencies..."
uv pip install -r requirements.txt > /dev/null

# Start Backend in background
echo "🔌 Starting FastAPI Backend on port 8000..."
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

cd ..

# 2. Frontend Setup
echo "🔹 Setting up Frontend..."
cd frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "⬇️  Installing frontend dependencies..."
    npm install > /dev/null
fi

# Start Frontend
echo "💻 Starting React Frontend..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo "✅ App is running!"
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:3000 (usually)"
echo "   Press Ctrl+C to stop both."

# Wait for both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT
wait
