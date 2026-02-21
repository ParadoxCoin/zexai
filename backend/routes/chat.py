"""
Chat service routes
Handles AI chat completions with credit-based billing
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse
from datetime import datetime
import httpx
import time
import uuid
import os
import json
from typing import List, Optional
from pydantic import BaseModel

from schemas.chat import ChatRequest, ChatResponse
from core.security import get_current_user
from core.database import get_db
from core.credits import CreditManager
from core.config import settings
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits
from services.model_service import model_service

router = APIRouter(prefix="/chat", tags=["Chat"])


# ============================================
# Conversation Management Schemas
# ============================================

class Message(BaseModel):
    """Chat message"""
    role: str
    content: str
    timestamp: datetime


class Conversation(BaseModel):
    """Conversation details"""
    id: str
    user_id: str
    title: Optional[str] = None
    messages: List[Message]
    model: str
    total_tokens: int
    total_credits: float
    created_at: datetime
    updated_at: datetime


class ConversationListItem(BaseModel):
    """Conversation list item"""
    id: str
    title: Optional[str]
    message_count: int
    last_message: str
    model: str
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    """Paginated conversation list"""
    conversations: List[ConversationListItem]
    total: int
    page: int
    page_size: int
    has_more: bool


class ConversationRenameRequest(BaseModel):
    """Rename conversation"""
    title: str


class ChatModel(BaseModel):
    """Available chat model"""
    id: str
    name: str
    description: str
    cost_per_1k_tokens: float
    max_tokens: int


# ============================================
# Chat Completion Endpoint
# ============================================

@router.post("", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Generate AI chat completion
    Credits are deducted based on token usage after API call
    """
    start_time = time.time()
    
    try:
        # 1. Fetch Model Details
        model = await model_service.get_model_by_id(db, request.model)
        if not model:
            # Fallback for legacy requests or if model not found in DB
            # Try to find a default chat model
            all_chat_models = await model_service.get_models(db, type="chat")
            if all_chat_models:
                model = all_chat_models[0]
            else:
                raise HTTPException(status_code=404, detail="Chat model not found")

        # 2. Fetch Provider Config
        provider_id = model.get("provider_id")
        provider_config = await model_service.get_provider_config(db, provider_id)
        
        # 3. Prepare API Request
        # Currently supporting OpenAI-compatible APIs (OpenAI, Fireworks, Groq, etc.)
        # Most providers follow this standard now.
        
        api_endpoint = f"{provider_config['base_url']}/chat/completions"
        
        # Provider-specific model ID (e.g., 'gpt-4o' vs 'accounts/fireworks/models/...')
        provider_model_id = model.get("provider_model_id", request.model)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                api_endpoint,
                headers={
                    "Authorization": f"Bearer {provider_config['api_key']}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": provider_model_id,
                    "messages": [{"role": "user", "content": request.message}],
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens
                },
                timeout=60.0
            )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Chat API error: {response.status_code} - {response.text}"
            )
        
        result = response.json()
        response_time = time.time() - start_time
        
        # Extract response and token usage
        ai_response = result["choices"][0]["message"]["content"]
        tokens_used = result.get("usage", {}).get("total_tokens", 0)
        
        # Calculate credit cost
        # Using cost_per_unit from DB (assuming it's per 1k tokens or similar unit)
        # If cost_per_unit is 0.01 (USD per 1k tokens), and we use 500 tokens:
        # Cost = (500 / 1000) * 0.01 * multiplier
        
        cost_per_unit = float(model.get("cost_per_unit", 0)) # Cost per 1 unit (usually 1k tokens for chat)
        multiplier = float(model.get("cost_multiplier", 2.0))
        
        # Normalize tokens (assuming cost is per 1k tokens for chat models)
        token_units = tokens_used / 1000.0
        cost_usd = token_units * cost_per_unit
        credits_charged = int(cost_usd * settings.DEFAULT_USD_TO_CREDIT_RATE * multiplier)
        
        # Ensure at least 1 credit if usage occurred
        if credits_charged == 0 and tokens_used > 0:
            credits_charged = 1
        
        # Deduct credits and log usage
        await CreditManager.deduct_credits(
            db=db,
            user_id=current_user.id,
            service_type="chat",
            cost=credits_charged,
            details={
                "model": request.model,
                "tokens": tokens_used,
                "prompt_length": len(request.message),
                "response_length": len(ai_response)
            }
        )
        
        # Save conversation to database (Supabase)
        conversation_record = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "messages": [
                {"role": "user", "content": request.message, "timestamp": datetime.utcnow().isoformat()},
                {"role": "assistant", "content": ai_response, "timestamp": datetime.utcnow().isoformat()}
            ],
            "model": request.model,
            "tokens_used": tokens_used,
            "credits_charged": credits_charged,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        try:
            db.table("conversations").insert(conversation_record).execute()
        except Exception as e:
             # If table doesn't exist, we might want to log error but not fail the request
             print(f"Failed to save conversation: {e}")
        
        return ChatResponse(
            response=ai_response,
            model=request.model,
            tokens_used=tokens_used,
            credits_charged=credits_charged,
            response_time=response_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat completion failed: {str(e)}"
        )


