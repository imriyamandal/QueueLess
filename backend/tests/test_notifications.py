import pytest
from unittest.mock import patch
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.models.models import Queue, QueueEntry, NotificationDelivery
from app.services.notification_service import (
    NotificationService, is_valid_phone_number, normalize_phone_number
)
from app.services.fcm_service import FcmService
from app.database import init_db

def test_phone_validation_and_normalization():
    # Valid Indian formats
    assert is_valid_phone_number("9876543210") is True
    assert normalize_phone_number("9876543210") == "+919876543210"

    assert is_valid_phone_number("+919876543210") is True
    assert normalize_phone_number("+919876543210") == "+919876543210"

    assert is_valid_phone_number("919876543210") is True
    assert normalize_phone_number("919876543210") == "+919876543210"

    assert is_valid_phone_number("+1 (555) 234-5678") is True
    assert normalize_phone_number("+1 (555) 234-5678") == "+15552345678"

    # Invalid formats
    assert is_valid_phone_number("") is False
    assert normalize_phone_number("") is None

    assert is_valid_phone_number(None) is False
    assert normalize_phone_number(None) is None

    assert is_valid_phone_number("abc") is False
    assert normalize_phone_number("abc") is None

    assert is_valid_phone_number("123") is False
    assert normalize_phone_number("123") is None

def test_join_queue_with_push_only_no_phone(client):
    """
    Test joining queue with FCM token and NO phone number (the exact bug report).
    Must succeed with HTTP 200 and record PUSH notification delivery with recipient_phone=None.
    """
    res_queues = client.get("/api/v1/queues")
    assert res_queues.status_code == 200
    q_id = res_queues.json()[0]["id"]

    join_payload = {
        "visitor_name": "Web Push Only Visitor",
        "visitor_phone": None,
        "fcm_token": "fcm_token_web_only_xyz_123",
        "priority": 0,
        "travel_time_minutes": 5,
    }

    res_join = client.post(f"/api/v1/queues/{q_id}/join", json=join_payload)
    assert res_join.status_code == 200
    ticket_data = res_join.json()
    assert "ticket" in ticket_data
    ticket_id = ticket_data["ticket"]["id"]
    assert ticket_data["ticket"]["visitor_phone"] is None
    assert ticket_data["ticket"]["fcm_token"] == "fcm_token_web_only_xyz_123"

    # Verify notification deliveries
    res_notifs = client.get(f"/api/v1/tickets/{ticket_id}/notifications")
    assert res_notifs.status_code == 200
    notifs = res_notifs.json()
    assert len(notifs) >= 1
    push_notif = notifs[0]
    assert push_notif["channel"] == "PUSH"
    assert push_notif["recipient_token"] == "fcm_token_web_only_xyz_123"
    assert push_notif["recipient_phone"] is None
    assert push_notif["status"] in ["DELIVERED", "DELIVERED_SIMULATED"]

def test_join_queue_with_sms_only_no_push(client):
    """
    Test joining queue with phone number and NO FCM token.
    Must record SMS delivery with normalized phone and recipient_token=None.
    """
    res_queues = client.get("/api/v1/queues")
    assert res_queues.status_code == 200
    q_id = res_queues.json()[0]["id"]

    join_payload = {
        "visitor_name": "SMS Only Visitor",
        "visitor_phone": "9876543219",
        "priority": 0,
    }

    res_join = client.post(f"/api/v1/queues/{q_id}/join", json=join_payload)
    assert res_join.status_code == 200
    ticket_id = res_join.json()["ticket"]["id"]

    res_notifs = client.get(f"/api/v1/tickets/{ticket_id}/notifications")
    assert res_notifs.status_code == 200
    notifs = res_notifs.json()
    assert len(notifs) >= 1
    sms_notif = notifs[0]
    assert sms_notif["channel"] == "SMS"
    assert sms_notif["recipient_phone"] == "+919876543219"
    assert sms_notif["recipient_token"] is None

def test_join_queue_with_both_push_and_sms(client):
    """
    Test joining queue with both FCM token and phone number.
    Both PUSH and SMS deliveries must be recorded.
    """
    res_queues = client.get("/api/v1/queues")
    q_id = res_queues.json()[0]["id"]

    join_payload = {
        "visitor_name": "Dual Channel Visitor",
        "visitor_phone": "+919876543288",
        "fcm_token": "fcm_dual_channel_token_999",
        "priority": 0,
    }

    res_join = client.post(f"/api/v1/queues/{q_id}/join", json=join_payload)
    assert res_join.status_code == 200
    ticket_id = res_join.json()["ticket"]["id"]

    res_notifs = client.get(f"/api/v1/tickets/{ticket_id}/notifications")
    assert res_notifs.status_code == 200
    notifs = res_notifs.json()
    channels = [n["channel"] for n in notifs]
    assert "PUSH" in channels
    assert "SMS" in channels

