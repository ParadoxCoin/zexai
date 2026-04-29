"""
Email background tasks
Handles user notifications, reports, and system emails (Supabase Version)
"""
from celery import Task
from core.celery_app import celery_app
from core.database import get_database
from core.logger import app_logger as logger
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List
from datetime import datetime, timedelta
import os
import asyncio


class EmailTask(Task):
    """Base class for email tasks with error handling"""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle email task failure"""
        logger.error(f"Email task {task_id} failed: {exc}")
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle email task success"""
        logger.info(f"Email task {task_id} completed successfully")


@celery_app.task(bind=True, base=EmailTask, name="send_welcome_email")
def send_welcome_email(self, user_email: str, user_name: str, **kwargs):
    """
    Send welcome email to new users
    """
    try:
        subject = "Hoş Geldiniz! AI Studio'ya Başlayın"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                <h1 style="color: white; margin: 0;">AI Studio'ya Hoş Geldiniz!</h1>
            </div>
            
            <div style="padding: 30px;">
                <h2>Merhaba {user_name}!</h2>
                
                <p>AI Studio platformuna kayıt olduğunuz için teşekkür ederiz. Artık güçlü AI araçlarını kullanarak yaratıcı içerikler oluşturabilirsiniz.</p>
                
                <h3>🚀 Başlamak için:</h3>
                <ul>
                    <li><strong>Görsel Üretimi:</strong> 40+ AI modeli ile profesyonel görseller</li>
                    <li><strong>Video Üretimi:</strong> AI ile dinamik videolar oluşturun</li>
                    <li><strong>Ses Üretimi:</strong> TTS ve müzik üretimi</li>
                    <li><strong>Synapse Agent:</strong> AI ajanları ile otomasyon</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{os.getenv('FRONTEND_URL', 'https://app.zexai.io')}" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Platforma Git
                    </a>
                </div>
                
                <p>İyi kullanımlar!<br>AI Studio Ekibi</p>
            </div>
        </body>
        </html>
        """
        
        _send_email(user_email, subject, html_content)
        
        return {
            "status": "sent",
            "recipient": user_email,
            "type": "welcome"
        }
        
    except Exception as e:
        logger.error(f"Welcome email failed: {e}")
        raise


@celery_app.task(bind=True, base=EmailTask, name="send_credit_low_email")
def send_credit_low_email(self, user_email: str, user_name: str, 
                         current_credits: float, **kwargs):
    """
    Send low credit warning email
    """
    try:
        subject = "Kredi Bakiyeniz Düşük - AI Studio"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff6b6b; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">⚠️ Kredi Uyarısı</h1>
            </div>
            
            <div style="padding: 30px;">
                <h2>Merhaba {user_name}!</h2>
                <p>Kredi bakiyeniz düşük seviyede. Mevcut bakiyeniz: <strong>{current_credits} kredi</strong></p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{os.getenv('FRONTEND_URL', 'https://app.zexai.io')}/billing" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Kredi Satın Al
                    </a>
                </div>
            </div>
        </body>
        </html>
        """
        
        _send_email(user_email, subject, html_content)
        
        return {
            "status": "sent",
            "recipient": user_email,
            "type": "credit_low"
        }
        
    except Exception as e:
        logger.error(f"Credit low email failed: {e}")
        raise


@celery_app.task(bind=True, base=EmailTask, name="send_generation_complete_email")
def send_generation_complete_email(self, user_email: str, user_name: str,
                                  generation_type: str, task_id: str, **kwargs):
    """
    Send email when AI generation is complete
    """
    try:
        subject = f"AI {generation_type.title()} Üretimi Tamamlandı"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #4ecdc4; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">✅ Üretim Tamamlandı!</h1>
            </div>
            <div style="padding: 30px;">
                <h2>Merhaba {user_name}!</h2>
                <p>AI {generation_type} üretiminiz başarıyla tamamlandı.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{os.getenv('FRONTEND_URL', 'https://app.zexai.io')}/library" 
                       style="background: #4ecdc4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Sonuçları Görüntüle
                    </a>
                </div>
            </div>
        </body>
        </html>
        """
        
        _send_email(user_email, subject, html_content)
        
        return {
            "status": "sent",
            "recipient": user_email,
            "type": "generation_complete"
        }
        
    except Exception as e:
        logger.error(f"Generation complete email failed: {e}")
        raise


@celery_app.task(bind=True, base=EmailTask, name="send_daily_reports")
def send_daily_reports(self, **kwargs):
    """
    Send daily reports to admins (Supabase Version)
    """
    async def run():
        try:
            db = await get_database()
            
            # Get admin emails using Supabase
            response = db.table("users").select("email, full_name").eq("role", "admin").execute()
            admin_users = response.data or []
            
            if not admin_users:
                return {"status": "no_admins", "message": "No admin users found"}
            
            # Get daily stats
            yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
            today = datetime.utcnow().isoformat()
            
            # User registrations count
            new_users_res = db.table("users").select("id", count="exact").gte("created_at", yesterday).lt("created_at", today).execute()
            new_users = new_users_res.count or 0
            
            # Total generations count
            total_gen_res = db.table("ai_generations").select("id", count="exact").gte("created_at", yesterday).lt("created_at", today).execute()
            total_generations = total_gen_res.count or 0
            
            # Revenue calculation (if billing table exists)
            revenue = 0.0
            try:
                revenue_res = db.table("billing_records").select("amount").eq("status", "completed").gte("created_at", yesterday).execute()
                revenue = sum(float(item["amount"]) for item in (revenue_res.data or []))
            except:
                pass
            
            for admin in admin_users:
                subject = f"Günlük Rapor - {datetime.now().strftime('%d.%m.%Y')}"
                
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #667eea; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">📊 Günlük Rapor</h1>
                    </div>
                    <div style="padding: 30px;">
                        <h3>📈 İstatistikler</h3>
                        <ul>
                            <li><strong>Yeni Kayıtlar:</strong> {new_users} kullanıcı</li>
                            <li><strong>AI Üretimleri:</strong> {total_generations} işlem</li>
                            <li><strong>Gelir:</strong> ${revenue:.2f}</li>
                        </ul>
                    </div>
                </body>
                </html>
                """
                _send_email(admin["email"], subject, html_content)
            
            return {
                "status": "sent",
                "recipients": len(admin_users),
                "type": "daily_report"
            }
        except Exception as e:
            logger.error(f"Daily reports failed: {e}")
            raise

    return asyncio.run(run())


def _send_email(to_email: str, subject: str, html_content: str):
    """Send email using SMTP"""
    try:
        # Email configuration
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        
        if not smtp_username or not smtp_password:
            logger.warning("SMTP credentials not configured, skipping email")
            return
        
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_username
        msg["To"] = to_email
        
        # Add HTML content
        html_part = MIMEText(html_content, "html", "utf-8")
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
        
        logger.info(f"Email sent to {to_email}")
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise
