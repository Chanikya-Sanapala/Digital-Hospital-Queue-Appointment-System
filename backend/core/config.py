import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Ensure backend/.env is loaded reliably regardless of current working directory
backend_dir = Path(__file__).resolve().parent.parent
env_file = backend_dir / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file, override=True)
else:
    load_dotenv(override=True)

class Settings:
    PROJECT_NAME: str = "QueueSense"
    PROJECT_VERSION: str = "1.0.0"
    
    # Database
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "queuesense")
    
    # JWT & Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "queuesense_super_secure_jwt_secret_key_2026_at_least_32_chars_long")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "queuesense_super_secure_refresh_secret_key_2026_at_least_32_chars")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # SMS Gateways (TextBee / MSG91)
    TEXTBEE_API_KEY: str = os.getenv("TEXTBEE_API_KEY", "")
    TEXTBEE_DEVICE_ID: str = os.getenv("TEXTBEE_DEVICE_ID", "")
    MSG91_AUTH_KEY: str = os.getenv("MSG91_AUTH_KEY", "")
    MSG91_SENDER_ID: str = os.getenv("MSG91_SENDER_ID", "QUSENS")
    MSG91_TEMPLATE_ID: str = os.getenv("MSG91_TEMPLATE_ID", "")
    MSG91_VOICE_TEMPLATE_ID: str = os.getenv("MSG91_VOICE_TEMPLATE_ID", "")
    OTP_EXPIRY_SECONDS: int = int(os.getenv("OTP_EXPIRY_SECONDS", "300")) # 5 mins
    OTP_RESEND_COOLDOWN: int = int(os.getenv("OTP_RESEND_COOLDOWN") or os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60")) # 1 min
    OTP_RESEND_COOLDOWN_SECONDS: int = OTP_RESEND_COOLDOWN
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    
    # Email / SMTP Configuration
    EMAIL_PROVIDER: str = os.getenv("EMAIL_PROVIDER", "smtp")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "QueueSense")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # CORS
    @property
    def cors_origins(self) -> List[str]:
        origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
        return [origin.strip() for origin in origins_str.split(",") if origin.strip()]

settings = Settings()

