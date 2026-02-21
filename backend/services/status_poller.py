"""
Background Status Poller Service
Automatically checks and updates status of pending video generations from Kie.ai
"""
import asyncio
import httpx
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from core.supabase_client import get_supabase_client
from core.logger import logger


class StatusPollerService:
    """Background service to poll Kie.ai for pending video status updates"""
    
    def __init__(self):
        self.is_running = False
        self.poll_interval = 30  # seconds
        self._task: Optional[asyncio.Task] = None
        
    def get_db(self):
        """Get Supabase client"""
        return get_supabase_client()
    
    async def start(self):
        """Start the background polling task"""
        if self.is_running:
            logger.info("[StatusPoller] Already running")
            return
            
        self.is_running = True
        self._task = asyncio.create_task(self._polling_loop())
        logger.info(f"[StatusPoller] Started - polling every {self.poll_interval}s")
        
    async def stop(self):
        """Stop the background polling task"""
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("[StatusPoller] Stopped")
        
    async def _polling_loop(self):
        """Main polling loop"""
        while self.is_running:
            try:
                await self._poll_pending_videos()
            except Exception as e:
                logger.error(f"[StatusPoller] Error in polling loop: {e}")
            
            await asyncio.sleep(self.poll_interval)
    
    async def _poll_pending_videos(self):
        """Check status of all pending videos"""
        try:
            db = self.get_db()
            
            # Get all pending/processing videos - model info is in generation_details or model_name
            pending_result = db.table("media_outputs").select(
                "id, provider_task_id, generation_details, created_at, status, model_name"
            ).in_("status", ["pending", "processing"]).eq("service_type", "video").limit(20).execute()
            
            if not pending_result.data:
                return
                
            # Get Kie.ai API key
            key_result = db.table("provider_keys").select("api_key").eq("provider_id", "kie").eq("is_active", True).limit(1).execute()
            api_key = key_result.data[0]["api_key"] if key_result.data else None
            
            if not api_key:
                logger.warning("[StatusPoller] No Kie.ai API key found")
                return
            
            logger.info(f"[StatusPoller] Checking {len(pending_result.data)} pending videos")
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                for video in pending_result.data:
                    await self._check_single_video(db, client, api_key, video)
                    
        except Exception as e:
            logger.error(f"[StatusPoller] Poll error: {e}")
    
    def _get_status_endpoint(self, model_id: str, task_id: str, endpoint: str = "", model_name: str = "") -> tuple[str, str]:
        """Get correct status endpoint based on model type, endpoint URL, or model name
        Returns: (endpoint_url, api_type)
        """
        model_id_lower = (model_id or "").lower()
        endpoint_lower = (endpoint or "").lower()
        model_name_lower = (model_name or "").lower()
        
        # First try model_id detection
        if "veo" in model_id_lower:
            return (f"https://api.kie.ai/api/v1/veo/record-info?taskId={task_id}", "veo")
        elif "runway" in model_id_lower:
            return (f"https://api.kie.ai/api/v1/runway/record-detail?taskId={task_id}", "runway")
        
        # Second: detect from endpoint URL
        if "/veo/" in endpoint_lower:
            return (f"https://api.kie.ai/api/v1/veo/record-info?taskId={task_id}", "veo")
        elif "/runway/" in endpoint_lower:
            return (f"https://api.kie.ai/api/v1/runway/record-detail?taskId={task_id}", "runway")
        
        # Third: detect from model_name (for older videos)
        if "veo" in model_name_lower:
            return (f"https://api.kie.ai/api/v1/veo/record-info?taskId={task_id}", "veo")
        elif "runway" in model_name_lower:
            return (f"https://api.kie.ai/api/v1/runway/record-detail?taskId={task_id}", "runway")
        
        # Default: Market API (Kling, Wan, Hailuo, Sora, etc.)
        return (f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={task_id}", "market")
    
    async def _check_single_video(self, db, client: httpx.AsyncClient, api_key: str, video: dict):
        """Check status of a single video"""
        try:
            # Get provider_task_id
            provider_task_id = video.get("provider_task_id")
            if not provider_task_id:
                gen_details = video.get("generation_details") or {}
                provider_task_id = gen_details.get("provider_task_id")
            
            if not provider_task_id:
                # Check if video is old (> 6 hours) with no task ID - mark as failed
                created_at_str = video.get("created_at", "")
                if created_at_str:
                    try:
                        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                        if datetime.now(timezone.utc) - created_at > timedelta(hours=6):
                            db.table("media_outputs").update({
                                "status": "failed"
                            }).eq("id", video["id"]).execute()
                            logger.info(f"[StatusPoller] Marked as failed (no task ID): {video['id']}")
                    except:
                        pass
                return
            
            # Get model detection info from multiple sources
            gen_details = video.get("generation_details") or {}
            model_id = gen_details.get("model_id", "") or gen_details.get("model", "")
            endpoint = gen_details.get("endpoint", "")  # From generation
            model_name = video.get("model_name", "")  # From DB column
            
            status_url, api_type = self._get_status_endpoint(model_id, provider_task_id, endpoint, model_name)
            
            print(f"[StatusPoll] ModelID: {model_id}, ModelName: {model_name}, API: {api_type}")
            
            response = await client.get(
                status_url,
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle different API response formats
                if api_type == "veo":
                    await self._handle_veo_response(db, video, data)
                elif api_type == "runway":
                    await self._handle_runway_response(db, video, data)
                else:
                    await self._handle_market_response(db, video, data)
                    
        except Exception as e:
            logger.error(f"[StatusPoller] Error checking video {video.get('id')}: {e}")
    
    async def _handle_veo_response(self, db, video: dict, data: dict):
        """Handle VEO API response format with successFlag"""
        # Debug: Print full VEO response
        print(f"[VEO Debug] Video: {video['id']}, Response: {data}")
        
        if data.get("code") == 200:
            task_data = data.get("data") or {}
            success_flag = task_data.get("successFlag")
            
            print(f"[VEO Debug] successFlag: {success_flag}, task_data keys: {task_data.keys()}")
            
            if success_flag == 1:  # Success
                # VEO returns resultUrls inside response object as array (not JSON string)
                video_url = None
                response_obj = task_data.get("response", {})
                result_urls = response_obj.get("resultUrls", [])
                
                if result_urls and isinstance(result_urls, list) and len(result_urls) > 0:
                    video_url = result_urls[0]
                
                print(f"[VEO Debug] Extracted video_url: {video_url}")
                
                if video_url:
                    db.table("media_outputs").update({
                        "status": "completed",
                        "file_url": video_url
                    }).eq("id", video["id"]).execute()
                    logger.info(f"[StatusPoller] ✓ VEO video completed: {video['id']} - {video_url}")
                else:
                    logger.warning(f"[StatusPoller] VEO success but no URL found: {video['id']}")
                    
            elif success_flag in (2, 3):  # Failed
                error_msg = task_data.get("errorMessage", "Unknown error")
                db.table("media_outputs").update({
                    "status": "failed"
                }).eq("id", video["id"]).execute()
                logger.info(f"[StatusPoller] ✗ VEO video failed: {video['id']} - {error_msg}")
                
            elif success_flag == 0:  # Still processing
                if video.get("status") != "processing":
                    db.table("media_outputs").update({
                        "status": "processing"
                    }).eq("id", video["id"]).execute()
    
    async def _handle_runway_response(self, db, video: dict, data: dict):
        """Handle Runway API response format"""
        if data.get("code") == 200:
            task_data = data.get("data") or {}
            state = task_data.get("state", "").lower()
            
            if state == "success":
                video_info = task_data.get("videoInfo", {})
                video_url = video_info.get("videoUrl", "")
                
                if video_url:
                    db.table("media_outputs").update({
                        "status": "completed",
                        "file_url": video_url,
                        "thumbnail_url": video_info.get("imageUrl", "")
                    }).eq("id", video["id"]).execute()
                    logger.info(f"[StatusPoller] ✓ Runway video completed: {video['id']}")
                    
            elif state in ("fail", "failed"):
                db.table("media_outputs").update({
                    "status": "failed"
                }).eq("id", video["id"]).execute()
                logger.info(f"[StatusPoller] ✗ Runway video failed: {video['id']}")
                
            elif state in ("pending", "queuing", "generating"):
                if video.get("status") != "processing":
                    db.table("media_outputs").update({
                        "status": "processing"
                    }).eq("id", video["id"]).execute()
    
    async def _handle_market_response(self, db, video: dict, data: dict):
        """Handle Market API response format (Kling, Wan, Hailuo, Sora)"""
        # Handle "recordInfo is null" - task expired or deleted
        if data.get("code") == 422:
            created_at_str = video.get("created_at", "")
            if created_at_str:
                try:
                    created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    if datetime.now(timezone.utc) - created_at > timedelta(hours=2):
                        db.table("media_outputs").update({
                            "status": "failed"
                        }).eq("id", video["id"]).execute()
                        logger.info(f"[StatusPoller] Task expired: {video['id']}")
                except:
                    pass
            return
        
        if data.get("code") == 200:
            task_data = data.get("data") or {}
            state = task_data.get("state", "").lower()
            
            # Parse resultJson for video URL
            video_url = None
            result_json_str = task_data.get("resultJson", "")
            if result_json_str:
                try:
                    result_json = json.loads(result_json_str)
                    result_urls = result_json.get("resultUrls", [])
                    if result_urls:
                        video_url = result_urls[0]
                except:
                    pass
            
            if state == "success" and video_url:
                db.table("media_outputs").update({
                    "status": "completed",
                    "file_url": video_url
                }).eq("id", video["id"]).execute()
                logger.info(f"[StatusPoller] ✓ Video completed: {video['id']}")
                
            elif state == "fail":
                fail_msg = task_data.get("failMsg", "")
                db.table("media_outputs").update({
                    "status": "failed"
                }).eq("id", video["id"]).execute()
                logger.info(f"[StatusPoller] ✗ Video failed: {video['id']} - {fail_msg}")
                
            elif state in ("waiting", "queuing", "generating"):
                if video.get("status") != "processing":
                    db.table("media_outputs").update({
                        "status": "processing"
                    }).eq("id", video["id"]).execute()


# Singleton instance
status_poller = StatusPollerService()
