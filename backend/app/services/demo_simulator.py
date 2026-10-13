import random
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    Facility, Department, Service, Queue, ServiceCounter, CounterService, QueueEntry, QueueEvent, User, utc_now
)
from app.services.queue_engine import QueueEngine
from app.services.prediction_engine import AdaptiveWaitingIntelligenceEngine

SAMPLE_NAMES = [
    "Alex Rivera", "Jordan Lee", "Taylor Chen", "Samira Patel",
    "Marcus Vance", "Elena Rostova", "Devon Brooks", "Priya Sharma",
    "Aiden Gallagher", "Chloe Dubois", "Zackariah Al-Mansoor", "Maria Santos"
]

def seed_demo_data(db: Session, seed: int = 42):
    random.seed(seed)
    # Check if facility already exists
    fac = db.query(Facility).filter(Facility.id == "fac-apex-001").first()
    if fac:
        return fac

    # 1. Create Default Facility: Apex Central University Student Services
    fac = Facility(
        id="fac-apex-001",
        name="Apex Central University — Student Success Hub",
        description="Comprehensive campus administrative center handling registrar, financial aid, and academic advising.",
        address="Student Center North, 2nd Floor, Hall of Honors",
        timezone="Asia/Kolkata",
        is_active=True,
    )
    db.add(fac)

    # 2. Departments
    dept_reg = Department(
        id="dept-reg-001",
        facility_id=fac.id,
        name="Office of the Registrar",
        code="REG",
    )
    dept_fin = Department(
        id="dept-fin-001",
        facility_id=fac.id,
        name="Student Financial Services",
        code="FIN",
    )
    dept_adv = Department(
        id="dept-adv-001",
        facility_id=fac.id,
        name="Academic Advising Center",
        code="ADV",
    )
    db.add_all([dept_reg, dept_fin, dept_adv])

    # 3. Services
    srv_transcripts = Service(
        id="srv-transcripts-001",
        facility_id=fac.id,
        department_id=dept_reg.id,
        name="Official Transcript & Degree Audit",
        code="TRA",
        description="Official paper and digital transcripts, graduation clearance, and diploma notarization.",
        baseline_duration_seconds=360,  # 6 min
        is_active=True,
    )
    srv_finaid = Service(
        id="srv-finaid-001",
        facility_id=fac.id,
        department_id=dept_fin.id,
        name="Financial Aid & Scholarships Consultation",
        code="AID",
        description="FAFSA verification, emergency grants, loan disbursements, and scholarship appeals.",
        baseline_duration_seconds=600,  # 10 min
        is_active=True,
    )
    srv_advising = Service(
        id="srv-advising-001",
        facility_id=fac.id,
        department_id=dept_adv.id,
        name="Course Registration & Add/Drop Petition",
        code="REG",
        description="Prerequisite overrides, late add/drop approvals, and degree planning.",
        baseline_duration_seconds=480,  # 8 min
        is_active=True,
    )
    db.add_all([srv_transcripts, srv_finaid, srv_advising])

    # 4. Queues for today
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    q_transcripts = Queue(
        id="q-transcripts-001",
        service_id=srv_transcripts.id,
        name="Transcripts & Verification Desk Queue",
        session_date=today_str,
        status="OPEN",
        next_token_number=1,
    )
    q_finaid = Queue(
        id="q-finaid-001",
        service_id=srv_finaid.id,
        name="Financial Aid Express Queue",
        session_date=today_str,
        status="OPEN",
        next_token_number=1,
    )
    q_advising = Queue(
        id="q-advising-001",
        service_id=srv_advising.id,
        name="Advising & Course Override Queue",
        session_date=today_str,
        status="OPEN",
        next_token_number=1,
    )
    db.add_all([q_transcripts, q_finaid, q_advising])

    # 5. Service Counters (3 counters)
    c1 = ServiceCounter(
        id="cnt-001",
        facility_id=fac.id,
        name="Counter 1 — Express Verification",
        counter_number=1,
        status="AVAILABLE",
    )
    c2 = ServiceCounter(
        id="cnt-002",
        facility_id=fac.id,
        name="Counter 2 — Comprehensive Advising",
        counter_number=2,
        status="AVAILABLE",
    )
    c3 = ServiceCounter(
        id="cnt-003",
        facility_id=fac.id,
        name="Counter 3 — Financial Counseling",
        counter_number=3,
        status="AVAILABLE",
    )
    db.add_all([c1, c2, c3])
    db.commit()

    # Counter to Service mappings
    cs_mappings = [
        CounterService(counter_id=c1.id, service_id=srv_transcripts.id),
        CounterService(counter_id=c1.id, service_id=srv_advising.id),
        CounterService(counter_id=c2.id, service_id=srv_advising.id),
        CounterService(counter_id=c2.id, service_id=srv_finaid.id),
        CounterService(counter_id=c3.id, service_id=srv_finaid.id),
    ]
    db.add_all(cs_mappings)

    # 6. Default Demo Users
    # Passwords hashed or demo dummy
    demo_staff = User(
        id="usr-staff-001",
        email="staff@queueless.edu",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # "staff123"
        full_name="Sarah Jenkins (Senior Registrar Staff)",
        role="STAFF",
        facility_id=fac.id,
        is_active=True,
    )
    demo_admin = User(
        id="usr-admin-001",
        email="admin@queueless.edu",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # "admin123"
        full_name="Dean Arthur Vance (Platform Admin)",
        role="ADMIN",
        facility_id=fac.id,
        is_active=True,
    )
    db.add_all([demo_staff, demo_admin])
    db.commit()

    # 7. Seed Initial Scenario Tickets in q_transcripts
    # Add a few completed tickets to give the prediction engine historical samples
    for i in range(8):
        dur = random.randint(280, 440)
        start_time = utc_now() - timedelta(minutes=45 - i * 5)
        comp_time = start_time + timedelta(seconds=dur)
        hist_entry = QueueEntry(
            queue_id=q_transcripts.id,
            token_number=f"TRA-{q_transcripts.next_token_number:03d}",
            visitor_name=SAMPLE_NAMES[i % len(SAMPLE_NAMES)],
            status="COMPLETED",
            priority=0,
            joined_at=start_time - timedelta(minutes=10),
            called_at=start_time - timedelta(seconds=20),
            service_start_at=start_time,
            completed_at=comp_time,
            actual_waiting_seconds=600,
            actual_service_seconds=dur,
            visitor_phone=f"+9198765432{i:02d}",
            assigned_counter_id=c1.id,
        )
        q_transcripts.next_token_number += 1
        db.add(hist_entry)

    # Add 1 active entry currently in service at Counter 1
    busy_entry = QueueEntry(
        queue_id=q_transcripts.id,
        token_number=f"TRA-{q_transcripts.next_token_number:03d}",
        visitor_name="Maya Lin",
        status="IN_SERVICE",
        priority=0,
        joined_at=utc_now() - timedelta(minutes=15),
        called_at=utc_now() - timedelta(minutes=4),
        service_start_at=utc_now() - timedelta(minutes=3),
        assigned_counter_id=c1.id,
    )
    q_transcripts.next_token_number += 1
    c1.status = "BUSY"
    c1.current_entry_id = busy_entry.id
    db.add(busy_entry)

    # Add 4 waiting visitors
    waiting_names = ["Jordan Lee", "Taylor Chen", "Samira Patel", "Marcus Vance"]
    for idx, name in enumerate(waiting_names):
        QueueEngine.join_queue(
            db=db,
            queue_id=q_transcripts.id,
            visitor_name=name,
            priority=1 if idx == 2 else 0, # One priority visitor for realistic demo
            travel_time_minutes=5 + idx * 2,
        )

    db.commit()
    return fac

def reset_scenario_to_seed(db: Session, seed: int = 42):
    """
    Clears today's queue entries and restores the standard reproducible hackathon scenario.
    """
    # Delete prediction snapshots and queue events for clean state
    db.query(PredictionSnapshot).delete()
    db.query(QueueEvent).delete()
    db.query(QueueEntry).delete()

    # Reset counters
    counters = db.query(ServiceCounter).all()
    for c in counters:
        c.status = "AVAILABLE"
        c.current_entry_id = None
        c.last_state_change = utc_now()

    # Reset queues
    queues = db.query(Queue).all()
    for q in queues:
        q.next_token_number = 1
        q.status = "OPEN"

    db.commit()

    # Seed fresh records
    return seed_demo_data(db, seed=seed)
