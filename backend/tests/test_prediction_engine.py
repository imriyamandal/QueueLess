import pytest
from app.models.models import Queue, ServiceCounter
from app.services.queue_engine import QueueEngine
from app.services.prediction_engine import AdaptiveWaitingIntelligenceEngine

def test_prediction_calculation_and_uncertainty_bounds(db_session):
    q = db_session.query(Queue).filter(Queue.status == "OPEN").first()
    assert q is not None

    entry = QueueEngine.join_queue(db_session, q.id, "Predictive Visitor", travel_time_minutes=8)
    pred = AdaptiveWaitingIntelligenceEngine.calculate_ticket_prediction(db_session, entry.id, record_snapshot=True)

    assert pred["estimated_wait_seconds"] >= 0
    assert pred["lower_bound_seconds"] <= pred["estimated_wait_seconds"]
    assert pred["upper_bound_seconds"] >= pred["estimated_wait_seconds"]
    assert pred["data_quality"] in ["HIGH", "MODERATE", "COLD_START"]
    assert pred["recommended_departure_time"] is not None

def test_counter_pause_impact_on_estimates(db_session):
    q = db_session.query(Queue).filter(Queue.status == "OPEN").first()
    entry = QueueEngine.join_queue(db_session, q.id, "Pause Impact Test")

    # Pause Counter 1 (which serves Transcripts)
    c1 = db_session.query(ServiceCounter).filter(ServiceCounter.id == "cnt-001").first()
    c1.status = "AVAILABLE"
    pred_before = AdaptiveWaitingIntelligenceEngine.calculate_ticket_prediction(db_session, entry.id, record_snapshot=False)

    QueueEngine.toggle_counter_pause(db_session, c1.id, pause=True)

    pred_after = AdaptiveWaitingIntelligenceEngine.calculate_ticket_prediction(db_session, entry.id, record_snapshot=False)

    # Upper bound should expand or explanation reflects pause
    assert pred_after["upper_bound_seconds"] >= pred_before["upper_bound_seconds"]
    assert "paused" in pred_after["explanation"].lower() or pred_after["active_counters_count"] <= pred_before["active_counters_count"]

def test_dynamic_eta_calculation_with_elapsed_time(db_session):
    q = db_session.query(Queue).filter(Queue.status == "OPEN").first()
    entry = QueueEngine.join_queue(db_session, q.id, "Elapsed Time Test Visitor")

    pred = AdaptiveWaitingIntelligenceEngine.calculate_ticket_prediction(db_session, entry.id, record_snapshot=False)
    assert pred["estimated_wait_seconds"] >= 0
    assert pred["estimated_turn_time"] is not None
    assert pred["facility_timezone"] == "Asia/Kolkata"
    assert pred["turn_time_lower"] <= pred["turn_time_upper"]
