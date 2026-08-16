from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Appointment, Doctor, Hospital

def parse_time(time_str: str) -> datetime:
    try:
        return datetime.strptime(time_str, "%Y-%m-%d %H:%M")
    except ValueError:
        # Fallback in case of seconds
        return datetime.strptime(time_str[:16], "%Y-%m-%d %H:%M")

def format_time(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M")


def preview_appointment_slot(
    db: Session,
    doctor_id: str,
    preferred_time_str: str,
    duration_mins: int,
) -> dict:
    """Return the first non-conflicting slot without changing the database.

    This is deliberately separate from ``calculate_appointment_slot``.  A
    recommendation must not increment a doctor's queue, occupy a hospital bed,
    or move another patient's appointment until the patient actually books.
    """
    preferred_start = parse_time(preferred_time_str)
    date_str = preferred_start.strftime("%Y-%m-%d")

    doctor = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doctor:
        raise ValueError(f"Doctor {doctor_id} not found")

    active_appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_time.like(f"{date_str}%"),
        Appointment.status != "CANCELLED",
    ).all()
    active_appointments.sort(key=lambda appointment: parse_time(appointment.appointment_time))

    slot_start = preferred_start
    while True:
        slot_end = slot_start + timedelta(minutes=duration_mins)
        conflicting_appointment = next(
            (
                appointment
                for appointment in active_appointments
                if not (
                    slot_end <= parse_time(appointment.appointment_time)
                    or slot_start >= parse_time(appointment.appointment_time)
                    + timedelta(minutes=appointment.estimated_duration)
                )
            ),
            None,
        )
        if not conflicting_appointment:
            break

        slot_start = parse_time(conflicting_appointment.appointment_time) + timedelta(
            minutes=conflicting_appointment.estimated_duration
        )

    return {
        "scheduled_time": format_time(slot_start),
        "wait_minutes": int((slot_start - preferred_start).total_seconds() // 60),
    }

def calculate_appointment_slot(
    db: Session,
    doctor_id: str,
    priority: str,
    preferred_time_str: str,
    duration_mins: int
) -> dict:
    """
    Schedules an appointment based on patient priority:
    - LOW/MEDIUM: Find next available slot that doesn't conflict, starting from preferred_time.
    - HIGH/EMERGENCY: Place immediately at preferred_time, shift subsequent appointments.
    """
    pref_dt = parse_time(preferred_time_str)
    date_str = pref_dt.strftime("%Y-%m-%d")

    # Fetch doctor working hours and consult length
    doc = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doc:
        raise ValueError(f"Doctor {doctor_id} not found")

    # Fetch active appointments for doctor on this day
    active_apps = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_time.like(f"{date_str}%"),
        Appointment.status != "CANCELLED"
    ).all()

    # Sort appointments by time
    active_apps.sort(key=lambda x: parse_time(x.appointment_time))

    if priority in ("HIGH", "EMERGENCY"):
        # Shift scheduling: insert at preferred_time, push subsequent appointments forward
        new_app_start = pref_dt
        new_app_end = new_app_start + timedelta(minutes=duration_mins)

        shifted_logs = []
        # Find all appointments starting at or after new_app_start
        for app in active_apps:
            app_start = parse_time(app.appointment_time)
            if app_start >= new_app_start:
                # Need to push this appointment forward
                old_time = app.appointment_time
                pushed_start = app_start + timedelta(minutes=duration_mins)
                new_time_str = format_time(pushed_start)
                app.appointment_time = new_time_str
                app.status = "SHIFTED"
                app.notes = f"Delayed by {duration_mins}m due to priority patient {priority} scheduled at {format_time(new_app_start)}."
                shifted_logs.append({
                    "appointment_id": app.appointment_id,
                    "patient_name": app.patient_name,
                    "old_time": old_time,
                    "new_time": new_time_str,
                    "reason": app.notes
                })
        
        # Save changes to the DB
        db.commit()

        # Update Doctor queue and workload
        doc.queue_count = len(active_apps) + 1
        doc.workload = min(100.0, round(((len(active_apps) + 1) * doc.consultation_duration / 480.0) * 100, 1))
        
        # Increment hospital occupancy
        if doc.hospital:
            doc.hospital.current_occupancy = min(doc.hospital.total_capacity, doc.hospital.current_occupancy + 1)
        db.commit()

        return {
            "scheduled_time": format_time(new_app_start),
            "shifted_appointments": shifted_logs,
            "status": "BOOKED",
            "notes": f"Immediate scheduling activated for priority level {priority}."
        }

    else:
        # Standard scheduling: find next free slot
        new_app_start = pref_dt
        
        while True:
            conflict = False
            new_app_end = new_app_start + timedelta(minutes=duration_mins)
            
            for app in active_apps:
                app_start = parse_time(app.appointment_time)
                app_end = app_start + timedelta(minutes=app.estimated_duration)
                
                # Check overlapping conditions
                if not (new_app_end <= app_start or new_app_start >= app_end):
                    conflict = True
                    # Push start time to end of conflicting appointment
                    new_app_start = app_end
                    break
            
            if not conflict:
                break
                
        scheduled_time_str = format_time(new_app_start)
        
        # Update Doctor queue
        doc.queue_count = len(active_apps) + 1
        doc.workload = min(100.0, round(((len(active_apps) + 1) * doc.consultation_duration / 480.0) * 100, 1))
        
        # Increment hospital occupancy
        if doc.hospital:
            doc.hospital.current_occupancy = min(doc.hospital.total_capacity, doc.hospital.current_occupancy + 1)
        db.commit()

        return {
            "scheduled_time": scheduled_time_str,
            "shifted_appointments": [],
            "status": "BOOKED",
            "notes": "Scheduled at first available time slot."
        }


