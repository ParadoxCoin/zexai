"""
Payment security utilities for webhook verification and blockchain validation
"""

import hmac
import hashlib
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import httpx
from web3 import Web3
from core.config import settings
from core.logger import app_logger as logger
from core.database import get_database

class WebhookVerifier:
    """Secure webhook signature verification"""
    
    @staticmethod
    def verify_lemonsqueezy_signature(payload: bytes, signature: str, secret: str) -> bool:
        """Verify LemonSqueezy webhook signature"""
        try:
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Remove 'sha256=' prefix if present
            if signature.startswith('sha256='):
                signature = signature[7:]
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"LemonSqueezy signature verification failed: {e}")
            return False
    
    @staticmethod
    def verify_nowpayments_signature(payload: bytes, signature: str, secret: str) -> bool:
        """Verify NowPayments IPN signature"""
        try:
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha512
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"NowPayments signature verification failed: {e}")
            return False
    
    @staticmethod
    def verify_binance_signature(payload: str, signature: str, secret: str) -> bool:
        """Verify Binance Pay webhook signature"""
        try:
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha512
            ).hexdigest().upper()
            
            return hmac.compare_digest(expected_signature, signature.upper())
        except Exception as e:
            logger.error(f"Binance signature verification failed: {e}")
            return False

class BlockchainVerifier:
    """Blockchain transaction verification for MetaMask payments"""
    
    def __init__(self):
        self.w3 = None
        if settings.WEB3_PROVIDER_URL:
            try:
                self.w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))
            except Exception as e:
                logger.error(f"Failed to initialize Web3: {e}")
    
    async def verify_transaction(self, tx_hash: str, expected_amount: float, expected_recipient: str) -> Dict[str, Any]:
        """Verify blockchain transaction"""
        if not self.w3:
            return {"verified": False, "error": "Web3 not initialized"}
        
        try:
            # Get transaction receipt
            tx_receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            if not tx_receipt:
                return {"verified": False, "error": "Transaction not found"}
            
            # Check if transaction was successful
            if tx_receipt.status != 1:
                return {"verified": False, "error": "Transaction failed"}
            
            # Get transaction details
            tx = self.w3.eth.get_transaction(tx_hash)
            
            # Verify recipient address
            if tx['to'].lower() != expected_recipient.lower():
                return {"verified": False, "error": "Recipient address mismatch"}
            
            # Convert Wei to Ether for amount comparison
            amount_eth = self.w3.from_wei(tx['value'], 'ether')
            
            # Allow small tolerance for gas fees and price fluctuations (1%)
            tolerance = expected_amount * 0.01
            if abs(float(amount_eth) - expected_amount) > tolerance:
                return {"verified": False, "error": "Amount mismatch"}
            
            # Check transaction age (should be recent)
            block = self.w3.eth.get_block(tx_receipt.blockNumber)
            tx_timestamp = datetime.fromtimestamp(block.timestamp)
            if datetime.utcnow() - tx_timestamp > timedelta(hours=1):
                return {"verified": False, "error": "Transaction too old"}
            
            return {
                "verified": True,
                "amount": float(amount_eth),
                "recipient": tx['to'],
                "block_number": tx_receipt.blockNumber,
                "gas_used": tx_receipt.gasUsed,
                "timestamp": tx_timestamp
            }
            
        except Exception as e:
            logger.error(f"Blockchain verification failed: {e}")
            return {"verified": False, "error": str(e)}

class PaymentIdempotency:
    """Payment idempotency control to prevent duplicate processing"""
    
    @staticmethod
    async def is_duplicate_payment(payment_id: str, provider: str) -> bool:
        """Check if payment has already been processed"""
        try:
            db = get_database()
            
            existing = await db.processed_payments.find_one({
                "payment_id": payment_id,
                "provider": provider
            })
            
            return existing is not None
        except Exception as e:
            logger.error(f"Failed to check payment duplication: {e}")
            return False
    
    @staticmethod
    async def mark_payment_processed(payment_id: str, provider: str, details: Dict[str, Any]):
        """Mark payment as processed"""
        try:
            db = get_database()
            
            record = {
                "payment_id": payment_id,
                "provider": provider,
                "details": details,
                "processed_at": datetime.utcnow()
            }
            
            await db.processed_payments.insert_one(record)
        except Exception as e:
            logger.error(f"Failed to mark payment as processed: {e}")

