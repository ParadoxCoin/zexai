"""
Input validation and sanitization utilities
Protects against injection attacks and ensures data integrity
"""
import re
import html
import bleach
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, validator, Field
from core.exceptions import ValidationError


class BaseValidationMixin:
    """Base mixin for validation utilities"""
    
    @staticmethod
    def sanitize_text(text: str, max_length: int = 1000) -> str:
        """Sanitize text input to prevent XSS and injection attacks"""
        if not isinstance(text, str):
            raise ValidationError("Input must be a string", "text", text)
        
        # Remove null bytes and control characters
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        
        # HTML escape to prevent XSS
        text = html.escape(text, quote=True)
        
        # Limit length
        if len(text) > max_length:
            text = text[:max_length]
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    @staticmethod
    def validate_prompt(prompt: str) -> str:
        """Validate and sanitize AI prompts"""
        if not prompt or not isinstance(prompt, str):
            raise ValidationError("Prompt cannot be empty", "prompt", prompt)
        
        # Check for prompt injection attempts
        injection_patterns = [
            r'ignore\s+previous\s+instructions',
            r'forget\s+everything',
            r'you\s+are\s+now',
            r'system\s*:',
            r'admin\s*:',
            r'<script',
            r'javascript:',
            r'data:',
            r'vbscript:',
            r'onload\s*=',
            r'onerror\s*=',
            r'onclick\s*=',
        ]
        
        prompt_lower = prompt.lower()
        for pattern in injection_patterns:
            if re.search(pattern, prompt_lower):
                raise ValidationError(
                    f"Prompt contains potentially malicious content: {pattern}",
                    "prompt",
                    prompt
                )
        
        # Sanitize the prompt
        sanitized = BaseValidationMixin.sanitize_text(prompt, max_length=2000)
        
        # Check minimum length
        if len(sanitized.strip()) < 3:
            raise ValidationError("Prompt must be at least 3 characters long", "prompt", prompt)
        
        return sanitized
    
    @staticmethod
    def validate_file_upload(filename: str, file_size: int, allowed_types: List[str]) -> bool:
        """Validate file upload parameters"""
        if not filename or not isinstance(filename, str):
            raise ValidationError("Filename is required", "filename", filename)
        
        # Check file extension
        file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
        if file_ext not in allowed_types:
            raise ValidationError(
                f"File type '{file_ext}' not allowed. Allowed types: {allowed_types}",
                "filename",
                filename
            )
        
        # Check file size (in bytes)
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            raise ValidationError(
                f"File size {file_size} exceeds maximum allowed size of {max_size} bytes",
                "file_size",
                file_size
            )
        
        # Check filename for malicious patterns
        malicious_patterns = [
            r'\.\./',  # Path traversal
            r'<script',
            r'javascript:',
            r'data:',
            r'vbscript:',
        ]
        
        for pattern in malicious_patterns:
            if re.search(pattern, filename.lower()):
                raise ValidationError(
                    f"Filename contains potentially malicious content: {pattern}",
                    "filename",
                    filename
                )
        
        return True
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format"""
        if not email or not isinstance(email, str):
            raise ValidationError("Email is required", "email", email)
        
        # Basic email regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValidationError("Invalid email format", "email", email)
        
        # Sanitize email
        sanitized = BaseValidationMixin.sanitize_text(email, max_length=254)
        
        return sanitized.lower()
    
    @staticmethod
    def validate_password(password: str) -> str:
        """Validate password strength"""
        if not password or not isinstance(password, str):
            raise ValidationError("Password is required", "password", password)
        
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long", "password", password)
        
        if len(password) > 128:
            raise ValidationError("Password must be less than 128 characters", "password", password)
        
        # Check for common weak passwords
        weak_passwords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ]
        
        if password.lower() in weak_passwords:
            raise ValidationError("Password is too common, please choose a stronger password", "password", password)
        
        # Check for at least one letter and one number
        if not re.search(r'[a-zA-Z]', password):
            raise ValidationError("Password must contain at least one letter", "password", password)
        
        if not re.search(r'\d', password):
            raise ValidationError("Password must contain at least one number", "password", password)
        
        return password


class ImageGenerationRequest(BaseModel):
    """Validated image generation request"""
    model_id: str = Field(..., min_length=1, max_length=100)
    prompt: str = Field(..., min_length=3, max_length=2000)
    negative_prompt: str = Field("", max_length=1000)
    aspect_ratio: str = Field("1:1", pattern=r'^\d+:\d+$')
    num_images: int = Field(1, ge=1, le=10)
    
    @validator('model_id')
    def validate_model_id(cls, v):
        """Validate model ID"""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValidationError("Model ID contains invalid characters", "model_id", v)
        return v
    
    @validator('prompt')
    def validate_prompt(cls, v):
        """Validate and sanitize prompt"""
        return BaseValidationMixin.validate_prompt(v)
    
    @validator('negative_prompt')
    def validate_negative_prompt(cls, v):
        """Validate negative prompt"""
        if v:
            return BaseValidationMixin.sanitize_text(v, max_length=1000)
        return v
    
    @validator('aspect_ratio')
    def validate_aspect_ratio(cls, v):
        """Validate aspect ratio"""
        allowed_ratios = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2']
        if v not in allowed_ratios:
            raise ValidationError(f"Aspect ratio must be one of: {allowed_ratios}", "aspect_ratio", v)
        return v


class VideoGenerationRequest(BaseModel):
    """Validated video generation request"""
    model_id: str = Field(..., min_length=1, max_length=100)
    prompt: str = Field(..., min_length=3, max_length=2000)
    duration: int = Field(5, ge=1, le=60)
    resolution: str = Field("1280x720", pattern=r'^\d+x\d+$')
    
    @validator('model_id')
    def validate_model_id(cls, v):
        """Validate model ID"""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValidationError("Model ID contains invalid characters", "model_id", v)
        return v
    
    @validator('prompt')
    def validate_prompt(cls, v):
        """Validate and sanitize prompt"""
        return BaseValidationMixin.validate_prompt(v)
    
    @validator('resolution')
    def validate_resolution(cls, v):
        """Validate resolution"""
        allowed_resolutions = ['1280x720', '1920x1080', '854x480']
        if v not in allowed_resolutions:
            raise ValidationError(f"Resolution must be one of: {allowed_resolutions}", "resolution", v)
        return v


class AudioGenerationRequest(BaseModel):
    """Validated audio generation request"""
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: str = Field(..., min_length=1, max_length=100)
    audio_type: str = Field("tts", pattern=r'^(tts|music|voice_clone)$')
    language: str = Field("en", pattern=r'^[a-z]{2}$')
    
    @validator('text')
    def validate_text(cls, v):
        """Validate and sanitize text"""
        return BaseValidationMixin.sanitize_text(v, max_length=5000)
    
    @validator('voice_id')
    def validate_voice_id(cls, v):
        """Validate voice ID"""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValidationError("Voice ID contains invalid characters", "voice_id", v)
        return v


class ChatRequest(BaseModel):
    """Validated chat request"""
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = Field(None, max_length=100)
    model: str = Field("gpt-3.5-turbo", max_length=100)
    
    @validator('message')
    def validate_message(cls, v):
        """Validate and sanitize message"""
        return BaseValidationMixin.sanitize_text(v, max_length=4000)
    
    @validator('conversation_id')
    def validate_conversation_id(cls, v):
        """Validate conversation ID"""
        if v and not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValidationError("Conversation ID contains invalid characters", "conversation_id", v)
        return v


class UserRegistrationRequest(BaseModel):
    """Validated user registration request"""
    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email"""
        return BaseValidationMixin.validate_email(v)
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password"""
        return BaseValidationMixin.validate_password(v)
    
    @validator('full_name')
    def validate_full_name(cls, v):
        """Validate and sanitize full name"""
        if not re.match(r'^[a-zA-Z\s\u00c0-\u017f]+$', v):  # Allow letters, spaces, and accented characters
            raise ValidationError("Full name contains invalid characters", "full_name", v)
        return BaseValidationMixin.sanitize_text(v, max_length=100)


class FileUploadRequest(BaseModel):
    """Validated file upload request"""
    filename: str = Field(..., max_length=255)
    file_size: int = Field(..., ge=1, le=10485760)  # 10MB max
    file_type: str = Field(..., pattern=r'^(image|video|audio|document)$')
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename"""
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValidationError("Filename contains invalid characters", "filename", v)
        return v
    
    @validator('file_size')
    def validate_file_size(cls, v):
        """Validate file size"""
        if v > 10485760:  # 10MB
            raise ValidationError("File size exceeds 10MB limit", "file_size", v)
        return v


