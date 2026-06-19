"""
Scheduler Service
APScheduler-based background task scheduler for admin tasks
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import threading

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    RUNNING = "running"
    PAUSED = "paused"
    PENDING = "pending"
    ERROR = "error"


class TriggerType(str, Enum):
    INTERVAL = "interval"
    CRON = "cron"
    DATE = "date"


@dataclass
class JobInfo:
    """Job information"""
    id: str
    name: str
    description: str
    trigger_type: TriggerType
    trigger_args: Dict[str, Any]
    status: JobStatus
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    last_status: Optional[str] = None
    run_count: int = 0
    error_count: int = 0
    is_system: bool = False  # System jobs cannot be deleted


@dataclass
class JobExecutionLog:
    """Job execution history entry"""
    job_id: str
    job_name: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str = "running"
    result: Optional[str] = None
    error: Optional[str] = None


class SchedulerService:
    """
    Singleton scheduler service for managing background tasks
    Uses APScheduler for job scheduling
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self._initialized = True
        self._scheduler = None
        self._jobs: Dict[str, JobInfo] = {}
        self._job_functions: Dict[str, Callable] = {}
        self._execution_history: List[JobExecutionLog] = []
        self._max_history = 100
        self._running = False
        
        logger.info("SchedulerService initialized")
    
    def _init_scheduler(self):
        """Initialize APScheduler"""
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.executors.pool import ThreadPoolExecutor
            from apscheduler.jobstores.memory import MemoryJobStore
            
            jobstores = {
                'default': MemoryJobStore()
            }
            executors = {
                'default': ThreadPoolExecutor(10)
            }
            job_defaults = {
                'coalesce': True,
                'max_instances': 1,
                'misfire_grace_time': 60
            }
            
            self._scheduler = BackgroundScheduler(
                jobstores=jobstores,
                executors=executors,
                job_defaults=job_defaults,
                timezone='Europe/Istanbul'
            )
            
            # Add error listener
            self._scheduler.add_listener(
                self._job_error_listener,
                1 << 7  # EVENT_JOB_ERROR
            )
            
            return True
        except ImportError:
            logger.warning("APScheduler not installed. Using mock scheduler.")
            return False
    
    def _job_error_listener(self, event):
        """Handle job errors"""
        job_id = event.job_id
        if job_id in self._jobs:
            self._jobs[job_id].error_count += 1
            self._jobs[job_id].last_status = "error"
            logger.error(f"Job {job_id} failed: {event.exception}")
    
    def start(self):
        """Start the scheduler"""
        if self._running:
            return
            
        if self._scheduler is None:
            if not self._init_scheduler():
                logger.warning("Scheduler running in mock mode")
                self._running = True
                return
        
        try:
            self._scheduler.start()
            self._running = True
            logger.info("Scheduler started")
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
    
    def stop(self):
        """Stop the scheduler"""
        if not self._running:
            return
            
        if self._scheduler:
            try:
                self._scheduler.shutdown(wait=False)
                logger.info("Scheduler stopped")
            except Exception as e:
                logger.error(f"Error stopping scheduler: {e}")
        
        self._running = False
    
    def is_running(self) -> bool:
        """Check if scheduler is running"""
        return self._running
    
    def add_job(
        self,
        job_id: str,
        func: Callable,
        name: str,
        description: str,
        trigger_type: TriggerType,
        trigger_args: Dict[str, Any],
        is_system: bool = False,
        replace_existing: bool = True
    ) -> JobInfo:
        """
        Add a new job to the scheduler
        
        Args:
            job_id: Unique job identifier
            func: Function to execute
            name: Display name
            description: Job description
            trigger_type: interval, cron, or date
            trigger_args: Trigger-specific arguments
            is_system: System jobs cannot be deleted
            replace_existing: Replace if job exists
        """
        # Create job info
        job_info = JobInfo(
            id=job_id,
            name=name,
            description=description,
            trigger_type=trigger_type,
            trigger_args=trigger_args,
            status=JobStatus.PENDING,
            is_system=is_system
        )
        
        # Store function reference
        self._job_functions[job_id] = func
        
        # Create wrapper that logs execution
        def job_wrapper():
            self._execute_job(job_id, func)
        
        # Add to APScheduler if available
        if self._scheduler:
            try:
                self._scheduler.add_job(
                    job_wrapper,
                    trigger=trigger_type.value,
                    id=job_id,
                    name=name,
                    replace_existing=replace_existing,
                    **trigger_args
                )
                
                # Get next run time
                ap_job = self._scheduler.get_job(job_id)
                if ap_job and ap_job.next_run_time:
                    job_info.next_run = ap_job.next_run_time
                    job_info.status = JobStatus.RUNNING
                    
            except Exception as e:
                logger.error(f"Failed to add job {job_id}: {e}")
                job_info.status = JobStatus.ERROR
        
        self._jobs[job_id] = job_info
        logger.info(f"Job {job_id} added: {name}")
        
        return job_info
    
    def _execute_job(self, job_id: str, func: Callable):
        """Execute job with logging"""
        job = self._jobs.get(job_id)
        if not job:
            return
            
        # Create execution log
        log_entry = JobExecutionLog(
            job_id=job_id,
            job_name=job.name,
            started_at=datetime.now()
        )
        
        try:
            # Execute the job
            result = func()
            
            # Update log
            log_entry.finished_at = datetime.now()
            log_entry.status = "success"
            log_entry.result = str(result) if result else "OK"
            
            # Update job info
            job.last_run = datetime.now()
            job.last_status = "success"
            job.run_count += 1
            
            # Update next run time
            if self._scheduler:
                ap_job = self._scheduler.get_job(job_id)
                if ap_job and ap_job.next_run_time:
                    job.next_run = ap_job.next_run_time
                    
        except Exception as e:
            log_entry.finished_at = datetime.now()
            log_entry.status = "error"
            log_entry.error = str(e)
            
            job.last_run = datetime.now()
            job.last_status = "error"
            job.error_count += 1
            
            logger.error(f"Job {job_id} execution failed: {e}")
        
        # Add to history
        self._execution_history.insert(0, log_entry)
        if len(self._execution_history) > self._max_history:
            self._execution_history = self._execution_history[:self._max_history]
    
    def remove_job(self, job_id: str) -> bool:
        """Remove a job from the scheduler"""
        job = self._jobs.get(job_id)
        if not job:
            return False
            
        if job.is_system:
            raise ValueError(f"Cannot remove system job: {job_id}")
        
        if self._scheduler:
            try:
                self._scheduler.remove_job(job_id)
            except Exception as e:
                logger.error(f"Failed to remove job {job_id}: {e}")
        
        del self._jobs[job_id]
        if job_id in self._job_functions:
            del self._job_functions[job_id]
            
        logger.info(f"Job {job_id} removed")
        return True
    
    def pause_job(self, job_id: str) -> bool:
        """Pause a job"""
        job = self._jobs.get(job_id)
        if not job:
            return False
        
        if self._scheduler:
            try:
                self._scheduler.pause_job(job_id)
                job.status = JobStatus.PAUSED
                job.next_run = None
                logger.info(f"Job {job_id} paused")
                return True
            except Exception as e:
                logger.error(f"Failed to pause job {job_id}: {e}")
                
        return False
    
    def resume_job(self, job_id: str) -> bool:
        """Resume a paused job"""
        job = self._jobs.get(job_id)
        if not job:
            return False
        
        if self._scheduler:
            try:
                self._scheduler.resume_job(job_id)
                job.status = JobStatus.RUNNING
                
                # Update next run time
                ap_job = self._scheduler.get_job(job_id)
                if ap_job and ap_job.next_run_time:
                    job.next_run = ap_job.next_run_time
                    
                logger.info(f"Job {job_id} resumed")
                return True
            except Exception as e:
                logger.error(f"Failed to resume job {job_id}: {e}")
                
        return False
    
    def run_job_now(self, job_id: str) -> bool:
        """Run a job immediately"""
        if job_id not in self._job_functions:
            return False
        
        func = self._job_functions[job_id]
        
        # Run in background thread
        thread = threading.Thread(
            target=self._execute_job,
            args=(job_id, func)
        )
        thread.start()
        
        logger.info(f"Job {job_id} triggered manually")
        return True
    
    def update_job(
        self,
        job_id: str,
        trigger_type: Optional[TriggerType] = None,
        trigger_args: Optional[Dict[str, Any]] = None,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> Optional[JobInfo]:
        """
        Update job schedule configuration
        
        Args:
            job_id: Job ID to update
            trigger_type: New trigger type (interval or cron)
            trigger_args: New trigger arguments
            name: New display name
            description: New description
        
        Returns:
            Updated JobInfo or None if job not found
        """
        job = self._jobs.get(job_id)
        if not job:
            return None
        
        func = self._job_functions.get(job_id)
        if not func:
            return None
        
        # Update metadata
        if name:
            job.name = name
        if description:
            job.description = description
        
        # Update trigger if provided
        if trigger_type or trigger_args:
            new_trigger_type = trigger_type or job.trigger_type
            new_trigger_args = trigger_args or job.trigger_args
            
            if self._scheduler:
                try:
                    # Create wrapper function
                    def job_wrapper():
                        self._execute_job(job_id, func)
                    
                    # Reschedule the job
                    self._scheduler.reschedule_job(
                        job_id,
                        trigger=new_trigger_type.value if isinstance(new_trigger_type, TriggerType) else new_trigger_type,
                        **new_trigger_args
                    )
                    
                    # Update job info
                    job.trigger_type = new_trigger_type
                    job.trigger_args = new_trigger_args
                    
                    # Update next run time
                    ap_job = self._scheduler.get_job(job_id)
                    if ap_job and ap_job.next_run_time:
                        job.next_run = ap_job.next_run_time
                    
                    logger.info(f"Job {job_id} updated: trigger={new_trigger_type}, args={new_trigger_args}")
                    
                except Exception as e:
                    logger.error(f"Failed to update job {job_id}: {e}")
                    return None
        
        return job
    
    def get_job(self, job_id: str) -> Optional[JobInfo]:
        """Get job information"""
        return self._jobs.get(job_id)
    
    def get_jobs(self) -> List[JobInfo]:
        """Get all jobs"""
        return list(self._jobs.values())
    
    def get_execution_history(self, limit: int = 50, job_id: Optional[str] = None) -> List[JobExecutionLog]:
        """Get execution history"""
        history = self._execution_history
        
        if job_id:
            history = [h for h in history if h.job_id == job_id]
            
        return history[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get scheduler statistics"""
        total_jobs = len(self._jobs)
        running_jobs = sum(1 for j in self._jobs.values() if j.status == JobStatus.RUNNING)
        paused_jobs = sum(1 for j in self._jobs.values() if j.status == JobStatus.PAUSED)
        
        total_runs = sum(j.run_count for j in self._jobs.values())
        total_errors = sum(j.error_count for j in self._jobs.values())
        
        return {
            "is_running": self._running,
            "total_jobs": total_jobs,
            "running_jobs": running_jobs,
            "paused_jobs": paused_jobs,
            "total_executions": total_runs,
            "total_errors": total_errors,
            "error_rate": (total_errors / total_runs * 100) if total_runs > 0 else 0
        }


# Global instance
scheduler_service = SchedulerService()


def get_scheduler() -> SchedulerService:
    """Get scheduler service instance"""
    return scheduler_service
