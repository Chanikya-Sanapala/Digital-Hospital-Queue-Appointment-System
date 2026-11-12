import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import logging
from backend.core.config import settings
from backend.core.database import get_database
from backend.services.email_service import EmailService

logger = logging.getLogger("queuesense.otp")

def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()

class OTPService:
    @staticmethod
    def generate_otp() -> str:
        """Generates a cryptographically secure 6-digit numeric OTP."""
        return f"{secrets.randbelow(900000) + 100000}"

    @classmethod
    async def send_email_otp(
        cls,
        email: str,
        customer_name: Optional[str] = None,
        purpose: str = "registration"
    ) -> Dict[str, Any]:
        """
        Generates and dispatches a real 6-digit verification OTP to the user's email via SMTP.
        Enforces 60-second resend cooldown and 5-minute expiration.
        Invalidates any previously active OTP for this email/purpose.
        """
        clean_email = email.strip().lower()
        if not clean_email or "@" not in clean_email:
            raise ValueError("A valid email address is required.")

        db = get_database()
        now = datetime.now(timezone.utc)

        # 1. Enforce Resend Cooldown
        existing = await db.otp_verifications.find_one({
            "email": clean_email,
            "purpose": purpose
        })
        if existing and not existing.get("verified", False):
            last_sent = existing.get("last_sent_at") or existing.get("created_at")
            if last_sent:
                if last_sent.tzinfo is None:
                    last_sent = last_sent.replace(tzinfo=timezone.utc)
                elapsed = (now - last_sent).total_seconds()
                if elapsed < settings.OTP_RESEND_COOLDOWN:
                    wait_time = int(settings.OTP_RESEND_COOLDOWN - elapsed)
                    raise ValueError(f"Please wait {wait_time} seconds before requesting a new verification code.")

        # 2. Invalidate any previous active OTP for this email & purpose
        await db.otp_verifications.delete_many({
            "email": clean_email,
            "purpose": purpose
        })

        # 3. Generate secure 6-digit OTP and calculate expiration
        otp_code = cls.generate_otp()
        hashed_otp = hash_code(otp_code)
        expiry_seconds = settings.OTP_EXPIRY_SECONDS
        expires_at = now + timedelta(seconds=expiry_seconds)

        # 4. Attempt real SMTP email dispatch
        name_for_email = (customer_name or "Customer").strip()
        try:
            await EmailService.send_verification_email(
                to_email=clean_email,
                customer_name=name_for_email,
                otp_code=otp_code,
                expiry_minutes=expiry_seconds // 60
            )
        except Exception as e:
            # If SMTP credentials are not configured or rejected, log clearly and bubble friendly error
            logger.error(f"Failed to dispatch verification email to {clean_email}: {e}")
            raise ValueError(f"Unable to send verification email: {str(e)}")

        # 5. Persist hashed OTP record in MongoDB Atlas
        doc = {
            "email": clean_email,
            "otp_hash": hashed_otp,
            "purpose": purpose,
            "attempts": 0,
            "max_attempts": settings.OTP_MAX_ATTEMPTS,
            "verified": False,
            "expires_at": expires_at,
            "last_sent_at": now,
            "created_at": now
        }
        await db.otp_verifications.insert_one(doc)

        logger.info(f"Verification code successfully issued and emailed to {clean_email}")

        return {
            "success": True,
            "email": clean_email,
            "expires_in": expiry_seconds,
            "cooldown_seconds": settings.OTP_RESEND_COOLDOWN,
            "message": f"Verification code sent to {clean_email}."
        }

    @classmethod
    async def verify_email_otp(
        cls,
        email: str,
        otp_code: str,
        purpose: str = "registration"
    ) -> bool:
        """
        Verifies the submitted 6-digit OTP against the stored SHA-256 hash.
        Enforces expiration, attempt limits, and single-use invalidation.
        """
        clean_email = email.strip().lower()
        clean_code = otp_code.strip()

        if not clean_email or not clean_code or len(clean_code) != 6:
            raise ValueError("Valid email address and 6-digit verification code are required.")

        db = get_database()
        now = datetime.now(timezone.utc)

        record = await db.otp_verifications.find_one({
            "email": clean_email,
            "purpose": purpose
        })
        if not record:
            raise ValueError(f"No active verification code found for {clean_email}. Please request a new code.")

        # Check if already verified/used (prevent reuse)
        if record.get("verified", False):
            raise ValueError("This verification code has already been used. Please request a new code.")

        # Check expiration
        expires_at = record.get("expires_at")
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if now > expires_at:
                await db.otp_verifications.delete_one({"_id": record["_id"]})
                raise ValueError("Verification code has expired. Please request a new code.")

        # Check maximum attempts limit
        attempts = record.get("attempts", 0)
        max_attempts = record.get("max_attempts", settings.OTP_MAX_ATTEMPTS)

        if attempts >= max_attempts:
            await db.otp_verifications.delete_one({"_id": record["_id"]})
            raise ValueError("Maximum verification attempts exceeded. Please request a new code.")

        # Constant-time comparison or hash equality
        submitted_hash = hash_code(clean_code)
        expected_hash = record.get("otp_hash") or record.get("otp_code_hash")

        if submitted_hash != expected_hash:
            await db.otp_verifications.update_one(
                {"_id": record["_id"]},
                {"$inc": {"attempts": 1}}
            )
            remaining = max_attempts - (attempts + 1)
            raise ValueError(f"Invalid verification code. {remaining} attempt(s) remaining.")

        # Mark as verified and invalidate further use
        await db.otp_verifications.update_one(
            {"_id": record["_id"]},
            {"$set": {"verified": True, "verified_at": now}}
        )

        return True
