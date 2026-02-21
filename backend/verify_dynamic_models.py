import asyncio
import sys
import os
from unittest.mock import MagicMock, AsyncMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock environment variables
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_KEY"] = "example-key"
os.environ["POLLO_API_KEY"] = "pollo-key"
os.environ["OPENAI_API_KEY"] = "openai-key"
os.environ["MANUS_API_KEY"] = "manus-key"

# Mock Supabase Client
mock_supabase = MagicMock()
mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"id": "test-id"}]
mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "test-id"}]

# Mock ModelService responses
mock_models = [
    {
        "id": "test-video-model",
        "name": "Test Video Model",
        "type": "text_to_video",
        "provider_id": "pollo",
        "cost_per_unit": 0.1,
        "cost_multiplier": 1.0,
        "parameters": {"duration": 5}
    },
    {
        "id": "test-chat-model",
        "name": "Test Chat Model",
        "type": "chat",
        "provider_id": "openai",
        "cost_per_unit": 0.01,
        "cost_multiplier": 1.0
    },
    {
        "id": "test-tts-model",
        "name": "Test TTS Model",
        "type": "text_to_speech",
        "provider_id": "elevenlabs",
        "cost_per_unit": 0.005,
        "cost_multiplier": 1.0
    }
]

mock_provider_config = {
    "api_key": "test-key",
    "base_url": "https://api.test.com"
}

# Patch ModelService
from services.model_service import model_service
model_service.get_models = AsyncMock(return_value=mock_models)
model_service.get_model_by_id = AsyncMock(return_value=mock_models[0])
model_service.get_provider_config = AsyncMock(return_value=mock_provider_config)

# Import Services
from services.video_service import video_service
from services.synapse_service import synapse_service
from schemas.video import VideoGenerateRequest
from schemas.synapse import SynapseTaskCreate
from types import SimpleNamespace

async def verify_video_service():
    print("Verifying VideoService...")
    user = SimpleNamespace(id="test-user")
    req = VideoGenerateRequest(model_id="test-video-model", prompt="test prompt")
    
    # Mock CreditManager
    from core.credits import CreditManager
    CreditManager.check_sufficient_credits = AsyncMock()
    CreditManager.deduct_credits = AsyncMock()
    
    # Mock HTTP Client
    video_service.http_client.post = AsyncMock(return_value=SimpleNamespace(status_code=200, json=lambda: {"task_id": "provider-task-id"}))
    
    try:
        response = await video_service.start_video_generation(req, user, mock_supabase)
        print(f"Video Generation Response: {response}")
        assert response.success == True
    except Exception as e:
        print(f"VideoService Error: {e}")
        raise

async def verify_synapse_service():
    print("\nVerifying SynapseService...")
    user = SimpleNamespace(id="test-user")
    req = SynapseTaskCreate(objective="test objective", max_credits=10)
    
    # Mock CreditManager
    from core.credits import CreditManager
    CreditManager.get_user_balance = AsyncMock(return_value=100)
    
    try:
        response = await synapse_service.create_synapse_task(req, user, mock_supabase)
        print(f"Synapse Task Response: {response}")
        assert response.status == "pending"
        
        # Verify call_manus_api
        synapse_service.http_client.post = AsyncMock(return_value=SimpleNamespace(status_code=200, json=lambda: {"status": "queued"}))
        await synapse_service.call_manus_api(response.task_id, req.objective, {}, [], 10, 5, mock_supabase)
        print("Synapse API call verified.")
        
    except Exception as e:
        print(f"SynapseService Error: {e}")
        raise

async def main():
    await verify_video_service()
    await verify_synapse_service()
    print("\nAll verifications passed!")

if __name__ == "__main__":
    asyncio.run(main())
