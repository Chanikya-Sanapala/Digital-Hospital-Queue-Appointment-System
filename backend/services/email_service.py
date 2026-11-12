import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import logging
from typing import Optional
from backend.core.config import settings

logger = logging.getLogger("queuesense.email")

class EmailService:
    @staticmethod
    def _render_verification_template(customer_name: str, otp_code: str, expiry_minutes: int) -> tuple[str, str]:
        """Generates plain-text and responsive HTML verification email bodies."""
        subject = "QueueSense — Verify Your Email Address"
        
        text_body = f"""Hello {customer_name},

Thank you for registering with QueueSense.

Your email verification code is:

{otp_code}

This verification code expires in {expiry_minutes} minutes.

If you did not request this verification, please ignore this email.

Regards,
QueueSense Team
Digital Hospital Queue & Appointment System
"""

        html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #242424;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F5F7; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #ffffff; border-bottom: 1px solid #F3F4F6;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #234F3E; letter-spacing: -0.5px;">QueueSense</span>
                    <span style="display: block; font-size: 11px; color: #777777; margin-top: 2px;">Digital Hospital Queue &amp; Appointment System</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              <p style="font-size: 14px; line-height: 1.5; color: #242424; margin: 0 0 16px 0;">
                Hello <strong>{customer_name}</strong>,
              </p>
              <p style="font-size: 13px; line-height: 1.6; color: #555555; margin: 0 0 24px 0;">
                Thank you for registering with QueueSense. Please use the following six-digit verification code to complete your verification:
              </p>

              <!-- OTP Code Box -->
              <div style="background-color: #F4F5F7; border: 1px solid #E5E7EB; border-radius: 6px; padding: 18px; text-align: center; margin: 0 0 24px 0;">
                <div style="font-size: 11px; text-transform: uppercase; tracking: 1px; color: #777777; margin-bottom: 6px; font-weight: 600;">Verification Code</div>
                <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #234F3E; font-family: 'Courier New', Courier, monospace;">
                  {otp_code}
                </div>
              </div>

              <p style="font-size: 12px; line-height: 1.6; color: #777777; margin: 0 0 16px 0;">
                This verification code expires in <strong>{expiry_minutes} minutes</strong>. Do not share this code with anyone.
              </p>
              <p style="font-size: 12px; line-height: 1.6; color: #999999; margin: 0 0 24px 0;">
                If you did not request this verification, please ignore this email.
              </p>

              <!-- Sign-off -->
              <div style="border-top: 1px solid #F3F4F6; padding-top: 16px;">
                <p style="font-size: 12px; color: #555555; margin: 0; line-height: 1.5;">
                  Regards,<br>
                  <strong style="color: #234F3E;">QueueSense Team</strong><br>
                  <span style="color: #777777; font-size: 11px;">Digital Hospital Queue &amp; Appointment System</span>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; background-color: #FAFAFA; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="font-size: 10px; color: #999999; margin: 0; line-height: 1.4;">
                This is an automated notification from QueueSense Hospital Management Platform.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return text_body, html_body

    @classmethod
    def _send_smtp_sync(cls, to_email: str, subject: str, text_body: str, html_body: str):
        """Synchronously opens connection to SMTP server and sends email."""
        if not settings.SMTP_HOST:
            raise ValueError("SMTP_HOST is not configured.")
        
        from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        if not from_email:
            raise ValueError("SMTP_FROM_EMAIL or SMTP_USERNAME is required to send emails.")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{from_email}>"
        msg["To"] = to_email

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        server = None
        try:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
            if settings.SMTP_TLS:
                server.starttls()
            
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

            server.send_message(msg)
            logger.info(f"Verification email successfully dispatched via SMTP to {to_email}")
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication error: {e}")
            raise ValueError(f"SMTP authentication failed: Invalid username or password.")
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError) as e:
            logger.error(f"SMTP connection error: {e}")
            raise ValueError("Failed to connect to email server. Please try again later.")
        except Exception as e:
            logger.error(f"Failed to dispatch email: {e}")
            raise ValueError(f"Failed to deliver email: {str(e)}")
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass

    @classmethod
    async def send_verification_email(
        cls,
        to_email: str,
        customer_name: str,
        otp_code: str,
        expiry_minutes: int = 5
    ) -> bool:
        """
        Sends the real QueueSense email verification email to the user.
        Raises ValueError with user-friendly error message if delivery fails.
        """
        text_body, html_body = cls._render_verification_template(customer_name, otp_code, expiry_minutes)
        subject = "QueueSense — Verify Your Email Address"
        
        # Execute SMTP delivery in thread pool to avoid blocking async event loop
        await asyncio.to_thread(
            cls._send_smtp_sync,
            to_email=to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body
        )
        return True

