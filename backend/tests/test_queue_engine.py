import pytest
from fastapi import HTTPException
from app.models.models import Queue, ServiceCounter, QueueEntry
from app.services.queue_engine import QueueEngine

def test_join_queue_and_fifo_priority_ordering(db_session):
    q = db_session.query(Queue).filter(Queue.status == "OPEN").first()
    assert q is not None

    # Normal visitor
    v1 = QueueEngine.join_queue(db_session, q.id, "Alice Normal", priority=0)
    assert v1.status == "WAITING"
    assert v1.token_number.startswith("TRA-")

    # Emergency priority visitor joined after Alice
    v2 = QueueEngine.join_queue(db_session, q.id, "Bob Emergency", priority=2)
    assert v2.status == "WAITING"

    # Counter 1 is for Transcripts
    c1 = db_session.query(ServiceCounter).filter(ServiceCounter.id == "cnt-001").first()
    assert c1 is not None
    c1.status = "AVAILABLE"
    c1.current_entry_id = None

    # Calling next should pick Bob because priority 2 is highest in queue
    called = QueueEngine.call_next(db_session, q.id, c1.id, staff_actor="tester")
    assert called.id == v2.id
    assert called.status == "CALLED"
    assert c1.status == "BUSY"
    assert c1.current_entry_id == v2.id

def test_legal_state_machine_transitions(db_session):
    q = db_session.query(Queue).filter(Queue.status == "OPEN").first()
    c2 = db_session.query(ServiceCounter).filter(ServiceCounter.id == "cnt-002").first()

    # Join -> CALLED -> IN_SERVICE -> COMPLETED
    entry = QueueEngine.join_queue(db_session, q.id, "Charlie", priority=2)
    called_entry = QueueEngine.call_next(db_session, q.id, c2.id, staff_actor="tester")
    assert called_entry.id == entry.id
    assert called_entry.status == "CALLED"

    in_service_entry = QueueEngine.start_service(db_session, entry.id, staff_actor="tester")
    assert in_service_entry.status == "IN_SERVICE"
    assert in_service_entry.service_start_at is not None

    comp_entry = QueueEngine.complete_service(db_session, entry.id, staff_actor="tester")
    assert comp_entry.status == "COMPLETED"
    assert comp_entry.completed_at is not None
    # Counter must be freed
    assert c2.status == "AVAILABLE"
    assert c2.current_entry_id is None

def test_illegal_state_transition_rejection(db_session):
    q = db_session.query(Queue).filter(Queue.status == "OPEN").first()
    entry = QueueEngine.join_queue(db_session, q.id, "Dan", priority=0)

    # Attempting to start service while WAITING must fail with 409
    with pytest.raises(HTTPException) as exc_info:
        QueueEngine.start_service(db_session, entry.id)
    assert exc_info.value.status_code == 409

    # Attempting to complete service while WAITING must fail with 409
    with pytest.raises(HTTPException) as exc_info2:
        QueueEngine.complete_service(db_session, entry.id)
    assert exc_info2.value.status_code == 409

def test_counter_pause_and_resume(db_session):
    c2 = db_session.query(ServiceCounter).filter(ServiceCounter.id == "cnt-002").first()
    assert c2.status == "AVAILABLE"

    # Pause
    paused = QueueEngine.toggle_counter_pause(db_session, c2.id, pause=True)
    assert paused.status == "PAUSED"

    # Cannot call next while paused
    q = db_session.query(Queue).filter(Queue.status == "OPEN").first()
    with pytest.raises(HTTPException) as exc_info:
        QueueEngine.call_next(db_session, q.id, c2.id)
    assert exc_info.value.status_code == 400

    # Resume
    resumed = QueueEngine.toggle_counter_pause(db_session, c2.id, pause=False)
    assert resumed.status == "AVAILABLE"
