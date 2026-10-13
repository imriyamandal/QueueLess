import json
from typing import Dict, Set
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # queue_id -> set of active WebSockets
        self.active_queues: Dict[str, Set[WebSocket]] = {}
        # ticket_id -> set of active WebSockets
        self.active_tickets: Dict[str, Set[WebSocket]] = {}

    async def connect_queue(self, queue_id: str, websocket: WebSocket):
        await websocket.accept()
        if queue_id not in self.active_queues:
            self.active_queues[queue_id] = set()
        self.active_queues[queue_id].add(websocket)

    def disconnect_queue(self, queue_id: str, websocket: WebSocket):
        if queue_id in self.active_queues:
            self.active_queues[queue_id].discard(websocket)
            if not self.active_queues[queue_id]:
                del self.active_queues[queue_id]

    async def connect_ticket(self, ticket_id: str, websocket: WebSocket):
        await websocket.accept()
        if ticket_id not in self.active_tickets:
            self.active_tickets[ticket_id] = set()
        self.active_tickets[ticket_id].add(websocket)

    def disconnect_ticket(self, ticket_id: str, websocket: WebSocket):
        if ticket_id in self.active_tickets:
            self.active_tickets[ticket_id].discard(websocket)
            if not self.active_tickets[ticket_id]:
                del self.active_tickets[ticket_id]

    async def broadcast_queue_event(self, queue_id: str, event_type: str, payload: dict):
        message = json.dumps({
            "event": event_type,
            "queue_id": queue_id,
            "data": payload
        })
        if queue_id in self.active_queues:
            dead_connections = set()
            for ws in self.active_queues[queue_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead_connections.add(ws)
            for ws in dead_connections:
                self.active_queues[queue_id].discard(ws)

    async def broadcast_ticket_update(self, ticket_id: str, payload: dict):
        message = json.dumps({
            "event": "TICKET_UPDATED",
            "ticket_id": ticket_id,
            "data": payload
        })
        if ticket_id in self.active_tickets:
            dead_connections = set()
            for ws in self.active_tickets[ticket_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead_connections.add(ws)
            for ws in dead_connections:
                self.active_tickets[ticket_id].discard(ws)

ws_manager = ConnectionManager()