class PaymentProviderClient:
    """Secure payment provider API clients"""
    
    @staticmethod
    async def create_lemonsqueezy_checkout(session_id: str, item_name: str, price: float, email: str, success_url: str, cancel_url: str) -> str:
        """Create LemonSqueezy checkout with proper error handling"""
        if not settings.LEMONSQUEEZY_API_KEY:
            raise ValueError("LemonSqueezy API key not configured")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.lemonsqueezy.com/v1/checkouts",
                    headers={
                        "Authorization": f"Bearer {settings.LEMONSQUEEZY_API_KEY}",
                        "Content-Type": "application/vnd.api+json",
                        "Accept": "application/vnd.api+json"
                    },
                    json={
                        "data": {
                            "type": "checkouts",
                            "attributes": {
                                "custom_price": int(price * 100),  # Convert to cents
                                "product_options": {
                                    "name": item_name,
                                    "description": f"Session: {session_id}"
                                },
                                "checkout_data": {
                                    "email": email,
                                    "custom": {"session_id": session_id}
                                },
                                "checkout_options": {
                                    "button_color": "#7C3AED"
                                },
                                "redirect_url": success_url
                            }
                        }
                    }
                )
                
                if response.status_code not in (200, 201):
                    error_detail = response.text
                    logger.error(f"LemonSqueezy API error: {response.status_code} - {error_detail}")
                    raise ValueError(f"LemonSqueezy checkout creation failed: {response.status_code}")
                
                data = response.json()
                return data["data"]["attributes"]["url"]
                
        except httpx.TimeoutException:
            raise ValueError("LemonSqueezy API timeout")
        except Exception as e:
            logger.error(f"LemonSqueezy checkout creation failed: {e}")
            raise ValueError(f"Failed to create LemonSqueezy checkout: {str(e)}")
    
    @staticmethod
    async def create_nowpayments_invoice(session_id: str, item_name: str, price: float, success_url: str, cancel_url: str) -> str:
        """Create NowPayments invoice with proper error handling"""
        if not settings.NOWPAYMENTS_API_KEY:
            raise ValueError("NowPayments API key not configured")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.nowpayments.io/v1/invoice",
                    headers={
                        "x-api-key": settings.NOWPAYMENTS_API_KEY,
                        "Content-Type": "application/json"
                    },
                    json={
                        "price_amount": price,
                        "price_currency": "usd",
                        "order_id": session_id,
                        "order_description": item_name,
                        "ipn_callback_url": f"{settings.WEBHOOK_BASE_URL}/api/v1/billing/webhooks/nowpayments",
                        "success_url": success_url,
                        "cancel_url": cancel_url
                    }
                )
                
                if response.status_code not in (200, 201):
                    error_detail = response.text
                    logger.error(f"NowPayments API error: {response.status_code} - {error_detail}")
                    raise ValueError(f"NowPayments invoice creation failed: {response.status_code}")
                
                data = response.json()
                return data["invoice_url"]
                
        except httpx.TimeoutException:
            raise ValueError("NowPayments API timeout")
        except Exception as e:
            logger.error(f"NowPayments invoice creation failed: {e}")
            raise ValueError(f"Failed to create NowPayments invoice: {str(e)}")

class InvoiceGenerator:
    """PDF invoice generation"""
    
    @staticmethod
    async def generate_invoice_pdf(invoice_data: Dict[str, Any]) -> bytes:
        """Generate PDF invoice"""
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib import colors
            from io import BytesIO
            
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            # Header
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                textColor=colors.HexColor('#7C3AED')
            )
            
            story.append(Paragraph("AI SaaS Platform", title_style))
            story.append(Paragraph(f"Invoice #{invoice_data['invoice_number']}", styles['Heading2']))
            story.append(Spacer(1, 20))
            
            # Invoice details
            invoice_details = [
                ['Invoice Date:', invoice_data['issued_at'].strftime('%Y-%m-%d')],
                ['Customer Email:', invoice_data['customer_email']],
                ['Payment Method:', invoice_data['payment_method']],
                ['Status:', invoice_data['status']]
            ]
            
            details_table = Table(invoice_details, colWidths=[2*inch, 3*inch])
            details_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            
            story.append(details_table)
            story.append(Spacer(1, 30))
            
            # Items table
            items_data = [['Description', 'Credits', 'Amount (USD)']]
            items_data.append([
                invoice_data['item_description'],
                str(invoice_data['credits_purchased']),
                f"${invoice_data['amount_usd']:.2f}"
            ])
            
            items_table = Table(items_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7C3AED')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(items_table)
            story.append(Spacer(1, 30))
            
            # Total
            total_style = ParagraphStyle(
                'Total',
                parent=styles['Normal'],
                fontSize=16,
                alignment=2,  # Right align
                fontName='Helvetica-Bold'
            )
            
            story.append(Paragraph(f"Total: ${invoice_data['amount_usd']:.2f} USD", total_style))
            
            # Footer
            story.append(Spacer(1, 50))
            story.append(Paragraph("Thank you for using AI SaaS Platform!", styles['Normal']))
            
            doc.build(story)
            buffer.seek(0)
            return buffer.getvalue()
            
        except ImportError:
            logger.error("ReportLab not installed - cannot generate PDF invoices")
            raise ValueError("PDF generation not available")
        except Exception as e:
            logger.error(f"Invoice PDF generation failed: {e}")
            raise ValueError(f"Failed to generate invoice PDF: {str(e)}")
    
    @staticmethod
    async def save_invoice_pdf(invoice_id: str, pdf_data: bytes) -> str:
        """Save invoice PDF to secure storage"""
        try:
            from pathlib import Path
            import os
            
            # Create invoices directory
            invoices_dir = Path(os.getenv("SECURE_STORAGE_PATH", "/var/lib/ai-saas")) / "invoices"
            invoices_dir.mkdir(parents=True, exist_ok=True, mode=0o750)
            
            # Save PDF file
            pdf_path = invoices_dir / f"invoice_{invoice_id}.pdf"
            with open(pdf_path, 'wb') as f:
                f.write(pdf_data)
            
            # Set secure permissions
            os.chmod(pdf_path, 0o640)
            
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Failed to save invoice PDF: {e}")
            raise ValueError(f"Failed to save invoice PDF: {str(e)}")