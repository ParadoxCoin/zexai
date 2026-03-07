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
    
    async def create_talk(
        self,
        user_id: str,
        image_url: str,
        text: str,
        voice_id: str = "tr-TR-AhmetNeural",
        driver_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a talking avatar video
        """
        try:
            estimated_duration = max(15, min(120, len(text) // 10))
            credit_cost = self.get_credit_cost(estimated_duration)
            
            # Demo mode - no API key
            if not self.api_key or self.api_key == "demo":
                return await self._create_demo_talk(user_id, image_url, text, voice_id, credit_cost)
            
            # Real API mode - check credits
            has_credits, current_credits = await self._check_user_credits(user_id, credit_cost)
            
            if not has_credits:
                return {
                    "success": False,
                    "error": "insufficient_credits",
                    "message": f"Yetersiz kredi. Gerekli: {credit_cost}💎, Mevcut: {current_credits}💎"
                }
            
            # Create talk request to D-ID
            payload = {
                "source_url": image_url,
                "script": {
                    "type": "text",
                    "input": text,
                    "provider": {
                        "type": "microsoft",
                        "voice_id": voice_id
                    }
                },
                "config": {
                    "stitch": True,
                    "result_format": "mp4"
                }
            }
            
            if driver_url:
                payload["driver_url"] = driver_url
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/talks",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code != 201:
                    logger.error(f"D-ID API error: {response.text}")
                    return {
                        "success": False,
                        "error": "api_error",
                        "message": "Video oluşturma hatası"
                    }
                
                result = response.json()
                talk_id = result.get("id")
                
                # Deduct credits
                await self._deduct_credits(user_id, credit_cost)
                
                # Add XP
                xp_result = await self._add_xp(user_id)
                
                # Save to database
                try:
                    self.supabase.table('avatar_jobs').insert({
                        'user_id': user_id,
                        'job_id': talk_id,
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
                    "job_id": talk_id,
                    "status": "processing",
                    "estimated_duration": estimated_duration,
                    "credit_cost": credit_cost,
                    "xp_earned": self.XP_REWARD,
                    "level_up": xp_result.get("level_up", False)
                }
                
        except Exception as e:
            logger.error(f"Avatar creation error: {str(e)}")
            return {
                "success": False,
                "error": "internal_error",
                "message": str(e)
            }
    
    async def _create_demo_talk(
        self, 
        user_id: str, 
        image_url: str, 
        text: str, 
        voice_id: str,
        credit_cost: int
    ) -> Dict[str, Any]:
        """Create a demo talk (simulated) - no DB operations"""
        job_id = f"demo_{uuid.uuid4().hex[:8]}"
        
        logger.info(f"[DEMO MODE] Avatar generation for user {user_id}")
        
        return {
            "success": True,
            "job_id": job_id,
            "status": "demo",
            "result_url": "https://www.w3schools.com/html/mov_bbb.mp4",
            "estimated_duration": max(15, len(text) // 10),
            "credit_cost": credit_cost,
            "demo_mode": True,
            "xp_earned": 0,
            "message": "Demo modu. DID_API_KEY ekleyerek gerçek video üretebilirsiniz."
        }
    
    async def create_talk_with_audio(
        self,
        user_id: str,
        image_url: str,
        audio_url: str
    ) -> Dict[str, Any]:
        """
        Create a talking avatar video using custom audio file
        """
        try:
            credit_cost = 20  # Fixed cost for audio mode
            
            # Demo mode - no API key
            if not self.api_key or self.api_key == "demo":
                job_id = f"demo_{uuid.uuid4().hex[:8]}"
                logger.info(f"[DEMO MODE] Avatar with audio for user {user_id}")
                return {
                    "success": True,
                    "job_id": job_id,
                    "status": "demo",
                    "result_url": "https://www.w3schools.com/html/mov_bbb.mp4",
                    "credit_cost": credit_cost,
                    "demo_mode": True,
                    "xp_earned": 0,
                    "message": "Demo modu. DID_API_KEY ekleyerek gerçek video üretebilirsiniz."
                }
            
            # Real API mode - check credits
            has_credits, current_credits = await self._check_user_credits(user_id, credit_cost)
            
            if not has_credits:
                return {
                    "success": False,
                    "error": "insufficient_credits",
                    "message": f"Yetersiz kredi. Gerekli: {credit_cost}💎, Mevcut: {current_credits}💎"
                }
            
            # Create talk request to D-ID with audio
            payload = {
                "source_url": image_url,
                "script": {
                    "type": "audio",
                    "audio_url": audio_url
                },
                "config": {
                    "stitch": True,
                    "result_format": "mp4"
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/talks",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code != 201:
                    logger.error(f"D-ID API error (audio): {response.text}")
                    return {
                        "success": False,
                        "error": "api_error",
                        "message": "Ses dosyası ile video oluşturma hatası"
                    }
                
                result = response.json()
                talk_id = result.get("id")
                
                # Deduct credits
                await self._deduct_credits(user_id, credit_cost)
                
                # Add XP
                xp_result = await self._add_xp(user_id)
                
                # Save to database
                try:
                    self.supabase.table('avatar_jobs').insert({
                        'user_id': user_id,
                        'job_id': talk_id,
                        'status': 'processing',
                        'image_url': image_url,
                        'text': '[audio_file]',
                        'voice_id': 'custom_audio',
                        'credit_cost': credit_cost
                    }).execute()
                except Exception as e:
                    logger.warning(f"Avatar job save error: {e}")
                
                return {
                    "success": True,
                    "job_id": talk_id,
                    "status": "processing",
                    "credit_cost": credit_cost,
                    "xp_earned": self.XP_REWARD,
                    "level_up": xp_result.get("level_up", False)
                }
                
        except Exception as e:
            logger.error(f"Avatar with audio error: {str(e)}")
            return {
                "success": False,
                "error": "internal_error",
                "message": str(e)
            }

    async def get_talk_status(self, job_id: str) -> Dict[str, Any]:
        """Get the status of a talk job"""
        try:
            if job_id.startswith("demo_"):
                return {
                    "success": True,
                    "job_id": job_id,
                    "status": "done",
                    "result_url": "https://www.w3schools.com/html/mov_bbb.mp4",
                    "demo_mode": True
                }
            
            if not self.api_key:
                return {"success": False, "error": "no_api_key"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/talks/{job_id}",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    return {"success": False, "error": "not_found"}
                
                result = response.json()
                status = result.get("status")
                
                result_url = result.get("result_url") if status == "done" else None
                error_msg = result.get("error") if status == "error" else None

                if status in ["done", "error"]:
                    try:
                        # Check current DB status to avoid duplicate notifications
                        job_record = self.supabase.table("avatar_jobs").select("status", "user_id").eq("job_id", job_id).single().execute()
                        if job_record.data and job_record.data.get("status") not in ["done", "error"]:
                            # Update DB
                            self.supabase.table("avatar_jobs").update({
                                "status": status,
                                "result_url": result_url
                            }).eq("job_id", job_id).execute()
                            
                            # Fire notification
                            if status == "done":
                                from core.notification_service import notify_generation_complete
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
    
    async def create_talk_with_audio(
        self,
        user_id: str,
        image_url: str,
        audio_url: str
    ) -> Dict[str, Any]:
        """Create a talking avatar video with custom audio"""
        try:
            credit_cost = 20
            
            if not self.api_key or self.api_key == "demo":
                return await self._create_demo_talk(user_id, image_url, "Audio upload", "custom", credit_cost)
            
            has_credits, current = await self._check_user_credits(user_id, credit_cost)
            
            if not has_credits:
                return {
                    "success": False,
                    "error": "insufficient_credits",
                    "message": f"Yetersiz kredi. Gerekli: {credit_cost}💎"
                }
            
            payload = {
                "source_url": image_url,
                "script": {
                    "type": "audio",
                    "audio_url": audio_url
                },
                "config": {
                    "stitch": True,
                    "result_format": "mp4"
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/talks",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code != 201:
                    return {"success": False, "error": "api_error"}
                
                result = response.json()
                talk_id = result.get("id")
                
                # Deduct credits
                await self._deduct_credits(user_id, credit_cost)
                
                # Add XP
                xp_result = await self._add_xp(user_id)
                
                return {
                    "success": True,
                    "job_id": talk_id,
                    "status": "processing",
                    "credit_cost": credit_cost,
                    "xp_earned": self.XP_REWARD,
                    "level_up": xp_result.get("level_up", False)
                }
                
        except Exception as e:
            logger.error(f"Avatar with audio error: {str(e)}")
            return {"success": False, "error": str(e)}


# Singleton instance
avatar_service = AvatarService()
