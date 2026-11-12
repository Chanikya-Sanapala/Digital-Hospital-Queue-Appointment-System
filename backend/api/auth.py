from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from backend.core.database import get_database
from backend.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_token_payload
)
from backend.core.config import settings
from backend.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    SendEmailOtpRequest,
    VerifyEmailOtpRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    RefreshTokenRequest,
    GoogleAuthRequest,
    GoogleAccountLinkRequest,
    AuthResponse,
    UserResponse,
    AccountLinkRequiredResponse
)
from backend.services.otp_service import OTPService
import logging

logger = logging.getLogger("queuesense.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

def format_user_response(user: Dict[str, Any]) -> UserResponse:
    first = user.get("first_name", "")
    last = user.get("last_name", "")
    full_name = user.get("name") or f"{first} {last}".strip()
    phone_val = user.get("phone_number") or user.get("mobile_number") or user.get("mobile")

    return UserResponse(
        id=str(user["_id"]),
        first_name=first,
        last_name=last,
        name=full_name,
        email=user.get("email", ""),
        username=user.get("username", ""),
        phone_number=phone_val,
        mobile=phone_val,
        gender=user.get("gender"),
        dob=user.get("dob"),
        role=user.get("role", "customer"),
        is_verified=user.get("is_verified", False),
        email_verified=user.get("email_verified", user.get("is_verified", False)),
        is_active=user.get("is_active", True),
        organization_id=user.get("organization_id"),
        profile_image=user.get("profile_image") or user.get("avatar_url"),
        auth_provider=user.get("auth_provider", "local"),
        google_sub=user.get("google_sub")
    )

def verify_real_google_token(credential: str) -> Dict[str, Any]:
    """
    Verifies a real Google ID token using the official google-auth library.
    Validates token signature, audience against GOOGLE_CLIENT_ID, issuer, expiration, and email_verified.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID is not configured in backend environment."
        )

    try:
        request = google_requests.Request()
        id_info = google_id_token.verify_oauth2_token(
            credential,
            request,
            settings.GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        logger.warning(f"Google ID token signature or claim verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error verifying Google ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify Google ID token with Google authentication servers."
        )

    # Validate token issuer
    issuer = id_info.get("iss")
    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token issuer."
        )

    # Validate email_verified
    if not id_info.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Google account email is not verified by Google."
        )

    return id_info

@router.get("/check-username")
async def check_username(username: str):
    """Checks if a username is available in real-time (for registration UI badge)."""
    db = get_database()
    u = username.strip().lower()
    if len(u) < 3:
        return {"available": False, "reason": "Too short"}
    existing = await db.users.find_one({"username": u})
    return {"available": existing is None}

@router.post("/register", response_model=RegisterResponse)
async def register(req: RegisterRequest):
    """
    Step 1 of customer registration:
    Validates inputs, stores account as unverified, and sends a real 6-digit email OTP via SMTP.
    Account is only activated upon successful OTP verification.
    """
    db = get_database()
    now = datetime.now(timezone.utc)

    if req.password != req.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match.")
    if not req.agree_terms:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You must agree to the Terms & Conditions.")

    clean_email = req.email.strip().lower()
    clean_username = req.username.strip().lower()
    clean_mobile = (req.mobile or req.phone_number or "").strip()

    if not clean_mobile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mobile number is required.")

    # Check email uniqueness among activated users
    existing_user = await db.users.find_one({"email": clean_email})
    if existing_user and existing_user.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email address already exists. Please login.")

    # Check username uniqueness
    existing_username = await db.users.find_one({"username": clean_username})
    if existing_username and existing_username.get("_id") != (existing_user.get("_id") if existing_user else None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already taken. Please choose another.")

    # Check mobile uniqueness
    existing_mobile = await db.users.find_one({"mobile": clean_mobile})
    if existing_mobile:
        if existing_user is None or existing_mobile["_id"] != existing_user["_id"]:
            if existing_mobile.get("email_verified") or existing_mobile.get("is_verified"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mobile number {clean_mobile} is already registered to another account. Please login or use a different number."
                )
            else:
                # Discard previous stale unverified registration with this phone number
                await db.users.delete_one({"_id": existing_mobile["_id"]})

    hashed_pwd = hash_password(req.password)
    user_name = f"{req.first_name.strip()} {req.last_name.strip()}"

    user_doc = {
        "first_name": req.first_name.strip(),
        "last_name": req.last_name.strip(),
        "name": user_name,
        "email": clean_email,
        "username": clean_username,
        "password_hash": hashed_pwd,
        "role": "customer",
        "email_verified": False,
        "is_verified": False,
        "is_active": False,
        "auth_provider": "local",
        "phone_number": clean_mobile,
        "mobile": clean_mobile,
        "gender": req.gender,
        "dob": req.dob,
        "updated_at": now
    }

    try:
        if existing_user:
            await db.users.update_one({"_id": existing_user["_id"]}, {"$set": user_doc})
        else:
            user_doc["created_at"] = now
            await db.users.insert_one(user_doc)
    except DuplicateKeyError as e:
        err_str = str(e)
        if "mobile" in err_str:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mobile number is already registered.")
        elif "username" in err_str:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already taken.")
        elif "email" in err_str:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered. Please login.")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account with these details already exists.")

    # Send real email verification OTP via SMTP
    try:
        await OTPService.send_email_otp(
            email=clean_email,
            customer_name=req.first_name.strip(),
            purpose="registration"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending registration email: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send verification email. Please verify your SMTP settings.")

    return RegisterResponse(
        success=True,
        email=clean_email,
        message="Account registered. Please enter the six-digit verification code sent to your email."
    )

@router.post("/send-email-otp")
async def send_email_otp(req: SendEmailOtpRequest):
    """Sends / resends a 6-digit verification code to the customer's email."""
    clean_email = req.email.strip().lower()
    db = get_database()
    user = await db.users.find_one({"email": clean_email})
    customer_name = user.get("first_name") if user else None

    try:
        res = await OTPService.send_email_otp(
            email=clean_email,
            customer_name=customer_name,
            purpose=req.purpose
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error in send_email_otp: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to deliver verification email.")

@router.post("/verify-email-otp", response_model=AuthResponse)
async def verify_email_otp(req: VerifyEmailOtpRequest):
    """
    Verifies the submitted 6-digit OTP code, marks email as verified,
    activates the customer account, and returns authenticated JWT session.
    """
    clean_email = req.email.strip().lower()
    try:
        await OTPService.verify_email_otp(
            email=clean_email,
            otp_code=req.otp_code,
            purpose=req.purpose
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    db = get_database()
    now = datetime.now(timezone.utc)

    user = await db.users.find_one({"email": clean_email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    # Activate account & mark email verified
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "email_verified": True,
            "is_verified": True,
            "is_active": True,
            "updated_at": now
        }}
    )
    user["email_verified"] = True
    user["is_verified"] = True
    user["is_active"] = True

    user_id_str = str(user["_id"])
    token_data = {
        "sub": user_id_str,
        "role": user.get("role", "customer"),
        "username": user.get("username"),
        "organization_id": user.get("organization_id")
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_response(user)
    )

# Backward-compatibility alias routes
@router.post("/send-otp")
async def send_otp_alias(req: SendEmailOtpRequest):
    return await send_email_otp(req)

@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp_alias(req: VerifyEmailOtpRequest):
    return await verify_email_otp(req)

@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    db = get_database()
    identifier = req.identifier.strip().lower()

    # Find user by email or username
    user = await db.users.find_one({
        "$or": [
            {"email": identifier},
            {"username": identifier}
        ]
    })

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email/username or password.")

    if not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email/username or password.")

    # Check email verification status
    if not user.get("email_verified") and not user.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address not verified. Please verify your email before logging in."
        )

    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Please contact support.")

    user_id_str = str(user["_id"])
    token_data = {
        "sub": user_id_str,
        "role": user.get("role", "customer"),
        "username": user.get("username"),
        "organization_id": user.get("organization_id")
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_response(user)
    )

@router.post("/refresh")
async def refresh_tokens(req: RefreshTokenRequest):
    try:
        payload = decode_token(req.refresh_token, settings.JWT_REFRESH_SECRET)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

        db = get_database()
        user_id = payload.get("sub")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or not user.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

        token_data = {
            "sub": str(user["_id"]),
            "role": user.get("role", "customer"),
            "username": user.get("username"),
            "organization_id": user.get("organization_id")
        }
        new_access = create_access_token(token_data)
        new_refresh = create_refresh_token(token_data)

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer"
        }
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")

