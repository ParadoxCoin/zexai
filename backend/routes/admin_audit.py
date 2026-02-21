"""
Admin Audit Log API
View and manage audit logs
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from core.security import get_current_user
from core.database import get_db
from core.audit import AuditLogService, AuditAction, ResourceType


router = APIRouter(prefix="/admin/audit", tags=["Admin - Audit Logs"])


# ============================================
# Schemas
# ============================================

class AuditLogResponse(BaseModel):
    """Single audit log entry"""
    id: str
    user_id: str
    user_email: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    resource_name: Optional[str]
    old_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    details: Optional[str]
    success: bool
    created_at: str


class AuditLogListResponse(BaseModel):
    """Paginated audit log list"""
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int


class AuditStatsResponse(BaseModel):
    """Audit log statistics"""
    total_logs: int
    by_action: Dict[str, int]
    by_resource: Dict[str, int]
    by_user: Dict[str, int]
    by_day: Dict[str, int]
    period_days: int


# ============================================
# Helper Functions
# ============================================

def require_admin(current_user):
    """Check if user is admin"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login required"
        )
    return current_user


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=AuditLogListResponse)
async def get_audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=100),
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get audit logs with filtering and pagination
    
    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 50)
    - user_id: Filter by user ID
    - action: Filter by action (create, update, delete, etc.)
    - resource_type: Filter by resource (model, provider, settings, etc.)
    - resource_id: Filter by specific resource ID
    - start_date: Filter from date (ISO format)
    - end_date: Filter to date (ISO format)
    """
    require_admin(current_user)
    
    # Log the view action
    await AuditLogService.log(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        action=AuditAction.READ,
        resource_type=ResourceType.SYSTEM,
        resource_name="audit_logs",
        ip_address=request.client.host if request.client else None,
        details=f"Viewed audit logs page {page}"
    )
    
    # Parse dates
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except:
            pass
    
    offset = (page - 1) * page_size
    
    logs = await AuditLogService.get_logs(
        db=db,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        start_date=start_dt,
        end_date=end_dt,
        limit=page_size,
        offset=offset
    )
    
    # Get total count (approximate for pagination)
    all_logs = await AuditLogService.get_logs(
        db=db,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        start_date=start_dt,
        end_date=end_dt,
        limit=10000,
        offset=0
    )
    
    return AuditLogListResponse(
        logs=[AuditLogResponse(**log) for log in logs],
        total=len(all_logs),
        page=page,
        page_size=page_size
    )


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    days: int = Query(7, ge=1, le=90),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get audit log statistics for the specified period"""
    require_admin(current_user)
    
    stats = await AuditLogService.get_stats(db, days=days)
    return AuditStatsResponse(**stats)


@router.get("/actions")
async def get_action_types(
    current_user = Depends(get_current_user)
):
    """Get list of available action types for filtering"""
    require_admin(current_user)
    
    return {
        "actions": [a.value for a in AuditAction],
        "resource_types": [r.value for r in ResourceType]
    }


@router.delete("/cleanup")
async def cleanup_old_logs(
    days: int = Query(90, ge=30, le=365),
    request: Request = None,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete audit logs older than specified days (minimum 30)"""
    require_admin(current_user)
    
    deleted_count = await AuditLogService.clear_old_logs(db, days=days)
    
    # Log the cleanup action
    await AuditLogService.log(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        action=AuditAction.DELETE,
        resource_type=ResourceType.SYSTEM,
        resource_name="audit_logs",
        ip_address=request.client.host if request and request.client else None,
        details=f"Cleaned up {deleted_count} logs older than {days} days"
    )
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"Deleted {deleted_count} logs older than {days} days"
    }


@router.get("/{log_id}")
async def get_audit_log_detail(
    log_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get single audit log entry details"""
    require_admin(current_user)
    
    logs = await AuditLogService.get_logs(db, limit=10000)
    log = next((l for l in logs if l.get("id") == log_id), None)
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log not found"
        )
    
    return AuditLogResponse(**log)
