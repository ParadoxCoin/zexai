from fastapi import FastAPI

# Import all routers
from routes.auth import router as auth_router
from routes.user import router as user_router
from routes.media import router as media_router
from routes.dashboard import router as dashboard_router
from routes.files import router as files_router
from routes.chat import router as chat_router
from routes.image import router as image_tools_router
from routes.image_new import router as image_new_router
from routes.video_new import router as video_new_router
from routes.audio import router as audio_tts_router
from routes.audio_extended import router as audio_extended_router
from routes.synapse import router as synapse_router
from routes.connectors import router as connectors_router
from routes.admin_enhanced import router as admin_enhanced_router
from routes.admin import router as admin_router
from routes.admin_video import router as admin_video_router
from routes.admin_image import router as admin_image_router
from routes.admin_models import router as admin_models_router
from routes.admin_providers import router as admin_providers_router
from routes.admin_settings import router as admin_settings_router
from routes.admin_audit import router as admin_audit_router
from routes.admin_roles import router as admin_roles_router
from routes.admin_billing import router as admin_billing_router
from routes.admin_rate_limits import router as admin_rate_limits_router
from routes.admin_scheduler import router as admin_scheduler_router
from routes.admin_key_vault import router as admin_key_vault_router
from routes.admin_ab_testing import router as admin_ab_testing_router
from routes.billing import router as billing_router
from routes.health import router as health_router
from routes.metrics import router as metrics_router
from routes.admin_pricing_enhanced import router as admin_pricing_enhanced_router
from routes.dashboard_enhanced import router as dashboard_enhanced_router
from routes.webhooks import router as webhooks_router
from routes.rpc_proxy import router as rpc_proxy_router
from routes.referral import router as referral_router
from routes.admin_analytics import router as admin_analytics_router
from routes.admin_email import router as admin_email_router
from routes.marketplace import router as marketplace_router
from routes.admin_reports import router as admin_reports_router
from routes.notifications import router as notifications_router
from routes.admin_airdrop import router as admin_airdrop_router
from routes.admin_referral import router as admin_referral_router
from routes.gamification import router as gamification_router
from routes.avatar import router as avatar_router
from routes.prompt import router as prompt_router
from routes.social import router as social_router
from routes.voice_clone import router as voice_clone_router
from routes.packages import router as packages_router
from routes.comparison import router as comparison_router
from routes.staking import router as staking_router
from routes.nft import router as nft_router
from routes.contact import router as contact_router
from routes.collections import router as collections_router

def register_routers(app: FastAPI, prefix: str):
    """
    Register all modular routers in the application in the correct order.
    Ensures enhanced routers are loaded before base ones to avoid wildcard clashes.
    """
    app.include_router(auth_router, prefix=prefix)
    app.include_router(user_router, prefix=prefix)
    app.include_router(media_router, prefix=prefix)
    app.include_router(dashboard_router, prefix=prefix)
    app.include_router(files_router, prefix=prefix)
    app.include_router(chat_router, prefix=prefix)
    app.include_router(image_tools_router, prefix=prefix)
    app.include_router(image_new_router, prefix=prefix)
    app.include_router(video_new_router, prefix=prefix)
    app.include_router(audio_tts_router, prefix=prefix)
    app.include_router(audio_extended_router, prefix=prefix)
    app.include_router(synapse_router, prefix=prefix)
    app.include_router(connectors_router, prefix=prefix)
    
    # Enhanced admin routers must come before base admin router
    app.include_router(admin_enhanced_router, prefix=prefix)
    app.include_router(admin_router, prefix=prefix)
    app.include_router(admin_video_router, prefix=prefix)
    app.include_router(admin_image_router, prefix=prefix)
    app.include_router(admin_models_router, prefix=prefix)
    app.include_router(admin_providers_router, prefix=prefix)
    app.include_router(admin_settings_router, prefix=prefix)
    app.include_router(admin_audit_router, prefix=prefix)
    app.include_router(admin_roles_router, prefix=prefix)
    app.include_router(admin_billing_router, prefix=prefix)
    app.include_router(admin_rate_limits_router, prefix=prefix)
    app.include_router(admin_scheduler_router, prefix=prefix)
    app.include_router(admin_key_vault_router, prefix=prefix)
    app.include_router(admin_ab_testing_router, prefix=prefix)
    
    app.include_router(billing_router, prefix=prefix)
    app.include_router(health_router, prefix=prefix)
    app.include_router(metrics_router, prefix=prefix)
    app.include_router(admin_pricing_enhanced_router, prefix=prefix)
    app.include_router(dashboard_enhanced_router, prefix=prefix)
    app.include_router(webhooks_router, prefix=prefix)
    app.include_router(rpc_proxy_router, prefix=prefix)
    app.include_router(referral_router, prefix=prefix)
    app.include_router(admin_analytics_router, prefix=prefix)
    app.include_router(admin_email_router, prefix=prefix)
    app.include_router(marketplace_router, prefix=prefix)
    app.include_router(admin_reports_router, prefix=prefix)
    app.include_router(notifications_router, prefix=prefix)
    app.include_router(admin_airdrop_router, prefix=prefix)
    app.include_router(admin_referral_router, prefix=prefix)
    app.include_router(gamification_router, prefix=prefix)
    app.include_router(avatar_router, prefix=prefix)
    app.include_router(prompt_router, prefix=prefix)
    app.include_router(social_router, prefix=prefix)
    app.include_router(voice_clone_router, prefix=prefix)
    app.include_router(packages_router, prefix=prefix)
    app.include_router(comparison_router, prefix=prefix)
    app.include_router(staking_router, prefix=prefix)
    app.include_router(nft_router, prefix=prefix)
    app.include_router(contact_router, prefix=prefix)
    app.include_router(collections_router, prefix=prefix)
