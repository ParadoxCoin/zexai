
import os
import requests
import json
import asyncio
from dotenv import load_dotenv

load_dotenv(r"c:\Users\my\Desktop\AİSaasManus\ai-saas-production\backend\.env")

API_KEY = os.getenv("KIE_API_KEY")

if not API_KEY:
    print("Error: KIE_API_KEY not found in .env")
    exit(1)

# Correct BASE_URL: https://api.kie.ai
BASE_URL = "https://api.kie.ai" 

def fetch_models():
    print(f"Fetching models from {BASE_URL}...")
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Try different endpoints with /api prefix as seen in provider code
    endpoints = [
        "/api/v1/models",
        "/api/v1/market/models",
        "/api/v1/providers/models",
        "/api/v1/jobs/models",
        "/api/models"
    ]
    
    for ep in endpoints:
        url = f"{BASE_URL}{ep}"
        try:
            print(f"Trying {url}...")
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                print(f"Success! Found models at {ep}")
                try:
                    data = response.json()
                    # Print simplified model list
                    models = data.get("data", [])
                    print(f"Found {len(models)} models.")
                    for m in models:
                        # Print all models to debug
                        print(f"- {m.get('id')} ({m.get('provider')}) - Name: {m.get('name', 'N/A')}")
                    return
                except Exception as e:
                    print(f"Error parsing JSON: {e}")
            else:
                print(f"Failed {ep}: {response.status_code}")
        except Exception as e:
            print(f"Error {ep}: {e}")

if __name__ == "__main__":
    fetch_models()
