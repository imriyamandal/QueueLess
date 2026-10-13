from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "QueueLess"
    VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "queueless-secure-jwt-hmac-sha256-secret-key-production-ready"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    DATABASE_URL: str = "sqlite:///./queueless.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    DEMO_MODE: bool = True
    DEFAULT_SAFETY_BUFFER_MINUTES: int = 5
    DEFAULT_TRAVEL_BUFFER_MINUTES: int = 5
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"

    # Firebase Cloud Messaging (Web Push Notifications)
    FCM_ENABLED: bool = True
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = None
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None

    # Optional Real SMS Provider (MSG91)
    SMS_PROVIDER: str = "mock"  # "mock", "msg91"
    SMS_ENABLED: bool = True
    MSG91_AUTH_KEY: Optional[str] = None
    MSG91_TEMPLATE_ID: Optional[str] = None
    MSG91_SENDER_ID: Optional[str] = "QLESS"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
