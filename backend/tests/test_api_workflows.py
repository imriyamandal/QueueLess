import pytest

def test_health_check(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "QueueLess Backend API"

def test_facilities_and_services_endpoints(client):
    res = client.get("/api/v1/facilities")
    assert res.status_code == 200
    facilities = res.json()
    assert len(facilities) >= 1
    assert facilities[0]["name"] == "Apex Central University — Student Success Hub"

    res_services = client.get("/api/v1/services")
    assert res_services.status_code == 200
    services = res_services.json()
    assert len(services) >= 3

def test_visitor_join_and_ticket_flow(client):
    res_queues = client.get("/api/v1/queues")
    assert res_queues.status_code == 200
    queues = res_queues.json()
    assert len(queues) >= 1
    q_id = queues[0]["id"]

    # Visitor joins
    join_payload = {
        "visitor_name": "API Test Visitor",
        "visitor_phone": "+1-555-0199",
        "priority": 0,
        "travel_time_minutes": 7
    }
    res_join = client.post(f"/api/v1/queues/{q_id}/join", json=join_payload)
    assert res_join.status_code == 200
    ticket = res_join.json()
    assert "ticket" in ticket
    ticket_id = ticket["ticket"]["id"]
    token = ticket["ticket"]["token_number"]
    assert token.startswith("TRA-")
    assert ticket["estimated_wait_seconds"] >= 0

    # Retrieve ticket details
    res_ticket = client.get(f"/api/v1/tickets/{ticket_id}")
    assert res_ticket.status_code == 200
    assert res_ticket.json()["ticket"]["token_number"] == token

def test_simulation_scenario_controls(client):
    # Add visitor via simulation
    res_add = client.post("/api/v1/demo/simulate", json={"action": "ADD_VISITOR"})
    assert res_add.status_code == 200
    assert res_add.json()["success"] is True

    # Pause counter
    res_pause = client.post("/api/v1/demo/simulate", json={"action": "PAUSE_COUNTER", "counter_id": "cnt-002"})
    assert res_pause.status_code == 200
    assert res_pause.json()["success"] is True

    # Resume counter
    res_resume = client.post("/api/v1/demo/simulate", json={"action": "RESUME_COUNTER", "counter_id": "cnt-002"})
    assert res_resume.status_code == 200
    assert res_resume.json()["success"] is True

def test_analytics_and_csv_export(client):
    res_analytics = client.get("/api/v1/analytics")
    assert res_analytics.status_code == 200
    metrics = res_analytics.json()
    assert "total_served_today" in metrics
    assert "hourly_throughput" in metrics

    res_csv = client.get("/api/v1/analytics/export")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Token Number" in res_csv.text

def test_ticket_history_and_lookup(client):
    # Join two tickets with same phone
    res_q = client.get("/api/v1/queues")
    q_id = res_q.json()[0]["id"]

    phone = "+919876543210"
    res1 = client.post(f"/api/v1/queues/{q_id}/join", json={
        "visitor_name": "History Visitor 1",
        "visitor_phone": phone,
        "priority": 0
    })
    assert res1.status_code == 200
    t1_id = res1.json()["ticket"]["id"]

    res2 = client.post(f"/api/v1/queues/{q_id}/join", json={
        "visitor_name": "History Visitor 2",
        "visitor_phone": phone,
        "priority": 1
    })
    assert res2.status_code == 200
    t2_id = res2.json()["ticket"]["id"]

    # History by phone
    res_hist = client.get(f"/api/v1/tickets/history?phone={phone}")
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert isinstance(hist, list)
    assert len(hist) >= 2
    ids = [item["id"] for item in hist]
    assert t1_id in ids
    assert t2_id in ids

    # History by IDs
    res_hist_ids = client.get(f"/api/v1/tickets/history?ids={t1_id},{t2_id}")
    assert res_hist_ids.status_code == 200
    assert len(res_hist_ids.json()) == 2

    # History by status filter
    res_waiting = client.get("/api/v1/tickets/history?status=ACTIVE")
    assert res_waiting.status_code == 200
    for it in res_waiting.json():
        assert it["status"] in ["WAITING", "CALLED", "IN_SERVICE"]

def test_notification_delivery_and_test_sms(client):
    # Test SMS endpoint
    res_sms = client.post("/api/v1/notifications/test-sms", json={
        "phone": "+919876543210",
        "message": "QueueLess unit test SMS alert"
    })
    assert res_sms.status_code == 200
    data = res_sms.json()
    assert data["success"] is True
    assert data["provider"] in ["mock", "msg91"]
    assert "message_id" in data
    assert data["is_simulated"] is True

    # Join queue with phone number to test notification logging
    res_q = client.get("/api/v1/queues")
    q_id = res_q.json()[0]["id"]
    res_join = client.post(f"/api/v1/queues/{q_id}/join", json={
        "visitor_name": "SMS Notify User",
        "visitor_phone": "+919876543211",
        "priority": 0
    })
    assert res_join.status_code == 200
    t_id = res_join.json()["ticket"]["id"]

    # Check notification delivery records for this ticket
    res_notif = client.get(f"/api/v1/tickets/{t_id}/notifications")
    assert res_notif.status_code == 200
    deliveries = res_notif.json()
    assert len(deliveries) >= 1
    assert deliveries[0]["entry_id"] == t_id
    assert deliveries[0]["event_type"] == "TICKET_JOINED"
    assert deliveries[0]["recipient_phone"] == "+919876543211"

def test_fcm_token_registration_and_push_notification(client):
    res_q = client.get("/api/v1/queues")
    q_id = res_q.json()[0]["id"]

    # 1. Join queue with FCM device token
    fcm_token_initial = "fcm-dev-token-initial-12345"
    res_join = client.post(f"/api/v1/queues/{q_id}/join", json={
        "visitor_name": "Push Notification Tester",
        "visitor_phone": "+919876543299",
        "priority": 0,
        "fcm_token": fcm_token_initial
    })
    assert res_join.status_code == 200
    ticket_data = res_join.json()["ticket"]
    ticket_id = ticket_data["id"]
    assert ticket_data.get("fcm_token") == fcm_token_initial

    # 2. Verify PUSH notification delivery record logged with channel="PUSH"
    res_notifs = client.get(f"/api/v1/tickets/{ticket_id}/notifications")
    assert res_notifs.status_code == 200
    deliveries = res_notifs.json()
    push_deliveries = [d for d in deliveries if d.get("channel") == "PUSH"]
    assert len(push_deliveries) >= 1
    assert push_deliveries[0]["provider"] == "firebase_fcm"
    assert push_deliveries[0]["recipient_token"] == fcm_token_initial

    # 3. Update / refresh FCM token for existing ticket
    fcm_token_refreshed = "fcm-dev-token-refreshed-67890"
    res_update_token = client.post(f"/api/v1/tickets/{ticket_id}/fcm-token", json={
        "fcm_token": fcm_token_refreshed
    })
    assert res_update_token.status_code == 200
    assert res_update_token.json()["success"] is True

    # 4. Verify refreshed token is saved in ticket
    res_ticket = client.get(f"/api/v1/tickets/{ticket_id}")
    assert res_ticket.status_code == 200
    assert res_ticket.json()["ticket"]["fcm_token"] == fcm_token_refreshed

    # 5. Test standalone FCM test push endpoint
    res_test_push = client.post("/api/v1/notifications/test-fcm", json={
        "token": fcm_token_refreshed,
        "title": "QueueLess Test Alert",
        "body": "Your turn is approaching"
    })
    assert res_test_push.status_code == 200
    push_result = res_test_push.json()
    assert push_result["success"] is True
    assert push_result["provider"] == "firebase_fcm"
    assert push_result["channel"] == "PUSH"
    assert "message_id" in push_result

def test_full_ticket_lifecycle_with_durations(client):
    res_q = client.get("/api/v1/queues")
    q_id = res_q.json()[0]["id"]

    # 1. Join queue
    join_res = client.post(f"/api/v1/queues/{q_id}/join", json={
        "visitor_name": "Lifecycle Visitor",
        "visitor_phone": "+919999988888",
        "priority": 2
    })
    assert join_res.status_code == 200
    ticket = join_res.json()["ticket"]
    t_id = ticket["id"]
    assert ticket["status"] == "WAITING"

    # 2. Staff calls ticket
    call_res = client.post(f"/api/v1/staff/queues/{q_id}/call-next", json={
        "counter_id": "cnt-002"
    })
    assert call_res.status_code == 200
    assert call_res.json()["ticket_id"] == t_id

    # 3. Staff starts service
    start_res = client.post(f"/api/v1/staff/tickets/{t_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["success"] is True

    # 4. Staff completes service
    comp_res = client.post(f"/api/v1/staff/tickets/{t_id}/complete")
    assert comp_res.status_code == 200
    assert comp_res.json()["success"] is True

    # 5. Fetch ticket details and verify final state
    t_final = client.get(f"/api/v1/tickets/{t_id}").json()
    assert t_final["ticket"]["status"] == "COMPLETED"
    assert t_final["ticket"]["actual_waiting_seconds"] is not None
    assert t_final["ticket"]["actual_waiting_seconds"] >= 0
    assert t_final["ticket"]["actual_service_seconds"] is not None
    assert t_final["ticket"]["actual_service_seconds"] >= 0


