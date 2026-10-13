import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="VISITOR")  # VISITOR, STAFF, ADMIN
    facility_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String(255), nullable=True)
    timezone = Column(String(50), default="Asia/Kolkata")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    departments = relationship("Department", back_populates="facility", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="facility", cascade="all, delete-orphan")
    counters = relationship("ServiceCounter", back_populates="facility", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    facility_id = Column(String(36), ForeignKey("facilities.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    facility = relationship("Facility", back_populates="departments")
    services = relationship("Service", back_populates="department")

class Service(Base):
    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    facility_id = Column(String(36), ForeignKey("facilities.id"), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    baseline_duration_seconds = Column(Integer, default=420)  # 7 minutes default
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    facility = relationship("Facility", back_populates="services")
    department = relationship("Department", back_populates="services")
    queues = relationship("Queue", back_populates="service")

class Queue(Base):
    __tablename__ = "queues"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    service_id = Column(String(36), ForeignKey("services.id"), nullable=False)
    name = Column(String(255), nullable=False)
    session_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    status = Column(String(50), default="OPEN")  # OPEN, PAUSED, CLOSED
    next_token_number = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    service = relationship("Service", back_populates="queues")
    entries = relationship("QueueEntry", back_populates="queue", order_by="QueueEntry.joined_at")

class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    queue_id = Column(String(36), ForeignKey("queues.id"), nullable=False, index=True)
    token_number = Column(String(50), nullable=False, index=True)
    visitor_id = Column(String(36), nullable=True)
    visitor_name = Column(String(255), nullable=True)
    visitor_phone = Column(String(50), nullable=True)
    status = Column(String(50), default="WAITING", index=True)  # WAITING, CALLED, IN_SERVICE, COMPLETED, CANCELLED, NO_SHOW
    priority = Column(Integer, default=0)  # 0: normal, 1: priority, 2: emergency
    
    joined_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    called_at = Column(DateTime(timezone=True), nullable=True)
    check_in_at = Column(DateTime(timezone=True), nullable=True)
    service_start_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    assigned_counter_id = Column(String(36), ForeignKey("service_counters.id"), nullable=True)
    notes = Column(Text, nullable=True)
    travel_time_minutes = Column(Integer, default=5)
    actual_waiting_seconds = Column(Integer, nullable=True)
    actual_service_seconds = Column(Integer, nullable=True)
    fcm_token = Column(String(512), nullable=True)
    fcm_token_updated_at = Column(DateTime(timezone=True), nullable=True)

    queue = relationship("Queue", back_populates="entries")
    assigned_counter = relationship("ServiceCounter", foreign_keys=[assigned_counter_id])
    snapshots = relationship("PredictionSnapshot", back_populates="entry", cascade="all, delete-orphan")
    notifications = relationship("NotificationDelivery", back_populates="entry", cascade="all, delete-orphan")

class ServiceCounter(Base):
    __tablename__ = "service_counters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    facility_id = Column(String(36), ForeignKey("facilities.id"), nullable=False)
    name = Column(String(255), nullable=False)
    counter_number = Column(Integer, nullable=False)
    status = Column(String(50), default="AVAILABLE")  # AVAILABLE, BUSY, PAUSED, OFFLINE
    current_entry_id = Column(String(36), nullable=True)
    last_state_change = Column(DateTime(timezone=True), default=utc_now)
    staff_user_id = Column(String(36), nullable=True)

    facility = relationship("Facility", back_populates="counters")
    services = relationship("CounterService", back_populates="counter", cascade="all, delete-orphan")

class CounterService(Base):
    __tablename__ = "counter_services"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    counter_id = Column(String(36), ForeignKey("service_counters.id"), nullable=False)
    service_id = Column(String(36), ForeignKey("services.id"), nullable=False)

    counter = relationship("ServiceCounter", back_populates="services")
    service = relationship("Service")

class QueueEvent(Base):
    __tablename__ = "queue_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    queue_id = Column(String(36), ForeignKey("queues.id"), nullable=False, index=True)
    entry_id = Column(String(36), nullable=True, index=True)
    counter_id = Column(String(36), nullable=True)
    event_type = Column(String(50), nullable=False)  # TOKEN_JOINED, TOKEN_CALLED, SERVICE_STARTED, etc.
    actor_id = Column(String(36), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)
    metadata_json = Column(Text, nullable=True)

class PredictionSnapshot(Base):
    __tablename__ = "prediction_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    entry_id = Column(String(36), ForeignKey("queue_entries.id"), nullable=False, index=True)
    prediction_timestamp = Column(DateTime(timezone=True), default=utc_now)
    estimated_wait_seconds = Column(Integer, nullable=False)
    lower_bound_seconds = Column(Integer, nullable=False)
    upper_bound_seconds = Column(Integer, nullable=False)
    queue_position = Column(Integer, nullable=False)
    active_counters_count = Column(Integer, nullable=False)
    model_version = Column(String(50), default="awie-v1.0")
    reason = Column(String(255), nullable=True)

    entry = relationship("QueueEntry", back_populates="snapshots")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    target_resource = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now)
    details_json = Column(Text, nullable=True)

class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    entry_id = Column(String(36), ForeignKey("queue_entries.id"), nullable=False, index=True)
    channel = Column(String(50), default="PUSH")     # PUSH (Web Push FCM), SMS
    recipient_phone = Column(String(50), nullable=True)
    recipient_token = Column(String(512), nullable=True)
    event_type = Column(String(50), nullable=False)  # TICKET_JOINED, TICKET_APPROACHING, TICKET_CALLED, QUEUE_STATUS_CHANGED, SERVICE_COMPLETED
    provider = Column(String(50), default="firebase_fcm")   # firebase_fcm, msg91, mock
    status = Column(String(50), default="PENDING")   # PENDING, SENT_TO_PROVIDER, DELIVERED, DELIVERED_SIMULATED, FAILED, SKIPPED
    provider_message_id = Column(String(100), nullable=True)
    message_text = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    entry = relationship("QueueEntry", back_populates="notifications")
