from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx
import uuid

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import UserResponse, TokenResponse, DevLoginRequest
from app.auth import get_current_user, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.get("/me", response_model=UserResponse)
def get_authenticated_user(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently logged-in SSO user."""
    return current_user


@router.post("/logout")
def logout():
    """Logout endpoint."""
    return {"success": True, "message": "Successfully logged out."}


@router.post("/dev-login", response_model=TokenResponse)
def dev_mock_sso_login(payload: DevLoginRequest, db: Session = Depends(get_db)):
    """
    Mock SSO Login for local development and testing.
    Allows instant login without needing external Google/Azure client credentials.
    """
    if not settings.DEV_SSO_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev SSO is disabled in production."
        )

    sso_id = payload.sso_user_id or f"mock-sso-{uuid.uuid5(uuid.NAMESPACE_DNS, payload.email)}"

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        user = User(
            sso_user_id=sso_id,
            name=payload.name,
            email=payload.email,
            avatar_url=payload.avatar_url or f"https://api.dicebear.com/7.x/initials/svg?seed={payload.name}"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@router.get("/sso/login/{provider}")
def sso_redirect(provider: str):
    """
    Initiate OAuth 2.0 / OpenID Connect authorization code flow
    with Google or Microsoft Entra ID.
    """
    provider = provider.lower()
    if provider == "google":
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth credentials are not configured in .env."
            )
        google_auth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.GOOGLE_CLIENT_ID}&"
            f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
            "response_type=code&"
            "scope=openid%20email%20profile"
        )
        return RedirectResponse(google_auth_url)

    elif provider in ("microsoft", "azure"):
        if not settings.AZURE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Microsoft Entra ID credentials are not configured in .env."
            )
        azure_auth_url = (
            f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/oauth2/v2.0/authorize?"
            f"client_id={settings.AZURE_CLIENT_ID}&"
            f"redirect_uri={settings.AZURE_REDIRECT_URI}&"
            "response_type=code&"
            "scope=openid%20email%20profile%20User.Read"
        )
        return RedirectResponse(azure_auth_url)

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported SSO provider: '{provider}'. Supported providers: 'google', 'microsoft'."
        )


@router.get("/sso/callback/{provider}")
async def sso_callback(provider: str, code: str = Query(...), db: Session = Depends(get_db)):
    """
    Handle authorization code callback from SSO Provider, exchange code for user profile,
    persist or update User in database, and redirect back to frontend with session token.
    """
    provider = provider.lower()
    try:
        async with httpx.AsyncClient() as client:
            if provider == "google":
                # Exchange code for token
                token_resp = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                        "grant_type": "authorization_code"
                    }
                )
                if token_resp.status_code != 200:
                    raise HTTPException(status_code=400, detail="Google token exchange failed.")
                token_data = token_resp.json()
                access_token = token_data.get("access_token")

                # Get user info
                user_info_resp = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                user_data = user_info_resp.json()
                sso_id = user_data["sub"]
                email = user_data["email"]
                name = user_data.get("name", email.split("@")[0])
                avatar = user_data.get("picture")

            elif provider in ("microsoft", "azure"):
                token_resp = await client.post(
                    f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/oauth2/v2.0/token",
                    data={
                        "client_id": settings.AZURE_CLIENT_ID,
                        "client_secret": settings.AZURE_CLIENT_SECRET,
                        "code": code,
                        "redirect_uri": settings.AZURE_REDIRECT_URI,
                        "grant_type": "authorization_code"
                    }
                )
                if token_resp.status_code != 200:
                    raise HTTPException(status_code=400, detail="Microsoft token exchange failed.")
                token_data = token_resp.json()
                access_token = token_data.get("access_token")

                # Get user info from Microsoft Graph
                graph_resp = await client.get(
                    "https://graph.microsoft.com/v1.0/me",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                user_data = graph_resp.json()
                sso_id = user_data["id"]
                email = user_data.get("mail") or user_data.get("userPrincipalName")
                name = user_data.get("displayName", email.split("@")[0])
                avatar = None
            else:
                raise HTTPException(status_code=400, detail="Invalid provider")

        # Find or create user in DB
        user = db.query(User).filter((User.sso_user_id == sso_id) | (User.email == email)).first()
        if not user:
            user = User(
                sso_user_id=sso_id,
                name=name,
                email=email,
                avatar_url=avatar or f"https://api.dicebear.com/7.x/initials/svg?seed={name}"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        jwt_token = create_access_token(data={"sub": str(user.id), "email": user.email})
        # Redirect back to frontend with session token
        redirect_url = f"{settings.FRONTEND_URL}/#token={jwt_token}"
        return RedirectResponse(redirect_url)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SSO authentication error: {str(e)}"
        )
