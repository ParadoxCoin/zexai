"""
Cleanup background tasks
Handles file cleanup, old data removal, and maintenance tasks
"""
from celery import Task
from core.celery_app import celery_app
from core.database import get_database
from core.logger import app_logger as logger
from datetime import datetime, timedelta
import os
import shutil
from typing import Dict, Any


class CleanupTask(Task):
    """Base class for cleanup tasks"""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle cleanup task failure"""
        logger.error(f"Cleanup task {task_id} failed: {exc}")
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle cleanup task success"""
        logger.info(f"Cleanup task {task_id} completed successfully")


@celery_app.task(bind=True, base=CleanupTask, name="cleanup_old_files")
async def cleanup_old_files(self, days_old: int = 30, **kwargs):
    """
    Clean up old temporary files and unused media
    
    Args:
        days_old: Files older than this many days will be deleted
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Get database connection
        db = get_database()
        
        # Find old temporary files
        old_files = await db.temp_files.find({
            "created_at": {"$lt": cutoff_date},
            "status": "temporary"
        }).to_list(length=1000)
        
        deleted_count = 0
        total_size_freed = 0
        
        for file_record in old_files:
            try:
                file_path = file_record.get("file_path")
                if file_path and os.path.exists(file_path):
                    # Get file size before deletion
                    file_size = os.path.getsize(file_path)
                    
                    # Delete file
                    os.remove(file_path)
                    
                    deleted_count += 1
                    total_size_freed += file_size
                    
                    logger.info(f"Deleted old file: {file_path}")
                
                # Remove database record
                await db.temp_files.delete_one({"_id": file_record["_id"]})
                
            except Exception as e:
                logger.error(f"Failed to delete file {file_record.get('file_path')}: {e}")
        
        # Clean up old generation results that are no longer needed
        old_generations = await db.ai_generations.find({
            "created_at": {"$lt": cutoff_date},
            "status": "completed",
            "user_id": {"$exists": True}
        }).to_list(length=1000)
        
        for generation in old_generations:
            # Check if user still exists and is active
            user = await db.users.find_one({"id": generation["user_id"]})
            if not user or not user.get("is_active", True):
                # Delete generation record and associated files
                await _cleanup_generation_files(generation)
                await db.ai_generations.delete_one({"_id": generation["_id"]})
        
        logger.info(f"Cleanup completed: {deleted_count} files deleted, {total_size_freed / 1024 / 1024:.2f} MB freed")
        
        return {
            "status": "completed",
            "files_deleted": deleted_count,
            "size_freed_mb": round(total_size_freed / 1024 / 1024, 2),
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"File cleanup failed: {e}")
        raise


@celery_app.task(bind=True, base=CleanupTask, name="cleanup_old_logs")
async def cleanup_old_logs(self, days_old: int = 90, **kwargs):
    """
    Clean up old log entries to prevent database bloat
    
    Args:
        days_old: Logs older than this many days will be deleted
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        db = get_database()
        
        # Clean up old usage logs
        usage_logs_deleted = await db.usage_logs.delete_many({
            "created_at": {"$lt": cutoff_date}
        })
        
        # Clean up old admin logs (keep for audit purposes, but limit)
        admin_logs_deleted = await db.admin_logs.delete_many({
            "created_at": {"$lt": cutoff_date - timedelta(days=30)}  # Keep admin logs longer
        })
        
        # Clean up old task logs
        task_logs_deleted = await db.ai_tasks.delete_many({
            "created_at": {"$lt": cutoff_date},
            "status": {"$in": ["completed", "failed"]}
        })
        
        total_deleted = (usage_logs_deleted.deleted_count + 
                        admin_logs_deleted.deleted_count + 
                        task_logs_deleted.deleted_count)
        
        logger.info(f"Log cleanup completed: {total_deleted} log entries deleted")
        
        return {
            "status": "completed",
            "usage_logs_deleted": usage_logs_deleted.deleted_count,
            "admin_logs_deleted": admin_logs_deleted.deleted_count,
            "task_logs_deleted": task_logs_deleted.deleted_count,
            "total_deleted": total_deleted
        }
        
    except Exception as e:
        logger.error(f"Log cleanup failed: {e}")
        raise


