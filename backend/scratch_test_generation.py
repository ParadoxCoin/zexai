import asyncio
from core.supabase_client import get_supabase_client
from schemas.video import VideoGenerateRequest
from services.unified_video_service import unified_video_service
from services.video_service import video_service

class MockUser:
    def __init__(self, user_id):
        self.id = user_id

async def test():
    db = get_supabase_client()
    
    # Try to find a real user to make sure we bypass RLS correctly
    users = db.table("user_credits").select("user_id").limit(1).execute()
    if users.data:
        user_id = users.data[0]["user_id"]
        print(f"Using real user from DB: {user_id}")
    else:
        user_id = "00000000-0000-0000-0000-000000000000"
        print(f"No users found, using fallback UUID: {user_id}")
        
    user = MockUser(user_id)
    
    request = VideoGenerateRequest(
        model_id="kie_runway_gen3",
        prompt="A beautiful sunset over the digital ocean, neon waves, synthwave style, cinematic motion, 4k",
        duration=5,
        aspect_ratio="16:9"
    )
    
    print("\n--- Testing Unified Video Service ---")
    try:
        res = await unified_video_service.start_video_generation(request, user, db)
        print("Success in Unified Video Service!")
        print(f"Response: {res}")
    except Exception as e:
        print(f"Unified Video Service Failed: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Testing Legacy Video Service ---")
    try:
        res = await video_service.start_video_generation(request, user, db)
        print("Success in Legacy Video Service!")
        print(f"Response: {res}")
    except Exception as e:
        print(f"Legacy Video Service Failed: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
