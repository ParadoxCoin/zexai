"""
Chat service routes
Handles AI chat completions with credit-based billing and conversation memory
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse
from datetime import datetime
import httpx
import time
import uuid
import os
import json
from typing import List, Optional, Dict, Any
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

# Default system prompt for ZexAi
DEFAULT_SYSTEM_PROMPT = """Sen ZexAi platformunun yapay zeka asistanısın. Kullanıcılara yardımcı, doğru ve güncel bilgiler sunmaya çalışıyorsun.
- Her zaman Türkçe veya kullanıcının tercih ettiği dilde yanıt ver.
- Kod yazarken açıklayıcı yorumlar ekle.
- Konuşma bağlamını hatırla ve önceki mesajlara referans ver.
- Eğer bir konuda bilgin güncel değilse, bunu belirt.
- Markdown formatını kullan (başlıklar, listeler, kod blokları).
"""

# Maximum messages to include in context (to avoid token overflow)
MAX_CONTEXT_MESSAGES = 30  # ~15 user + 15 assistant turns


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
# Helper: Load conversation history from DB
# ============================================

def _load_conversation_messages(db, conversation_id: str, user_id: str) -> tuple[Optional[Dict], List[Dict]]:
    """
    Load conversation and its messages from database.
    Returns (conversation_record, messages_list)
    """
    if not conversation_id:
        logger.info("No conversation_id provided, starting fresh")
        return None, []
    
    try:
        logger.info(f"Loading conversation {conversation_id} for user {user_id}")
        result = db.table("conversations").select("*").eq("id", conversation_id).eq("user_id", user_id).execute()
        if result.data and len(result.data) > 0:
            conv = result.data[0]
            messages = conv.get("messages", [])
            if isinstance(messages, str):
                try:
                    messages = json.loads(messages)
                except:
                    messages = []
            logger.info(f"Loaded conversation with {len(messages)} messages")
            return conv, messages
        else:
            logger.warning(f"Conversation {conversation_id} not found in DB")
    except Exception as e:
        logger.warning(f"Failed to load conversation {conversation_id}: {e}")
    
    return None, []


def _build_messages_for_api(
    history: List[Dict],
    new_message: str,
    system_prompt: Optional[str] = None,
    max_messages: int = MAX_CONTEXT_MESSAGES
) -> List[Dict[str, str]]:
    """
    Build the messages array for the OpenAI-compatible API call.
    Includes system prompt + trimmed conversation history + new user message.
    Works with ALL providers (OpenAI, Groq, Fireworks, DeepSeek, etc.)
    """
    api_messages = []
    
    # 1. System prompt
    prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
    api_messages.append({"role": "system", "content": prompt})
    
    # 2. Conversation history (trimmed to last N messages)
    if history:
        # Take only the last max_messages to avoid token overflow
        recent_history = history[-max_messages:]
        for msg in recent_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                api_messages.append({"role": role, "content": content})
    
    # 3. New user message
    api_messages.append({"role": "user", "content": new_message})
    
    return api_messages


def _save_conversation(
    db,
    conversation_id: str,
    user_id: str,
    existing_conv: Optional[Dict],
    existing_messages: List[Dict],
    user_message: str,
    ai_response: str,
    model: str,
    tokens_used: int,
    credits_charged: float
) -> str:
    """
    Save or update conversation in database.
    Returns the conversation_id.
    """
    now = datetime.utcnow().isoformat()
    
    new_msgs = [
        {"role": "user", "content": user_message, "timestamp": now},
        {"role": "assistant", "content": ai_response, "timestamp": now}
    ]
    
    if existing_conv:
        # Update existing conversation
        all_messages = existing_messages + new_msgs
        prev_tokens = existing_conv.get("tokens_used", 0) or 0
        prev_credits = existing_conv.get("credits_charged", 0) or 0
        
        try:
            logger.info(f"Updating conversation {conversation_id} with {len(all_messages)} total messages")
            db.table("conversations").update({
                "messages": json.dumps(all_messages, ensure_ascii=False) if isinstance(all_messages, list) else all_messages,
                "tokens_used": prev_tokens + tokens_used,
                "credits_charged": prev_credits + credits_charged,
                "updated_at": now,
                "model": model
            }).eq("id", conversation_id).execute()
        except Exception as e:
            logger.error(f"Failed to update conversation: {e}")
        
        return conversation_id
    else:
        # Create new conversation - always use valid UUID
        new_id = str(uuid.uuid4())
        
        # Auto-generate title from first message
        title = user_message[:60] + "..." if len(user_message) > 60 else user_message
        
        conversation_record = {
            "id": new_id,
            "user_id": user_id,
            "title": title,
            "messages": json.dumps(new_msgs, ensure_ascii=False),
            "model": model,
            "tokens_used": tokens_used,
            "credits_charged": credits_charged,
            "created_at": now,
            "updated_at": now
        }
        
        try:
            logger.info(f"Creating new conversation {new_id} for user {user_id}")
            db.table("conversations").insert(conversation_record).execute()
            logger.info(f"Conversation {new_id} created successfully")
        except Exception as e:
            logger.error(f"Failed to save conversation: {e}")
        
        return new_id


# ============================================
# Chat Completion Endpoint (Non-Streaming)
# ============================================

@router.post("", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Generate AI chat completion with conversation memory.
    Credits are deducted based on token usage after API call.
    """
    start_time = time.time()
    
    try:
        # 1. Fetch Model Details
        model = await model_service.get_model_by_id(db, request.model)
        if not model:
            all_chat_models = await model_service.get_models(db, type="chat")
            if all_chat_models:
                model = all_chat_models[0]
            else:
                raise HTTPException(status_code=404, detail="Chat model not found")

        # 2. Fetch Provider Config
        provider_id = model.get("provider_id")
        provider_config = await model_service.get_provider_config(db, provider_id)
        
        # 3. Load conversation history for context
        existing_conv, existing_messages = _load_conversation_messages(
            db, request.conversation_id, current_user.id
        )
        
        # 4. Build messages array with full history
        api_messages = _build_messages_for_api(
            history=existing_messages,
            new_message=request.message,
            system_prompt=request.system_prompt
        )
        
        logger.info(f"Chat request: model={request.model}, history_msgs={len(existing_messages)}, total_api_msgs={len(api_messages)}")
        
        # 5. Call API (OpenAI-compatible format - works with all providers)
        api_endpoint = f"{provider_config['base_url']}/chat/completions"
        provider_model_id = model.get("provider_model_id", request.model)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                api_endpoint,
                headers={
                    "Authorization": f"Bearer {str(provider_config['api_key'])}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": provider_model_id,
                    "messages": api_messages,  # ✅ Full history included!
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens
                },
                timeout=120.0
            )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Chat API error: {response.status_code} - {response.text}"
            )
        
        result = response.json()
        response_time = time.time() - start_time
        
        # 6. Extract response and token usage
        ai_response = result["choices"][0]["message"]["content"]
        tokens_used = result.get("usage", {}).get("total_tokens", 0)
        
        # 7. Calculate credit cost
        cost_per_unit = float(model.get("cost_per_unit", 0))
        multiplier = float(model.get("cost_multiplier", 2.0))
        token_units = tokens_used / 1000.0
        cost_usd = token_units * cost_per_unit
        credits_charged = int(cost_usd * settings.DEFAULT_USD_TO_CREDIT_RATE * multiplier)
        
        if credits_charged == 0 and tokens_used > 0:
            credits_charged = 1
        
        # 8. Deduct credits
        await CreditManager.deduct_credits(
            db=db,
            user_id=current_user.id,
            service_type="chat",
            cost=credits_charged,
            details={
                "model": request.model,
                "tokens": tokens_used,
                "prompt_length": len(request.message),
                "response_length": len(ai_response),
                "context_messages": len(api_messages)
            }
        )
        
        # 9. Save/update conversation
        saved_conv_id = _save_conversation(
            db=db,
            conversation_id=request.conversation_id or str(uuid.uuid4()),
            user_id=current_user.id,
            existing_conv=existing_conv,
            existing_messages=existing_messages,
            user_message=request.message,
            ai_response=ai_response,
            model=request.model,
            tokens_used=tokens_used,
            credits_charged=credits_charged
        )
        
        return ChatResponse(
            response=ai_response,
            model=request.model,
            tokens_used=tokens_used,
            credits_charged=credits_charged,
            response_time=response_time,
            conversation_id=saved_conv_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat completion failed: {str(e)}")
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
        count_response = db.table("conversations").select("*", count="exact").eq("user_id", current_user.id).execute()
        total = count_response.count
        
        start = (page - 1) * page_size
        end = start + page_size - 1
        
        response = db.table("conversations").select("*")\
            .eq("user_id", current_user.id)\
            .order("updated_at", desc=True)\
            .range(start, end)\
            .execute()
            
        conversations = response.data
        
        conversation_list = []
        for conv in conversations:
            messages = conv.get("messages", [])
            if isinstance(messages, str):
                try:
                    messages = json.loads(messages)
                except:
                    messages = []
                    
            last_message = messages[-1].get("content", "") if messages else ""
            
            title = conv.get("title")
            if not title and messages:
                first_msg = messages[0].get("content", "")
                title = first_msg[:50] + "..." if len(first_msg) > 50 else first_msg
            
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
        
        raw_messages = conversation.get("messages", [])
        if isinstance(raw_messages, str):
             try:
                raw_messages = json.loads(raw_messages)
             except:
                raw_messages = []
                
        messages = []
        for msg in raw_messages:
            ts = msg.get("timestamp")
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            elif ts is None:
                ts = datetime.utcnow()
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
        models_data = await model_service.get_models(db, type="chat")
        
        models = []
        for m in models_data:
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
# Streaming Chat Endpoint (SSE) with Memory
# ============================================

class StreamingChatRequest(BaseModel):
    """Streaming chat request"""
    message: str
    model: str = "llama-3.3-70b"
    conversation_id: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    system_prompt: Optional[str] = None


@router.post("/stream")
async def chat_stream(
    request: StreamingChatRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Stream AI chat completion using SSE (Server-Sent Events)
    Real-time token-by-token response WITH conversation memory.
    Works with any OpenAI-compatible provider (Groq, OpenAI, Fireworks, DeepSeek, etc.)
    """
    import asyncio
    
    async def generate():
        try:
            # 1. Get model and provider config
            model = await model_service.get_model_by_id(db, request.model)
            provider_config = None
            
            if model:
                provider_id = model.get("provider_id")
                provider_config = await model_service.get_provider_config(db, provider_id)
            
            # Determine API endpoint and key
            if provider_config:
                api_url = f"{provider_config['base_url']}/chat/completions"
                api_key = str(provider_config['api_key'])
                provider_model_id = model.get("provider_model_id", request.model)
            else:
                # Fallback to Groq
                groq_key = os.getenv("GROQ_API_KEY", "")
                if not groq_key:
                    yield f"data: {json.dumps({'error': 'No API key configured for this model'})}\n\n"
                    return
                api_url = "https://api.groq.com/openai/v1/chat/completions"
                api_key = groq_key
                # Model mapping for Groq fallback
                groq_models = {
                    "llama-3.3-70b": "llama-3.3-70b-versatile",
                    "llama-3.1-8b": "llama-3.1-8b-instant",
                    "llama-3.2-3b": "llama-3.2-3b-preview",
                    "llama-3.2-1b": "llama-3.2-1b-preview",
                }
                provider_model_id = groq_models.get(request.model, "llama-3.3-70b-versatile")
            
            # 2. Load conversation history
            existing_conv, existing_messages = _load_conversation_messages(
                db, request.conversation_id, current_user.id
            )
            
            # 3. Build messages with full context
            api_messages = _build_messages_for_api(
                history=existing_messages,
                new_message=request.message,
                system_prompt=request.system_prompt
            )
            
            logger.info(f"Stream chat: model={request.model}, provider_model={provider_model_id}, context_msgs={len(api_messages)}")
            
            # 4. Stream from provider
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    api_url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": provider_model_id,
                        "messages": api_messages,  # ✅ Full history included!
                        "temperature": request.temperature,
                        "max_tokens": request.max_tokens,
                        "stream": True
                    },
                    timeout=120.0
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"data: {json.dumps({'error': error_text.decode()})}\n\n"
                        return
                    
                    full_response = ""
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
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
                    
                    # 5. Save conversation after streaming completes
                    conv_id = request.conversation_id or str(uuid.uuid4())
                    saved_conv_id = _save_conversation(
                        db=db,
                        conversation_id=conv_id,
                        user_id=current_user.id,
                        existing_conv=existing_conv,
                        existing_messages=existing_messages,
                        user_message=request.message,
                        ai_response=full_response,
                        model=request.model,
                        tokens_used=len(full_response.split()) * 2,  # Approximate token count
                        credits_charged=1  # Minimum 1 credit for streaming
                    )
                    
                    # Send final message with metadata
                    yield f"data: {json.dumps({'content': '', 'done': True, 'full_response': full_response, 'conversation_id': saved_conv_id})}\n\n"
                    
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