@router.post("/logout")
async def logout(payload: Dict[str, Any] = Depends(get_current_token_payload)):
    """Logs out the user and invalidates current session."""
    return {"success": True, "message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
async def get_me(payload: Dict[str, Any] = Depends(get_current_token_payload)):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return format_user_response(user)

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """
    Sends a 6-digit email OTP for password recovery.
    Prevents account enumeration by returning a generic response.
    """
    clean_email = req.email.strip().lower()
    db = get_database()
    user = await db.users.find_one({"email": clean_email})

    if user and user.get("email"):
        try:
            await OTPService.send_email_otp(
                email=clean_email,
                customer_name=user.get("first_name"),
                purpose="password_reset"
            )
        except Exception as e:
            logger.error(f"Error dispatching password reset email: {e}")

    return {
        "success": True,
        "email": clean_email,
        "message": "If an account exists with this email address, a six-digit verification code has been sent."
    }

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Verifies the email OTP and updates the customer's password."""
    clean_email = req.email.strip().lower()
    try:
        await OTPService.verify_email_otp(
            email=clean_email,
            otp_code=req.otp_code,
            purpose="password_reset"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db = get_database()
    now = datetime.now(timezone.utc)
    new_hash = hash_password(req.new_password)

    res = await db.users.update_one(
        {"email": clean_email},
        {"$set": {"password_hash": new_hash, "updated_at": now}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")

    return {"success": True, "message": "Password reset successfully. Please login with your new password."}

@router.post("/google", response_model=Union[AuthResponse, AccountLinkRequiredResponse])
async def google_auth(req: GoogleAuthRequest):
    """
    Real Google OAuth: Verifies Google ID token via official google-auth library.
    Checks email_verified from Google.
    Creates or retrieves the user.
    No mobile verification or secondary OTP is required when Google has already verified the email.
    """
    credential = req.credential.strip()
    if not credential:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google credential token is required.")

    id_info = verify_real_google_token(credential)

    google_sub = str(id_info["sub"])
    email = id_info.get("email", "").strip().lower()
    name = id_info.get("name", "")
    given_name = id_info.get("given_name") or name or "Google"
    family_name = id_info.get("family_name") or "User"
    profile_image = id_info.get("picture", "")

    db = get_database()
    now = datetime.now(timezone.utc)

    # 1. Search by stable google_sub
    user = await db.users.find_one({"google_sub": google_sub})

    if not user:
        # 2. Check if a user with this email already exists
        existing_by_email = await db.users.find_one({"email": email})
        if existing_by_email:
            # If account has a password, enforce secure linking rather than silent takeover
            if existing_by_email.get("password_hash"):
                return AccountLinkRequiredResponse(
                    requires_account_linking=True,
                    email=email,
                    message="An account with this email already exists. Please enter your existing password to link your Google account."
                )
            else:
                user = existing_by_email
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {
                        "google_sub": google_sub,
                        "profile_image": profile_image or user.get("profile_image"),
                        "email_verified": True,
                        "is_verified": True,
                        "is_active": True,
                        "updated_at": now
                    }}
                )
                user["google_sub"] = google_sub
                user["profile_image"] = profile_image
                user["email_verified"] = True

    if not user:
        # 3. Create a brand new user in MongoDB Atlas
        base_username = email.split("@")[0].lower()
        base_username = "".join(c for c in base_username if c.isalnum() or c in "_-")
        if len(base_username) < 3:
            base_username = f"user_{base_username}"

        username_candidate = base_username
        suffix = 1
        while await db.users.find_one({"username": username_candidate}):
            username_candidate = f"{base_username}_{suffix}"
            suffix += 1

        user_doc = {
            "google_sub": google_sub,
            "email": email,
            "name": name or f"{given_name} {family_name}".strip(),
            "first_name": given_name,
            "last_name": family_name,
            "username": username_candidate,
            "profile_image": profile_image,
            "auth_provider": "google",
            "email_verified": True,
            "is_verified": True,
            "is_active": True,
            "password_hash": "",
            "phone_number": None,
            "mobile": None,
            "role": "customer",
            "created_at": now,
            "updated_at": now
        }
        res = await db.users.insert_one(user_doc)
        user_doc["_id"] = res.inserted_id
        user = user_doc

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact hospital support."
        )

    user_id_str = str(user["_id"])
    token_data = {
        "sub": user_id_str,
        "role": user.get("role", "customer"),
        "username": user.get("username"),
        "organization_id": user.get("organization_id")
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_response(user)
    )

@router.post("/google/link", response_model=AuthResponse)
async def google_account_link(req: GoogleAccountLinkRequest):
    """
    Securely links a Google account to an existing password-protected account.
    Verifies both the real Google ID token and the existing account password.
    """
    id_info = verify_real_google_token(req.credential)
    google_sub = str(id_info["sub"])
    email = id_info.get("email", "").strip().lower()
    profile_image = id_info.get("picture", "")

    db = get_database()
    now = datetime.now(timezone.utc)

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="No existing account found with this email.")

    if not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Invalid password for existing account. Linking rejected.")

    # Securely link google_sub to this existing account
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "google_sub": google_sub,
            "profile_image": profile_image or user.get("profile_image"),
            "email_verified": True,
            "is_verified": True,
            "is_active": True,
            "updated_at": now
        }}
    )
    user["google_sub"] = google_sub
    user["email_verified"] = True
    user["is_verified"] = True
    user["is_active"] = True

    user_id_str = str(user["_id"])
    token_data = {
        "sub": user_id_str,
        "role": user.get("role", "customer"),
        "username": user.get("username"),
        "organization_id": user.get("organization_id")
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_response(user)
    )
