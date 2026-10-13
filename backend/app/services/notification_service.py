import logging
import re
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import NotificationDelivery, QueueEntry, utc_now
from app.services.fcm_service import FcmService

logger = logging.getLogger("queueless.notifications")

def normalize_phone_number(phone: str) -> str:
    """
    Cleans and normalizes phone number to E.164 standard.
    Defaults 10-digit Indian numbers to +91.
    """
    cleaned = re.sub(r"[\s\-\(\)]", "", phone.strip())
    if cleaned.startswith("+"):
        return cleaned
    if len(cleaned) == 10 and cleaned[0] in "6789":
        return f"+91{cleaned}"
    if len(cleaned) == 12 and cleaned.startswith("91"):
        return f"+{cleaned}"
    return f"+{cleaned}"

class BaseSmsProvider(ABC):
    @abstractmethod
    def send_sms(self, phone: str, message: str) -> Tuple[bool, str, Optional[str]]:
        """Returns (success, provider_message_id, error_message)"""
        pass

class MockSmsProvider(BaseSmsProvider):
    def send_sms(self, phone: str, message: str) -> Tuple[bool, str, Optional[str]]:
        mock_id = f"mock-sms-{uuid.uuid4().hex[:12]}"
        logger.info(f"[SIMULATED SMS] To: {phone} | Msg: {message} | ID: {mock_id}")
        return True, mock_id, None

class Msg91SmsProvider(BaseSmsProvider):
    """
    Optional Real-SMS provider via MSG91 Flow API (India DLT compliant).
    """
    def send_sms(self, phone: str, message: str) -> Tuple[bool, str, Optional[str]]:
        auth_key = settings.MSG91_AUTH_KEY
        sender_id = settings.MSG91_SENDER_ID or "QLESS"

        if not auth_key:
            return False, "", "MSG91 credentials not configured (MSG91_AUTH_KEY)"

        try:
            import httpx
            url = "https://control.msg91.com/api/v5/flow/"
            headers = {"authkey": auth_key, "content-type": "application/json"}
            payload = {
                "mobiles": phone.replace("+", ""),
                "sender": sender_id,
                "message": message,
            }
            res = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if res.status_code in [200, 201]:
                return True, f"msg91-{uuid.uuid4().hex[:8]}", None
            else:
                return False, "", f"MSG91 Error ({res.status_code}): {res.text}"
        except Exception as e:
            return False, "", str(e)

def get_sms_provider() -> BaseSmsProvider:
    provider_name = (settings.SMS_PROVIDER or "mock").lower()
    if provider_name == "msg91":
        return Msg91SmsProvider()
    return MockSmsProvider()

