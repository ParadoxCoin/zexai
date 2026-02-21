"""
Email Service with Resend
Handles email sending and template management
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx
from jinja2 import Template

from core.supabase_client import get_supabase_client
from core.config import settings

logger = logging.getLogger(__name__)


# Default email templates
DEFAULT_TEMPLATES = {
    "welcome": {
        "subject": "🎉 {{app_name}}'e Hoş Geldiniz!",
        "body_html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
        .header { text-align: center; margin-bottom: 20px; }
        .logo { font-size: 32px; color: #6366f1; }
        .content { color: #333; line-height: 1.6; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
        .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">✨ {{app_name}}</div>
        </div>
        <div class="content">
            <h2>Merhaba {{user_name}}! 👋</h2>
            <p>{{app_name}} ailesine katıldığınız için teşekkür ederiz!</p>
            <p>Artık yapay zeka destekli içerik oluşturma araçlarımızı kullanmaya başlayabilirsiniz:</p>
            <ul>
                <li>🖼️ AI ile görsel üretin</li>
                <li>🎬 Metinden video oluşturun</li>
                <li>🎙️ Ses sentezi yapın</li>
                <li>💬 AI asistanlarla sohbet edin</li>
            </ul>
            <center>
                <a href="{{dashboard_url}}" class="button">Dashboard'a Git</a>
            </center>
            <p>Başlangıç kredileriniz: <strong>{{credits}} kredi</strong></p>
        </div>
        <div class="footer">
            <p>© {{year}} {{app_name}}. Tüm hakları saklıdır.</p>
        </div>
    </div>
</body>
</html>
        """,
        "body_text": """
Merhaba {{user_name}}!

{{app_name}} ailesine katıldığınız için teşekkür ederiz!

Artık yapay zeka destekli içerik oluşturma araçlarımızı kullanmaya başlayabilirsiniz.

Dashboard: {{dashboard_url}}
Başlangıç kredileriniz: {{credits}} kredi

© {{year}} {{app_name}}
        """,
        "variables": ["app_name", "user_name", "dashboard_url", "credits", "year"]
    },
    "password_reset": {
        "subject": "🔐 Şifre Sıfırlama - {{app_name}}",
        "body_html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
        .header { text-align: center; margin-bottom: 20px; }
        .content { color: #333; line-height: 1.6; }
        .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
        .warning { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔐 Şifre Sıfırlama</h2>
        </div>
        <div class="content">
            <p>Merhaba {{user_name}},</p>
            <p>Şifrenizi sıfırlamak için bir talep aldık.</p>
            <center>
                <a href="{{reset_url}}" class="button">Şifremi Sıfırla</a>
            </center>
            <div class="warning">
                ⚠️ Bu link {{expiry_hours}} saat içinde geçerliliğini yitirecektir.
            </div>
            <p>Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
        </div>
        <div class="footer">
            <p>© {{year}} {{app_name}}</p>
        </div>
    </div>
</body>
</html>
        """,
        "body_text": """
Şifre Sıfırlama

Merhaba {{user_name}},

Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:
{{reset_url}}

Bu link {{expiry_hours}} saat içinde geçerliliğini yitirecektir.

Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.

© {{year}} {{app_name}}
        """,
        "variables": ["app_name", "user_name", "reset_url", "expiry_hours", "year"]
    },
    "payment_success": {
        "subject": "✅ Ödeme Başarılı - {{app_name}}",
        "body_html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
        .success { background: #d1fae5; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .details { background: #f9fafb; padding: 15px; border-radius: 6px; }
        .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">
            <h2>✅ Ödeme Başarılı!</h2>
        </div>
        <p>Merhaba {{user_name}},</p>
        <p>Ödemeniz başarıyla tamamlandı.</p>
        <div class="details">
            <p><strong>Tutar:</strong> {{amount}}</p>
            <p><strong>Açıklama:</strong> {{description}}</p>
            <p><strong>Tarih:</strong> {{date}}</p>
            <p><strong>Yeni Bakiye:</strong> {{new_balance}} kredi</p>
        </div>
        <div class="footer">
            <p>© {{year}} {{app_name}}</p>
        </div>
    </div>
</body>
</html>
        """,
        "body_text": """
Ödeme Başarılı!

Merhaba {{user_name}},

Ödemeniz başarıyla tamamlandı.

Tutar: {{amount}}
Açıklama: {{description}}
Tarih: {{date}}
Yeni Bakiye: {{new_balance}} kredi

© {{year}} {{app_name}}
        """,
        "variables": ["app_name", "user_name", "amount", "description", "date", "new_balance", "year"]
    },
    "credits_low": {
        "subject": "⚠️ Krediniz Azaldı - {{app_name}}",
        "body_html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
        .warning { background: #fef3c7; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; }
        .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="warning">
            <h2>⚠️ Krediniz Azaldı</h2>
            <p style="font-size: 24px; margin: 10px 0;"><strong>{{current_credits}} kredi</strong> kaldı</p>
        </div>
        <p>Merhaba {{user_name}},</p>
        <p>Kredi bakiyeniz düşük seviyede. İşlemlerinizin kesintisiz devam etmesi için kredi yüklemenizi öneriyoruz.</p>
        <center>
            <a href="{{credits_url}}" class="button">Kredi Yükle</a>
        </center>
        <div class="footer">
            <p>© {{year}} {{app_name}}</p>
        </div>
    </div>
</body>
</html>
        """,
        "body_text": """
Krediniz Azaldı!

Merhaba {{user_name}},

Kalan krediniz: {{current_credits}}

Kredi yüklemek için: {{credits_url}}

© {{year}} {{app_name}}
        """,
        "variables": ["app_name", "user_name", "current_credits", "credits_url", "year"]
    }
}


class EmailService:
    """Email service using Resend"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.api_key = getattr(settings, 'RESEND_API_KEY', None)
        self.from_email = getattr(settings, 'EMAIL_FROM', 'noreply@example.com')
        self.app_name = getattr(settings, 'APP_NAME', 'AI SaaS Platform')
        logger.info("EmailService initialized")
    
    async def get_template(self, template_type: str) -> Optional[Dict[str, Any]]:
        """Get email template from database or defaults"""
        supabase = get_supabase_client()
        
        if supabase:
            try:
                result = supabase.table("email_templates").select("*")\
                    .eq("type", template_type).eq("is_active", True).execute()
                if result.data:
                    return result.data[0]
            except Exception as e:
                logger.warning(f"Failed to get template from DB: {e}")
        
        # Return default template
        if template_type in DEFAULT_TEMPLATES:
            return {
                "type": template_type,
                **DEFAULT_TEMPLATES[template_type]
            }
        
        return None
    
    async def get_all_templates(self) -> List[Dict[str, Any]]:
        """Get all email templates"""
        supabase = get_supabase_client()
        templates = []
        
        if supabase:
            try:
                result = supabase.table("email_templates").select("*")\
                    .order("type").execute()
                if result.data:
                    return result.data
            except Exception as e:
                logger.warning(f"Failed to get templates from DB: {e}")
        
        # Return defaults
        for template_type, template in DEFAULT_TEMPLATES.items():
            templates.append({
                "id": template_type,
                "type": template_type,
                "is_active": True,
                **template
            })
        
        return templates
    
    async def update_template(
        self, 
        template_type: str, 
        subject: str, 
        body_html: str, 
        body_text: str
    ) -> bool:
        """Update email template in database"""
        supabase = get_supabase_client()
        if not supabase:
            return False
        
        try:
            # Check if exists
            existing = supabase.table("email_templates").select("id")\
                .eq("type", template_type).execute()
            
            data = {
                "type": template_type,
                "subject": subject,
                "body_html": body_html,
                "body_text": body_text,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if existing.data:
                supabase.table("email_templates").update(data)\
                    .eq("type", template_type).execute()
            else:
                data["is_active"] = True
                data["variables"] = DEFAULT_TEMPLATES.get(template_type, {}).get("variables", [])
                supabase.table("email_templates").insert(data).execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to update template: {e}")
            return False
    
    def render_template(self, template: Dict[str, Any], variables: Dict[str, Any], branding: Dict[str, str] = None) -> Dict[str, str]:
        """Render template with variables and branding"""
        # Add default variables
        variables.setdefault("app_name", self.app_name)
        variables.setdefault("year", datetime.now().year)
        
        # Add branding variables if provided
        if branding:
            variables.update(branding)
        
        try:
            subject = Template(template["subject"]).render(**variables)
            body_html = Template(template["body_html"]).render(**variables)
            body_text = Template(template["body_text"]).render(**variables)
            
            # Apply branding wrapper if logo or banner is set
            if branding and (branding.get("logo_url") or branding.get("banner_url")):
                body_html = self._apply_branding_wrapper(body_html, branding)
            
            return {
                "subject": subject,
                "html": body_html,
                "text": body_text
            }
        except Exception as e:
            logger.error(f"Failed to render template: {e}")
            raise
    
    def _apply_branding_wrapper(self, html_content: str, branding: Dict[str, str]) -> str:
        """Wrap HTML content with branding header/footer"""
        logo_url = branding.get("logo_url", "")
        banner_url = branding.get("banner_url", "")
        primary_color = branding.get("primary_color", "#6366f1")
        background_color = branding.get("background_color", "#f5f5f5")
        footer_text = branding.get("footer_text", "")
        
        # Build header
        header_html = ""
        if logo_url:
            header_html += f'''
            <div style="text-align: center; padding: 20px 0;">
                <img src="{logo_url}" alt="Logo" style="max-height: 60px; max-width: 200px;" />
            </div>
            '''
        if banner_url:
            header_html += f'''
            <div style="margin-bottom: 20px;">
                <img src="{banner_url}" alt="Banner" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px;" />
            </div>
            '''
        
        # Build footer with social links
        footer_html = ""
        social_links = []
        if branding.get("social_facebook"):
            social_links.append(f'<a href="{branding["social_facebook"]}" style="margin: 0 10px; color: {primary_color};">Facebook</a>')
        if branding.get("social_twitter"):
            social_links.append(f'<a href="{branding["social_twitter"]}" style="margin: 0 10px; color: {primary_color};">Twitter</a>')
        if branding.get("social_instagram"):
            social_links.append(f'<a href="{branding["social_instagram"]}" style="margin: 0 10px; color: {primary_color};">Instagram</a>')
        if branding.get("social_linkedin"):
            social_links.append(f'<a href="{branding["social_linkedin"]}" style="margin: 0 10px; color: {primary_color};">LinkedIn</a>')
        
        if social_links or footer_text or branding.get("company_address"):
            footer_html = f'''
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 12px;">
                {"".join(social_links)}
                {"<p>" + footer_text + "</p>" if footer_text else ""}
                {"<p>" + branding.get("company_address", "") + "</p>" if branding.get("company_address") else ""}
            </div>
            '''
        
        # If header or footer exists, wrap the content
        if header_html or footer_html:
            # Try to inject into existing container or wrap
            if '<div class="container">' in html_content:
                # Inject after container opening
                html_content = html_content.replace(
                    '<div class="container">',
                    f'<div class="container">{header_html}'
                )
                # Inject before container closing (before </div></body>)
                html_content = html_content.replace(
                    '</div>\n</body>',
                    f'{footer_html}</div>\n</body>'
                )
            else:
                # Wrap entire content
                html_content = f'''
                <div style="background: {background_color}; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px;">
                        {header_html}
                        {html_content}
                        {footer_html}
                    </div>
                </div>
                '''
        
        return html_content
    
    async def get_branding_settings(self) -> Dict[str, str]:
        """Fetch branding settings from database"""
        supabase = get_supabase_client()
        branding = {}
        
        if supabase:
            try:
                result = supabase.table("email_settings").select("setting_key, setting_value").execute()
                if result.data:
                    for item in result.data:
                        if item.get("setting_value"):
                            branding[item["setting_key"]] = item["setting_value"]
            except Exception as e:
                logger.warning(f"Failed to get branding settings: {e}")
        
        return branding
    
    async def send_email(
        self, 
        to: str, 
        template_type: str, 
        variables: Dict[str, Any]
    ) -> bool:
        """Send email using Resend with branding"""
        if not self.api_key:
            logger.warning("Resend API key not configured, skipping email")
            return False
        
        template = await self.get_template(template_type)
        if not template:
            logger.error(f"Template not found: {template_type}")
            return False
        
        try:
            # Fetch branding settings
            branding = await self.get_branding_settings()
            
            # Render template with branding
            rendered = self.render_template(template, variables, branding)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": self.from_email,
                        "to": [to],
                        "subject": rendered["subject"],
                        "html": rendered["html"],
                        "text": rendered["text"]
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"Email sent successfully to {to}")
                    return True
                else:
                    logger.error(f"Failed to send email: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    async def send_welcome_email(self, user_email: str, user_name: str, credits: int = 100) -> bool:
        """Send welcome email to new user"""
        return await self.send_email(user_email, "welcome", {
            "user_name": user_name,
            "credits": credits,
            "dashboard_url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/dashboard"
        })
    
    async def send_password_reset(self, user_email: str, user_name: str, reset_url: str) -> bool:
        """Send password reset email"""
        return await self.send_email(user_email, "password_reset", {
            "user_name": user_name,
            "reset_url": reset_url,
            "expiry_hours": 24
        })
    
    async def send_payment_success(
        self, 
        user_email: str, 
        user_name: str, 
        amount: str, 
        description: str,
        new_balance: int
    ) -> bool:
        """Send payment success email"""
        return await self.send_email(user_email, "payment_success", {
            "user_name": user_name,
            "amount": amount,
            "description": description,
            "date": datetime.now().strftime("%d.%m.%Y %H:%M"),
            "new_balance": new_balance
        })
    
    async def send_credits_low(self, user_email: str, user_name: str, current_credits: int) -> bool:
        """Send low credits warning email"""
        return await self.send_email(user_email, "credits_low", {
            "user_name": user_name,
            "current_credits": current_credits,
            "credits_url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/credits"
        })


# Singleton instance
_email_service = None

def get_email_service() -> EmailService:
    """Get email service singleton"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
