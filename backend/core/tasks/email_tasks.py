"""
Email background tasks
Handles user notifications, reports, and system emails
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
                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Platforma Git
                    </a>
                </div>
                
                <h3>💡 İpuçları:</h3>
                <ul>
                    <li>Detaylı prompt'lar daha iyi sonuçlar verir</li>
                    <li>Farklı modelleri deneyerek en uygun olanı bulun</li>
                    <li>Kredi sistemini takip edin</li>
                </ul>
                
                <p>Herhangi bir sorunuz varsa, destek ekibimiz size yardımcı olmaktan mutluluk duyar.</p>
                
                <p>İyi kullanımlar!<br>AI Studio Ekibi</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
                <p>Bu e-postayı almak istemiyorsanız, hesap ayarlarınızdan bildirim tercihlerinizi değiştirebilirsiniz.</p>
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
                
                <p>Kesintisiz AI deneyimi için kredi satın almanızı öneriyoruz.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/billing" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Kredi Satın Al
                    </a>
                </div>
                
                <h3>💳 Ödeme Seçenekleri:</h3>
                <ul>
                    <li>Kredi/Banka Kartı</li>
                    <li>Kripto Para (Bitcoin, Ethereum, USDT)</li>
                    <li>Binance Pay</li>
                    <li>MetaMask (%15 indirim)</li>
                </ul>
                
                <p>Herhangi bir sorunuz varsa, destek ekibimizle iletişime geçebilirsiniz.</p>
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
                    <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/library" 
                       style="background: #4ecdc4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Sonuçları Görüntüle
                    </a>
                </div>
                
                <p><strong>Görev ID:</strong> {task_id}</p>
                <p><strong>Tür:</strong> {generation_type.title()}</p>
                <p><strong>Tarih:</strong> {datetime.now().strftime('%d.%m.%Y %H:%M')}</p>
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
async def send_daily_reports(self, **kwargs):
    """
    Send daily reports to admins
    """
    try:
        # Get admin emails
        db = get_database()
        admin_users = await db.users.find({"role": "admin"}).to_list(length=100)
        
        if not admin_users:
            return {"status": "no_admins", "message": "No admin users found"}
        
        # Get daily stats
        yesterday = datetime.utcnow() - timedelta(days=1)
        today = datetime.utcnow()
        
        # User registrations
        new_users = await db.users.count_documents({
            "created_at": {"$gte": yesterday, "$lt": today}
        })
        
        # Total generations
        total_generations = await db.ai_generations.count_documents({
            "created_at": {"$gte": yesterday, "$lt": today}
        })
        
        # Revenue (placeholder)
        revenue = 0.0  # TODO: Calculate from billing records
        
        for admin in admin_users:
            subject = f"Günlük Rapor - {today.strftime('%d.%m.%Y')}"
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #667eea; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">📊 Günlük Rapor</h1>
                    <p style="color: white; margin: 10px 0 0 0;">{today.strftime('%d.%m.%Y')}</p>
                </div>
                
                <div style="padding: 30px;">
                    <h2>Platform İstatistikleri</h2>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center;">
                            <h3 style="margin: 0; color: #667eea;">{new_users}</h3>
                            <p style="margin: 5px 0 0 0;">Yeni Kullanıcı</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center;">
                            <h3 style="margin: 0; color: #4ecdc4;">{total_generations}</h3>
                            <p style="margin: 5px 0 0 0;">AI Üretimi</p>
                        </div>
                    </div>
                    
                    <h3>📈 Detaylı Analiz</h3>
                    <ul>
                        <li><strong>Yeni Kayıtlar:</strong> {new_users} kullanıcı</li>
                        <li><strong>AI Üretimleri:</strong> {total_generations} işlem</li>
                        <li><strong>Gelir:</strong> ${revenue:.2f}</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/admin" 
                           style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Admin Paneli
                        </a>
                    </div>
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

