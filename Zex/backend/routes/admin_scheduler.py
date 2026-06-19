"""
Admin Scheduler Routes
API endpoints for managing scheduled tasks
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from types import SimpleNamespace
from datetime import datetime
import logging

from core.security import get_current_admin_user, get_current_super_admin
from core.scheduler import get_scheduler, TriggerType, JobInfo, JobStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/scheduler", tags=["Admin - Scheduler"])


# ============================================
# Schemas
# ============================================

class JobResponse(BaseModel):
    """Job information response"""
    id: str
    name: str
    description: str
    trigger_type: str
    trigger_args: Dict[str, Any]
    status: str
    next_run: Optional[str] = None
    last_run: Optional[str] = None
    last_status: Optional[str] = None
    run_count: int
    error_count: int
    is_system: bool


class JobListResponse(BaseModel):
    """Job list response"""
    jobs: List[JobResponse]
    stats: Dict[str, Any]


class ExecutionLogResponse(BaseModel):
    """Execution log entry response"""
    job_id: str
    job_name: str
    started_at: str
    finished_at: Optional[str] = None
    status: str
    result: Optional[str] = None
    error: Optional[str] = None


class JobUpdateRequest(BaseModel):
    """Update job schedule request"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    trigger_type: Optional[str] = Field(None, pattern="^(interval|cron)$")
    trigger_args: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "trigger_type": "interval",
                    "trigger_args": {"minutes": 10}
                },
                {
                    "trigger_type": "cron",
                    "trigger_args": {"hour": 4, "minute": 30}
                }
            ]
        }


# ============================================
# Helper Functions
# ============================================

def job_info_to_response(job: JobInfo) -> JobResponse:
    """Convert JobInfo to response model"""
    return JobResponse(
        id=job.id,
        name=job.name,
        description=job.description,
        trigger_type=job.trigger_type.value if isinstance(job.trigger_type, TriggerType) else job.trigger_type,
        trigger_args=job.trigger_args,
        status=job.status.value if isinstance(job.status, JobStatus) else job.status,
        next_run=job.next_run.isoformat() if job.next_run else None,
        last_run=job.last_run.isoformat() if job.last_run else None,
        last_status=job.last_status,
        run_count=job.run_count,
        error_count=job.error_count,
        is_system=job.is_system
    )


# ============================================
# Endpoints
# ============================================

@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    request: Request,
    status: Optional[str] = Query(None, pattern="^(running|paused|pending|error)$"),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """List all scheduled jobs with optional status filter"""
    scheduler = get_scheduler()
    
    jobs = scheduler.get_jobs()
    
    # Filter by status if provided
    if status:
        jobs = [j for j in jobs if (j.status.value if isinstance(j.status, JobStatus) else j.status) == status]
    
    # Get stats
    stats = scheduler.get_stats()
    
    return JobListResponse(
        jobs=[job_info_to_response(j) for j in jobs],
        stats=stats
    )


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    request: Request,
    job_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get a specific job's details"""
    scheduler = get_scheduler()
    
    job = scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return job_info_to_response(job)


@router.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job(
    request: Request,
    job_id: str,
    update_data: JobUpdateRequest,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Update job schedule configuration
    
    Allows changing:
    - name: Display name
    - description: Job description
    - trigger_type: 'interval' or 'cron'
    - trigger_args: Schedule parameters
    
    Examples:
    - Interval: {"trigger_type": "interval", "trigger_args": {"minutes": 15}}
    - Cron: {"trigger_type": "cron", "trigger_args": {"hour": 5, "minute": 0}}
    """
    scheduler = get_scheduler()
    
    job = scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    # Prepare update parameters
    trigger_type = None
    if update_data.trigger_type:
        trigger_type = TriggerType(update_data.trigger_type)
    
    # Update the job
    updated_job = scheduler.update_job(
        job_id=job_id,
        trigger_type=trigger_type,
        trigger_args=update_data.trigger_args,
        name=update_data.name,
        description=update_data.description
    )
    
    if not updated_job:
        raise HTTPException(status_code=500, detail="Failed to update job")
    
    logger.info(f"Job {job_id} updated by user {current_user.id}: {update_data.dict(exclude_none=True)}")
    
    return job_info_to_response(updated_job)


@router.post("/jobs/{job_id}/pause")
async def pause_job(
    request: Request,
    job_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Pause a scheduled job"""
    scheduler = get_scheduler()
    
    job = scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    success = scheduler.pause_job(job_id)
    
    if success:
        logger.info(f"Job {job_id} paused by user {current_user.id}")
        return {"success": True, "message": f"Job {job_id} paused"}
    else:
        raise HTTPException(status_code=500, detail="Failed to pause job")


@router.post("/jobs/{job_id}/resume")
async def resume_job(
    request: Request,
    job_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Resume a paused job"""
    scheduler = get_scheduler()
    
    job = scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    success = scheduler.resume_job(job_id)
    
    if success:
        logger.info(f"Job {job_id} resumed by user {current_user.id}")
        return {"success": True, "message": f"Job {job_id} resumed"}
    else:
        raise HTTPException(status_code=500, detail="Failed to resume job")


@router.post("/jobs/{job_id}/run")
async def run_job_now(
    request: Request,
    job_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Run a job immediately"""
    scheduler = get_scheduler()
    
    job = scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    success = scheduler.run_job_now(job_id)
    
    if success:
        logger.info(f"Job {job_id} triggered manually by user {current_user.id}")
        return {"success": True, "message": f"Job {job_id} triggered"}
    else:
        raise HTTPException(status_code=500, detail="Failed to run job")


@router.delete("/jobs/{job_id}")
async def delete_job(
    request: Request,
    job_id: str,
    current_user: SimpleNamespace = Depends(get_current_super_admin)
):
    """Delete a job (Super Admin only, non-system jobs)"""
    scheduler = get_scheduler()
    
    job = scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if job.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system jobs")
    
    try:
        scheduler.remove_job(job_id)
        logger.info(f"Job {job_id} deleted by user {current_user.id}")
        return {"success": True, "message": f"Job {job_id} deleted"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/history", response_model=List[ExecutionLogResponse])
async def get_execution_history(
    request: Request,
    job_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get job execution history"""
    scheduler = get_scheduler()
    
    history = scheduler.get_execution_history(limit=limit, job_id=job_id)
    
    return [
        ExecutionLogResponse(
            job_id=h.job_id,
            job_name=h.job_name,
            started_at=h.started_at.isoformat(),
            finished_at=h.finished_at.isoformat() if h.finished_at else None,
            status=h.status,
            result=h.result,
            error=h.error
        )
        for h in history
    ]


@router.get("/stats")
async def get_scheduler_stats(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get scheduler statistics"""
    scheduler = get_scheduler()
    
    return scheduler.get_stats()


@router.post("/start")
async def start_scheduler(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_super_admin)
):
    """Start the scheduler (Super Admin only)"""
    scheduler = get_scheduler()
    
    if scheduler.is_running():
        return {"success": True, "message": "Scheduler is already running"}
    
    scheduler.start()
    logger.info(f"Scheduler started by user {current_user.id}")
    
    return {"success": True, "message": "Scheduler started"}


@router.post("/stop")
async def stop_scheduler(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_super_admin)
):
    """Stop the scheduler (Super Admin only)"""
    scheduler = get_scheduler()
    
    if not scheduler.is_running():
        return {"success": True, "message": "Scheduler is not running"}
    
    scheduler.stop()
    logger.info(f"Scheduler stopped by user {current_user.id}")
    
    return {"success": True, "message": "Scheduler stopped"}
