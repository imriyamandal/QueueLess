from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from sqlalchemy import inspect, text
    Base.metadata.create_all(bind=engine)

    # Safe deterministic migration for existing tables
    inspector = inspect(engine)
    if "queue_entries" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("queue_entries")]
        with engine.begin() as conn:
            if "actual_waiting_seconds" not in columns:
                conn.execute(text("ALTER TABLE queue_entries ADD COLUMN actual_waiting_seconds INTEGER"))
            if "actual_service_seconds" not in columns:
                conn.execute(text("ALTER TABLE queue_entries ADD COLUMN actual_service_seconds INTEGER"))
            if "fcm_token" not in columns:
                conn.execute(text("ALTER TABLE queue_entries ADD COLUMN fcm_token VARCHAR(512)"))
            if "fcm_token_updated_at" not in columns:
                conn.execute(text("ALTER TABLE queue_entries ADD COLUMN fcm_token_updated_at DATETIME"))

    if "notification_deliveries" in inspector.get_table_names():
        notif_columns = [c["name"] for c in inspector.get_columns("notification_deliveries")]
        with engine.begin() as conn:
            if "channel" not in notif_columns:
                conn.execute(text("ALTER TABLE notification_deliveries ADD COLUMN channel VARCHAR(50) DEFAULT 'PUSH'"))
            if "recipient_token" not in notif_columns:
                conn.execute(text("ALTER TABLE notification_deliveries ADD COLUMN recipient_token VARCHAR(512)"))