def test_join_queue_with_invalid_phone_skips_sms_gracefully(client):
    """
    Test joining queue with invalid phone number string.
    Should safely skip SMS without 500 error.
    """
    res_queues = client.get("/api/v1/queues")
    q_id = res_queues.json()[0]["id"]

    join_payload = {
        "visitor_name": "Invalid Phone Visitor",
        "visitor_phone": "invalid_number_123",
        "fcm_token": "fcm_valid_fallback_token",
    }

    res_join = client.post(f"/api/v1/queues/{q_id}/join", json=join_payload)
    assert res_join.status_code == 200
    ticket_id = res_join.json()["ticket"]["id"]

    res_notifs = client.get(f"/api/v1/tickets/{ticket_id}/notifications")
    assert res_notifs.status_code == 200
    notifs = res_notifs.json()
    # PUSH was sent, SMS was safely skipped
    sms_deliveries = [n for n in notifs if n["channel"] == "SMS"]
    assert len(sms_deliveries) == 0

def test_notification_dispatch_failure_rolls_back_and_preserves_ticket(client):
    """
    Ensure that when notification creation fails with an exception,
    the transaction is rolled back and queue joining still succeeds with HTTP 200.
    """
    res_queues = client.get("/api/v1/queues")
    q_id = res_queues.json()[0]["id"]

    # Simulate an error inside NotificationService.notify_ticket_joined
    with patch("app.services.notification_service.NotificationService.notify_ticket_joined", side_effect=RuntimeError("Notification downstream failure")):
        join_payload = {
            "visitor_name": "Resilient Visitor",
            "visitor_phone": "+919876543200",
            "fcm_token": "fcm_token_fail_test",
        }
        res_join = client.post(f"/api/v1/queues/{q_id}/join", json=join_payload)
        assert res_join.status_code == 200
        ticket = res_join.json()["ticket"]
        assert ticket["token_number"].startswith("TRA-")
        assert ticket["status"] == "WAITING"

def test_sqlite_migration_on_legacy_table_with_not_null_recipient_phone(tmp_path):
    """
    Test that the migration in init_db() converts a legacy NOT NULL recipient_phone
    column to nullable in SQLite while preserving all existing rows.
    """
    db_file = tmp_path / "legacy_test.db"
    db_url = f"sqlite:///{db_file}"
    test_engine = create_engine(db_url, connect_args={"check_same_thread": False})

    # Create a legacy table with recipient_phone NOT NULL
    with test_engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE queue_entries (
                id VARCHAR(36) PRIMARY KEY,
                queue_id VARCHAR(36),
                token_number VARCHAR(20),
                status VARCHAR(50)
            );
        """))
        conn.execute(text("""
            CREATE TABLE notification_deliveries (
                id VARCHAR(36) PRIMARY KEY,
                entry_id VARCHAR(36) NOT NULL,
                recipient_phone VARCHAR(50) NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                provider VARCHAR(50),
                status VARCHAR(50),
                provider_message_id VARCHAR(100),
                message_text TEXT,
                error_message TEXT,
                created_at DATETIME,
                delivered_at DATETIME
            );
        """))
        conn.execute(text("""
            INSERT INTO queue_entries (id, status) VALUES ('entry-1', 'WAITING');
        """))
        conn.execute(text("""
            INSERT INTO notification_deliveries (
                id, entry_id, recipient_phone, event_type, provider, status
            ) VALUES (
                'legacy-row-1', 'entry-1', '+919999999999', 'TICKET_JOINED', 'msg91', 'DELIVERED'
            );
        """))
        conn.commit()

    # Verify column is NOT NULL before migration
    insp_before = inspect(test_engine)
    phone_col_before = next(c for c in insp_before.get_columns("notification_deliveries") if c["name"] == "recipient_phone")
    assert phone_col_before["nullable"] is False

    # Run migration logic using our engine
    with patch("app.database.engine", test_engine):
        init_db()

    # Verify column is now nullable
    insp_after = inspect(test_engine)
    phone_col_after = next(c for c in insp_after.get_columns("notification_deliveries") if c["name"] == "recipient_phone")
    assert phone_col_after["nullable"] is True

    # Verify row was preserved
    with test_engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM notification_deliveries")).scalar()
        assert count == 1
        row = conn.execute(text("SELECT id, recipient_phone, channel FROM notification_deliveries")).fetchone()
        assert row[0] == "legacy-row-1"
        assert row[1] == "+919999999999"
        assert row[2] == "PUSH"

        # Verify inserting a row with recipient_phone=NULL now succeeds without error
        conn.execute(text("""
            INSERT INTO notification_deliveries (
                id, entry_id, channel, recipient_phone, recipient_token, event_type
            ) VALUES (
                'new-push-row', 'entry-1', 'PUSH', NULL, 'test-fcm-token', 'PUSH_JOINED'
            );
        """))
        conn.commit()
        count_after = conn.execute(text("SELECT count(*) FROM notification_deliveries")).scalar()
        assert count_after == 2
