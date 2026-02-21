"""
Celery configuration for background tasks
Handles AI generation, email sending, and other async operations
"""
from celery import Celery
from celery.schedules import crontab
from core.config import settings
import os

# Redis URL for Celery broker and result backend
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Create Celery app
celery_app = Celery(
    "ai_saas",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "core.tasks.ai_generation",
        "core.tasks.email_tasks", 
        "core.tasks.cleanup_tasks",
        "core.tasks.analytics_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task routing
    task_routes={
        "core.tasks.ai_generation.*": {"queue": "ai_generation"},
        "core.tasks.email_tasks.*": {"queue": "email"},
        "core.tasks.cleanup_tasks.*": {"queue": "cleanup"},
        "core.tasks.analytics_tasks.*": {"queue": "analytics"},
    },
    
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    
    # Result backend settings
    result_expires=3600,  # 1 hour
    result_persistent=True,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-old-files": {
            "task": "core.tasks.cleanup_tasks.cleanup_old_files",
            "schedule": crontab(hour=2, minute=0),  # Daily at 2 AM
        },
        "update-analytics": {
            "task": "core.tasks.analytics_tasks.update_platform_analytics",
            "schedule": crontab(minute="*/15"),  # Every 15 minutes
        },
        "send-daily-reports": {
            "task": "core.tasks.email_tasks.send_daily_reports",
            "schedule": crontab(hour=9, minute=0),  # Daily at 9 AM
        },
    },
)

# Task time limits
celery_app.conf.task_time_limit = 300  # 5 minutes
celery_app.conf.task_soft_time_limit = 240  # 4 minutes

# Error handling
@celery_app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")

# Health check task
@celery_app.task
def health_check():
    """Health check for Celery workers"""
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}

