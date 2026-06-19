"""
Scheduled Tasks
Real background tasks for the platform with Supabase integration
"""
import logging
import json
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


def health_check_task():
    """
    Check health of all AI providers
    Runs every 5 minutes by default
    """
    try:
        from core.failover_manager import failover_manager
        
        providers = failover_manager.get_all_statuses()
        
        healthy = sum(1 for p in providers.values() if p.get('status') == 'healthy')
        degraded = sum(1 for p in providers.values() if p.get('status') == 'degraded')
        down = sum(1 for p in providers.values() if p.get('status') == 'down')
        total = len(providers)
        
        # Log detailed status
        for name, status in providers.items():
            if status.get('status') != 'healthy':
                logger.warning(f"Provider {name} status: {status.get('status')}")
        
        logger.info(f"Health check completed: {healthy} healthy, {degraded} degraded, {down} down out of {total}")
        
        return {
            "healthy": healthy,
            "degraded": degraded,
            "down": down,
            "total": total,
            "providers": providers,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check task failed: {e}")
        raise


def cleanup_old_logs_task():
    """
    Cleanup old audit logs (older than 90 days)
    Runs daily at 3 AM by default
    """
    try:
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        cutoff_date = datetime.now() - timedelta(days=90)
        cutoff_str = cutoff_date.isoformat()
        
        # Delete old audit logs from Supabase
        try:
            result = db.table('audit_logs').delete().lt('created_at', cutoff_str).execute()
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"Cleanup task: Deleted {deleted_count} audit logs older than {cutoff_date.date()}")
        except Exception as db_error:
            logger.warning(f"Could not delete audit logs (table may not exist): {db_error}")
            deleted_count = 0
        
        # Also cleanup old usage_logs if exists
        try:
            result2 = db.table('usage_logs').delete().lt('created_at', cutoff_str).execute()
            deleted_usage = len(result2.data) if result2.data else 0
            logger.info(f"Cleanup task: Deleted {deleted_usage} usage logs")
        except Exception:
            deleted_usage = 0
        
        return {
            "cutoff_date": cutoff_str,
            "deleted_audit_logs": deleted_count,
            "deleted_usage_logs": deleted_usage,
            "status": "completed"
        }
    except Exception as e:
        logger.error(f"Cleanup task failed: {e}")
        raise


