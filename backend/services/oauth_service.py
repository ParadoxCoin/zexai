"""
OAuth Service
Handles OAuth 2.0 authentication with Google, GitHub, and Discord
"""
from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException, status
from datetime import datetime
import uuid
import httpx

from core.config import settings
from core.security import create_access_token


# Initialize OAuth client
oauth = OAuth()

# Register Google OAuth
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# Register GitHub OAuth
oauth.register(
    name='github',
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    authorize_url='https://github.com/login/oauth/authorize',
    access_token_url='https://github.com/login/oauth/access_token',
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)

# Register Discord OAuth
oauth.register(
    name='discord',
    client_id=settings.DISCORD_CLIENT_ID,
    client_secret=settings.DISCORD_CLIENT_SECRET,
    authorize_url='https://discord.com/api/oauth2/authorize',
    access_token_url='https://discord.com/api/oauth2/token',
    api_base_url='https://discord.com/api/',
    client_kwargs={'scope': 'identify email'},
)


async def get_google_user_info(token: dict) -> dict:
    """Fetch user info from Google"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {token["access_token"]}'}
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch user info from Google"
            )
        return response.json()


async def get_github_user_info(token: dict) -> dict:
    """Fetch user info from GitHub"""
    async with httpx.AsyncClient() as client:
        # Get user profile
        response = await client.get(
            'https://api.github.com/user',
            headers={'Authorization': f'Bearer {token["access_token"]}'}
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch user info from GitHub"
            )
        user_data = response.json()
        
        # Get user email (if not public)
        if not user_data.get('email'):
            email_response = await client.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f'Bearer {token["access_token"]}'}
            )
            if email_response.status_code == 200:
                emails = email_response.json()
                primary_email = next((e for e in emails if e['primary']), None)
                if primary_email:
                    user_data['email'] = primary_email['email']
        
        return user_data


async def get_discord_user_info(token: dict) -> dict:
    """Fetch user info from Discord"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            'https://discord.com/api/users/@me',
            headers={'Authorization': f'Bearer {token["access_token"]}'}
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch user info from Discord"
            )
        return response.json()


async def create_or_update_oauth_user(db, provider: str, user_info: dict):
    """
    Create or update user from OAuth provider (Supabase Version)
    Returns user document and JWT token
    """
    # Extract email and name based on provider
    if provider == 'google':
        email = user_info.get('email')
        full_name = user_info.get('name', '')
        provider_user_id = user_info.get('id')
    elif provider == 'github':
        email = user_info.get('email')
        full_name = user_info.get('name') or user_info.get('login', '')
        provider_user_id = str(user_info.get('id'))
    elif provider == 'discord':
        email = user_info.get('email')
        full_name = user_info.get('username', '')
        provider_user_id = user_info.get('id')
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email not provided by {provider}"
        )
    
    # Check if user exists using Supabase
    try:
        response = db.table("users").select("*").eq("email", email).execute()
        existing_user = response.data[0] if response.data else None
    except Exception as e:
        # Fallback for table name mapping if needed (some systems use 'profiles' instead of 'users' for public info)
        try:
            response = db.table("profiles").select("*").eq("email", email).execute()
            existing_user = response.data[0] if response.data else None
        except:
            existing_user = None
    
    if existing_user:
        # Update last login and OAuth info
        try:
            db.table("users").update({
                "last_login": datetime.utcnow().isoformat(),
                f"oauth_{provider}_id": provider_user_id,
            }).eq("id", existing_user["id"]).execute()
        except Exception:
            # Try profiles table
            try:
                db.table("profiles").update({
                    "last_login": datetime.utcnow().isoformat(),
                    f"oauth_{provider}_id": provider_user_id,
                }).eq("id", existing_user["id"]).execute()
            except:
                pass
        user = existing_user
    else:
        # Create new user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": email,
            "password_hash": None,  # OAuth users don't have password
            "full_name": full_name,
            "role": "user",
            "package": "free",
            "created_at": datetime.utcnow().isoformat(),
            "last_login": datetime.utcnow().isoformat(),
            "is_active": True,
            f"oauth_{provider}_id": provider_user_id,
        }
        
        # Insert into users/profiles table
        try:
            db.table("users").insert(user).execute()
        except Exception:
            try:
                db.table("profiles").insert(user).execute()
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create user: {str(e)}"
                )
        
        # Initialize credit balance
        try:
            db.table("user_credits").insert({
                "user_id": user_id,
                "credits_balance": 0.0,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            # Log error but continue
            print(f"Warning: Failed to initialize credits for {user_id}: {e}")
    
    # Create JWT token
    token = create_access_token(user["id"])
    
    return user, token