def cancel_appointment_and_pull_forward(db: Session, appointment_id: str) -> dict:
    """
    Cancels an appointment and pulls forward subsequent appointments on that day
    for the same doctor to fill the gap, reducing wait times.
    """
    app_to_cancel = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
    if not app_to_cancel:
        raise ValueError(f"Appointment {appointment_id} not found")

    if app_to_cancel.status == "CANCELLED":
        return {"message": "Appointment already cancelled", "shifted_appointments": []}

    cancelled_time_str = app_to_cancel.appointment_time
    cancelled_dt = parse_time(cancelled_time_str)
    date_str = cancelled_dt.strftime("%Y-%m-%d")
    duration = app_to_cancel.estimated_duration
    doctor_id = app_to_cancel.doctor_id

    # Mark as cancelled
    app_to_cancel.status = "CANCELLED"
    app_to_cancel.notes = f"Cancelled on {datetime.now().strftime('%Y-%m-%d %H:%M')}."

    # Decrement hospital occupancy
    doc = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if doc:
        if doc.hospital and doc.hospital.current_occupancy > 0:
            doc.hospital.current_occupancy = max(0, doc.hospital.current_occupancy - 1)

    # Fetch subsequent active appointments for this doctor on this day
    subsequent_apps = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_time.like(f"{date_str}%"),
        Appointment.status != "CANCELLED",
        Appointment.appointment_id != appointment_id
    ).all()

    # Filter subsequent ones in memory
    subsequent_apps = [a for a in subsequent_apps if parse_time(a.appointment_time) > cancelled_dt]
    subsequent_apps.sort(key=lambda x: parse_time(x.appointment_time))

    shifted_logs = []
    # Pull subsequent appointments earlier
    for app in subsequent_apps:
        app_start = parse_time(app.appointment_time)
        old_time = app.appointment_time
        pulled_start = app_start - timedelta(minutes=duration)
        new_time_str = format_time(pulled_start)
        
        app.appointment_time = new_time_str
        app.status = "SHIFTED"
        app.notes = f"Pulled forward by {duration}m due to cancellation of appointment at {cancelled_time_str}."
        
        shifted_logs.append({
            "appointment_id": app.appointment_id,
            "patient_name": app.patient_name,
            "old_time": old_time,
            "new_time": new_time_str,
            "reason": app.notes
        })

    # Update doctor queue count and workload
    active_count = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_time.like(f"{date_str}%"),
        Appointment.status != "CANCELLED"
    ).count()
    
    if doc:
        doc.queue_count = active_count
        doc.workload = min(100.0, round((active_count * doc.consultation_duration / 480.0) * 100, 1))

    db.commit()

    return {
        "message": f"Appointment {appointment_id} cancelled.",
        "shifted_appointments": shifted_logs
    }
