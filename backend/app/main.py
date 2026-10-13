from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, SessionLocal
from app.services.demo_simulator import seed_demo_data
from app.websocket.manager import ws_manager

from app.api.auth import router as auth_router
from app.api.facilities import router as facilities_router
from app.api.queues import router as queues_router
from app.api.tickets import router as tickets_router
from app.api.staff import router as staff_router
from app.api.admin import router as admin_router
from app.api.analytics import router as analytics_router
from app.api.demo import router as demo_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize schema and seed demo data if in demo mode
    init_db()
    db = SessionLocal()
    try:
        if settings.DEMO_MODE:
            seed_demo_data(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="QueueLess — Your Time Matters",
    description="Adaptive Waiting Intelligence & Digital Queue Management Platform",
    version=settings.VERSION,
    lifespan=lifespan,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEMO_MODE else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "QueueLess Backend API",
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "demo_mode": settings.DEMO_MODE,
    }

# WebSocket Endpoints
@app.websocket("/ws/queues/{queue_id}")
async def websocket_queue_endpoint(websocket: WebSocket, queue_id: str):
    await ws_manager.connect_queue(queue_id, websocket)
    try:
        while True:
            # Keep connection alive, listen for ping/client messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_queue(queue_id, websocket)

@app.websocket("/ws/tickets/{ticket_id}")
async def websocket_ticket_endpoint(websocket: WebSocket, ticket_id: str):
    await ws_manager.connect_ticket(ticket_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_ticket(ticket_id, websocket)

# Mount API Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(facilities_router, prefix="/api/v1")
app.include_router(queues_router, prefix="/api/v1")
app.include_router(tickets_router, prefix="/api/v1")
app.include_router(staff_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(demo_router, prefix="/api/v1")
