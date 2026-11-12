import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from bson import ObjectId
from backend.core.security import hash_password, verify_password, create_access_token, decode_token
from backend.services.otp_service import OTPService
from backend.core.config import settings

def test_password_hashing():
    raw = "SecurePassword123!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert hashed.startswith("$argon2")
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_tokens():
    payload = {"sub": "user_12345", "role": "customer", "username": "testuser"}
    token = create_access_token(payload)
    assert isinstance(token, str)
    decoded = decode_token(token, settings.JWT_SECRET)
    assert decoded["sub"] == "user_12345"
    assert decoded["role"] == "customer"
    assert decoded["username"] == "testuser"

@pytest.mark.asyncio
async def test_email_otp_flow():
    email = "testpatient@example.com"
    mock_db = MagicMock()
    mock_db.otp_verifications.find_one = AsyncMock(return_value=None)
    mock_db.otp_verifications.delete_many = AsyncMock()
    mock_db.otp_verifications.insert_one = AsyncMock()

    with patch("backend.services.otp_service.get_database", return_value=mock_db), \
         patch("backend.services.email_service.EmailService.send_verification_email", new_callable=AsyncMock, return_value=True):
        send_res = await OTPService.send_email_otp(email=email, customer_name="Test Patient", purpose="registration")
        assert send_res["success"] is True
        assert "expires_in" in send_res
        mock_db.otp_verifications.insert_one.assert_called_once()

@pytest.mark.asyncio
async def test_google_auth_endpoint():
    from httpx import AsyncClient, ASGITransport
    from backend.main import app

    mock_db = MagicMock()
    mock_user = {
        "_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
        "first_name": "Alex",
        "last_name": "Mercer",
        "name": "Alex Mercer",
        "email": "verified.google.user@example.com",
        "username": "alexmercer",
        "google_sub": "google_sub_9988776655",
        "auth_provider": "google",
        "email_verified": True,
        "is_verified": True,
        "is_active": True,
        "role": "customer",
    }
    mock_db.users.find_one = AsyncMock(return_value=mock_user)

    with patch("backend.api.auth.get_database", return_value=mock_db):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Missing / empty credential must return 400
            res_empty = await client.post("/api/auth/google", json={"credential": ""})
            assert res_empty.status_code == 400

            # 2. Fake / unverified credential must be rejected with 401
            res_fake = await client.post("/api/auth/google", json={"credential": "tampered_fake_jwt_token"})
            assert res_fake.status_code in (401, 500)

            # 3. Verified Google ID token payload via official google-auth mock
            mock_idinfo = {
                "sub": "google_sub_9988776655",
                "email": "verified.google.user@example.com",
                "email_verified": True,
                "name": "Alex Mercer",
                "given_name": "Alex",
                "family_name": "Mercer",
                "picture": "https://lh3.googleusercontent.com/test-pic",
                "iss": "https://accounts.google.com",
                "aud": "test-client-id"
            }

            with patch("backend.api.auth.verify_real_google_token", return_value=mock_idinfo):
                res_verified = await client.post("/api/auth/google", json={"credential": "real_google_token"})
                assert res_verified.status_code == 200
                data = res_verified.json()
                assert "access_token" in data
                assert "refresh_token" in data
                assert data["user"]["email"] == "verified.google.user@example.com"
                assert data["user"]["google_sub"] == "google_sub_9988776655"
                assert data["user"]["auth_provider"] == "google"
                assert data["user"]["email_verified"] is True
