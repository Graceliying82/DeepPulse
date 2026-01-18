from google import genai
import os
import toml

def load_secrets():
    secrets_path = os.path.join(os.path.dirname(__file__), '..', '.streamlit', 'secrets.toml')
    secrets_path = os.path.abspath(secrets_path)
    if os.path.exists(secrets_path):
        with open(secrets_path, 'r') as f:
            return toml.load(f)
    return {}

def main():
    print("Testing AI Connection (New SDK)...")
    
    secrets = load_secrets()
    api_key = secrets.get('GOOGLE_API_KEY')
    
    if not api_key:
        api_key = os.getenv('GOOGLE_API_KEY')
        
    if not api_key:
        print("FAIL: No API Key found.")
        return

    print(f"API Key found: {api_key[:5]}...")
    
    try:
        client = genai.Client(api_key=api_key)
        
        # Test Gemini 3 preview (or experimental 2.0 if that is the real path)
        models_to_test = ['gemini-3-flash-preview', 'gemini-2.0-flash-exp']
        
        for model_name in models_to_test:
            print(f"\nTesting model: {model_name}")
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents="Hello! Just say 'SUCCESS'."
                )
                print(f"SUCCESS: {response.text.strip()}")
            except Exception as e:
                print(f"FAILED: {e}")
                
    except Exception as e:
        print(f"Configuration Error: {e}")

if __name__ == "__main__":
    main()
