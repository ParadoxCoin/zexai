"""
Admin Reports API
Advanced reporting endpoints for model performance, period comparison, and export
"""
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from types import SimpleNamespace
from datetime import datetime, timedelta
import logging
import csv
import io

from core.security import get_current_admin_user
from core.database import get_db
from core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/reports", tags=["Admin - Reports"])


# ============================================
# Response Models
# ============================================

class ModelPerformanceItem(BaseModel):
    """Single model performance data"""
    model_id: str
    model_name: str
    category: str
    provider: Optional[str]
    total_uses: int
    total_revenue: float
    avg_credits_per_use: float
    success_rate: float
    avg_response_time_ms: Optional[float]


class ModelPerformanceResponse(BaseModel):
    """Model performance report response"""
    models: List[ModelPerformanceItem]
    total_models: int
    total_uses: int
    total_revenue: float
    period: str
    generated_at: str


class PeriodComparisonResponse(BaseModel):
    """Period comparison response"""
    current_period: Dict[str, Any]
    previous_period: Dict[str, Any]
    changes: Dict[str, float]
    period_type: str


class ScheduledReportConfig(BaseModel):
    """Scheduled report configuration"""
    report_type: str = "weekly"  # weekly, monthly
    email: str
    include_models: bool = True
    include_revenue: bool = True
    include_usage: bool = True


# ============================================
# Helper Functions
# ============================================

def get_date_range(period: str):
    """Get date range for period"""
    now = datetime.utcnow()
    
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = now - timedelta(days=7)
        end = now
    elif period == "month":
        start = now - timedelta(days=30)
        end = now
    elif period == "quarter":
        start = now - timedelta(days=90)
        end = now
    elif period == "year":
        start = now - timedelta(days=365)
        end = now
    else:
        start = now - timedelta(days=7)
        end = now
    
    return start, end


async def get_model_usage_data(db, start_date: datetime, end_date: datetime):
    """Get model usage data from database"""
    try:
        # Try to get from model_usage_stats or credit_transactions
        supabase = get_supabase_client()
        if not supabase:
            return []
        
        # Get credit transactions grouped by model
        result = supabase.table("credit_transactions")\
            .select("*")\
            .gte("created_at", start_date.isoformat())\
            .lte("created_at", end_date.isoformat())\
            .eq("transaction_type", "usage")\
            .execute()
        
        return result.data or []
    except Exception as e:
        logger.warning(f"Could not fetch model usage data: {e}")
        return []


# ============================================
# Endpoints
# ============================================

