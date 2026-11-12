from typing import Optional, Union, Dict, Any
from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    mobile: str = Field(..., min_length=7, max_length=20, description="Mandatory mobile number for queue management")
    password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)
    agree_terms: bool = Field(..., description="User must agree to terms")
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None

class SendEmailOtpRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(default="registration") # "registration", "password_reset"

class VerifyEmailOtpRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    purpose: str = Field(default="registration")

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or Username")
    password: str
    remember_me: bool = False

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., description="Real Google ID token credential from Google Identity Services")

class GoogleAccountLinkRequest(BaseModel):
    credential: str = Field(..., description="Real Google ID token credential")
    password: str = Field(..., description="Password of the existing account to verify ownership")

class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    name: Optional[str] = None
    email: str
    username: str
    phone_number: Optional[str] = None
    mobile: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    role: str
    is_verified: bool
    email_verified: bool = False
    is_active: bool
    organization_id: Optional[str] = None
    profile_image: Optional[str] = None
    auth_provider: Optional[str] = "local"
    google_sub: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RegisterResponse(BaseModel):
    success: bool = True
    email: str
    message: str

class AccountLinkRequiredResponse(BaseModel):
    requires_account_linking: bool = True
    email: str
    message: str
