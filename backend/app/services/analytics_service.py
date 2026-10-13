import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import QueueEntry, ServiceCounter, Service, Queue, ensure_utc
from app.services.prediction_engine import AdaptiveWaitingIntelligenceEngine

class AnalyticsService:
    @classmethod
    def get_operational_metrics(cls, db: Session, facility_id: Optional[str] = None) -> Dict:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Base query for entries today
        query = db.query(QueueEntry).filter(QueueEntry.joined_at >= today_start)

        entries = query.all()

        total_served = 0
        currently_waiting = 0
        currently_in_service = 0
        no_show_count = 0
        cancelled_count = 0

        waiting_durations = []
        service_durations = []
        hourly_counts: Dict[int, int] = {h: 0 for h in range(8, 19)}

        for e in entries:
            if e.status == "COMPLETED":
                total_served += 1
                if e.actual_waiting_seconds is not None and e.actual_waiting_seconds >= 0:
                    waiting_durations.append(e.actual_waiting_seconds)
                elif e.joined_at and e.service_start_at:
                    j_utc = ensure_utc(e.joined_at)
                    s_utc = ensure_utc(e.service_start_at)
                    if j_utc and s_utc:
                        w_sec = (s_utc - j_utc).total_seconds()
                        if w_sec >= 0:
                            waiting_durations.append(w_sec)

                if e.actual_service_seconds is not None and e.actual_service_seconds >= 0:
                    service_durations.append(e.actual_service_seconds)
                elif e.service_start_at and e.completed_at:
                    s_utc = ensure_utc(e.service_start_at)
                    c_utc = ensure_utc(e.completed_at)
                    if s_utc and c_utc:
                        s_sec = (c_utc - s_utc).total_seconds()
                        if s_sec >= 0:
                            service_durations.append(s_sec)
                if e.completed_at:
                    h = e.completed_at.hour
                    if h in hourly_counts:
                        hourly_counts[h] += 1
            elif e.status == "WAITING":
                currently_waiting += 1
            elif e.status == "IN_SERVICE":
                currently_in_service += 1
            elif e.status == "NO_SHOW":
                no_show_count += 1
            elif e.status == "CANCELLED":
                cancelled_count += 1

        total_concluded = total_served + no_show_count + cancelled_count
        no_show_rate = (no_show_count / total_concluded * 100.0) if total_concluded > 0 else 0.0
        cancellation_rate = (cancelled_count / total_concluded * 100.0) if total_concluded > 0 else 0.0

        avg_waiting = int(np.mean(waiting_durations)) if waiting_durations else 0
        median_waiting = int(np.median(waiting_durations)) if waiting_durations else 0
        avg_service = int(np.mean(service_durations)) if service_durations else 0

        # Counters
        counters_query = db.query(ServiceCounter)
        if facility_id:
            counters_query = counters_query.filter(ServiceCounter.facility_id == facility_id)
        all_counters = counters_query.all()
        total_counters = len(all_counters)
        active_counters = sum(1 for c in all_counters if c.status in ["AVAILABLE", "BUSY"])
        busy_counters = sum(1 for c in all_counters if c.status == "BUSY")
        counter_utilization = (busy_counters / max(1, active_counters)) * 100.0

        # Prediction Accuracy from Snapshots
        pred_acc = AdaptiveWaitingIntelligenceEngine.evaluate_model_accuracy(db)

        # Hourly throughput formatted for Recharts
        hourly_data = [
            {"hour": f"{h:02d}:00", "served": hourly_counts[h]}
            for h in sorted(hourly_counts.keys())
        ]

        # Service breakdown
        services = db.query(Service).all()
        service_data = []
        for s in services:
            s_served = (
                db.query(func.count(QueueEntry.id))
                .join(Queue, QueueEntry.queue_id == Queue.id)
                .filter(Queue.service_id == s.id, QueueEntry.status == "COMPLETED")
                .scalar()
                or 0
            )
            service_data.append({"service": s.name, "count": s_served})

        return {
            "total_served_today": total_served,
            "currently_waiting": currently_waiting,
            "currently_in_service": currently_in_service,
            "avg_waiting_time_seconds": avg_waiting,
            "median_waiting_time_seconds": median_waiting,
            "avg_service_time_seconds": avg_service,
            "no_show_rate_percent": round(no_show_rate, 1),
            "cancellation_rate_percent": round(cancellation_rate, 1),
            "active_counters_count": active_counters,
            "total_counters_count": total_counters,
            "counter_utilization_percent": round(counter_utilization, 1),
            "prediction_mae_seconds": pred_acc["mae_seconds"],
            "prediction_coverage_percent": pred_acc["coverage_percent"],
            "hourly_throughput": hourly_data,
            "service_breakdown": service_data,
        }
