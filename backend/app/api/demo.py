import random
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Queue, ServiceCounter, QueueEntry
from app.schemas.schemas import SimulationControlRequest
from app.services.demo_simulator import reset_scenario_to_seed, SAMPLE_NAMES
from app.services.queue_engine import QueueEngine
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/demo", tags=["Demo Simulator"])

@router.post("/simulate")
async def handle_simulation_action(
    req: SimulationControlRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    action = req.action.upper()
    q = db.query(Queue).filter(Queue.status == "OPEN").first()
    if not q:
        raise HTTPException(status_code=400, detail="No active open queue found.")

    if action == "RESET_SCENARIO":
        reset_scenario_to_seed(db, seed=req.seed or 42)
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "SCENARIO_RESET",
            {"message": "Scenario reset to default state."},
        )
        return {"success": True, "action": action, "message": "Demo scenario reset with standard seed."}

    elif action == "ADD_VISITOR":
        name = req.visitor_name or f"Simulated {random.choice(SAMPLE_NAMES)}"
        entry = QueueEngine.join_queue(
            db=db,
            queue_id=q.id,
            visitor_name=name,
            priority=random.choice([0, 0, 0, 1]),
            travel_time_minutes=random.randint(5, 12),
        )
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "TOKEN_JOINED",
            {"token": entry.token_number, "id": entry.id, "visitor": entry.visitor_name},
        )
        return {
            "success": True,
            "action": action,
            "message": f"Added simulated visitor {entry.token_number} ({entry.visitor_name})",
            "entry_id": entry.id,
            "token": entry.token_number,
        }

    elif action == "CALL_NEXT":
        counter = None
        if req.counter_id:
            counter = db.query(ServiceCounter).filter(ServiceCounter.id == req.counter_id).first()
        else:
            counter = db.query(ServiceCounter).filter(ServiceCounter.status == "AVAILABLE").first()

        if not counter:
            raise HTTPException(status_code=400, detail="No available counter to call visitor.")

        entry = QueueEngine.call_next(db=db, queue_id=q.id, counter_id=counter.id)
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "TOKEN_CALLED",
            {"token": entry.token_number, "id": entry.id, "counter": counter.name},
        )
        return {
            "success": True,
            "action": action,
            "message": f"Called {entry.token_number} to {counter.name}",
            "ticket_id": entry.id,
        }

    elif action == "COMPLETE_SERVICE":
        # Find any busy counter
        counter = None
        if req.counter_id:
            counter = db.query(ServiceCounter).filter(ServiceCounter.id == req.counter_id).first()
        else:
            counter = db.query(ServiceCounter).filter(ServiceCounter.status == "BUSY").first()

        if not counter or not counter.current_entry_id:
            raise HTTPException(status_code=400, detail="No busy counter currently in service.")

        entry = db.query(QueueEntry).filter(QueueEntry.id == counter.current_entry_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Active ticket not found.")

        if entry.status == "CALLED":
            # Start and then complete
            QueueEngine.start_service(db, entry.id)
        
        QueueEngine.complete_service(db, entry.id)
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "SERVICE_COMPLETED",
            {"token": entry.token_number, "id": entry.id},
        )
        return {
            "success": True,
            "action": action,
            "message": f"Completed service for {entry.token_number}",
        }

    elif action == "PAUSE_COUNTER":
        counter = None
        if req.counter_id:
            counter = db.query(ServiceCounter).filter(ServiceCounter.id == req.counter_id).first()
        else:
            counter = db.query(ServiceCounter).filter(ServiceCounter.status == "AVAILABLE").first()

        if not counter:
            raise HTTPException(status_code=400, detail="No available counter found to pause.")

        QueueEngine.toggle_counter_pause(db, counter.id, pause=True)
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "COUNTER_PAUSED",
            {"counter_id": counter.id, "name": counter.name},
        )
        return {
            "success": True,
            "action": action,
            "message": f"Paused {counter.name}. Queue capacity reduced; prediction engine updated.",
        }

    elif action == "RESUME_COUNTER":
        counter = None
        if req.counter_id:
            counter = db.query(ServiceCounter).filter(ServiceCounter.id == req.counter_id).first()
        else:
            counter = db.query(ServiceCounter).filter(ServiceCounter.status == "PAUSED").first()

        if not counter:
            raise HTTPException(status_code=400, detail="No paused counter found to resume.")

        QueueEngine.toggle_counter_pause(db, counter.id, pause=False)
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "COUNTER_RESUMED",
            {"counter_id": counter.id, "name": counter.name},
        )
        return {
            "success": True,
            "action": action,
            "message": f"Resumed {counter.name}. Full desk capacity restored; estimates recalculating.",
        }

    elif action == "INJECT_NO_SHOW":
        # Find any CALLED entry
        entry = db.query(QueueEntry).filter(QueueEntry.queue_id == q.id, QueueEntry.status == "CALLED").first()
        if not entry:
            raise HTTPException(status_code=400, detail="No CALLED visitor currently waiting to be marked as no-show.")

        QueueEngine.mark_no_show(db, entry.id)
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "TOKEN_NO_SHOW",
            {"token": entry.token_number, "id": entry.id},
        )
        return {
            "success": True,
            "action": action,
            "message": f"Marked {entry.token_number} as no-show. Counter released.",
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action '{action}'.")