@router.get("/models", response_model=ModelPerformanceResponse)
async def get_model_performance(
    period: str = Query("month", pattern="^(week|month|quarter|year)$"),
    category: Optional[str] = Query(None),
    sort_by: str = Query("total_uses", pattern="^(total_uses|total_revenue|success_rate)$"),
    limit: int = Query(50, ge=1, le=100),
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Get model performance report
    
    Shows usage, revenue, and performance metrics for each model.
    """
    start_date, end_date = get_date_range(period)
    
    # Get model usage data
    usage_data = await get_model_usage_data(db, start_date, end_date)
    
    # Aggregate by model
    model_stats = {}
    for tx in usage_data:
        model_id = tx.get("details", {}).get("model_id") or tx.get("description", "unknown")
        
        if model_id not in model_stats:
            model_stats[model_id] = {
                "model_id": model_id,
                "model_name": model_id,
                "category": tx.get("details", {}).get("category", "other"),
                "provider": tx.get("details", {}).get("provider"),
                "total_uses": 0,
                "total_credits": 0,
                "success_count": 0,
                "total_response_time": 0
            }
        
        model_stats[model_id]["total_uses"] += 1
        model_stats[model_id]["total_credits"] += abs(tx.get("amount", 0))
        
        if tx.get("details", {}).get("success", True):
            model_stats[model_id]["success_count"] += 1
        
        resp_time = tx.get("details", {}).get("response_time_ms")
        if resp_time:
            model_stats[model_id]["total_response_time"] += resp_time
    
    # Convert to response format
    models = []
    for model_id, stats in model_stats.items():
        if category and stats["category"] != category:
            continue
        
        total_uses = stats["total_uses"]
        models.append(ModelPerformanceItem(
            model_id=model_id,
            model_name=stats["model_name"],
            category=stats["category"],
            provider=stats["provider"],
            total_uses=total_uses,
            total_revenue=stats["total_credits"] / 100,  # Credits to USD
            avg_credits_per_use=stats["total_credits"] / max(1, total_uses),
            success_rate=stats["success_count"] / max(1, total_uses) * 100,
            avg_response_time_ms=stats["total_response_time"] / max(1, total_uses) if stats["total_response_time"] else None
        ))
    
    # Sort
    if sort_by == "total_uses":
        models.sort(key=lambda x: x.total_uses, reverse=True)
    elif sort_by == "total_revenue":
        models.sort(key=lambda x: x.total_revenue, reverse=True)
    elif sort_by == "success_rate":
        models.sort(key=lambda x: x.success_rate, reverse=True)
    
    # Limit
    models = models[:limit]
    
    # Calculate totals
    total_uses = sum(m.total_uses for m in models)
    total_revenue = sum(m.total_revenue for m in models)
    
    return ModelPerformanceResponse(
        models=models,
        total_models=len(models),
        total_uses=total_uses,
        total_revenue=total_revenue,
        period=period,
        generated_at=datetime.utcnow().isoformat()
    )


@router.get("/comparison", response_model=PeriodComparisonResponse)
async def get_period_comparison(
    period_type: str = Query("month", pattern="^(week|month)$"),
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Compare current period with previous period
    
    Shows changes in usage, revenue, and user metrics.
    """
    now = datetime.utcnow()
    
    if period_type == "week":
        current_start = now - timedelta(days=7)
        previous_start = now - timedelta(days=14)
        previous_end = now - timedelta(days=7)
    else:  # month
        current_start = now - timedelta(days=30)
        previous_start = now - timedelta(days=60)
        previous_end = now - timedelta(days=30)
    
    supabase = get_supabase_client()
    
    # Get current period stats
    current_stats = {
        "total_users": 0,
        "new_users": 0,
        "total_transactions": 0,
        "total_credits_used": 0,
        "total_revenue": 0
    }
    
    # Get previous period stats
    previous_stats = {
        "total_users": 0,
        "new_users": 0,
        "total_transactions": 0,
        "total_credits_used": 0,
        "total_revenue": 0
    }
    
    if supabase:
        try:
            # Current period users
            curr_users = supabase.table("profiles")\
                .select("id", count="exact")\
                .gte("created_at", current_start.isoformat())\
                .execute()
            current_stats["new_users"] = curr_users.count or 0
            
            # Previous period users
            prev_users = supabase.table("profiles")\
                .select("id", count="exact")\
                .gte("created_at", previous_start.isoformat())\
                .lt("created_at", previous_end.isoformat())\
                .execute()
            previous_stats["new_users"] = prev_users.count or 0
            
            # Current period transactions
            curr_tx = supabase.table("credit_transactions")\
                .select("amount")\
                .gte("created_at", current_start.isoformat())\
                .eq("transaction_type", "usage")\
                .execute()
            current_stats["total_transactions"] = len(curr_tx.data or [])
            current_stats["total_credits_used"] = sum(abs(tx["amount"]) for tx in (curr_tx.data or []))
            
            # Previous period transactions
            prev_tx = supabase.table("credit_transactions")\
                .select("amount")\
                .gte("created_at", previous_start.isoformat())\
                .lt("created_at", previous_end.isoformat())\
                .eq("transaction_type", "usage")\
                .execute()
            previous_stats["total_transactions"] = len(prev_tx.data or [])
            previous_stats["total_credits_used"] = sum(abs(tx["amount"]) for tx in (prev_tx.data or []))
            
        except Exception as e:
            logger.warning(f"Could not fetch comparison data: {e}")
    
    # Calculate changes (percentage)
    def calc_change(current, previous):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round((current - previous) / previous * 100, 2)
    
    changes = {
        "new_users_change": calc_change(current_stats["new_users"], previous_stats["new_users"]),
        "transactions_change": calc_change(current_stats["total_transactions"], previous_stats["total_transactions"]),
        "credits_change": calc_change(current_stats["total_credits_used"], previous_stats["total_credits_used"])
    }
    
    return PeriodComparisonResponse(
        current_period=current_stats,
        previous_period=previous_stats,
        changes=changes,
        period_type=period_type
    )


@router.get("/export")
async def export_report(
    report_type: str = Query("models", pattern="^(models|usage|revenue)$"),
    period: str = Query("month"),
    format: str = Query("csv", pattern="^(csv|json)$"),
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Export report data as CSV or JSON
    """
    start_date, end_date = get_date_range(period)
    
    if report_type == "models":
        # Get model performance data
        usage_data = await get_model_usage_data(db, start_date, end_date)
        
        # Aggregate
        model_stats = {}
        for tx in usage_data:
            model_id = tx.get("details", {}).get("model_id") or "unknown"
            if model_id not in model_stats:
                model_stats[model_id] = {"uses": 0, "credits": 0}
            model_stats[model_id]["uses"] += 1
            model_stats[model_id]["credits"] += abs(tx.get("amount", 0))
        
        data = [
            {"model_id": mid, "uses": stats["uses"], "credits": stats["credits"]}
            for mid, stats in model_stats.items()
        ]
        
        if format == "json":
            return {"data": data, "period": period, "generated_at": datetime.utcnow().isoformat()}
        
        # CSV format
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["model_id", "uses", "credits"])
        writer.writeheader()
        writer.writerows(data)
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=model_report_{period}.csv"}
        )
    
    # Default response
    return {"message": "Report type not implemented", "report_type": report_type}


@router.get("/summary")
async def get_report_summary(
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Get a quick summary for the reports dashboard
    """
    supabase = get_supabase_client()
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    
    summary = {
        "total_models_used": 0,
        "top_model": None,
        "weekly_growth": 0,
        "export_available": True,
        "last_updated": now.isoformat()
    }
    
    if supabase:
        try:
            # Get distinct models used this week
            tx_result = supabase.table("credit_transactions")\
                .select("details")\
                .gte("created_at", week_ago.isoformat())\
                .eq("transaction_type", "usage")\
                .execute()
            
            models_used = set()
            model_counts = {}
            for tx in (tx_result.data or []):
                model_id = tx.get("details", {}).get("model_id")
                if model_id:
                    models_used.add(model_id)
                    model_counts[model_id] = model_counts.get(model_id, 0) + 1
            
            summary["total_models_used"] = len(models_used)
            
            if model_counts:
                top = max(model_counts.items(), key=lambda x: x[1])
                summary["top_model"] = {"id": top[0], "uses": top[1]}
                
        except Exception as e:
            logger.warning(f"Could not get report summary: {e}")
    
    return summary
