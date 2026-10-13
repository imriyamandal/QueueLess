from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime

# --- Auth & User ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "VISITOR"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    facility_id: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Facility, Dept, Service ---
class FacilityBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    timezone: str = "UTC"

class FacilityCreate(FacilityBase):
    pass

class FacilityResponse(FacilityBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DepartmentResponse(BaseModel):
    id: str
    facility_id: str
    name: str
    code: str

    class Config:
        from_attributes = True

class ServiceBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    baseline_duration_seconds: int = 420

class ServiceCreate(ServiceBase):
    facility_id: str
    department_id: Optional[str] = None

class ServiceResponse(ServiceBase):
    id: str
    facility_id: str
    department_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# --- Queue ---
class QueueResponse(BaseModel):
    id: str
    service_id: str
    name: str
    session_date: str
    status: str
    next_token_number: int
    is_active: bool
    service_name: Optional[str] = None
    facility_name: Optional[str] = None
    waiting_count: int = 0
    in_service_count: int = 0
    completed_count: int = 0

    class Config:
        from_attributes = True

class QueueStatusResponse(BaseModel):
    queue_id: str
    queue_name: str
    status: str
    waiting_count: int
    in_service_count: int
    active_counters_count: int
    estimated_wait_seconds: int
    lower_bound_seconds: int
    upper_bound_seconds: int

# --- QueueEntry & Ticket ---
class QueueJoinRequest(BaseModel):
    visitor_name: str = "Guest Visitor"
    visitor_phone: Optional[str] = None
    fcm_token: Optional[str] = None
    priority: int = 0  # 0 normal
    travel_time_minutes: int = 5
    idempotency_key: Optional[str] = None

class QueueEntryResponse(BaseModel):
    id: str
    queue_id: str
    token_number: str
    visitor_name: Optional[str] = None
    visitor_phone: Optional[str] = None
    fcm_token: Optional[str] = None
    status: str
    priority: int
    joined_at: datetime
    called_at: Optional[datetime] = None
    service_start_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    assigned_counter_id: Optional[str] = None
    assigned_counter_name: Optional[str] = None
    notes: Optional[str] = None
    travel_time_minutes: int
    actual_waiting_seconds: Optional[int] = None
    actual_service_seconds: Optional[int] = None

    class Config:
        from_attributes = True

class FcmTokenUpdateRequest(BaseModel):
    fcm_token: str

class TestPushRequest(BaseModel):
    fcm_token: Optional[str] = None
    token: Optional[str] = None
    title: str = "QueueLess Web Push Test"
    body: str = "Real-time browser push notifications are active."

class NotificationDeliveryResponse(BaseModel):
    id: str
    entry_id: str
    channel: str = "PUSH"
    recipient_phone: Optional[str] = None
    recipient_token: Optional[str] = None
    event_type: str
    provider: str
    status: str
    provider_message_id: Optional[str] = None
    message_text: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    delivered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TicketDetailResponse(BaseModel):
    ticket: QueueEntryResponse
    facility_id: str
    facility_name: str
    service_id: str
    service_name: str
    queue_name: str
    position_ahead: int
    estimated_wait_seconds: int
    lower_bound_seconds: int
    upper_bound_seconds: int
    estimated_turn_time: Optional[datetime] = None
    turn_time_lower: Optional[datetime] = None
    turn_time_upper: Optional[datetime] = None
    recommended_departure_time: Optional[datetime] = None
    active_counters_count: int
    data_quality: str  # "HIGH", "MODERATE", "COLD_START"
    explanation: str
    facility_timezone: str = "Asia/Kolkata"
    last_updated_at: datetime
    status_message: str
    notifications: List[NotificationDeliveryResponse] = []

class TicketHistoryItem(BaseModel):
    id: str
    token_number: str
    queue_id: str
    facility_name: str
    service_name: str
    status: str
    priority: int
    joined_at: datetime
    called_at: Optional[datetime] = None
    service_start_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    actual_waiting_seconds: Optional[int] = None
    actual_service_seconds: Optional[int] = None
    assigned_counter_name: Optional[str] = None
    notes: Optional[str] = None

class TestSmsRequest(BaseModel):
    phone: str
    message: str

# --- Counters ---
class CounterResponse(BaseModel):
    id: str
    facility_id: str
    name: str
    counter_number: int
    status: str  # AVAILABLE, BUSY, PAUSED, OFFLINE
    current_entry_id: Optional[str] = None
    current_token_number: Optional[str] = None
    current_visitor_name: Optional[str] = None
    service_elapsed_seconds: Optional[int] = None
    last_state_change: datetime
    supported_services: List[str] = []

    class Config:
        from_attributes = True

# --- Staff Actions ---
class CallNextRequest(BaseModel):
    counter_id: str

class StaffActionResponse(BaseModel):
    success: bool
    message: str
    entry: Optional[QueueEntryResponse] = None

# --- Analytics & Metrics ---
class AnalyticsOverview(BaseModel):
    total_served_today: int
    currently_waiting: int
    currently_in_service: int
    avg_waiting_time_seconds: int
    median_waiting_time_seconds: int
    avg_service_time_seconds: int
    no_show_rate_percent: float
    cancellation_rate_percent: float
    active_counters_count: int
    total_counters_count: int
    counter_utilization_percent: float
    prediction_mae_seconds: float
    prediction_coverage_percent: float
    hourly_throughput: List[dict] = []
    service_breakdown: List[dict] = []

# --- Simulation / Demo ---
class SimulationControlRequest(BaseModel):
    action: str  # "ADD_VISITOR", "CALL_NEXT", "COMPLETE_SERVICE", "PAUSE_COUNTER", "RESUME_COUNTER", "INJECT_NO_SHOW", "RESET_SCENARIO"
    counter_id: Optional[str] = None
    service_id: Optional[str] = None
    visitor_name: Optional[str] = None
    seed: Optional[int] = 42

class AuditLogResponse(BaseModel):
    id: str
    actor_email: Optional[str] = None
    action: str
    target_resource: Optional[str] = None
    timestamp: datetime
    details_json: Optional[str] = None

    class Config:
        from_attributes = True
