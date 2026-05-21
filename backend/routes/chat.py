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
from services.kie_service import kie_service

router = APIRouter(prefix="/chat", tags=["Chat"])

DEFAULT_CHAT_MODELS = [
    {
        "id": "llama-3.3-70b",
        "name": "Llama 3.3 70B",
        "description": "Fast general-purpose assistant via Groq",
        "cost_usd": 0,
        "cost_multiplier": 1,
        "provider_id": "groq",
        "model_id": "llama-3.3-70b-versatile",
        "parameters": {"max_tokens": 8192},
    },
    {
        "id": "llama-3.1-8b",
        "name": "Llama 3.1 8B",
        "description": "Low-latency assistant via Groq",
        "cost_usd": 0,
        "cost_multiplier": 1,
        "provider_id": "groq",
        "model_id": "llama-3.1-8b-instant",
        "parameters": {"max_tokens": 8192},
    },
]


def _default_chat_model(model_id: str) -> Dict[str, Any]:
    return next((m for m in DEFAULT_CHAT_MODELS if m["id"] == model_id), DEFAULT_CHAT_MODELS[0])


def _default_groq_config() -> Optional[Dict[str, str]]:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None
    return {"api_key": api_key, "base_url": "https://api.groq.com/openai/v1"}

# Default system prompt for ZexAi
DEFAULT_SYSTEM_PROMPT = """Sen ZexAi platformunun yapay zeka asistanısın.
- Bugünün tarihi: 23 Şubat 2026, Pazartesi.
- Kullanıcılara yardımcı, doğru ve kapsamlı bilgiler sun.
- Her zaman Türkçe veya kullanıcının tercih ettiği dilde yanıt ver.
- Kod yazarken açıklayıcı yorumlar ekle.
- Konuşma bağlamını hatırla ve önceki mesajlara referans ver.
- Markdown formatını kullan (başlıklar, listeler, kod blokları).
- Yanıtlarında doğal, samimi ve profesyonel ol.
- ÖNEMLİ: Bilgi kesim tarihinden veya güncel olmayan bilgilerden asla bahsetme. Bildiğin kadarıyla cevap ver, emin olmadığın konularda 'bu konuda kesin bilgim yok' de ama asla 'eğitim verim şu tarihe kadar' gibi ifadeler kullanma.
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
    Ensures alternating user/assistant turns and merges consecutive identical-role messages.
    """
    api_messages = []
    
    # 1. System prompt
    prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
    api_messages.append({"role": "system", "content": prompt})
    
    # 2. Extract and sanitize messages from history
    temp_msgs = []
    if history:
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                temp_msgs.append({"role": role, "content": content})
                
    # 3. Prevent double-appending if the frontend already added the new user message to the history
    cleaned_new_message = new_message.strip() if new_message else ""
    if cleaned_new_message:
        is_already_appended = False
        if temp_msgs:
            last_msg = temp_msgs[-1]
            if last_msg["role"] == "user" and last_msg["content"].strip() == cleaned_new_message:
                is_already_appended = True
        
        if not is_already_appended:
            temp_msgs.append({"role": "user", "content": cleaned_new_message})

    # 4. Merge consecutive messages of the exact same role to prevent API validation failures
    merged_msgs = []
    for msg in temp_msgs:
        if merged_msgs and merged_msgs[-1]["role"] == msg["role"]:
            merged_msgs[-1]["content"] += "\n" + msg["content"]
        else:
            merged_msgs.append(msg)
            
    # 5. Trim to max_messages
    if len(merged_msgs) > max_messages:
        merged_msgs = merged_msgs[-max_messages:]
        
    api_messages.extend(merged_msgs)
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
        
        try:
            logger.info(f"Updating conversation {conversation_id} with {len(all_messages)} total messages")
            db.table("conversations").update({
                "messages": json.dumps(all_messages, ensure_ascii=False) if isinstance(all_messages, list) else all_messages,
                "updated_at": now,
                "model": model
            }).eq("id", conversation_id).execute()
        except Exception as e:
            logger.error(f"Failed to update conversation: {e}", exc_info=True)
        
        return conversation_id
    else:
        # Create new conversation - USE THE PROVIDED conversation_id
        # This is critical: the conv_id was already sent to the frontend via stream
        # If we generate a new UUID here, the frontend will track the wrong ID
        
        # Auto-generate title from first message
        title = user_message[:60] + "..." if len(user_message) > 60 else user_message
        
        conversation_record = {
            "id": conversation_id,
            "user_id": user_id,
            "title": title,
            "messages": json.dumps(new_msgs, ensure_ascii=False),
            "model": model,
            "created_at": now,
            "updated_at": now
        }
        
        try:
            logger.info(f"Creating new conversation {conversation_id} for user {user_id}")
            result = db.table("conversations").insert(conversation_record).execute()
            if result.data:
                logger.info(f"✅ Conversation {conversation_id} created successfully")
            else:
                logger.error(f"⚠️ Insert returned no data for {conversation_id}")
        except Exception as e:
            logger.error(f"❌ Failed to save conversation: {e}", exc_info=True)
        
        return conversation_id


