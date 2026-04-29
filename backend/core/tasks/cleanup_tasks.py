"""
Cleanup background tasks
Handles file cleanup, old data removal, and maintenance tasks (Supabase Version)
"""
from celery import Task
from core.celery_app import celery_app
from core.database import get_database
from core.logger import app_logger as logger
from datetime import datetime, timedelta
import os
import shutil
from typing import Dict, Any
import asyncio


class CleanupTask(Task):
    """Base class for cleanup tasks"""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle cleanup task failure"""
        logger.error(f"Cleanup task {task_id} failed: {exc}")
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle cleanup task success"""
        logger.info(f"Cleanup task {task_id} completed successfully")


@celery_app.task(bind=True, base=CleanupTask, name="cleanup_old_files")
def cleanup_old_files(self, days_old: int = 30, **kwargs):
    """
    Clean up old temporary files and unused media (Supabase Version)
    """
    async def run():
        try:
            cutoff_date = (datetime.utcnow() - timedelta(days=days_old)).isoformat()
            db = await get_database()
            
            # Find old temporary files in Supabase
            response = db.table("temp_files").select("*").lt("created_at", cutoff_date).eq("status", "temporary").limit(1000).execute()
            old_files = response.data or []
            
            deleted_count = 0
            total_size_freed = 0
            
            for file_record in old_files:
                try:
                    file_path = file_record.get("file_path")
                    if file_path and os.path.exists(file_path):
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                        total_size_freed += file_size
                        logger.info(f"Deleted old file: {file_path}")
                    
                    # Remove database record
                    db.table("temp_files").delete().eq("id", file_record["id"]).execute()
                except Exception as e:
                    logger.error(f"Failed to delete file {file_record.get('file_path')}: {e}")
            
            # Clean up old generations from ai_generations table
            gen_res = db.table("ai_generations").select("*").lt("created_at", cutoff_date).limit(1000).execute()
            old_generations = gen_res.data or []
            
            for generation in old_generations:
                # Check if user is active
                user_res = db.table("users").select("is_active").eq("id", generation["user_id"]).execute()
                user = user_res.data[0] if user_res.data else None
                
                if not user or not user.get("is_active", True):
                    await _cleanup_generation_files(generation)
                    db.table("ai_generations").delete().eq("id", generation["id"]).execute()
            
            return {
                "status": "completed",
                "files_deleted": deleted_count,
                "size_freed_mb": round(total_size_freed / 1024 / 1024, 2)
            }
        except Exception as e:
            logger.error(f"File cleanup failed: {e}")
            raise

    return asyncio.run(run())


@celery_app.task(bind=True, base=CleanupTask, name="cleanup_old_logs")
def cleanup_old_logs(self, days_old: int = 90, **kwargs):
    """
    Clean up old log entries from Supabase
    """
    async def run():
        try:
            cutoff_date = (datetime.utcnow() - timedelta(days=days_old)).isoformat()
            db = await get_database()
            
            # Clean up old usage logs
            db.table("usage_logs").delete().lt("created_at", cutoff_date).execute()
            
            # Clean up old admin logs
            db.table("admin_logs").delete().lt("created_at", (datetime.utcnow() - timedelta(days=days_old+30)).isoformat()).execute()
            
            # Clean up old task logs
            db.table("ai_tasks").delete().lt("created_at", cutoff_date).in_("status", ["completed", "failed"]).execute()
            
            return {"status": "completed", "message": "Logs cleaned"}
        except Exception as e:
            logger.error(f"Log cleanup failed: {e}")
            raise

    return asyncio.run(run())


@celery_app.task(bind=True, base=CleanupTask, name="cleanup_failed_tasks")
def cleanup_failed_tasks(self, hours_old: int = 24, **kwargs):
    """
    Clean up failed tasks in Supabase
    """
    async def run():
        try:
            cutoff_date = (datetime.utcnow() - timedelta(hours=hours_old)).isoformat()
            db = await get_database()
            
            # Find and delete old failed tasks
            db.table("ai_tasks").delete().eq("status", "failed").lt("created_at", cutoff_date).execute()
            
            return {"status": "completed"}
        except Exception as e:
            logger.error(f"Failed task cleanup failed: {e}")
            raise

    return asyncio.run(run())


async def _cleanup_generation_files(generation: Dict[str, Any]):
    """Clean up files associated with a generation"""
    try:
        result = generation.get("result", {})
        # Local file cleanup logic (same as before but safer)
        if result.get("images"):
            for image_url in result["images"]:
                if isinstance(image_url, str) and (image_url.startswith("/") or "localhost" in image_url):
                    file_path = image_url.split("/")[-1]
                    full_path = os.path.join("uploads", file_path)
                    if os.path.exists(full_path):
                        os.remove(full_path)
    except Exception as e:
        logger.error(f"Failed to cleanup generation files: {e}")
