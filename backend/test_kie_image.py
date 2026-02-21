"""
Direct test: Call the image generation service inline to find the 500 error.
Run: python test_kie_image.py
"""
import os, sys, asyncio, traceback
sys.path.insert(0, '.')

from dotenv import load_dotenv
load_dotenv()

async def test_flow():
    print("=" * 60)
    print("TEST 1: Import check")
    print("=" * 60)
    
    try:
        from core.config import settings
        print(f"  KIE_API_KEY present: {bool(settings.KIE_API_KEY)}")
        print(f"  KIE_API_KEY length: {len(settings.KIE_API_KEY)}")
        print(f"  KIE_API_KEY preview: {settings.KIE_API_KEY[:8]}...")
    except Exception as e:
        print(f"  ❌ Config error: {e}")
        traceback.print_exc()
        return
    
    print("\n" + "=" * 60)
    print("TEST 2: KIE_IMAGE_MODELS import")
    print("=" * 60)
    
    try:
        from core.kie_models import KIE_IMAGE_MODELS
        print(f"  Models loaded: {len(KIE_IMAGE_MODELS)}")
        
        test_model = "kie_zimage"
        model_config = KIE_IMAGE_MODELS.get(test_model)
        print(f"  Test model {test_model}: {model_config.get('model_id')}, api_type={model_config.get('api_type')}")
    except Exception as e:
        print(f"  ❌ Model import error: {e}")
        traceback.print_exc()
        return
    
    print("\n" + "=" * 60)
    print("TEST 3: KIE Provider direct call")
    print("=" * 60)
    
    try:
        from services.providers.kie_provider import kie_provider
        print(f"  Provider base_url: {kie_provider.base_url}")
        print(f"  Provider API key present: {bool(kie_provider.api_key)}")
        print(f"  Provider API key: {kie_provider.api_key[:8]}...")
        
        # Direct API call test
        print("\n  Calling kie_provider.generate_image('kie_zimage', 'a red cat', ...)...")
        urls = await kie_provider.generate_image(
            "kie_zimage", 
            "a cute red cat sitting on a chair",
            {"aspect_ratio": "1:1", "num_images": 1}
        )
        print(f"  ✅ Success! URLs: {urls}")
    except Exception as e:
        print(f"  ❌ Provider error: {type(e).__name__}: {e}")
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("TEST 4: Image Service model lookup")
    print("=" * 60)
    
    try:
        from core.image_models import ALL_IMAGE_MODELS
        from core.kie_models import KIE_IMAGE_MODELS
        
        model = ALL_IMAGE_MODELS.get("kie_zimage") or KIE_IMAGE_MODELS.get("kie_zimage")
        if model:
            print(f"  ✅ Model found: provider={model['provider']}, name={model['name']}")
        else:
            print(f"  ❌ Model 'kie_zimage' NOT FOUND!")
    except Exception as e:
        print(f"  ❌ Lookup error: {e}")
        traceback.print_exc()

asyncio.run(test_flow())
