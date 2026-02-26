from dotenv import load_dotenv
load_dotenv()
import asyncio
import httpx
from services.model_comparison_service import model_comparison_service

async def test():
    # Fetch all free models
    api_key = await model_comparison_service._get_api_key("openrouter")
    r = httpx.get('https://openrouter.ai/api/v1/models', headers={'Authorization': f'Bearer {api_key}'})
    models = r.json().get('data', [])
    free_models = [m['id'] for m in models if float(m['pricing']['prompt']) == 0 and float(m['pricing']['completion']) == 0][:15]
    
    print(f"Testing {len(free_models)} free models...")
    working = []
    
    for m in free_models:
        try:
            res = await model_comparison_service._call_openrouter(m, "Hi")
            print(f"SUCCESS {m}")
            working.append(m)
            if len(working) == 5:
                break
        except Exception as e:
            pass
            
    print("\nWORKING MODELS:")
    for w in working:
        print(w)

asyncio.run(test())
