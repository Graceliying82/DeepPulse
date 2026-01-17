import google.generativeai as genai
import os
from dotenv import load_dotenv

# Try to load from .streamlit/secrets.toml if possible manually, 
# but for script let's assume env var or manual setup logic like in ai_agent.py
import toml

def load_secrets():
    secrets_path = os.path.join(os.path.dirname(__file__), '..', '.streamlit', 'secrets.toml')
    secrets_path = os.path.abspath(secrets_path)
    if os.path.exists(secrets_path):
        with open(secrets_path, 'r') as f:
            return toml.load(f)
    return {}

def main():
    secrets = load_secrets()
    api_key = secrets.get('GOOGLE_API_KEY')
    
    if not api_key:
        api_key = os.getenv('GOOGLE_API_KEY')
        
    if not api_key:
        print("FAIL: No API Key found in .streamlit/secrets.toml or ENV.")
        return

    print(f"API Key found: {api_key[:5]}...")
    genai.configure(api_key=api_key)

    models_to_test = [
        'gemini-3-flash-preview'
    ]
    
    for model_name in models_to_test:
        print(f"\nTesting model: {model_name}")
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("Say 'Hello'")
            print(f"SUCCESS: {response.text.strip()}")
        except Exception as e:
            print(f"FAIL: {e}")

if __name__ == "__main__":
    main()
