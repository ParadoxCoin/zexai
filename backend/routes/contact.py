from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx
from core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["Contact"])

class ContactForm(BaseModel):
    name: str
    email: str
    subject: str
    message: str

@router.post("")
async def submit_contact_form(form: ContactForm):
    """
    Submit contact form and send via Resend API
    """
    api_key = getattr(settings, 'RESEND_API_KEY', None)
    
    if not api_key:
        logger.warning("RESEND_API_KEY not configured. Logging contact form submission.")
        logger.info(f"Contact form from {form.name} ({form.email}): {form.subject} - {form.message}")
        # Return success anyway to not block the frontend if email is not configured locally
        return {"success": True, "message": "Message logged successfully"}

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6b21a8; margin-top: 0;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 100px;"><strong>Name:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">{form.name}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">{form.email}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">{form.subject or 'No subject specified'}</td>
            </tr>
        </table>
        <h3 style="color: #333; margin-bottom: 10px;">Message:</h3>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; line-height: 1.6; color: #444;">
            {form.message.replace(chr(10), '<br>')}
        </div>
        <div style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
            This email was sent from the ZexAi Studio contact form.
        </div>
    </div>
    """

    async with httpx.AsyncClient() as client:
        try:
            # We must use a verified domain email in the 'from' field. 
            # Usually info@zexai.io or noreply@zexai.io
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
                # If the domain is not verified yet, Resend returns an error.
                # In development, don't fail the request completely to allow testing
                return {"success": False, "message": "Provider error", "detail": response.text}
                
        except Exception as e:
            logger.error(f"Error sending contact form: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to send message")

    return {"success": True, "message": "Message sent successfully"}
