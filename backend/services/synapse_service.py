"""
Synapse (Agent) Service
Encapsulates all business logic for Synapse Agent tasks, including API calls, 
database operations, and webhook handling.
"""
from fastapi import HTTPException, status
from datetime import datetime
from typing import Dict, Any, List, Optional
from types import SimpleNamespace
import httpx
import uuid
import json

from core.database import get_db
from core.credits import CreditManager
from core.config import settings
from services.model_service import model_service
from schemas.synapse import (
    SynapseTaskCreate,
    SynapseTaskResponse,
    SynapseTaskStatus,
    SynapseLogEntry,
    SynapseLogsResponse,
    SynapseWebhookPayload
)

class SynapseService:
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=60.0)
        self.MANUS_CREDIT_MULTIPLIER = 2 # 2 app credits per 1 Manus credit

    async def _append_log(self, supabase, task_id: str, message: str, log_type: str = "info"):
        """Helper to append a log entry to the generation metadata"""
        try:
            # Fetch current metadata
            response = supabase.table("generations").select("metadata").eq("id", task_id).execute()
            if not response.data:
                return
            
            metadata = response.data[0].get("metadata", {}) or {}
            logs = metadata.get("logs", [])
            
            new_log = {
                "log_message": message,
                "log_type": log_type,
                "created_at": datetime.utcnow().isoformat()
            }
            logs.append(new_log)
            metadata["logs"] = logs
            
            # Update metadata
            supabase.table("generations").update({"metadata": metadata}).eq("id", task_id).execute()
        except Exception as e:
            print(f"Error appending log: {e}")

    async def call_manus_api(self, task_id: str, objective: str, context: dict, constraints: list, max_credits: int, max_duration: int, db):
        """
        Background task to call Manus API
        This runs asynchronously after the initial request returns
        """
        try:
            # 1. Fetch Provider Config
            # Assuming 'manus' provider for now, or we could store provider_id in task metadata
            # For now, let's fetch the 'manus' provider config directly or via a default model
            
            # Try to get provider config for 'manus'
            try:
                provider_config = await model_service.get_provider_config(db, "manus")
            except:
                # Fallback if 'manus' provider not in DB yet
                provider_config = {
                    "base_url": settings.MANUS_API_ENDPOINT,
                    "api_key": settings.MANUS_API_KEY
                }

            # Prepare Manus API request
            manus_payload = {
                "task_name": f"Synapse Task {task_id}",
                "agent_instructions": {
                    "objective": objective,
                    "context": context or {},
                    "constraints": constraints or []
                },
                "resource_limits": {
                    "max_credits": max_credits,
                    "max_duration_minutes": max_duration
                },
                "callback_url": f"{settings.MANUS_CALLBACK_BASE_URL}/api/v1/synapse/webhook"
            }
            
            # Update task status to running
            db.table("generations").update({
                "status": "running", 
                # "updated_at": datetime.utcnow().isoformat() # generations table doesn't have updated_at, relying on metadata logs
            }).eq("id", task_id).execute()
            
            # Add log entry
            await self._append_log(db, task_id, "Manus Agent başlatıldı...", "info")
            
            # Call Manus API
            response = await self.http_client.post(
                f"{provider_config['base_url']}/tasks",
                headers={
                    "Authorization": f"Bearer {provider_config['api_key']}",
                    "Content-Type": "application/json"
                },
                json=manus_payload,
                timeout=30.0
            )
            
            if response.status_code not in [200, 201]:
                # Mark task as failed
                db.table("generations").update({
                    "status": "failed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "error_message": f"Manus API error: {response.status_code} - {response.text}"
                }).eq("id", task_id).execute()
                
                await self._append_log(db, task_id, f"Hata: Manus API çağrısı başarısız oldu (HTTP {response.status_code})", "error")
        
        except Exception as e:
            # Mark task as failed
            db.table("generations").update({
                "status": "failed",
                "completed_at": datetime.utcnow().isoformat(),
                "error_message": str(e)
            }).eq("id", task_id).execute()
            
            await self._append_log(db, task_id, f"Hata: {str(e)}", "error")

    async def create_synapse_task(self, request: SynapseTaskCreate, current_user: SimpleNamespace, db) -> SynapseTaskResponse:
        """Creates the task record and returns the initial response."""
        
        # Check minimum credit balance (to start the task)
        min_required_credits = 10  # Minimum to start any task
        balance = await CreditManager.get_user_balance(db, current_user.id)
        
        if balance < min_required_credits:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient credits to start task. Minimum required: {min_required_credits}"
            )
        
        # Create task record
        task_id = str(uuid.uuid4())
        
        generation_record = {
            "id": task_id,
            "user_id": current_user.id,
            "type": "synapse",
            "prompt": request.objective,
            "status": "pending",
            "credits_cost": 0, # Will be updated on completion
            "created_at": datetime.utcnow().isoformat(),
            "metadata": {
                "context": request.context,
                "constraints": request.constraints,
                "max_credits": request.max_credits,
                "max_duration_minutes": request.max_duration_minutes,
                "logs": [{
                    "log_message": "Görev oluşturuldu, agent başlatılıyor...",
                    "log_type": "info",
                    "created_at": datetime.utcnow().isoformat()
                }]
            }
        }
        
        try:
            db.table("generations").insert(generation_record).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        # Estimate cost
        estimated_cost = request.max_credits * self.MANUS_CREDIT_MULTIPLIER
        
        return SynapseTaskResponse(
            task_id=task_id,
            status="pending",
            objective=request.objective,
            created_at=datetime.utcnow(),
            estimated_cost=estimated_cost
        )

    async def get_task_status(self, task_id: str, user_id: str, db) -> SynapseTaskStatus:
        """Retrieves the status and latest log of a Synapse task."""
        response = db.table("generations").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = response.data[0]
        metadata = task.get("metadata", {}) or {}
        logs = metadata.get("logs", [])
        latest_log = logs[-1] if logs else None
        
        created_at = datetime.fromisoformat(task["created_at"].replace('Z', '+00:00'))
        completed_at = datetime.fromisoformat(task["completed_at"].replace('Z', '+00:00')) if task.get("completed_at") else None
        
        return SynapseTaskStatus(
            task_id=task["id"],
            status=task["status"],
            objective=task["prompt"],
            result_url=task.get("output_url"),
            credits_consumed=task.get("credits_cost"),
            created_at=created_at,
            completed_at=completed_at,
            current_step=latest_log.get("log_message") if latest_log else None
        )

    async def get_task_logs(self, task_id: str, user_id: str, db) -> SynapseLogsResponse:
        """Retrieves all logs for a Synapse task."""
        # Verify task belongs to user
        response = db.table("generations").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = response.data[0]
        metadata = task.get("metadata", {}) or {}
        logs_list = metadata.get("logs", [])
        
        logs = [
            SynapseLogEntry(
                log_message=log["log_message"],
                log_type=log["log_type"],
                created_at=datetime.fromisoformat(log["created_at"].replace('Z', '+00:00'))
            )
            for log in logs_list
        ]
        
        return SynapseLogsResponse(
            task_id=task_id,
            logs=logs
        )

    async def list_tasks(self, user_id: str, db, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """Lists Synapse tasks for a user."""
        # Get total count
        count_response = db.table("generations").select("*", count="exact").eq("user_id", user_id).eq("type", "synapse").execute()
        total = count_response.count
        
        # Get paginated items
        response = db.table("generations").select("*")\
            .eq("user_id", user_id)\
            .eq("type", "synapse")\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
            
        tasks = []
        for item in response.data:
            metadata = item.get("metadata", {}) or {}
            logs = metadata.get("logs", [])
            latest_log = logs[-1] if logs else None
            
            created_at = datetime.fromisoformat(item["created_at"].replace('Z', '+00:00'))
            completed_at = datetime.fromisoformat(item["completed_at"].replace('Z', '+00:00')) if item.get("completed_at") else None
            
            tasks.append(SynapseTaskStatus(
                task_id=item["id"],
                status=item["status"],
                objective=item["prompt"],
                result_url=item.get("output_url"),
                credits_consumed=item.get("credits_cost"),
                created_at=created_at,
                completed_at=completed_at,
                current_step=latest_log.get("log_message") if latest_log else None
            ))
            
        return {
            "tasks": tasks,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    async def handle_manus_webhook(self, payload: SynapseWebhookPayload, db):
        """Handles incoming webhooks from the Manus API."""
        task_id = payload.task_id
        
        # Verify task exists
        response = db.table("generations").select("*").eq("id", task_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = response.data[0]
        
        # Handle different webhook types
        
        # 1. Log message
        if payload.log_message:
            await self._append_log(db, task_id, payload.log_message, payload.log_type or "info")
        
        # 2. Status update
        if payload.status:
            update_data = {
                "status": payload.status,
            }
            
            # 3. Task completion
            if payload.status == "completed" and payload.usage:
                # Extract Manus credits consumed
                manus_credits_consumed = payload.usage.get("credits_consumed", 0)
                
                # Calculate app credits cost (2 app credits per 1 Manus credit)
                app_credits_cost = manus_credits_consumed * self.MANUS_CREDIT_MULTIPLIER
                
                # Deduct credits from user
                try:
                    await CreditManager.deduct_credits(
                        supabase=db, # CreditManager expects 'db' or 'supabase' depending on impl, here it's supabase client
                        user_id=task["user_id"],
                        service_type="synapse",
                        cost=app_credits_cost,
                        details={
                            "task_id": task_id,
                            "objective": task["prompt"][:200],
                            "manus_credits": manus_credits_consumed,
                            "duration_seconds": payload.usage.get("duration_seconds", 0)
                        }
                    )
                    
                    update_data["credits_cost"] = app_credits_cost
                    update_data["completed_at"] = datetime.utcnow().isoformat()
                    
                    # Extract result URL if available
                    if payload.outcome and payload.outcome.get("artifacts"):
                        artifacts = payload.outcome["artifacts"]
                        if artifacts and len(artifacts) > 0:
                            update_data["output_url"] = artifacts[0].get("url")
                    
                    # Add completion log
                    await self._append_log(db, task_id, f"Görev tamamlandı! {app_credits_cost} kredi harcandı.", "info")
                    
                except HTTPException as e:
                    # Insufficient credits - mark task as failed
                    update_data["status"] = "failed"
                    update_data["error_message"] = e.detail
                    update_data["completed_at"] = datetime.utcnow().isoformat()
                    
                    await self._append_log(db, task_id, f"Hata: {e.detail}", "error")
            
            # 4. Task failure
            elif payload.status == "failed":
                update_data["completed_at"] = datetime.utcnow().isoformat()
                update_data["error_message"] = payload.outcome.get("message", "Unknown error") if payload.outcome else "Task failed"
                
                await self._append_log(db, task_id, f"Görev başarısız oldu: {update_data['error_message']}", "error")
            
            # Update task in database
            db.table("generations").update(update_data).eq("id", task_id).execute()
        
        return {"status": "ok", "message": "Webhook processed successfully"}

# Global instance
synapse_service = SynapseService()