# ============================================
# Diagnostic: Test conversation save
# ============================================

@router.get("/test-save")
async def test_save(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Test if conversations table works"""
    test_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    test_msgs = [{"role": "user", "content": "test", "timestamp": now}]
    
    errors = []
    results = {}
    
    # 1. Test insert
    try:
        record = {
            "id": test_id,
            "user_id": current_user.id,
            "title": "TEST - will be deleted",
            "messages": json.dumps(test_msgs, ensure_ascii=False),
            "model": "test",
            "created_at": now,
            "updated_at": now
        }
        insert_result = db.table("conversations").insert(record).execute()
        results["insert"] = {"success": bool(insert_result.data), "data_count": len(insert_result.data) if insert_result.data else 0}
    except Exception as e:
        errors.append(f"INSERT: {str(e)}")
        results["insert"] = {"success": False, "error": str(e)}
    
    # 2. Test read
    try:
        read_result = db.table("conversations").select("*").eq("user_id", current_user.id).order("created_at", desc=True).limit(5).execute()
        results["read"] = {"success": True, "count": len(read_result.data) if read_result.data else 0}
        if read_result.data:
            results["read"]["first_title"] = read_result.data[0].get("title", "no title")
    except Exception as e:
        errors.append(f"READ: {str(e)}")
        results["read"] = {"success": False, "error": str(e)}
    
    # 3. Cleanup test record
    try:
        db.table("conversations").delete().eq("id", test_id).execute()
        results["cleanup"] = "ok"
    except Exception as e:
        results["cleanup"] = f"failed: {str(e)}"
    
    # 4. Check supabase client type
    from core.supabase_client import get_supabase_client
    fresh = get_supabase_client()
    results["supabase_client"] = "available" if fresh else "NONE"
    
    return {
        "user_id": current_user.id,
        "test_id": test_id,
        "results": results,
        "errors": errors
    }


# ============================================
# Chat Completion Endpoint (Non-Streaming)
# ============================================

@router.post("", response_model=ChatResponse)
@limiter.limit(RateLimits.AI_CHAT)
async def chat_completion(
    request: Request,
    body: ChatRequest,
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
        model = await model_service.get_model_by_id(db, body.model)
        if not model:
            all_chat_models = await model_service.get_models(db, type="chat")
            if all_chat_models:
                model = all_chat_models[0]
            else:
                model = _default_chat_model(body.model)

        cost_per_unit = float(model.get("cost_usd", 0))
        is_free_model = cost_per_unit == 0
        is_kie_paid_model = (not is_free_model) or (model.get("provider_id") == "kie")

        # Pre-check credit balance (minimum 1.0 credits required for paid models)
        if is_kie_paid_model:
            balance = await CreditManager.get_user_balance(db, current_user.id)
            if balance < 1.0:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Bu model ücretlidir. Lütfen en az 1 kredi bakiyeniz olduğundan emin olun."
                )

        # 2. Fetch Provider Config (Only if not a Kie paid model)
        provider_config = None
        provider_id = model.get("provider_id")
        if not is_kie_paid_model:
            if provider_id == "groq":
                provider_config = _default_groq_config()
                if not provider_config:
                    raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")
            else:
                provider_config = await model_service.get_provider_config(db, provider_id)
        
        # 3. Load conversation history for context (ALWAYS check DB if conversation_id is supplied)
        existing_conv = None
        existing_messages = []
        if body.conversation_id:
            existing_conv, existing_messages = _load_conversation_messages(
                db, body.conversation_id, current_user.id
            )
            
        if body.history and len(body.history) > 0:
            history_messages = body.history
        else:
            history_messages = existing_messages
        
        # 4. Build messages array with full history
        api_messages = _build_messages_for_api(
            history=history_messages,
            new_message=body.message,
        )
        
        logger.info(f"Chat request: model={body.model}, history_msgs={len(existing_messages)}, total_api_msgs={len(api_messages)}")
        
        # 5. Call API (OpenAI-compatible format)
        provider_model_id = model.get("model_id", body.model)
        if is_kie_paid_model:
            api_endpoint = "https://api.kie.ai/v1/chat/completions"
            api_key = kie_service._next_key()
            req_headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        else:
            # Smart URL construction - avoid doubling /chat/completions
            base = provider_config['base_url'].rstrip('/')
            if base.endswith('/chat/completions'):
                api_endpoint = base
            else:
                api_endpoint = f"{base}/chat/completions"
            
            # Build headers - add OpenRouter-specific headers when needed
            req_headers = {
                "Authorization": f"Bearer {str(provider_config['api_key'])}",
                "Content-Type": "application/json"
            }
            if provider_id and "openrouter" in provider_id.lower():
                req_headers["HTTP-Referer"] = "https://zexai.vercel.app"
                req_headers["X-Title"] = "ZexAI"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                api_endpoint,
                headers=req_headers,
                json={
                    "model": provider_model_id,
                    "messages": api_messages,  # ✅ Full history included!
                    "temperature": body.temperature,
                    "max_tokens": body.max_tokens
                },
                timeout=300.0
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
        cost_per_unit = float(model.get("cost_usd", 0))
        multiplier = float(model.get("cost_multiplier", 2.0))
        token_units = tokens_used / 1000.0
        cost_usd = token_units * cost_per_unit
        credits_charged = int(cost_usd * settings.DEFAULT_USD_TO_CREDIT_RATE * multiplier)
        
        # Free models (cost_usd = 0) never deduct credits
        is_free_model = cost_per_unit == 0
        
        if not is_free_model:
            # For paid models: always charge at least 1 credit
            if credits_charged == 0 and tokens_used > 0:
                credits_charged = 1
            
            # 8. Deduct credits (only for paid models)
            await CreditManager.deduct_credits(
                db=db,
                user_id=current_user.id,
                service_type="chat",
                cost=credits_charged,
                details={
                    "model": body.model,
                    "tokens": tokens_used,
                    "prompt_length": len(body.message),
                    "response_length": len(ai_response),
                    "context_messages": len(api_messages)
                }
            )
        else:
            credits_charged = 0  # Free model - no charge
        
        # 9. Save/update conversation
        saved_conv_id = _save_conversation(
            db=db,
            conversation_id=body.conversation_id or str(uuid.uuid4()),
            user_id=current_user.id,
            existing_conv=existing_conv,
            existing_messages=existing_messages,
            user_message=body.message,
            ai_response=ai_response,
            model=body.model,
            tokens_used=tokens_used,
            credits_charged=credits_charged
        )
        
        return ChatResponse(
            response=ai_response,
            model=body.model,
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
        if not models_data:
            models_data = DEFAULT_CHAT_MODELS
        
        models = []
        for m in models_data:
            cost_usd = float(m.get("cost_usd", 0))
            multiplier = float(m.get("cost_multiplier", 2.0))
            # Display cost per 1k tokens: (cost_usd * multiplier * 100)
            cost_per_1k = cost_usd * multiplier * 100.0
            
            params = m.get("parameters", {})
            
            models.append(ChatModel(
                id=m["id"],
                name=m["name"],
                description=m.get("description", ""),
                cost_per_1k_tokens=cost_per_1k,
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
    """Streaming chat request — system prompt is server-enforced only."""
    message: str
    model: str = "llama-3.3-70b"
    conversation_id: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    history: Optional[List[Dict]] = None  # Frontend sends full message history


@router.post("/stream")
@limiter.limit(RateLimits.AI_CHAT)
async def chat_stream(
    http_request: Request,
    request: StreamingChatRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Stream AI chat completion using SSE with conversation memory.
    Uses frontend-provided history (priority) or DB-loaded history (fallback).
    """
    # ── PRE-STREAM: Fetch Model and precheck credits ──
    model = await model_service.get_model_by_id(db, request.model)
    if not model:
        all_chat_models = await model_service.get_models(db, type="chat")
        if all_chat_models:
            model = all_chat_models[0]
        else:
            model = _default_chat_model(request.model)

    cost_per_unit = float(model.get("cost_usd", 0))
    is_free_model = cost_per_unit == 0
    is_kie_paid_model = (not is_free_model) or (model.get("provider_id") == "kie")

    # Pre-check credit balance (minimum 1.0 credits required for paid models)
    if is_kie_paid_model:
        balance = await CreditManager.get_user_balance(db, current_user.id)
        if balance < 1.0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Bu model ücretlidir. Lütfen en az 1 kredi bakiyeniz olduğundan emin olun."
            )

    # Fetch Provider Config (Only if not a Kie paid model)
    provider_config = None
    provider_id = model.get("provider_id")
    if not is_kie_paid_model:
        if provider_id == "groq":
            provider_config = _default_groq_config()
            if not provider_config:
                raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")
        else:
            provider_config = await model_service.get_provider_config(db, provider_id)

    # Determine Endpoint, Key and Model ID
    provider_model_id = model.get("model_id", request.model)
    if is_kie_paid_model:
        api_url = "https://api.kie.ai/v1/chat/completions"
        api_key = kie_service._next_key()
        is_openrouter = False
    else:
        if provider_config:
            base = provider_config['base_url'].rstrip('/')
            if base.endswith('/chat/completions'):
                api_url = base
            else:
                api_url = f"{base}/chat/completions"
            api_key = str(provider_config['api_key'])
            is_openrouter = "openrouter" in provider_id.lower()
        else:
            groq_key = os.getenv("GROQ_API_KEY", "")
            if not groq_key:
                raise HTTPException(status_code=500, detail="No API key configured")
            api_url = "https://api.groq.com/openai/v1/chat/completions"
            api_key = groq_key
            is_openrouter = False

    # Always try to load existing conversation for proper save/update
    existing_conv = None
    existing_db_messages = []
    if request.conversation_id:
        existing_conv, existing_db_messages = _load_conversation_messages(db, request.conversation_id, current_user.id)

    # Use frontend-provided history for API context (priority) or DB history (fallback)
    if request.history and len(request.history) > 0:
        history_messages = request.history
        logger.info(f"Using frontend-provided history: {len(history_messages)} messages")
    else:
        history_messages = existing_db_messages
        logger.info(f"Using DB history: {len(history_messages)} messages")

    api_messages = _build_messages_for_api(history_messages, request.message)
    conv_id = request.conversation_id if existing_conv else str(uuid.uuid4())

    logger.info(f"STREAM: model={provider_model_id}, api_msgs={len(api_messages)}, conv_id={conv_id}, existing={existing_conv is not None}")

    # ── Closure context for generator ──
    ctx = {
        "api_url": api_url, "api_key": api_key, "model_id": provider_model_id,
        "messages": api_messages, "temp": request.temperature, "max_tok": request.max_tokens,
        "conv_id": conv_id, "uid": current_user.id, "user_msg": request.message,
        "model_name": request.model, "ex_conv": existing_conv, "ex_msgs": existing_db_messages,
        "is_free": is_free_model, "is_openrouter": is_openrouter
    }

    # Shared state for the generator to communicate with the background task
    save_state = {"full_response": "", "saved": False}

    async def generate():
        c = ctx
        try:
            # FIRST event: conversation_id so frontend tracks it immediately
            yield f"data: {json.dumps({'conversation_id': c['conv_id'], 'content': '', 'done': False})}\n\n"

            async with httpx.AsyncClient() as http:
                async with http.stream(
                    "POST", c["api_url"],
                    headers={"Authorization": f"Bearer {c['api_key']}", "Content-Type": "application/json",
                             **(({"HTTP-Referer": "https://zexai.vercel.app", "X-Title": "ZexAI"}) if c.get("is_openrouter") else {})},
                    json={"model": c["model_id"], "messages": c["messages"],
                          "temperature": c["temp"], "max_tokens": c["max_tok"], "stream": True},
                    timeout=300.0
                ) as resp:
                    if resp.status_code != 200:
                        err = await resp.aread()
                        yield f"data: {json.dumps({'error': err.decode()})}\n\n"
                        return

                    full = ""
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            raw = line[6:]
                            if raw == "[DONE]":
                                break
                            try:
                                tk = json.loads(raw).get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if tk:
                                    full += tk
                                    yield f"data: {json.dumps({'content': tk, 'done': False})}\n\n"
                            except json.JSONDecodeError:
                                continue

            # Store full response for background save
            save_state["full_response"] = full

            # Try inline save BEFORE final yield (best effort)
            try:
                from core.supabase_client import get_supabase_client
                fresh = get_supabase_client()
                if fresh is not None:
                    tokens_used = max(len(full.split()) * 2, 1)
                    credits_charged = 0
                    if not c.get("is_free"):
                        credits_charged = await CreditManager.calculate_chat_cost(fresh, c["model_name"], tokens_used)
                        credits_charged = int(credits_charged)
                        if credits_charged == 0 and tokens_used > 0:
                            credits_charged = 1
                        
                        # Deduct credits
                        await CreditManager.deduct_credits(
                            db=fresh,
                            user_id=c["uid"],
                            service_type="chat",
                            cost=credits_charged,
                            details={
                                "model": c["model_name"],
                                "tokens": tokens_used,
                                "prompt_length": len(c["user_msg"]),
                                "response_length": len(full),
                                "context_messages": len(c["messages"])
                            }
                        )

                    _save_conversation(
                        db=fresh, conversation_id=c["conv_id"], user_id=c["uid"],
                        existing_conv=c["ex_conv"], existing_messages=c["ex_msgs"],
                        user_message=c["user_msg"], ai_response=full,
                        model=c["model_name"], 
                        tokens_used=tokens_used, 
                        credits_charged=credits_charged
                    )

                    save_state["saved"] = True
                    logger.info(f"✅ Saved conv {c['conv_id']} inline ({len(c['ex_msgs'])+2} msgs)")
                else:
                    logger.error("CRITICAL: Supabase client is None!")
            except Exception as se:
                logger.error(f"❌ Inline save error: {se}", exc_info=True)

            yield f"data: {json.dumps({'content': '', 'done': True, 'conversation_id': c['conv_id']})}\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    def background_save():
        """Fallback save in case the inline save didn't work"""
        c = ctx
        if save_state["saved"]:
            logger.info(f"Background save skipped - already saved inline for {c['conv_id']}")
            return
        
        full = save_state.get("full_response", "")
        if not full:
            logger.warning(f"Background save skipped - no response text for {c['conv_id']}")
            return

        try:
            from core.supabase_client import get_supabase_client
            fresh = get_supabase_client()
            if fresh is not None:
                tokens_used = max(len(full.split()) * 2, 1)
                credits_charged = 0
                if not c.get("is_free"):
                    credits_charged = await CreditManager.calculate_chat_cost(fresh, c["model_name"], tokens_used)
                    credits_charged = int(credits_charged)
                    if credits_charged == 0 and tokens_used > 0:
                        credits_charged = 1
                    
                    # Deduct credits in background fallback
                    await CreditManager.deduct_credits(
                        db=fresh,
                        user_id=c["uid"],
                        service_type="chat",
                        cost=credits_charged,
                        details={
                            "model": c["model_name"],
                            "tokens": tokens_used,
                            "prompt_length": len(c["user_msg"]),
                            "response_length": len(full),
                            "context_messages": len(c["messages"])
                        }
                    )

                _save_conversation(
                    db=fresh, conversation_id=c["conv_id"], user_id=c["uid"],
                    existing_conv=c["ex_conv"], existing_messages=c["ex_msgs"],
                    user_message=c["user_msg"], ai_response=full,
                    model=c["model_name"], tokens_used=tokens_used, credits_charged=credits_charged
                )
                logger.info(f"✅ Saved conv {c['conv_id']} via background task")
            else:
                logger.error("CRITICAL: Supabase client is None in background save!")
        except Exception as se:
            logger.error(f"❌ Background save error: {se}", exc_info=True)

    from starlette.background import BackgroundTask

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        background=BackgroundTask(background_save)
    )