# ============================================
# Conversation Management Endpoints
# ============================================

@router.get("/conversations", response_model=ConversationListResponse)
@limiter.limit(RateLimits.PUBLIC_READ)
async def list_conversations(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    List user's chat conversations
    """
    try:
        # Get total count
        count_response = db.table("conversations").select("*", count="exact").eq("user_id", current_user.id).execute()
        total = count_response.count
        
        # Get paginated conversations
        start = (page - 1) * page_size
        end = start + page_size - 1
        
        response = db.table("conversations").select("*")\
            .eq("user_id", current_user.id)\
            .order("updated_at", desc=True)\
            .range(start, end)\
            .execute()
            
        conversations = response.data
        
        # Convert to list items
        conversation_list = []
        for conv in conversations:
            messages = conv.get("messages", [])
            # Handle potential JSON string if not automatically parsed
            if isinstance(messages, str):
                try:
                    messages = json.loads(messages)
                except:
                    messages = []
                    
            last_message = messages[-1].get("content", "") if messages else ""
            
            # Auto-generate title from first message if not set
            title = conv.get("title")
            if not title and messages:
                first_msg = messages[0].get("content", "")
                title = first_msg[:50] + "..." if len(first_msg) > 50 else first_msg
            
            # Parse dates
            created_at = datetime.fromisoformat(conv["created_at"].replace('Z', '+00:00'))
            updated_at = datetime.fromisoformat(conv.get("updated_at", conv["created_at"]).replace('Z', '+00:00'))
            
            conversation_list.append(ConversationListItem(
                id=conv["id"],
                title=title,
                message_count=len(messages),
                last_message=last_message[:100] + "..." if len(last_message) > 100 else last_message,
                model=conv.get("model", "unknown"),
                created_at=created_at,
                updated_at=updated_at
            ))
        
        return ConversationListResponse(
            conversations=conversation_list,
            total=total,
            page=page,
            page_size=page_size,
            has_more=start + len(conversations) < total
        )
    
    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list conversations"
        )


@router.get("/conversations/{conversation_id}", response_model=Conversation)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_conversation(
    request: Request,
    conversation_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get conversation details with full message history
    """
    try:
        response = db.table("conversations").select("*").eq("id", conversation_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        conversation = response.data[0]
        
        # Convert messages to Message objects
        raw_messages = conversation.get("messages", [])
        if isinstance(raw_messages, str):
             try:
                raw_messages = json.loads(raw_messages)
             except:
                raw_messages = []
                
        messages = []
        for msg in raw_messages:
            # Handle timestamp parsing if it's a string
            ts = msg.get("timestamp")
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            messages.append(Message(role=msg["role"], content=msg["content"], timestamp=ts))
            
        created_at = datetime.fromisoformat(conversation["created_at"].replace('Z', '+00:00'))
        updated_at = datetime.fromisoformat(conversation.get("updated_at", conversation["created_at"]).replace('Z', '+00:00'))
        
        return Conversation(
            id=conversation["id"],
            user_id=conversation["user_id"],
            title=conversation.get("title"),
            messages=messages,
            model=conversation.get("model", "unknown"),
            total_tokens=conversation.get("tokens_used", 0),
            total_credits=conversation.get("credits_charged", 0),
            created_at=created_at,
            updated_at=updated_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch conversation"
        )


@router.delete("/conversations/{conversation_id}")
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def delete_conversation(
    request: Request,
    conversation_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Delete a conversation
    """
    try:
        response = db.table("conversations").delete().eq("id", conversation_id).eq("user_id", current_user.id).execute()
        
        # Supabase delete returns the deleted rows
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        logger.info(f"User {current_user.id} deleted conversation {conversation_id}")
        return {"message": "Conversation deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation"
        )


@router.post("/conversations/{conversation_id}/rename")
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def rename_conversation(
    request: Request,
    conversation_id: str,
    rename_request: ConversationRenameRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Rename a conversation
    """
    try:
        response = db.table("conversations").update({
            "title": rename_request.title,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", conversation_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        logger.info(f"User {current_user.id} renamed conversation {conversation_id}")
        return {"message": "Conversation renamed successfully", "title": rename_request.title}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error renaming conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rename conversation"
        )


@router.post("/conversations/{conversation_id}/export")
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def export_conversation(
    request: Request,
    conversation_id: str,
    format: str = Query("txt", pattern="^(txt|json|md)$"),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Export conversation to text, JSON, or Markdown
    """
    try:
        response = db.table("conversations").select("*").eq("id", conversation_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        conversation = response.data[0]
        
        messages = conversation.get("messages", [])
        if isinstance(messages, str):
            try:
                messages = json.loads(messages)
            except:
                messages = []
                
        title = conversation.get("title", "Untitled Conversation")
        created_at = datetime.fromisoformat(conversation["created_at"].replace('Z', '+00:00'))
        
        if format == "json":
            return {
                "title": title,
                "messages": messages,
                "created_at": created_at.isoformat(),
                "model": conversation.get("model")
            }
        
        elif format == "md":
            content = f"# {title}\n\n"
            content += f"**Created:** {created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            content += f"**Model:** {conversation.get('model', 'unknown')}\n\n"
            content += "---\n\n"
            
            for msg in messages:
                role = "**You:**" if msg["role"] == "user" else "**Assistant:**"
                content += f"{role}\n{msg['content']}\n\n"
            
            return {"format": "markdown", "content": content}
        
        else:  # txt
            content = f"{title}\n"
            content += f"Created: {created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += f"Model: {conversation.get('model', 'unknown')}\n"
            content += "=" * 50 + "\n\n"
            
            for msg in messages:
                role = "You:" if msg["role"] == "user" else "Assistant:"
                content += f"{role}\n{msg['content']}\n\n"
            
            return {"format": "text", "content": content}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export conversation"
        )


@router.get("/models", response_model=List[ChatModel])
@limiter.limit(RateLimits.PUBLIC_READ)
async def list_chat_models(
    request: Request,
    db = Depends(get_db)
):
    """
    Get list of available chat models from Supabase
    """
    try:
        # Fetch chat models from Supabase
        models_data = await model_service.get_models(db, type="chat")
        
        models = []
        for m in models_data:
            # Calculate cost per 1k tokens (assuming cost_per_unit is per 1k)
            # This logic might need adjustment based on how you define cost_per_unit in DB
            cost = float(m.get("cost_per_unit", 0)) * float(m.get("cost_multiplier", 2.0))
            
            params = m.get("parameters", {})
            
            models.append(ChatModel(
                id=m["id"],
                name=m["name"],
                description=m.get("description", ""),
                cost_per_1k_tokens=cost,
                max_tokens=params.get("max_tokens", 4096)
            ))
            
        return models
    
    except Exception as e:
        logger.error(f"Error listing chat models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list chat models"
        )


# ============================================
# Streaming Chat Endpoint (SSE)
# ============================================

class StreamingChatRequest(BaseModel):
    """Streaming chat request"""
    message: str
    model: str = "llama-3.3-70b"
    conversation_id: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000


@router.post("/stream")
async def chat_stream(
    request: StreamingChatRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Stream AI chat completion using SSE (Server-Sent Events)
    Real-time token-by-token response
    """
    import asyncio
    
    async def generate():
        try:
            # Get Groq API key for streaming (fast and free)
            groq_key = os.getenv("GROQ_API_KEY", "")
            
            if not groq_key:
                yield f"data: {json.dumps({'error': 'GROQ_API_KEY not configured'})}\n\n"
                return
            
            # Model mapping for Groq
            groq_models = {
                "llama-3.3-70b": "llama-3.3-70b-versatile",
                "llama-3.1-8b": "llama-3.1-8b-instant",
                "llama-3.2-3b": "llama-3.2-3b-preview",
                "llama-3.2-1b": "llama-3.2-1b-preview",
            }
            
            model_id = groq_models.get(request.model, "llama-3.3-70b-versatile")
            
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model_id,
                        "messages": [{"role": "user", "content": request.message}],
                        "temperature": request.temperature,
                        "max_tokens": request.max_tokens,
                        "stream": True
                    },
                    timeout=60.0
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"data: {json.dumps({'error': error_text.decode()})}\n\n"
                        return
                    
                    full_response = ""
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: " prefix
                            if data == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_response += content
                                    yield f"data: {json.dumps({'content': content, 'done': False})}\n\n"
                            except json.JSONDecodeError:
                                continue
                    
                    # Send final message with metadata
                    yield f"data: {json.dumps({'content': '', 'done': True, 'full_response': full_response})}\n\n"
                    
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
