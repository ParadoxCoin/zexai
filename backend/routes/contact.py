"""
Contact form endpoint.

Security:
  - Rate limited: 3/minute per IP (spam koruması).
  - Input length constraints via Pydantic validators.
  - HTML in user input is escaped before embedding in email body.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
import httpx
import html
from core.config import settings
from core.rate_limiter import limiter
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["Contact"])

# Rate limit for contact form — stricter than normal endpoints
_CONTACT_RATE_LIMIT = "3/minute"


class ContactForm(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=254)
    subject: str = Field(default="", max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        """Basic email format check — Supabase/Resend do deeper validation."""
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.strip().lower()

    @field_validator("name", "subject", "message")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


@router.post("")
@limiter.limit(_CONTACT_RATE_LIMIT)
async def submit_contact_form(request: Request, form: ContactForm):
    """
    Submit contact form and send via Resend API.
    Rate limited to 3/minute per IP.
    """
    api_key = getattr(settings, 'RESEND_API_KEY', None)
    
    if not api_key:
        logger.warning("RESEND_API_KEY not configured. Logging contact form submission.")
        logger.info(f"Contact form from {form.name} ({form.email}): {form.subject} - {form.message}")
        return {"success": True, "message": "Message logged successfully"}

    # Escape HTML in user-supplied fields to prevent injection in email body
    safe_name = html.escape(form.name)
    safe_email = html.escape(form.email)
    safe_subject = html.escape(form.subject or "No subject specified")
    safe_message = html.escape(form.message).replace("\n", "<br>")

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6b21a8; margin-top: 0;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 100px;"><strong>Name:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">{safe_name}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">{safe_email}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">{safe_subject}</td>
            </tr>
        </table>
        <h3 style="color: #333; margin-bottom: 10px;">Message:</h3>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; line-height: 1.6; color: #444;">
            {safe_message}
        </div>
        <div style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
            This email was sent from the ZexAi Studio contact form.
        </div>
    </div>
    """

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "ZexAi Platform <info@zexai.io>",
                    "to": ["info@zexai.io"],
                    "reply_to": form.email,
                    "subject": f"Contact Form: {form.subject or 'New Message'}",
                    "html": html_content
                }
            )
            
            if response.status_code >= 400:
                logger.error(f"Resend API error: {response.text}")
                return {"success": False, "message": "Provider error", "detail": response.text}
                
        except Exception as e:
            logger.error(f"Error sending contact form: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to send message")

    return {"success": True, "message": "Message sent successfully"}
