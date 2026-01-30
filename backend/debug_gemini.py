import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

print(f"Library Version: {genai.__version__}")

api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key present: {bool(api_key)}")

if api_key:
    genai.configure(api_key=api_key)
    try:
        print("Listing models...")
        for m in genai.list_models():
            print(f"- {m.name}")
            if 'generateContent' in m.supported_generation_methods:
                 print(f"  (Supports generateContent)")
    except Exception as e:
        print(f"Error listing models: {e}")
