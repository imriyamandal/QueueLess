import math
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    QueueEntry, Queue, Service, ServiceCounter, CounterService, PredictionSnapshot, utc_now, ensure_utc
)

class AdaptiveWaitingIntelligenceEngine:
    MODEL_VERSION = "AWIE-v1.2-Deterministic"

    @classmethod
    def get_service_duration_stats(cls, db: Session, service_id: str) -> Tuple[float, float, str]:
        """
        Returns (mean_seconds, std_seconds, data_quality)
        Calculates empirical duration from completed tickets, or falls back to baseline.
        """
        # Fetch completed entries for this service
        completed_entries = (
            db.query(QueueEntry)
            .join(Queue, QueueEntry.queue_id == Queue.id)
            .filter(
                Queue.service_id == service_id,
                QueueEntry.status == "COMPLETED",
                QueueEntry.service_start_at.isnot(None),
                QueueEntry.completed_at.isnot(None),
            )
            .order_by(QueueEntry.completed_at.desc())
            .limit(50)
            .all()
        )

        valid_durations = []
        for e in completed_entries:
            if e.service_start_at and e.completed_at:
                s_utc = ensure_utc(e.service_start_at)
                c_utc = ensure_utc(e.completed_at)
                if s_utc and c_utc:
                    dur = (c_utc - s_utc).total_seconds()
                    if 60 <= dur <= 3600:  # Exclude extreme anomalies
                        valid_durations.append(dur)

        service = db.query(Service).filter(Service.id == service_id).first()
        baseline = service.baseline_duration_seconds if service else 420.0

        if len(valid_durations) >= 5:
            mean = sum(valid_durations) / len(valid_durations)
            variance = sum((d - mean) ** 2 for d in valid_durations) / len(valid_durations)
            std = math.sqrt(variance)
            quality = "HIGH" if len(valid_durations) >= 15 else "MODERATE"
            return float(mean), max(float(std), 60.0), quality
        else:
            # Fallback to configured baseline
            return float(baseline), float(baseline * 0.35), "COLD_START"

    @classmethod
    def calculate_ticket_prediction(
        cls, db: Session, ticket_id: str, record_snapshot: bool = True
    ) -> Dict:
        """
        Simulates counter-aware discrete scheduling to compute wait time and confidence interval.
        """
        target_entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
        if not target_entry:
            return cls._empty_prediction("Ticket not found")

        now = utc_now()
        # If already called or in service
        if target_entry.status in ["CALLED", "IN_SERVICE"]:
            msg = (
                f"Your turn has been called. Please proceed to {target_entry.assigned_counter.name if target_entry.assigned_counter else 'the counter'}."
                if target_entry.status == "CALLED"
                else "Your service is in progress."
            )
            return {
                "estimated_wait_seconds": 0,
                "lower_bound_seconds": 0,
                "upper_bound_seconds": 0,
                "estimated_turn_time": now,
                "turn_time_lower": now,
                "turn_time_upper": now,
                "position_ahead": 0,
                "active_counters_count": 1,
                "data_quality": "HIGH",
                "explanation": f"Ticket is currently {target_entry.status.replace('_', ' ').lower()}.",
                "status_message": msg,
                "facility_timezone": "Asia/Kolkata",
                "last_updated_at": now,
                "recommended_departure_time": now,
            }
        elif target_entry.status in ["COMPLETED", "CANCELLED", "NO_SHOW"]:
            terminal_msg = (
                "Your service is complete. Thank you for using QueueLess."
                if target_entry.status == "COMPLETED"
                else f"Your ticket status is {target_entry.status}."
            )
            return {
                "estimated_wait_seconds": 0,
                "lower_bound_seconds": 0,
                "upper_bound_seconds": 0,
                "estimated_turn_time": None,
                "turn_time_lower": None,
                "turn_time_upper": None,
                "position_ahead": 0,
                "active_counters_count": 0,
                "data_quality": "HIGH",
                "explanation": f"Ticket status is {target_entry.status}.",
                "status_message": terminal_msg,
                "facility_timezone": "Asia/Kolkata",
                "last_updated_at": now,
                "recommended_departure_time": None,
            }

        queue = db.query(Queue).filter(Queue.id == target_entry.queue_id).first()
        if not queue:
            return cls._empty_prediction("Queue not found")

        service = db.query(Service).filter(Service.id == queue.service_id).first()
        if not service:
            return cls._empty_prediction("Service not found")

        facility_id = service.facility_id

        # 1. Get all active counters eligible for this service
        eligible_counter_ids = {
            cs.counter_id
            for cs in db.query(CounterService).filter(CounterService.service_id == service.id).all()
        }

        # If no explicit mapping, default to all counters in facility
        all_facility_counters = (
            db.query(ServiceCounter).filter(ServiceCounter.facility_id == facility_id).all()
        )
        if not eligible_counter_ids:
            eligible_counter_ids = {c.id for c in all_facility_counters}

        # Counters status map: counter_id -> projected availability (seconds from now)
        counter_availability: Dict[str, float] = {}
        active_counters_count = 0
        paused_counters_count = 0
        now = utc_now()

        mean_dur, std_dur, data_quality = cls.get_service_duration_stats(db, service.id)

        for counter in all_facility_counters:
            if counter.id not in eligible_counter_ids:
                continue

            if counter.status == "OFFLINE":
                continue
            elif counter.status == "PAUSED":
                paused_counters_count += 1
                # Paused counters have high delayed availability
                counter_availability[counter.id] = 1800.0  # 30 min projected delay
            elif counter.status == "AVAILABLE":
                active_counters_count += 1
                counter_availability[counter.id] = 0.0
            elif counter.status == "BUSY":
                active_counters_count += 1
                # Calculate remaining time for busy entry
                busy_entry = (
                    db.query(QueueEntry).filter(QueueEntry.id == counter.current_entry_id).first()
                    if counter.current_entry_id
                    else None
                )
                if busy_entry and busy_entry.service_start_at:
                    s_utc = ensure_utc(busy_entry.service_start_at)
                    n_utc = ensure_utc(now)
                    elapsed = (n_utc - s_utc).total_seconds() if s_utc and n_utc else 0.0
                    remaining = max(30.0, mean_dur - elapsed)
                else:
                    remaining = mean_dur * 0.5
                counter_availability[counter.id] = remaining

        if not counter_availability:
            # Fallback when all counters offline
            explanation = "All service counters are currently offline or paused."
            est_wait = max(600, int(mean_dur * 2))
            return {
                "estimated_wait_seconds": est_wait,
                "lower_bound_seconds": int(est_wait * 0.8),
                "upper_bound_seconds": int(est_wait * 2.5),
                "position_ahead": 1,
                "active_counters_count": 0,
                "data_quality": "COLD_START",
                "explanation": explanation,
                "recommended_departure_time": now + timedelta(seconds=est_wait)
            }

        # 2. Get all waiting entries ahead of target ticket
        # Ordering: Priority DESC, joined_at ASC
        waiting_entries_ahead = (
            db.query(QueueEntry)
            .filter(
                QueueEntry.queue_id == queue.id,
                QueueEntry.status == "WAITING",
                (
                    (QueueEntry.priority > target_entry.priority)
                    | (
                        (QueueEntry.priority == target_entry.priority)
                        & (QueueEntry.joined_at < target_entry.joined_at)
                    )
                ),
            )
            .order_by(QueueEntry.priority.desc(), QueueEntry.joined_at.asc())
            .all()
        )

        position_ahead = len(waiting_entries_ahead)

        # 3. Simulate discrete scheduling progression
        # Clone availability for simulation
        sim_counters = dict(counter_availability)

        for _ in waiting_entries_ahead:
            # Entry gets earliest available counter
            best_counter_id = min(sim_counters, key=sim_counters.get)
            sim_counters[best_counter_id] += mean_dur

        # Target entry is assigned earliest available counter
        best_counter_for_target = min(sim_counters, key=sim_counters.get)
        est_wait_seconds = max(0.0, sim_counters[best_counter_for_target])

        # 4. Uncertainty Estimation (P10 - P90)
        eff_counters = max(1, active_counters_count)
        # Standard error accumulates with queue length ahead
        se = math.sqrt(max(1, position_ahead + 1) * (std_dur ** 2) / eff_counters)
        
        # Interruption buffer if paused counters exist
        pause_buffer = paused_counters_count * 120.0

        lower_bound = max(30, int(est_wait_seconds - 1.28 * se))
        upper_bound = int(est_wait_seconds + 1.28 * se + pause_buffer)
        if upper_bound <= lower_bound:
            upper_bound = lower_bound + 120

        # Explanation logic
        explanation = "Normal queue progression."
        if paused_counters_count > 0:
            explanation = f"{paused_counters_count} counter(s) currently paused; wait time adjusted for reduced desk capacity."
        elif active_counters_count == 0:
            explanation = "Counters temporarily unavailable; estimates reflect standby mode."
        elif position_ahead == 0:
            explanation = "You are next in line! Stay ready near the service desk."

        # Travel & Departure recommendation
        travel_buffer_sec = (target_entry.travel_time_minutes + 5) * 60
        rec_departure_sec = max(0, lower_bound - travel_buffer_sec)
        rec_departure_time = now + timedelta(seconds=rec_departure_sec)

        # Record snapshot if requested
        if record_snapshot:
            snapshot = PredictionSnapshot(
                entry_id=target_entry.id,
                prediction_timestamp=now,
                estimated_wait_seconds=int(est_wait_seconds),
                lower_bound_seconds=lower_bound,
                upper_bound_seconds=upper_bound,
                queue_position=position_ahead + 1,
                active_counters_count=active_counters_count,
                model_version=cls.MODEL_VERSION,
                reason=explanation,
            )
            db.add(snapshot)
            db.commit()

        # Status message determination
        status_message = "You're in the queue. We'll keep your waiting time updated."
        if position_ahead <= 1 or est_wait_seconds <= 300:
            status_message = "Your turn is approaching. Please prepare to reach the counter."

        est_turn_time = now + timedelta(seconds=int(est_wait_seconds))
        turn_time_lower = now + timedelta(seconds=lower_bound)
        turn_time_upper = now + timedelta(seconds=upper_bound)

        facility = service.facility if service else None
        fac_tz = facility.timezone if facility and facility.timezone else "Asia/Kolkata"

        return {
            "estimated_wait_seconds": int(est_wait_seconds),
            "lower_bound_seconds": lower_bound,
            "upper_bound_seconds": upper_bound,
            "estimated_turn_time": est_turn_time,
            "turn_time_lower": turn_time_lower,
            "turn_time_upper": turn_time_upper,
            "position_ahead": position_ahead,
            "active_counters_count": active_counters_count,
            "data_quality": data_quality,
            "explanation": explanation,
            "status_message": status_message,
            "facility_timezone": fac_tz,
            "last_updated_at": now,
            "recommended_departure_time": rec_departure_time,
        }

    @classmethod
    def _empty_prediction(cls, msg: str) -> Dict:
        now = utc_now()
        return {
            "estimated_wait_seconds": 0,
            "lower_bound_seconds": 0,
            "upper_bound_seconds": 0,
            "estimated_turn_time": None,
            "turn_time_lower": None,
            "turn_time_upper": None,
            "position_ahead": 0,
            "active_counters_count": 0,
            "data_quality": "COLD_START",
            "explanation": msg,
            "status_message": msg,
            "facility_timezone": "Asia/Kolkata",
            "last_updated_at": now,
            "recommended_departure_time": None
        }

    @classmethod
    def evaluate_model_accuracy(cls, db: Session) -> Dict:
        """
        Calculates MAE and Prediction Range Coverage across historical snapshots vs actual service start.
        """
        # Join snapshot with completed/in_service entry
        results = (
            db.query(PredictionSnapshot, QueueEntry)
            .join(QueueEntry, PredictionSnapshot.entry_id == QueueEntry.id)
            .filter(QueueEntry.service_start_at.isnot(None))
            .limit(200)
            .all()
        )

        if not results:
            return {
                "mae_seconds": 0.0,
                "coverage_percent": 100.0,
                "evaluated_samples": 0,
                "model_version": cls.MODEL_VERSION
            }

        abs_errors = []
        covered_count = 0

        for snap, entry in results:
            s_utc = ensure_utc(entry.service_start_at)
            p_utc = ensure_utc(snap.prediction_timestamp)
            if s_utc and p_utc:
                actual_wait = (s_utc - p_utc).total_seconds()
                if actual_wait >= 0:
                    abs_errors.append(abs(snap.estimated_wait_seconds - actual_wait))
                    if snap.lower_bound_seconds <= actual_wait <= snap.upper_bound_seconds:
                        covered_count += 1

        if not abs_errors:
            return {
                "mae_seconds": 0.0,
                "coverage_percent": 100.0,
                "evaluated_samples": 0,
                "model_version": cls.MODEL_VERSION
            }

        mae = sum(abs_errors) / len(abs_errors)
        coverage = (covered_count / len(abs_errors)) * 100.0

        return {
            "mae_seconds": round(mae, 1),
            "coverage_percent": round(coverage, 1),
            "evaluated_samples": len(abs_errors),
            "model_version": cls.MODEL_VERSION
        }
