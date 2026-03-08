"""
AI Avatar Service - D-ID API Integration
Talking head video generation from image + text/audio
With Gamification XP integration
"""
import httpx
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime
import os
import uuid

from core.database import get_supabase_client
from core.logger import logger


class AvatarService:
    """D-ID API client for avatar video generation"""
    
    BASE_URL = "https://api.d-id.com"
    
    # Credit costs per duration
    CREDIT_COSTS = {
        15: 10,   # 15 seconds = 10 credits
        30: 20,   # 30 seconds = 20 credits
        60: 40,   # 60 seconds = 40 credits
        120: 75   # 2 minutes = 75 credits
    }
    
    # XP reward for avatar generation
    XP_REWARD = 25  # Same as video
    
    # Available voices (D-ID + Microsoft Neural)
    VOICES = [
        # Turkish
        {"id": "tr-TR-AhmetNeural", "name": "Ahmet", "language": "tr-TR", "gender": "male", "flag": "🇹🇷", "preview_text": "Merhaba, ben Ahmet. Size nasıl yardımcı olabilirim?"},
        {"id": "tr-TR-EmelNeural", "name": "Emel", "language": "tr-TR", "gender": "female", "flag": "🇹🇷", "preview_text": "Merhaba, ben Emel. Bugün size nasıl yardımcı olabilirim?"},
        # English
        {"id": "en-US-JennyNeural", "name": "Jenny", "language": "en-US", "gender": "female", "flag": "🇺🇸", "preview_text": "Hi, I'm Jenny. How can I help you today?"},
        {"id": "en-US-GuyNeural", "name": "Guy", "language": "en-US", "gender": "male", "flag": "🇺🇸", "preview_text": "Hey there, I'm Guy. What can I do for you?"},
        {"id": "en-US-AriaNeural", "name": "Aria", "language": "en-US", "gender": "female", "flag": "🇺🇸", "preview_text": "Hello, I'm Aria. Let me assist you with anything you need."},
        {"id": "en-GB-SoniaNeural", "name": "Sonia", "language": "en-GB", "gender": "female", "flag": "🇬🇧", "preview_text": "Hello, I'm Sonia. How may I help you?"},
        # German
        {"id": "de-DE-KatjaNeural", "name": "Katja", "language": "de-DE", "gender": "female", "flag": "🇩🇪", "preview_text": "Hallo, ich bin Katja. Wie kann ich Ihnen helfen?"},
        {"id": "de-DE-ConradNeural", "name": "Conrad", "language": "de-DE", "gender": "male", "flag": "🇩🇪", "preview_text": "Hallo, ich bin Conrad. Was kann ich für Sie tun?"},
        # French
        {"id": "fr-FR-DeniseNeural", "name": "Denise", "language": "fr-FR", "gender": "female", "flag": "🇫🇷", "preview_text": "Bonjour, je suis Denise. Comment puis-je vous aider?"},
        {"id": "fr-FR-HenriNeural", "name": "Henri", "language": "fr-FR", "gender": "male", "flag": "🇫🇷", "preview_text": "Bonjour, je suis Henri. Que puis-je faire pour vous?"},
        # Spanish
        {"id": "es-ES-ElviraNeural", "name": "Elvira", "language": "es-ES", "gender": "female", "flag": "🇪🇸", "preview_text": "Hola, soy Elvira. ¿En qué puedo ayudarte?"},
        {"id": "es-ES-AlvaroNeural", "name": "Álvaro", "language": "es-ES", "gender": "male", "flag": "🇪🇸", "preview_text": "Hola, soy Álvaro. ¿Cómo puedo ayudarte?"},
        # Japanese
        {"id": "ja-JP-NanamiNeural", "name": "Nanami", "language": "ja-JP", "gender": "female", "flag": "🇯🇵", "preview_text": "こんにちは、ナナミです。何かお手伝いできますか？"},
        # Korean
        {"id": "ko-KR-SunHiNeural", "name": "Sun-Hi", "language": "ko-KR", "gender": "female", "flag": "🇰🇷", "preview_text": "안녕하세요, 선희입니다. 무엇을 도와드릴까요?"},
        # Arabic
        {"id": "ar-SA-HamedNeural", "name": "Hamed", "language": "ar-SA", "gender": "male", "flag": "🇸🇦", "preview_text": "مرحبًا، أنا حامد. كيف يمكنني مساعدتك؟"},
    ]
    
    def __init__(self):
        self.api_key = os.getenv("DID_API_KEY", "")
        self.supabase = get_supabase_client()
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {
            "Authorization": f"Basic {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def get_credit_cost(self, duration_seconds: int) -> int:
        """Calculate credit cost based on video duration"""
        for tier, cost in sorted(self.CREDIT_COSTS.items()):
            if duration_seconds <= tier:
                return cost
        return self.CREDIT_COSTS[120]
    
    async def get_voices(self) -> list:
        """Get available voices"""
        return self.VOICES
    
    async def _add_xp(self, user_id: str) -> Dict[str, Any]:
        """Add XP for avatar generation using gamification service"""
        try:
            # Import here to avoid circular imports
            from services.gamification_service import GamificationService
            
            gamification = GamificationService(self.supabase)
            result = await gamification.add_xp(user_id, 'video', self.XP_REWARD)
            logger.info(f"Avatar XP awarded to user {user_id}: {result}")
            return result
        except Exception as e:
            logger.warning(f"Failed to add XP for avatar: {e}")
            return {"success": False, "error": str(e)}
    
    async def _deduct_credits(self, user_id: str, amount: int) -> bool:
        """Deduct credits from user"""
        try:
            # Get current credits
            result = self.supabase.table('users').select('credits').eq('id', user_id).single().execute()
            
            if not result.data:
                logger.warning(f"User {user_id} not found for credit deduction")
                return False
            
            current_credits = result.data.get('credits', 0)
            
            if current_credits < amount:
                return False
            
            # Deduct credits
            self.supabase.table('users').update({
                'credits': current_credits - amount
            }).eq('id', user_id).execute()
            
            logger.info(f"Deducted {amount} credits from user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Credit deduction failed: {e}")
            return False
    
    async def _check_user_credits(self, user_id: str, required: int) -> tuple[bool, int]:
        """Check if user has enough credits"""
        try:
            result = self.supabase.table('users').select('credits').eq('id', user_id).single().execute()
            
            if not result.data:
                # User not found, try with default
                return True, 1000
            
            current = result.data.get('credits', 0)
            return current >= required, current
        except Exception as e:
            logger.warning(f"Credit check failed: {e}, allowing by default")
            return True, 1000
    
    async def _generate_tts_audio(self, text: str, voice_id: str) -> Optional[str]:
        """Generate TTS and upload to storage, returning audio URL"""
        import base64
        import uuid
        import httpx
        from services.storage_service import storage_service
        
        audio_bytes = None
        
        # If it's a built-in neural voice (previously D-ID/Azure), we fallback to OpenAI TTS or default ElevenLabs
        if "Neural" in voice_id or "-" in voice_id:
            logger.info("Using OpenAI TTS as fallback for built-in voice")
            openai_key = os.getenv("OPENAI_API_KEY")
            if not openai_key:
                logger.error("OPENAI_API_KEY not found")
                return None
                
            # Map gender to OpenAI voices roughly
            voice = "alloy" # neutral
            if "female" in str(voice_id).lower() or any(x in voice_id for x in ["Emel", "Jenny", "Aria", "Sonia", "Katja", "Elvira"]):
                voice = "nova"
            elif "male" in str(voice_id).lower() or any(x in voice_id for x in ["Ahmet", "Guy", "Conrad", "Henri"]):
                voice = "echo"
                
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.openai.com/v1/audio/speech",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "tts-1",
                        "input": text,
                        "voice": voice
                    },
                    timeout=30.0
                )
                if resp.status_code == 200:
                    audio_bytes = resp.content
                else:
                    logger.error(f"OpenAI TTS error: {resp.text}")
                    return None
        else:
            # ElevenLabs Premium/Cloned Voice
            from services.voice_clone_service import voice_clone_service
            logger.info(f"Using ElevenLabs TTS for voice_id {voice_id}")
            tts_result = await voice_clone_service.generate_speech(voice_id, text)
            if tts_result.get("success") and tts_result.get("audio_base64"):
                audio_bytes = base64.b64decode(tts_result["audio_base64"])
            else:
                logger.error(f"ElevenLabs TTS failed: {tts_result.get('error')}")
                return None
                
        # Upload to Storage
        if audio_bytes:
            file_name = f"avatar_audio/{uuid.uuid4().hex[:12]}.mp3"
            audio_url = storage_service.upload_file(audio_bytes, file_name, "audio/mpeg")
            return audio_url
            
        return None

    async def create_talk(
        self,
        user_id: str,
        image_url: str,
        text: str,
        voice_id: str = "tr-TR-AhmetNeural",
        driver_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a talking avatar video via Kie.ai Kling using internal TTS
        """
        try:
            estimated_duration = max(5, min(30, len(text) // 10))
            # Kling 5s or 10s. Let's charge a fixed credit cost for Kling 2.6 Audio
            credit_cost = 110 # Kling 2.6 Audio 5s cost
            if estimated_duration > 5:
                credit_cost = 220 # 10s cost
            
            # Real API mode - check credits
            has_credits, current_credits = await self._check_user_credits(user_id, credit_cost)
            
            if not has_credits:
                return {
                    "success": False,
                    "error": "insufficient_credits",
                    "message": f"Yetersiz kredi. Gerekli: {credit_cost}💎, Mevcut: {current_credits}💎"
                }

            kie_api_key = os.getenv("KIE_API_KEY")
            if not kie_api_key or kie_api_key == "demo":
                return {
                    "success": False,
                    "error": "missing_api_key",
                    "message": "KIE_API_KEY is not configured."
                }
            # 1. Generate Audio URL
            audio_url = await self._generate_tts_audio(text, voice_id)
            if not audio_url:
                return {
                    "success": False,
                    "error": "tts_failed",
                    "message": "Ses oluşturulamadı. Lütfen API ayarlarını kontrol edin."
                }
                
            return await self._submit_kie_avatar(user_id, image_url, audio_url, credit_cost, text=text, voice_id=voice_id)
            
        except Exception as e:
            logger.error(f"Avatar creation error: {str(e)}")
            return {
                "success": False,
                "error": "internal_error",
                "message": str(e)
            }
            
    async def _submit_kie_avatar(
        self, 
        user_id: str, 
        image_url: str, 
        audio_url: str, 
        credit_cost: int,
        text: str = "[audio_file]",
        voice_id: str = "custom_audio"
    ) -> Dict[str, Any]:
        """Submits the image to Kie.ai Kling 2.6 via Market API (createTask)"""
        try:
            kie_api_key = os.getenv("KIE_API_KEY")
            
            kie_model = "kling-2.6/image-to-video"
            duration = "5"
            if credit_cost > 110:
                duration = "10"

            payload = {
                "model": kie_model,
                "input": {
                    "prompt": "A person speaking naturally, clear lip movements synchronized with audio, front facing, professional talking head video",
                    "sound": True,
                    "duration": duration,
                    "aspect_ratio": "16:9",
                    "image_urls": [image_url]
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.kie.ai/api/v1/jobs/createTask",
                    headers={
                        "Authorization": f"Bearer {kie_api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=30.0
                )
                
                result = response.json()
                
                if result.get("code") != 200:
                    error_msg = result.get("msg", "Unknown error")
                    logger.error(f"Kie.ai createTask error: {error_msg}")
                    return {
                        "success": False,
                        "error": "api_error",
                        "message": f"Video oluşturma hatası: {error_msg}"
                    }
                
                task_id = result["data"]["taskId"]
                
                # Deduct credits
                await self._deduct_credits(user_id, credit_cost)
                
                # Add XP
                xp_result = await self._add_xp(user_id)
                
                # Save to database
                try:
                    self.supabase.table('avatar_jobs').insert({
                        'user_id': user_id,
                        'job_id': task_id,
                        'status': 'processing',
                        'image_url': image_url,
                        'text': text,
                        'voice_id': voice_id,
                        'credit_cost': credit_cost
                    }).execute()
                except Exception as e:
                    logger.warning(f"Avatar job save error: {e}")
                
                return {
                    "success": True,
                    "job_id": task_id,
                    "status": "processing",
                    "credit_cost": credit_cost,
                    "xp_earned": self.XP_REWARD,
                    "level_up": xp_result.get("level_up", False)
                }
        except Exception as e:
            logger.error(f"Kie Avatar submit error: {str(e)}")
            return {
                "success": False,
                "error": "internal_error",
                "message": str(e)
            }
    
    async def create_talk_with_audio(
        self,
        user_id: str,
        image_url: str,
        audio_url: str
    ) -> Dict[str, Any]:
        """
        Create a talking avatar video using custom audio file via Kie.ai Kling
        """
        try:
            credit_cost = 110  # Kling 5s default cost for audio mode
            
            # Real API mode - check credits
            has_credits, current_credits = await self._check_user_credits(user_id, credit_cost)
            
            if not has_credits:
                return {
                    "success": False,
                    "error": "insufficient_credits",
                    "message": f"Yetersiz kredi. Gerekli: {credit_cost}💎, Mevcut: {current_credits}💎"
                }

            kie_api_key = os.getenv("KIE_API_KEY")
            if not kie_api_key or kie_api_key == "demo":
                return {
                    "success": False,
                    "error": "missing_api_key",
                    "message": "KIE_API_KEY is not configured."
                }                
            return await self._submit_kie_avatar(user_id, image_url, audio_url, credit_cost, text="[audio_file]", voice_id="custom_audio")
            
        except Exception as e:
            logger.error(f"Avatar with audio error: {str(e)}")
            return {
                "success": False,
                "error": "internal_error",
                "message": str(e)
            }

    async def get_talk_status(self, job_id: str) -> Dict[str, Any]:
        """Get the status of an avatar job from Kie.ai (Market API)"""
        try:
            if job_id.startswith("demo_"):
                return {
                    "success": True,
                    "job_id": job_id,
                    "status": "done",
                    "result_url": "https://www.w3schools.com/html/mov_bbb.mp4",
                    "demo_mode": True
                }
            
            kie_api_key = os.getenv("KIE_API_KEY")
            if not kie_api_key:
                return {"success": False, "error": "no_api_key"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.kie.ai/api/v1/jobs/recordInfo",
                    params={"taskId": job_id},
                    headers={
                        "Authorization": f"Bearer {kie_api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    return {"success": False, "error": "not_found"}
                
                result = response.json()
                if result.get("code") != 200:
                    return {"success": False, "error": "api_error"}
                
                task_data = result.get("data", {})
                raw_state = task_data.get("state", "processing")
                
                # Check status
                status = "processing"
                result_url = None
                error_msg = None
                
                if raw_state == "success":
                    status = "done"
                    # Parse resultJson string
                    import json
                    try:
                        res_json_str = task_data.get("resultJson", "{}")
                        res_json = json.loads(res_json_str) if isinstance(res_json_str, str) else res_json_str
                        urls = res_json.get("resultUrls", [])
                        if urls:
                            result_url = urls[0]
                    except:
                        pass
                elif raw_state == "fail":
                    status = "error"
                    error_msg = task_data.get("failMsg", "Unknown error")

                # Update database & notify
                if status in ["done", "error"]:
                    try:
                        job_record = self.supabase.table("avatar_jobs").select("status", "user_id").eq("job_id", job_id).single().execute()
                        if job_record.data and job_record.data.get("status") not in ["done", "error"]:
                            self.supabase.table("avatar_jobs").update({
                                "status": status,
                                "result_url": result_url
                            }).eq("job_id", job_id).execute()
                            
                            if status == "done":
                                from core.notification_service import notify_generation_complete
                                import asyncio
                                user_id = job_record.data.get("user_id")
                                asyncio.create_task(notify_generation_complete(
                                    user_id=user_id,
                                    generation_type="avatar",
                                    generation_id=job_id
                                ))
                    except Exception as e:
                        logger.warning(f"Error updating avatar job status in DB: {e}")
                
                return {
                    "success": True,
                    "job_id": job_id,
                    "status": status,
                    "result_url": result_url,
                    "error": error_msg
                }
                
        except Exception as e:
            logger.error(f"Get talk status error: {str(e)}")
            return {"success": False, "error": str(e)}

# Singleton instance
avatar_service = AvatarService()
