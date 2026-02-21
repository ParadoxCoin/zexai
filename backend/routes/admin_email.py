"""
Admin Email Routes
API endpoints for email template management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from types import SimpleNamespace
import logging

from core.security import get_current_admin_user
from core.email_service import get_email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/email", tags=["Admin - Email"])


# ============================================
# Request/Response Models
# ============================================

class EmailTemplateResponse(BaseModel):
    """Email template response"""
    id: Optional[str] = None
    type: str
    subject: str
    body_html: str
    body_text: str
    variables: List[str] = []
    is_active: bool = True


class EmailTemplateUpdate(BaseModel):
    """Email template update request"""
    subject: str
    body_html: str
    body_text: str


class TestEmailRequest(BaseModel):
    """Test email request"""
    template_type: str
    to_email: EmailStr
    test_variables: Optional[Dict[str, Any]] = None


class TestEmailResponse(BaseModel):
    """Test email response"""
    success: bool
    message: str


# ============================================
# Endpoints
# ============================================

@router.get("/templates", response_model=List[EmailTemplateResponse])
async def list_templates(
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """List all email templates"""
    service = get_email_service()
    templates = await service.get_all_templates()
    return [EmailTemplateResponse(**t) for t in templates]


@router.get("/templates/{template_type}", response_model=EmailTemplateResponse)
async def get_template(
    template_type: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get specific email template"""
    service = get_email_service()
    template = await service.get_template(template_type)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_type}' not found"
        )
    
    return EmailTemplateResponse(**template)


@router.put("/templates/{template_type}", response_model=EmailTemplateResponse)
async def update_template(
    template_type: str,
    data: EmailTemplateUpdate,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Update email template"""
    service = get_email_service()
    
    success = await service.update_template(
        template_type=template_type,
        subject=data.subject,
        body_html=data.body_html,
        body_text=data.body_text
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update template"
        )
    
    # Return updated template
    template = await service.get_template(template_type)
    return EmailTemplateResponse(**template)


@router.post("/test", response_model=TestEmailResponse)
async def send_test_email(
    data: TestEmailRequest,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Send a test email"""
    service = get_email_service()
    
    # Default test variables
    test_vars = data.test_variables or {}
    test_vars.setdefault("user_name", "Test Kullanıcı")
    test_vars.setdefault("credits", 100)
    test_vars.setdefault("dashboard_url", "https://example.com/dashboard")
    test_vars.setdefault("reset_url", "https://example.com/reset")
    test_vars.setdefault("expiry_hours", 24)
    test_vars.setdefault("amount", "$10.00")
    test_vars.setdefault("description", "Test Ödemesi")
    test_vars.setdefault("date", "15.12.2025")
    test_vars.setdefault("new_balance", 1000)
    test_vars.setdefault("current_credits", 50)
    test_vars.setdefault("credits_url", "https://example.com/credits")
    
    success = await service.send_email(
        to=data.to_email,
        template_type=data.template_type,
        variables=test_vars
    )
    
    if success:
        return TestEmailResponse(
            success=True,
            message=f"Test email sent to {data.to_email}"
        )
    else:
        return TestEmailResponse(
            success=False,
            message="Failed to send email. Check Resend API key configuration."
        )


@router.get("/config")
async def get_email_config(
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get email configuration status"""
    service = get_email_service()
    
    return {
        "provider": "Resend",
        "configured": bool(service.api_key),
        "from_email": service.from_email,
        "app_name": service.app_name
    }


# ============================================
# Branding Settings Endpoints
# ============================================

class BrandingSettingResponse(BaseModel):
    """Branding setting"""
    setting_key: str
    setting_value: Optional[str] = None
    setting_type: str
    description: Optional[str] = None


class BrandingSettingUpdate(BaseModel):
    """Branding setting update"""
    setting_key: str
    setting_value: str


@router.get("/branding", response_model=List[BrandingSettingResponse])
async def get_branding_settings(
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get all email branding settings"""
    from core.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    
    if not supabase:
        # Return defaults if no DB
        return [
            {"setting_key": "logo_url", "setting_value": "", "setting_type": "image", "description": "Logo URL"},
            {"setting_key": "banner_url", "setting_value": "", "setting_type": "image", "description": "Banner URL"},
            {"setting_key": "primary_color", "setting_value": "#6366f1", "setting_type": "color", "description": "Primary color"},
            {"setting_key": "background_color", "setting_value": "#f5f5f5", "setting_type": "color", "description": "Background color"},
        ]
    
    try:
        result = supabase.table("email_settings").select("*").execute()
        return [BrandingSettingResponse(**s) for s in (result.data or [])]
    except Exception as e:
        logger.error(f"Failed to get branding settings: {e}")
        return []


@router.put("/branding")
async def update_branding_setting(
    data: BrandingSettingUpdate,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Update a branding setting"""
    from core.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not available")
    
    try:
        # Check if exists
        existing = supabase.table("email_settings").select("id")\
            .eq("setting_key", data.setting_key).execute()
        
        if existing.data:
            supabase.table("email_settings").update({
                "setting_value": data.setting_value
            }).eq("setting_key", data.setting_key).execute()
        else:
            supabase.table("email_settings").insert({
                "setting_key": data.setting_key,
                "setting_value": data.setting_value,
                "setting_type": "text"
            }).execute()
        
        return {"success": True, "message": f"Setting '{data.setting_key}' updated"}
    except Exception as e:
        logger.error(f"Failed to update branding setting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/branding/upload")
async def upload_branding_image(
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Upload branding image (logo/banner)
    Note: Actual file upload should use Supabase Storage
    """
    return {
        "message": "Use Supabase Storage for image uploads",
        "storage_bucket": "email-branding",
        "instructions": "Upload file to Supabase Storage and use the public URL"
    }
