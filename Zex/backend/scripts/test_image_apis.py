"""
Test script for Image Generation APIs
Tests FAL.AI, Replicate, and Pollo.ai API keys
"""
import os
import sys
import asyncio
import httpx
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

# API Keys
FAL_API_KEY = os.getenv("FAL_API_KEY")
REPLICATE_API_KEY = os.getenv("REPLICATE_API_KEY")
POLLO_API_KEY = os.getenv("POLLO_API_KEY")

async def test_fal_api():
    """Test FAL.AI API"""
    print("\n" + "="*50)
    print("FAL.AI API Testi")
    print("="*50)
    
    if not FAL_API_KEY:
        print("[FAIL] FAL_API_KEY bulunamadi!")
        return False
    
    print(f"[OK] API Key: {FAL_API_KEY[:20]}...")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test with a simple model list request
            headers = {
                "Authorization": f"Key {FAL_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Try to generate a simple image
            response = await client.post(
                "https://fal.run/fal-ai/flux-pro",
                headers=headers,
                json={
                    "prompt": "a cute cat",
                    "image_size": "square_hd",
                    "num_inference_steps": 28,
                    "num_images": 1
                }
            )
            
            if response.status_code == 200:
                print("[OK] FAL.AI API calisiyor!")
                result = response.json()
                print(f"Sonuc: {result}")
                return True
            else:
                print(f"[WARN] Status Code: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
    except Exception as e:
        print(f"[FAIL] Hata: {str(e)}")
        return False

async def test_replicate_api():
    """Test Replicate API"""
    print("\n" + "="*50)
    print("Replicate API Testi")
    print("="*50)
    
    if not REPLICATE_API_KEY:
        print("[FAIL] REPLICATE_API_KEY bulunamadi!")
        return False
    
    print(f"[OK] API Key: {REPLICATE_API_KEY[:20]}...")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Token {REPLICATE_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Test with account info
            response = await client.get(
                "https://api.replicate.com/v1/account",
                headers=headers
            )
            
            if response.status_code == 200:
                print("[OK] Replicate API calisiyor!")
                result = response.json()
                print(f"Hesap: {result.get('username', 'N/A')}")
                return True
            else:
                print(f"[WARN] Status Code: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
    except Exception as e:
        print(f"[FAIL] Hata: {str(e)}")
        return False

async def test_pollo_api():
    """Test Pollo.ai API"""
    print("\n" + "="*50)
    print("Pollo.ai API Testi")
    print("="*50)
    
    if not POLLO_API_KEY:
        print("[FAIL] POLLO_API_KEY bulunamadi!")
        return False
    
    print(f"[OK] API Key: {POLLO_API_KEY[:20]}...")
    
    try:
        # Disable SSL verification for Pollo.ai
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            headers = {
                "Authorization": f"Bearer {POLLO_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Test with models list
            response = await client.get(
                "https://api.pollo.ai/v1/models",
                headers=headers
            )
            
            if response.status_code == 200:
                print("[OK] Pollo.ai API calisiyor!")
                result = response.json()
                print(f"Mevcut modeller: {len(result.get('data', []))}")
                return True
            else:
                print(f"[WARN] Status Code: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
    except Exception as e:
        print(f"[FAIL] Hata: {str(e)}")
        return False

async def main():
    """Run all tests"""
    print("\n" + "="*50)
    print("Gorsel Uretim API Test Basliyor")
    print("="*50)
    
    results = {
        "FAL.AI": await test_fal_api(),
        "Replicate": await test_replicate_api(),
        "Pollo.ai": await test_pollo_api()
    }
    
    print("\n" + "="*50)
    print("TEST SONUCLARI")
    print("="*50)
    
    for provider, status in results.items():
        icon = "OK" if status else "FAIL"
        print(f"[{icon}] {provider}: {'Calisiyor' if status else 'Hata'}")
    
    total = len(results)
    passed = sum(results.values())
    print(f"\nToplam: {passed}/{total} API calisiyor")
    
    if passed == total:
        print("Tum API'ler basariyla test edildi!")
    elif passed > 0:
        print("Bazi API'lerde sorun var, kontrol edin.")
    else:
        print("Hicbir API calismiyor!")

if __name__ == "__main__":
    asyncio.run(main())
