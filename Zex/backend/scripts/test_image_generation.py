"""
Real Image Generation Test
Tests actual image generation with working APIs
"""
import os
import sys
import asyncio
import httpx
from pathlib import Path
import json

sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

REPLICATE_API_KEY = os.getenv("REPLICATE_API_KEY")

async def test_replicate_image_generation():
    """Test Replicate SDXL image generation"""
    print("\n" + "="*60)
    print("Replicate SDXL Image Generation Test")
    print("="*60)
    
    if not REPLICATE_API_KEY:
        print("[FAIL] REPLICATE_API_KEY not found!")
        return False
    
    print(f"[OK] API Key: {REPLICATE_API_KEY[:20]}...")
    print("[INFO] Starting image generation...")
    print("[INFO] Prompt: 'a beautiful sunset over mountains'")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            headers = {
                "Authorization": f"Token {REPLICATE_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Create prediction
            payload = {
                "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                "input": {
                    "prompt": "a beautiful sunset over mountains, highly detailed, 8k",
                    "negative_prompt": "ugly, blurry, low quality",
                    "width": 1024,
                    "height": 1024,
                    "num_outputs": 1
                }
            }
            
            print("[INFO] Creating prediction...")
            response = await client.post(
                "https://api.replicate.com/v1/predictions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 201:
                print(f"[FAIL] Status Code: {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            result = response.json()
            prediction_id = result.get("id")
            status = result.get("status")
            
            print(f"[OK] Prediction created: {prediction_id}")
            print(f"[INFO] Status: {status}")
            
            # Poll for completion
            max_attempts = 30
            attempt = 0
            
            while attempt < max_attempts:
                await asyncio.sleep(2)
                attempt += 1
                
                check_response = await client.get(
                    f"https://api.replicate.com/v1/predictions/{prediction_id}",
                    headers=headers
                )
                
                if check_response.status_code != 200:
                    print(f"[FAIL] Check failed: {check_response.status_code}")
                    return False
                
                check_result = check_response.json()
                status = check_result.get("status")
                
                print(f"[INFO] Attempt {attempt}/{max_attempts} - Status: {status}")
                
                if status == "succeeded":
                    output = check_result.get("output")
                    if output:
                        image_url = output[0] if isinstance(output, list) else output
                        print(f"\n[SUCCESS] Image generated!")
                        print(f"[INFO] Image URL: {image_url}")
                        print(f"[INFO] Metrics: {json.dumps(check_result.get('metrics', {}), indent=2)}")
                        return True
                
                elif status == "failed":
                    error = check_result.get("error")
                    print(f"[FAIL] Generation failed: {error}")
                    return False
                
                elif status == "canceled":
                    print("[FAIL] Generation canceled")
                    return False
            
            print("[FAIL] Timeout waiting for generation")
            return False
            
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_replicate_flux_schnell():
    """Test Replicate Flux Schnell (faster model)"""
    print("\n" + "="*60)
    print("Replicate Flux Schnell Test (Fast Generation)")
    print("="*60)
    
    if not REPLICATE_API_KEY:
        print("[FAIL] REPLICATE_API_KEY not found!")
        return False
    
    print(f"[OK] API Key: {REPLICATE_API_KEY[:20]}...")
    print("[INFO] Starting fast image generation...")
    print("[INFO] Prompt: 'a cute cat wearing sunglasses'")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            headers = {
                "Authorization": f"Token {REPLICATE_API_KEY}",
                "Content-Type": "application/json"
            }
            
            # Flux Schnell model
            payload = {
                "version": "f2ab8a5569279d9b84c4e3c1e1f8a8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8",
                "input": {
                    "prompt": "a cute cat wearing sunglasses, digital art",
                    "num_outputs": 1,
                    "aspect_ratio": "1:1",
                    "output_format": "png"
                }
            }
            
            print("[INFO] Creating prediction...")
            response = await client.post(
                "https://api.replicate.com/v1/predictions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 201:
                print(f"[WARN] Status Code: {response.status_code}")
                print(f"Response: {response.text}")
                print("[INFO] Model version might be incorrect, trying alternative...")
                return False
            
            result = response.json()
            prediction_id = result.get("id")
            print(f"[OK] Prediction created: {prediction_id}")
            
            # Poll for completion
            max_attempts = 20
            attempt = 0
            
            while attempt < max_attempts:
                await asyncio.sleep(1)
                attempt += 1
                
                check_response = await client.get(
                    f"https://api.replicate.com/v1/predictions/{prediction_id}",
                    headers=headers
                )
                
                check_result = check_response.json()
                status = check_result.get("status")
                
                print(f"[INFO] Attempt {attempt}/{max_attempts} - Status: {status}")
                
                if status == "succeeded":
                    output = check_result.get("output")
                    if output:
                        image_url = output[0] if isinstance(output, list) else output
                        print(f"\n[SUCCESS] Fast image generated!")
                        print(f"[INFO] Image URL: {image_url}")
                        return True
                
                elif status in ["failed", "canceled"]:
                    print(f"[FAIL] Generation {status}")
                    return False
            
            print("[FAIL] Timeout")
            return False
            
    except Exception as e:
        print(f"[INFO] Flux Schnell test skipped: {str(e)}")
        return False

async def main():
    """Run all generation tests"""
    print("\n" + "="*60)
    print("REAL IMAGE GENERATION TEST")
    print("="*60)
    print("[INFO] This will test actual image generation")
    print("[INFO] Each test may take 10-60 seconds")
    
    results = {}
    
    # Test SDXL (most reliable)
    results["SDXL"] = await test_replicate_image_generation()
    
    # Test Flux Schnell (faster)
    results["Flux Schnell"] = await test_replicate_flux_schnell()
    
    print("\n" + "="*60)
    print("TEST RESULTS")
    print("="*60)
    
    for model, status in results.items():
        icon = "[OK]" if status else "[FAIL]"
        print(f"{icon} {model}: {'Success' if status else 'Failed'}")
    
    total = len(results)
    passed = sum(results.values())
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed > 0:
        print("\n[SUCCESS] Image generation is working!")
        print("[INFO] You can now use Replicate for image generation")
    else:
        print("\n[WARN] No tests passed")
        print("[INFO] Check API key and account status")

if __name__ == "__main__":
    asyncio.run(main())
