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
        cols_dict = {c["name"]: c for c in inspector.get_columns("notification_deliveries")}

        # Ensure channel and recipient_token columns exist
        with engine.begin() as conn:
            if "channel" not in notif_columns:
                conn.execute(text("ALTER TABLE notification_deliveries ADD COLUMN channel VARCHAR(50) DEFAULT 'PUSH'"))
            if "recipient_token" not in notif_columns:
                conn.execute(text("ALTER TABLE notification_deliveries ADD COLUMN recipient_token VARCHAR(512)"))

        # Re-inspect to verify column nullability
        inspector = inspect(engine)
        cols_dict = {c["name"]: c for c in inspector.get_columns("notification_deliveries")}
        phone_col = cols_dict.get("recipient_phone")
        is_phone_not_null = phone_col is not None and not phone_col.get("nullable", True)

        if is_phone_not_null:
            if engine.dialect.name == "sqlite":
                # Safe SQLite 12-step table recreation preserving all rows and indexes
                with engine.connect() as conn:
                    try:
                        conn.execute(text("PRAGMA foreign_keys = OFF"))
                        conn.commit()
                        conn.execute(text("DROP TABLE IF EXISTS _new_notification_deliveries"))
                        conn.execute(text("""
                            CREATE TABLE _new_notification_deliveries (
                                id VARCHAR(36) NOT NULL,
                                entry_id VARCHAR(36) NOT NULL,
                                channel VARCHAR(50) DEFAULT 'PUSH',
                                recipient_phone VARCHAR(50),
                                recipient_token VARCHAR(512),
                                event_type VARCHAR(50) NOT NULL,
                                provider VARCHAR(50) DEFAULT 'firebase_fcm',
                                status VARCHAR(50) DEFAULT 'PENDING',
                                provider_message_id VARCHAR(100),
                                message_text TEXT,
                                error_message TEXT,
                                created_at DATETIME,
                                delivered_at DATETIME,
                                PRIMARY KEY (id),
                                FOREIGN KEY(entry_id) REFERENCES queue_entries (id) ON DELETE CASCADE
                            )
                        """))
                        conn.execute(text("""
                            INSERT INTO _new_notification_deliveries (
                                id, entry_id, channel, recipient_phone, recipient_token,
                                event_type, provider, status, provider_message_id,
                                message_text, error_message, created_at, delivered_at
                            )
                            SELECT 
                                id, entry_id, 
                                COALESCE(channel, 'PUSH'), 
                                recipient_phone, 
                                recipient_token, 
                                event_type, provider, status, provider_message_id, 
                                message_text, error_message, created_at, delivered_at
                            FROM notification_deliveries
                        """))
                        conn.execute(text("DROP TABLE notification_deliveries"))
                        conn.execute(text("ALTER TABLE _new_notification_deliveries RENAME TO notification_deliveries"))
                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notification_deliveries_entry_id ON notification_deliveries (entry_id)"))
                        conn.commit()
                    finally:
                        conn.execute(text("PRAGMA foreign_keys = ON"))
                        conn.commit()
            else:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE notification_deliveries ALTER COLUMN recipient_phone DROP NOT NULL"))