def low_credit_notification_task():
    """
    Check and log users with low credits
    Runs every hour by default
    Note: Email sending requires SMTP configuration
    """
    try:
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        threshold = 10  # Credits threshold
        
        # Query users with low credits
        try:
            result = db.table('credits').select('user_id, balance').lt('balance', threshold).execute()
            low_credit_users = result.data if result.data else []
        except Exception as db_error:
            logger.warning(f"Could not query credits table: {db_error}")
            low_credit_users = []
        
        if low_credit_users:
            logger.warning(f"Low credit alert: {len(low_credit_users)} users have less than {threshold} credits")
            
            # Log each user for monitoring
            for user in low_credit_users[:10]:  # Log first 10
                logger.info(f"  - User {user.get('user_id')}: {user.get('balance')} credits")
            
            # TODO: Integrate with email service for actual notifications
            # For now, we just log. Email integration would be:
            # for user in low_credit_users:
            #     send_email(user['email'], 'Low Credit Warning', ...)
        else:
            logger.info(f"Low credit check: All users have >= {threshold} credits")
        
        return {
            "threshold": threshold,
            "users_with_low_credit": len(low_credit_users),
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Low credit notification task failed: {e}")
        raise


def backup_settings_task():
    """
    Backup system settings to file
    Runs daily at 2 AM by default
    """
    try:
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        # Create backups directory if not exists
        backup_dir = "backups/settings"
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"{backup_dir}/settings_{timestamp}.json"
        
        # Fetch actual settings from database
        settings_data = {
            "backup_timestamp": datetime.now().isoformat(),
            "version": "1.0",
        }
        
        # Try to fetch various settings tables
        tables_to_backup = ['system_settings', 'pricing_plans', 'ai_providers', 'ai_models']
        
        for table_name in tables_to_backup:
            try:
                result = db.table(table_name).select('*').execute()
                settings_data[table_name] = result.data if result.data else []
            except Exception as table_error:
                logger.warning(f"Could not backup table {table_name}: {table_error}")
                settings_data[table_name] = []
        
        # Write to file
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(settings_data, f, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"Settings backup created: {backup_file}")
        
        # Clean old backups (keep last 7)
        clean_old_backups(backup_dir, keep=7)
        
        # Get backup file size
        file_size = os.path.getsize(backup_file)
        
        return {
            "backup_file": backup_file,
            "file_size_bytes": file_size,
            "tables_backed_up": list(settings_data.keys()),
            "status": "completed"
        }
    except Exception as e:
        logger.error(f"Backup task failed: {e}")
        raise


def clean_old_backups(directory: str, keep: int = 7):
    """Remove old backup files, keeping only the most recent ones"""
    import glob
    
    try:
        files = sorted(glob.glob(f"{directory}/*.json"), reverse=True)
        for old_file in files[keep:]:
            os.remove(old_file)
            logger.info(f"Removed old backup: {old_file}")
    except Exception as e:
        logger.warning(f"Failed to clean old backups: {e}")


def usage_stats_aggregation_task():
    """
    Aggregate usage statistics for reporting
    Runs every hour by default
    """
    try:
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=1)
        
        stats = {
            "period_start": start_time.isoformat(),
            "period_end": end_time.isoformat(),
        }
        
        # Aggregate video generations
        try:
            video_result = db.table('video_jobs').select('id', count='exact').gte('created_at', start_time.isoformat()).execute()
            stats["video_jobs"] = video_result.count if video_result.count else 0
        except:
            stats["video_jobs"] = 0
        
        # Aggregate image generations
        try:
            image_result = db.table('image_jobs').select('id', count='exact').gte('created_at', start_time.isoformat()).execute()
            stats["image_jobs"] = image_result.count if image_result.count else 0
        except:
            stats["image_jobs"] = 0
        
        # Aggregate credit usage
        try:
            credit_result = db.table('credit_transactions').select('amount').gte('created_at', start_time.isoformat()).lt('amount', 0).execute()
            total_credits = sum(abs(t.get('amount', 0)) for t in (credit_result.data or []))
            stats["credits_used"] = total_credits
        except:
            stats["credits_used"] = 0
        
        # New user registrations
        try:
            user_result = db.table('profiles').select('id', count='exact').gte('created_at', start_time.isoformat()).execute()
            stats["new_users"] = user_result.count if user_result.count else 0
        except:
            stats["new_users"] = 0
        
        logger.info(f"Usage stats aggregated: {stats['video_jobs']} videos, {stats['image_jobs']} images, {stats['credits_used']} credits used")
        
        # Optionally save to stats table
        try:
            db.table('hourly_stats').insert({
                "period_start": start_time.isoformat(),
                "period_end": end_time.isoformat(),
                "stats": stats,
                "created_at": datetime.now().isoformat()
            }).execute()
        except Exception as save_error:
            logger.debug(f"Could not save hourly stats (table may not exist): {save_error}")
        
        stats["status"] = "completed"
        return stats
        
    except Exception as e:
        logger.error(f"Usage stats aggregation failed: {e}")
        raise


