"""
Voice Clone Service
ElevenLabs API integration for voice cloning
"""
import httpx
import os
import base64
from typing import Optional, Dict, Any, List
from core.supabase_client import get_supabase_client
from core.logger import logger


class VoiceCloneService:
    """Service for voice cloning using ElevenLabs API"""
    
    BASE_URL = "https://api.elevenlabs.io/v1"
    CREDIT_COST = 100  # Credits per voice clone
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY", "")
        self.supabase = get_supabase_client()
    
    def _get_headers(self):
        return {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def clone_voice(
        self, 
        user_id: str, 
        name: str, 
        audio_data: bytes,
        description: str = ""
    ) -> Dict[str, Any]:
        """Clone a voice from audio sample"""
        try:
            if not self.api_key:
                return {"success": False, "error": "ElevenLabs API key not configured"}
            
            # Create DB record first
            db_result = self.supabase.table('voice_clones').insert({
                'user_id': user_id,
                'name': name,
                'status': 'processing',
                'credit_cost': self.CREDIT_COST
            }).execute()
            
            clone_id = db_result.data[0]['id']
            
            # Call ElevenLabs API
            async with httpx.AsyncClient() as client:
                # Create form data for voice cloning
                files = {
                    'files': ('audio.mp3', audio_data, 'audio/mpeg')
                }
                data = {
                    'name': name,
                    'description': description or f"Voice clone for user"
                }
                
                response = await client.post(
                    f"{self.BASE_URL}/voices/add",
                    headers={"xi-api-key": self.api_key},
                    files=files,
                    data=data,
                    timeout=120.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    voice_id = result.get('voice_id')
                    
                    # Update DB with success
                    self.supabase.table('voice_clones').update({
                        'elevenlabs_voice_id': voice_id,
                        'status': 'ready'
                    }).eq('id', clone_id).execute()
                    
                    logger.info(f"Voice cloned successfully: {voice_id}")
                    
                    return {
                        "success": True,
                        "clone_id": clone_id,
                        "voice_id": voice_id,
                        "name": name,
                        "credit_cost": self.CREDIT_COST
                    }
                else:
                    error_msg = response.text
                    logger.error(f"ElevenLabs API error: {error_msg}")
                    
                    # Update DB with failure
                    self.supabase.table('voice_clones').update({
                        'status': 'failed',
                        'error_message': error_msg[:500]
                    }).eq('id', clone_id).execute()
                    
                    return {"success": False, "error": error_msg}
                    
        except Exception as e:
            logger.error(f"Voice clone error: {e}")
            return {"success": False, "error": str(e)}
    
    async def list_user_voices(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's cloned voices"""
        try:
            result = self.supabase.table('voice_clones').select('*').eq(
                'user_id', user_id
            ).order('created_at', desc=True).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"List voices error: {e}")
            return []
    
    async def delete_voice(self, user_id: str, clone_id: str) -> Dict[str, Any]:
        """Delete a cloned voice"""
        try:
            # Get the voice record
            voice = self.supabase.table('voice_clones').select('*').eq(
                'id', clone_id
            ).eq('user_id', user_id).execute()
            
            if not voice.data:
                return {"success": False, "error": "Ses bulunamadı"}
            
            voice_data = voice.data[0]
            
            # Delete from ElevenLabs if exists
            if voice_data.get('elevenlabs_voice_id') and self.api_key:
                async with httpx.AsyncClient() as client:
                    await client.delete(
                        f"{self.BASE_URL}/voices/{voice_data['elevenlabs_voice_id']}",
                        headers=self._get_headers(),
                        timeout=30.0
                    )
            
            # Delete from DB
            self.supabase.table('voice_clones').delete().eq('id', clone_id).execute()
            
            return {"success": True, "message": "Ses silindi"}
            
        except Exception as e:
            logger.error(f"Delete voice error: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_speech(
        self, 
        voice_id: str, 
        text: str,
        stability: float = 0.5,
        similarity_boost: float = 0.75
    ) -> Dict[str, Any]:
        """Generate speech using cloned voice"""
        try:
            if not self.api_key:
                return {"success": False, "error": "ElevenLabs API key not configured"}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/text-to-speech/{voice_id}",
                    headers=self._get_headers(),
                    json={
                        "text": text,
                        "model_id": "eleven_multilingual_v2",
                        "voice_settings": {
                            "stability": stability,
                            "similarity_boost": similarity_boost
                        }
                    },
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    audio_data = response.content
                    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                    
                    return {
                        "success": True,
                        "audio_base64": audio_base64,
                        "content_type": "audio/mpeg"
                    }
                else:
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logger.error(f"Generate speech error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_available_voices(self) -> List[Dict[str, Any]]:
        """Get all available voices from ElevenLabs"""
        try:
            if not self.api_key:
                return []
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/voices",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get('voices', [])
                return []
        except:
            return []


# Singleton
voice_clone_service = VoiceCloneService()
