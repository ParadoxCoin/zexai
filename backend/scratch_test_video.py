import os
import sys
import asyncio

# Setup python path to include the current directory
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from core.supabase_client import get_supabase_client
from schemas.video import VideoGenerateRequest
from services.unified_video_service import unified_video_service
from services.video_service import video_service
from core.security import get_current_user

class MockUser:
    def __init__(self):
        self.id = "c4d0263f-67bd-42ef-ad8e-8a1a2b163d8e" # A real user ID in public.users or user_credits
        self.email = "luxor00@gmail.com"

async def test():
    db = get_supabase_client()
    user = MockUser()
    
    # Let's check user credits first
    try:
        credits_res = db.table("user_credits").select("credits").eq("user_id", user.id).single().execute()
        print(f"User Credits: {credits_res.data}")
    except Exception as e:
        print(f"Failed to fetch credits: {e}")
        
    req = VideoGenerateRequest(
        model_id="kie_kling26_i2v",
        prompt="A cute cat playing with a toy",
        aspect_ratio="16:9",
        duration=5,
        image_url="https://dyxvsnfrcmjkbzerrsmu.supabase.co/storage/v1/object/public/media/5c8cd695-942b-407d-b69f-71d29b0cdfdf/ae3fb7d9-5cc8-4e8c-8c08-bdf76f18374d.png"
    )
    
    print("\n--- Testing Unified Video Service ---")
    try:
        res = await unified_video_service.start_video_generation(req, user, db)
        print(f"Unified Success: {res}")
    except Exception as e:
        print("Unified Service Failed:")
        import traceback
        traceback.print_exc()
        
    print("\n--- Testing Legacy Video Service ---")
    try:
        res = await video_service.start_video_generation(req, user, db)
        print(f"Legacy Success: {res}")
    except Exception as e:
        print("Legacy Service Failed:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