def expired_sessions_cleanup_task():
    """
    Clean up expired user sessions
    Runs every 6 hours by default
    Note: Supabase handles most session management automatically
    """
    try:
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        cutoff_time = datetime.now() - timedelta(days=7)
        
        # Clean up old refresh tokens if stored locally
        try:
            result = db.table('refresh_tokens').delete().lt('expires_at', cutoff_time.isoformat()).execute()
            cleaned = len(result.data) if result.data else 0
        except:
            cleaned = 0
        
        # Clean up old auth sessions if custom table exists
        try:
            result2 = db.table('user_sessions').delete().lt('last_activity', cutoff_time.isoformat()).execute()
            cleaned += len(result2.data) if result2.data else 0
        except:
            pass
        
        logger.info(f"Session cleanup completed: {cleaned} expired sessions removed")
        
        return {
            "cleaned_sessions": cleaned,
            "cutoff_time": cutoff_time.isoformat(),
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Session cleanup failed: {e}")
        raise


def provider_cost_tracking_task():
    """
    Track and log API costs per provider
    Runs daily at 1 AM
    """
    try:
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        yesterday = datetime.now() - timedelta(days=1)
        
        # Aggregate usage per provider
        try:
            result = db.table('usage_logs').select('provider, credits_used').gte('created_at', yesterday.isoformat()).execute()
            
            provider_costs = {}
            for log in (result.data or []):
                provider = log.get('provider', 'unknown')
                credits = log.get('credits_used', 0)
                provider_costs[provider] = provider_costs.get(provider, 0) + credits
            
            logger.info(f"Daily provider costs: {provider_costs}")
            
            return {
                "date": yesterday.date().isoformat(),
                "provider_costs": provider_costs,
                "status": "completed"
            }
        except Exception as db_error:
            logger.warning(f"Could not track provider costs: {db_error}")
            return {"status": "skipped", "reason": str(db_error)}
            
    except Exception as e:
        logger.error(f"Provider cost tracking failed: {e}")
        raise


def register_default_jobs():
    """
    Register all default scheduled jobs
    Called on application startup
    """
    from core.scheduler import get_scheduler, TriggerType
    
    scheduler = get_scheduler()
    
    # Health Check - Every 5 minutes
    scheduler.add_job(
        job_id="health_check",
        func=health_check_task,
        name="Sağlık Kontrolü",
        description="AI sağlayıcılarının sağlık durumunu kontrol eder",
        trigger_type=TriggerType.INTERVAL,
        trigger_args={"minutes": 5},
        is_system=True
    )
    
    # Cleanup Old Logs - Daily at 3 AM
    scheduler.add_job(
        job_id="cleanup_logs",
        func=cleanup_old_logs_task,
        name="Log Temizliği",
        description="90 günden eski audit loglarını temizler",
        trigger_type=TriggerType.CRON,
        trigger_args={"hour": 3, "minute": 0},
        is_system=True
    )
    
    # Low Credit Notification - Every hour
    scheduler.add_job(
        job_id="low_credit_notify",
        func=low_credit_notification_task,
        name="Düşük Kredi Uyarısı",
        description="Düşük kredili kullanıcıları kontrol eder ve loglar",
        trigger_type=TriggerType.INTERVAL,
        trigger_args={"hours": 1},
        is_system=True
    )
    
    # Backup Settings - Daily at 2 AM
    scheduler.add_job(
        job_id="backup_settings",
        func=backup_settings_task,
        name="Ayar Yedeklemesi",
        description="Sistem ayarlarını günlük olarak yedekler",
        trigger_type=TriggerType.CRON,
        trigger_args={"hour": 2, "minute": 0},
        is_system=True
    )
    
    # Usage Stats Aggregation - Every hour
    scheduler.add_job(
        job_id="usage_stats",
        func=usage_stats_aggregation_task,
        name="Kullanım İstatistikleri",
        description="Saatlik kullanım istatistiklerini toplar",
        trigger_type=TriggerType.INTERVAL,
        trigger_args={"hours": 1},
        is_system=True
    )
    
    # Session Cleanup - Every 6 hours
    scheduler.add_job(
        job_id="session_cleanup",
        func=expired_sessions_cleanup_task,
        name="Oturum Temizliği",
        description="Süresi dolmuş oturumları temizler",
        trigger_type=TriggerType.INTERVAL,
        trigger_args={"hours": 6},
        is_system=True
    )
    
    # Provider Cost Tracking - Daily at 1 AM
    scheduler.add_job(
        job_id="cost_tracking",
        func=provider_cost_tracking_task,
        name="Maliyet Takibi",
        description="Günlük sağlayıcı maliyetlerini takip eder",
        trigger_type=TriggerType.CRON,
        trigger_args={"hour": 1, "minute": 0},
        is_system=True
    )
    
    logger.info("Default scheduled jobs registered (7 jobs)")