class NotificationService:
    @classmethod
    def register_fcm_token(cls, db: Session, ticket_id: str, fcm_token: str) -> QueueEntry:
        """
        Securely stores or refreshes the FCM device token for a queue entry.
        """
        entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
        if not entry:
            raise ValueError("Ticket not found")

        entry.fcm_token = fcm_token.strip()
        entry.fcm_token_updated_at = utc_now()
        db.commit()
        db.refresh(entry)
        logger.info(f"Updated FCM token for ticket {entry.token_number}")
        return entry

    @classmethod
    def dispatch_sms_notification(
        cls,
        db: Session,
        entry: QueueEntry,
        event_type: str,
        message: str,
    ) -> Optional[NotificationDelivery]:
        """
        Dispatches SMS via configured provider (Mock or MSG91).
        Clearly records channel='SMS'. Never conflates with Web Push.
        """
        if not entry.visitor_phone or not settings.SMS_ENABLED:
            return None

        normalized_phone = normalize_phone_number(entry.visitor_phone)

        # Idempotency check: don't send duplicate SMS for the same ticket and event type
        existing = (
            db.query(NotificationDelivery)
            .filter(
                NotificationDelivery.entry_id == entry.id,
                NotificationDelivery.event_type == event_type,
                NotificationDelivery.channel == "SMS",
            )
            .first()
        )
        if existing:
            return existing

        provider = get_sms_provider()
        provider_name = settings.SMS_PROVIDER.lower() if settings.SMS_PROVIDER else "mock"

        success, msg_id, err = provider.send_sms(normalized_phone, message)

        delivery_status = "DELIVERED" if success and provider_name != "mock" else ("DELIVERED_SIMULATED" if success else "FAILED")

        delivery = NotificationDelivery(
            entry_id=entry.id,
            channel="SMS",
            recipient_phone=normalized_phone,
            event_type=event_type,
            provider=provider_name,
            status=delivery_status,
            provider_message_id=msg_id or None,
            message_text=message,
            error_message=err,
            created_at=utc_now(),
            delivered_at=utc_now() if success else None,
        )
        db.add(delivery)
        db.commit()
        db.refresh(delivery)
        return delivery

    @classmethod
    def notify_ticket_joined(cls, db: Session, entry: QueueEntry, service_name: str, est_wait_mins: int):
        # 1. FCM Web Push if token is present
        if entry.fcm_token:
            FcmService.dispatch_push_notification(
                db=db,
                entry=entry,
                event_type="PUSH_JOINED",
                title="QueueLess: Ticket Confirmed",
                body=f"You joined the queue for {service_name}. Token: {entry.token_number}. Est. wait: ~{est_wait_mins}m.",
                data={"ticket_id": entry.id, "token": entry.token_number, "status": entry.status},
            )

        # 2. SMS if enabled
        msg = f"QueueLess: You joined queue for {service_name}. Token: {entry.token_number}. Est wait: ~{est_wait_mins} mins."
        return cls.dispatch_sms_notification(db, entry, "TICKET_JOINED", msg)

    @classmethod
    def notify_ticket_approaching(cls, db: Session, entry: QueueEntry, service_name: str, position_ahead: int):
        # 1. FCM Web Push
        if entry.fcm_token:
            FcmService.dispatch_push_notification(
                db=db,
                entry=entry,
                event_type="PUSH_APPROACHING",
                title="QueueLess: Your turn is approaching!",
                body=f"Token {entry.token_number} ({service_name}) is next! Only {position_ahead} ahead. Please prepare to reach the desk.",
                data={"ticket_id": entry.id, "token": entry.token_number, "status": "APPROACHING"},
            )

        # 2. SMS if enabled
        msg = f"QueueLess Alert: Token {entry.token_number} ({service_name}) is next! Only {position_ahead} ahead. Please head toward the desk."
        return cls.dispatch_sms_notification(db, entry, "TICKET_APPROACHING", msg)

    @classmethod
    def notify_ticket_called(cls, db: Session, entry: QueueEntry, counter_name: str):
        # 1. FCM Web Push
        if entry.fcm_token:
            FcmService.dispatch_push_notification(
                db=db,
                entry=entry,
                event_type="PUSH_CALLED",
                title="QueueLess: Your turn is CALLED!",
                body=f"Token {entry.token_number}: Please proceed immediately to {counter_name}.",
                data={"ticket_id": entry.id, "token": entry.token_number, "counter": counter_name, "status": "CALLED"},
            )

        # 2. SMS if enabled
        msg = f"QueueLess: YOUR TURN IS CALLED! Token {entry.token_number}, please proceed immediately to {counter_name}."
        return cls.dispatch_sms_notification(db, entry, "TICKET_CALLED", msg)

    @classmethod
    def notify_queue_status_changed(cls, db: Session, entry: QueueEntry, change_description: str):
        """
        Pushes an FCM notification when queue status changes (e.g. paused counter, delays).
        """
        if entry.fcm_token:
            FcmService.dispatch_push_notification(
                db=db,
                entry=entry,
                event_type="PUSH_STATUS_CHANGED",
                title="QueueLess: Queue Status Update",
                body=f"Token {entry.token_number}: {change_description}",
                data={"ticket_id": entry.id, "token": entry.token_number, "status": entry.status},
            )

    @classmethod
    def notify_service_completed(cls, db: Session, entry: QueueEntry, service_name: str):
        # 1. FCM Web Push
        if entry.fcm_token:
            FcmService.dispatch_push_notification(
                db=db,
                entry=entry,
                event_type="PUSH_STATUS_CHANGED",
                title="QueueLess: Service Completed",
                body=f"Service completed for Token {entry.token_number} ({service_name}). Thank you for saving time with QueueLess!",
                data={"ticket_id": entry.id, "token": entry.token_number, "status": "COMPLETED"},
            )

        # 2. SMS if enabled
        msg = f"QueueLess: Service completed for Token {entry.token_number} ({service_name}). Thank you for saving time with QueueLess!"
        return cls.dispatch_sms_notification(db, entry, "SERVICE_COMPLETED", msg)

    @classmethod
    def send_test_push(cls, fcm_token: str, title: str, body: str) -> Dict:
        success, msg_id, err = FcmService.send_web_push(fcm_token, title, body)
        return {
            "success": success,
            "provider": "firebase_fcm",
            "channel": "PUSH",
            "message_id": msg_id,
            "is_simulated": FcmService.get_firebase_app() is None,
            "error": err,
        }

    @classmethod
    def send_test_sms(cls, phone: str, message: str) -> Dict:
        norm_phone = normalize_phone_number(phone)
        provider = get_sms_provider()
        provider_name = settings.SMS_PROVIDER.lower() if settings.SMS_PROVIDER else "mock"
        success, msg_id, err = provider.send_sms(norm_phone, message)
        return {
            "success": success,
            "provider": provider_name,
            "channel": "SMS",
            "recipient_phone": norm_phone,
            "message_id": msg_id,
            "is_simulated": provider_name == "mock",
            "error": err,
        }