@celery_app.task(bind=True, base=CleanupTask, name="cleanup_inactive_users")
async def cleanup_inactive_users(self, days_inactive: int = 365, **kwargs):
    """
    Clean up inactive user accounts and their data
    
    Args:
        days_inactive: Users inactive for this many days will be cleaned up
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_inactive)
        
        db = get_database()
        
        # Find inactive users
        inactive_users = await db.users.find({
            "last_login": {"$lt": cutoff_date},
            "is_active": True,
            "role": "user"  # Don't clean up admin accounts
        }).to_list(length=1000)
        
        cleaned_count = 0
        
        for user in inactive_users:
            try:
                user_id = user["id"]
                
                # Delete user's media files
                user_media = await db.media_outputs.find({"user_id": user_id}).to_list(length=1000)
                for media in user_media:
                    await _cleanup_media_files(media)
                
                # Delete user's generation records
                await db.ai_generations.delete_many({"user_id": user_id})
                
                # Delete user's usage logs
                await db.usage_logs.delete_many({"user_id": user_id})
                
                # Delete user's media records
                await db.media_outputs.delete_many({"user_id": user_id})
                
                # Delete user's credit records
                await db.user_credits.delete_many({"user_id": user_id})
                
                # Mark user as inactive instead of deleting (for audit purposes)
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {"is_active": False, "cleaned_at": datetime.utcnow()}}
                )
                
                cleaned_count += 1
                logger.info(f"Cleaned up inactive user: {user['email']}")
                
            except Exception as e:
                logger.error(f"Failed to clean up user {user.get('email')}: {e}")
        
        logger.info(f"Inactive user cleanup completed: {cleaned_count} users cleaned")
        
        return {
            "status": "completed",
            "users_cleaned": cleaned_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Inactive user cleanup failed: {e}")
        raise


@celery_app.task(bind=True, base=CleanupTask, name="cleanup_failed_tasks")
async def cleanup_failed_tasks(self, hours_old: int = 24, **kwargs):
    """
    Clean up failed tasks that are old and won't be retried
    
    Args:
        hours_old: Failed tasks older than this many hours will be cleaned up
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(hours=hours_old)
        
        db = get_database()
        
        # Find old failed tasks
        failed_tasks = await db.ai_tasks.find({
            "status": "failed",
            "created_at": {"$lt": cutoff_date}
        }).to_list(length=1000)
        
        deleted_count = 0
        
        for task in failed_tasks:
            try:
                # Clean up any associated files
                if task.get("result") and task["result"].get("files"):
                    for file_path in task["result"]["files"]:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                
                # Delete task record
                await db.ai_tasks.delete_one({"_id": task["_id"]})
                deleted_count += 1
                
            except Exception as e:
                logger.error(f"Failed to clean up task {task.get('task_id')}: {e}")
        
        logger.info(f"Failed task cleanup completed: {deleted_count} tasks deleted")
        
        return {
            "status": "completed",
            "tasks_deleted": deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed task cleanup failed: {e}")
        raise


async def _cleanup_generation_files(generation: Dict[str, Any]):
    """Clean up files associated with a generation"""
    try:
        result = generation.get("result", {})
        
        # Clean up image files
        if result.get("images"):
            for image_url in result["images"]:
                if image_url.startswith("/") or "localhost" in image_url:
                    # Local file, try to delete
                    file_path = image_url.replace("http://localhost:8000", "")
                    full_path = os.path.join("uploads", file_path.lstrip("/"))
                    if os.path.exists(full_path):
                        os.remove(full_path)
        
        # Clean up video files
        if result.get("video_url"):
            video_url = result["video_url"]
            if video_url.startswith("/") or "localhost" in video_url:
                file_path = video_url.replace("http://localhost:8000", "")
                full_path = os.path.join("uploads", file_path.lstrip("/"))
                if os.path.exists(full_path):
                    os.remove(full_path)
        
        # Clean up audio files
        if result.get("audio_url"):
            audio_url = result["audio_url"]
            if audio_url.startswith("/") or "localhost" in audio_url:
                file_path = audio_url.replace("http://localhost:8000", "")
                full_path = os.path.join("uploads", file_path.lstrip("/"))
                if os.path.exists(full_path):
                    os.remove(full_path)
                    
    except Exception as e:
        logger.error(f"Failed to cleanup generation files: {e}")


async def _cleanup_media_files(media: Dict[str, Any]):
    """Clean up files associated with media"""
    try:
        file_path = media.get("file_path")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted media file: {file_path}")
            
    except Exception as e:
        logger.error(f"Failed to cleanup media file: {e}")

