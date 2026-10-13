import logging
import uuid
import os
import json
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import NotificationDelivery, QueueEntry, utc_now

logger = logging.getLogger("queueless.fcm")

class FcmService:
    _app = None
    _initialized = False

    @classmethod
    def get_firebase_app(cls):
        """
        Lazily initializes Firebase Admin SDK with service account credentials if available.
        Falls back to simulated FCM mode when credentials are not configured.
        """
        if cls._initialized:
            return cls._app
        cls._initialized = True
        try:
            import firebase_admin
            from firebase_admin import credentials

            # Return existing app if already initialized
            if firebase_admin._apps:
                cls._app = firebase_admin.get_app()
                return cls._app

            cred = None
            if settings.FIREBASE_CREDENTIALS_JSON:
                try:
                    cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
                    cred = credentials.Certificate(cred_dict)
                except Exception as e:
                    logger.warning(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")

            if not cred and settings.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)

            if cred:
                cls._app = firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK successfully initialized for Web Push.")
            else:
                logger.info("Firebase Admin credentials not provided. Operating in simulated FCM Web Push mode.")
                cls._app = None
        except Exception as e:
            logger.warning(f"Firebase Admin SDK initialization skipped/failed: {e}")
            cls._app = None
        return cls._app

    @classmethod
    def send_web_push(
        cls,
        fcm_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Sends an FCM Web Push notification to the specified device token.
        Returns: (success, message_id, error_message)
        """
        if not fcm_token or len(fcm_token.strip()) < 10:
            return False, "", "Invalid or empty FCM device token"

        app = cls.get_firebase_app()
        if app:
            try:
                from firebase_admin import messaging
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body,
                    ),
                    data=data or {},
                    token=fcm_token,
                    webpush=messaging.WebpushConfig(
                        notification=messaging.WebpushNotification(
                            title=title,
                            body=body,
                            icon="/icon-192.png",
                            badge="/icon-192.png",
                        )
                    ),
                )
                response = messaging.send(message, app=app)
                logger.info(f"[FCM LIVE PUSH SENT] Token: {fcm_token[:15]}... | MsgID: {response}")
                return True, response, None
            except Exception as e:
                err_str = str(e)
                logger.error(f"[FCM SEND ERROR] {err_str}")
                return False, "", err_str
        else:
            # Simulated FCM Web Push
            sim_id = f"fcm-sim-{uuid.uuid4().hex[:12]}"
            logger.info(f"[FCM SIMULATED PUSH] Title: '{title}' | Body: '{body}' | Token: {fcm_token[:15]}... | ID: {sim_id}")
            return True, sim_id, None

    @classmethod
    def dispatch_push_notification(
        cls,
        db: Session,
        entry: QueueEntry,
        event_type: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
    ) -> Optional[NotificationDelivery]:
        """
        Dispatches web push and records delivery with channel='PUSH'.
        Never labels web push as SMS.
        """
        if not entry.fcm_token:
            return None

        # Check idempotency for critical events (e.g. approaching, called)
        try:
            existing = (
                db.query(NotificationDelivery)
                .filter(
                    NotificationDelivery.entry_id == entry.id,
                    NotificationDelivery.event_type == event_type,
                    NotificationDelivery.channel == "PUSH",
                )
                .first()
            )
            if existing:
                return existing
        except Exception as e:
            logger.warning(f"Error checking existing PUSH delivery for entry {entry.id}: {e}")
            db.rollback()

        app = cls.get_firebase_app()
        is_live = app is not None
        success, msg_id, err = cls.send_web_push(entry.fcm_token, title, body, data)

        delivery_status = "DELIVERED" if success and is_live else ("DELIVERED_SIMULATED" if success else "FAILED")

        phone_val = entry.visitor_phone.strip() if entry.visitor_phone and entry.visitor_phone.strip() else None

        delivery = NotificationDelivery(
            entry_id=entry.id,
            channel="PUSH",
            recipient_token=entry.fcm_token,
            recipient_phone=phone_val,
            event_type=event_type,
            provider="firebase_fcm",
            status=delivery_status,
            provider_message_id=msg_id or None,
            message_text=f"{title}: {body}",
            error_message=err,
            created_at=utc_now(),
            delivered_at=utc_now() if success else None,
        )
        try:
            db.add(delivery)
            db.commit()
            db.refresh(delivery)
            return delivery
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to record PUSH delivery for ticket {entry.token_number}: {e}")
            return None
