"""
DeepPulse - API Key Debugger
Author: Grace Li
Date: 2026
Description: Utility script to verify Google Gemini API connectivity and list available models.
Usage: 
    Run from the project root:
    python3 scripts/debug_key.py
"""
import google.generativeai as genai
import os
import tomllib
import sys

def check_key():
    """
    Reads the .streamlit/secrets.toml file and attempts to connect to the Gemini API.
    It will list all available models if the key is valid.
    """
    print("🔍 Reading .streamlit/secrets.toml...")
    
    # Calculate path relative to this script location (scripts/)
    # We want to go up one level to root, then into .streamlit
    secrets_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.streamlit', 'secrets.toml')
    
    try:
        with open(secrets_path, "rb") as f:
            data = tomllib.load(f)
            api_key = data.get("GOOGLE_API_KEY")
    except FileNotFoundError:
        print(f"❌ .streamlit/secrets.toml not found at {secrets_path}!")
        return
    except Exception as e:
        print(f"❌ Error reading secrets file: {e}")
        return

    if not api_key:
        print("❌ GOOGLE_API_KEY not found in secrets file.")
        return
        
    print(f"✅ Found API Key: {api_key[:5]}...{api_key[-5:]}")
    
    print("📡 Testing connection to Google Gemini API...")
    genai.configure(api_key=api_key)
    
    print("🔍 Listing available models...")
    try:
        found_any = False
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"   - {m.name}")
                found_any = True
        
        if not found_any:
            print("⚠️ No models found with 'generateContent' capability.")
        else:
            print("✅ Models listed successfully.")

    except Exception as e:
        print(f"\n❌ List Models Failed! Error: {e}")

if __name__ == "__main__":
    check_key()