class AdminUserUpdateRequest(BaseModel):
    """Validated admin user update request"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    package: Optional[str] = Field(None, pattern=r'^(free|basic|pro|enterprise)$')
    is_active: Optional[bool] = None
    role: Optional[str] = Field(None, pattern=r'^(user|admin)$')
    
    @validator('full_name')
    def validate_full_name(cls, v):
        """Validate full name"""
        if v:
            return BaseValidationMixin.sanitize_text(v, max_length=100)
        return v


class CreditAdjustmentRequest(BaseModel):
    """Validated credit adjustment request"""
    amount: float = Field(..., ge=-10000, le=10000)
    reason: str = Field(..., min_length=5, max_length=500)
    
    @validator('reason')
    def validate_reason(cls, v):
        """Validate reason"""
        return BaseValidationMixin.sanitize_text(v, max_length=500)


class SearchRequest(BaseModel):
    """Validated search request"""
    query: str = Field(..., min_length=1, max_length=200)
    filters: Optional[Dict[str, Any]] = Field(None)
    page: int = Field(1, ge=1, le=1000)
    page_size: int = Field(20, ge=1, le=100)
    
    @validator('query')
    def validate_query(cls, v):
        """Validate search query"""
        return BaseValidationMixin.sanitize_text(v, max_length=200)
    
    @validator('filters')
    def validate_filters(cls, v):
        """Validate search filters"""
        if v:
            # Check for potentially malicious filter values
            for key, value in v.items():
                if isinstance(value, str):
                    v[key] = BaseValidationMixin.sanitize_text(str(value), max_length=100)
        return v


# Validation decorators
def validate_input(schema_class):
    """Decorator to validate input data"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request data from kwargs
            request_data = kwargs.get('request_data', {})
            
            try:
                # Validate using schema
                validated_data = schema_class(**request_data)
                
                # Replace request_data with validated data
                kwargs['request_data'] = validated_data.dict()
                
                return await func(*args, **kwargs)
                
            except ValidationError as e:
                raise e
            except Exception as e:
                raise ValidationError(f"Validation failed: {str(e)}", "input", request_data)
        
        return wrapper
    return decorator


# SQL injection prevention
def sanitize_sql_query(query: str) -> str:
    """Sanitize SQL query to prevent injection"""
    # Remove SQL keywords that could be used for injection
    dangerous_keywords = [
        'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE',
        'EXEC', 'EXECUTE', 'UNION', 'SELECT', 'FROM', 'WHERE'
    ]
    
    query_upper = query.upper()
    for keyword in dangerous_keywords:
        if keyword in query_upper:
            raise ValidationError(f"Query contains potentially dangerous SQL keyword: {keyword}", "query", query)
    
    # Escape special characters
    query = re.sub(r"[';\"\\]", "", query)
    
    return query


# XSS prevention
def sanitize_html(html_content: str) -> str:
    """Sanitize HTML content to prevent XSS"""
    # Use bleach to clean HTML
    allowed_tags = ['b', 'i', 'em', 'strong', 'p', 'br']
    allowed_attributes = {}
    
    cleaned = bleach.clean(html_content, tags=allowed_tags, attributes=allowed_attributes)
    
    return cleaned

