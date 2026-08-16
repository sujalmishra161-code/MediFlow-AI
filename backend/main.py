from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from database import engine, Base, get_db
from models import Hospital, Doctor, Patient, Appointment
import schemas
from ai import classify_symptoms
from matching import resolve_location_to_coords, find_and_rank_doctors, calculate_doctor_score
from scheduler import (
    calculate_appointment_slot,
    cancel_appointment_and_pull_forward,
    parse_time,
    format_time,
    preview_appointment_slot,
)

app = FastAPI(title="MediFlow AI Backend", version="1.0.0")

# Enable CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "time": datetime.now().isoformat()}


@app.post("/api/ai/classify", response_model=schemas.AIClassifyResponse)
def classify_patient_symptoms(request: Dict[str, str]):
    symptoms = request.get("symptoms")
    if not symptoms:
        raise HTTPException(status_code=400, detail="Symptoms text required")
    res = classify_symptoms(symptoms)
    return res


@app.post("/api/patient/request")
def patient_request(req: schemas.PatientRequest, db: Session = Depends(get_db)):
    """
    Registers a patient request, determines specialty and urgency,
    and returns recommended doctors based on distance and scores.
    """
    # 1. Classify symptoms
    ai_res = classify_symptoms(req.symptoms)
    
    # 2. Resolve coords
    lat, lon = resolve_location_to_coords(req.location)
    
    # 3. Create Patient Record in DB
    db_patient = Patient(
        name=req.name,
        age=req.age,
        symptoms=req.symptoms,
        location_name=req.location,
        latitude=lat,
        longitude=lon,
        preferred_date=req.preferred_date,
        preferred_time=req.preferred_time
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    # 4. Search and rank doctors.
    recommendations = find_and_rank_doctors(db, lat, lon, ai_res["specialty"])

    # 5. Recommend a real slot without booking it.  Start with the existing
    # doctor score, then account for the actual delay caused by appointments
    # already in the doctor's calendar.  This prevents a highly ranked but
    # busy doctor from always beating a nearly equivalent doctor with an
    # immediate opening.
    appointment_recommendation = None
    preferred_datetime = f"{req.preferred_date} {req.preferred_time}"
    available_candidates = [
        doctor for doctor in recommendations.get("doctors", []) if doctor["available_now"]
    ]
    candidate_slots = []
    for doctor in available_candidates:
        try:
            slot = preview_appointment_slot(
                db=db,
                doctor_id=doctor["doctor_id"],
                preferred_time_str=preferred_datetime,
                duration_mins=doctor["consultation_duration"],
            )
        except ValueError:
            continue

        # A delay of 20 minutes costs one ranking point, capped at 20 points
        # so an otherwise excellent nearby doctor remains competitive.
        effective_score = round(doctor["score"] - min(slot["wait_minutes"] / 20, 20), 1)
        candidate_slots.append({**doctor, **slot, "effective_score": effective_score})

    if candidate_slots:
        candidate_slots.sort(
            key=lambda candidate: (
                -candidate["effective_score"],
                candidate["wait_minutes"],
                candidate["distance_km"],
            )
        )
        best = candidate_slots[0]
        delay_description = (
            "at the preferred time"
            if best["wait_minutes"] == 0
            else f"after an estimated {best['wait_minutes']}-minute delay"
        )
        appointment_recommendation = {
            "doctor_id": best["doctor_id"],
            "doctor_name": best["name"],
            "hospital_id": best["hospital"]["hospital_id"],
            "hospital_name": best["hospital"]["name"],
            "appointment_time": best["scheduled_time"],
            "estimated_wait_minutes": best["wait_minutes"],
            "effective_score": best["effective_score"],
            "reason": (
                f"Best available slot {delay_description}, based on specialty match, "
                "availability, distance, queue, workload, hospital capacity, and "
                "existing appointments."
            ),
        }
    
    return {
        "patient_id": db_patient.patient_id,
        "classification": ai_res,
        "location": {"latitude": lat, "longitude": lon},
        "recommendations": recommendations,
        "appointment_recommendation": appointment_recommendation,
    }


@app.get("/api/doctors", response_model=List[Dict[str, Any]])
def get_doctors(specialty: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Doctor)
    if specialty:
        query = query.filter(Doctor.specialty.ilike(specialty))
    docs = query.all()
    
    result = []
    for d in docs:
        result.append({
            "doctor_id": d.doctor_id,
            "name": d.name,
            "specialty": d.specialty,
            "qualification": d.qualification,
            "experience_years": d.experience_years,
            "available_now": d.available_now,
            "queue_count": d.queue_count,
            "workload": d.workload,
            "rating": d.rating,
            "hospital_name": d.hospital.name if d.hospital else "Private Clinic"
        })
    return result


@app.get("/api/doctors/recommend", response_model=schemas.DoctorRecommendResponse)
def get_recommended_doctors(
    location: str = Query(..., description="Patient location name"),
    specialty: str = Query(..., description="Target medical specialty"),
    db: Session = Depends(get_db)
):
    lat, lon = resolve_location_to_coords(location)
    return find_and_rank_doctors(db, lat, lon, specialty)


@app.get("/api/hospitals/nearby")
def get_nearby_hospitals(location: str, db: Session = Depends(get_db)):
    lat, lon = resolve_location_to_coords(location)
    hospitals = db.query(Hospital).all()
    
    from distance import haversine_distance
    result = []
    for h in hospitals:
        dist = haversine_distance(h.latitude, h.longitude, lat, lon)
        result.append({
            "hospital_id": h.hospital_id,
            "name": h.name,
            "address": h.address,
            "distance_km": round(dist, 2),
            "occupancy_rate": round((h.current_occupancy / h.total_capacity) * 100, 1) if h.total_capacity > 0 else 0,
            "icu_occupancy_rate": round((h.icu_occupancy / h.icu_capacity) * 100, 1) if h.icu_capacity > 0 else 0,
            "emergency_available": h.emergency_available
        })
        
    result.sort(key=lambda x: x["distance_km"])
    return result


@app.post("/api/appointments")
def create_appointment(req: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    """
    Creates an appointment, runs priority scheduler, and commits changes.
    """
    # 1. Resolve patient coordinates
    lat, lon = resolve_location_to_coords(req.location)
    
    # 2. Check if patient exists, if not create
    patient = db.query(Patient).filter(Patient.name == req.name, Patient.symptoms == req.symptoms).first()
    if not patient:
        patient = Patient(
            name=req.name,
            age=req.age,
            symptoms=req.symptoms,
            location_name=req.location,
            latitude=lat,
            longitude=lon,
            preferred_date=req.appointment_time.split()[0],
            preferred_time=req.appointment_time.split()[1]
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        
    # 3. Check doctor consultation length
    doc = db.query(Doctor).filter(Doctor.doctor_id == req.doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    # 4. Run appointment optimization engine
    schedule_res = calculate_appointment_slot(
        db=db,
        doctor_id=req.doctor_id,
        priority=req.priority,
        preferred_time_str=req.appointment_time,
        duration_mins=doc.consultation_duration
    )
    
    # 5. Save appointment in DB
    app_id = f"A{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    db_app = Appointment(
        appointment_id=app_id,
        patient_id=patient.patient_id,
        patient_name=patient.name,
        doctor_id=req.doctor_id,
        hospital_id=req.hospital_id,
        appointment_time=schedule_res["scheduled_time"],
        priority=req.priority,
        estimated_duration=doc.consultation_duration,
        status=schedule_res["status"],
        notes=schedule_res["notes"]
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    
    return {
        "appointment": {
            "appointment_id": db_app.appointment_id,
            "patient_id": db_app.patient_id,
            "patient_name": db_app.patient_name,
            "doctor_id": db_app.doctor_id,
            "doctor_name": doc.name,
            "hospital_id": db_app.hospital_id,
            "hospital_name": doc.hospital.name if doc.hospital else "Private Clinic",
            "appointment_time": db_app.appointment_time,
            "priority": db_app.priority,
            "status": db_app.status,
            "notes": db_app.notes
        },
        "shifted_appointments": schedule_res["shifted_appointments"]
    }


@app.get("/api/appointments/{id}")
def get_appointment(id: str, db: Session = Depends(get_db)):
    app = db.query(Appointment).filter(Appointment.appointment_id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return app


@app.get("/api/appointments")
def get_all_appointments(db: Session = Depends(get_db)):
    apps = db.query(Appointment).all()
    result = []
    for a in apps:
        doc = db.query(Doctor).filter(Doctor.doctor_id == a.doctor_id).first()
        hosp = db.query(Hospital).filter(Hospital.hospital_id == a.hospital_id).first()
        result.append({
            "appointment_id": a.appointment_id,
            "patient_name": a.patient_name,
            "doctor_name": doc.name if doc else a.doctor_id,
            "hospital_name": hosp.name if hosp else a.hospital_id,
            "appointment_time": a.appointment_time,
            "priority": a.priority,
            "status": a.status,
            "notes": a.notes
        })
    return result


@app.post("/api/events/emergency")
def simulate_emergency(req: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Simulates the arrival of an emergency patient:
    - Inserts a high/emergency priority request
    - Selects the best doctor using matching engine
    - Recalculates doctor schedule, pushing others
    """
    name = req.get("name", "Emergency Patient")
    age = req.get("age", 45)
    symptoms = req.get("symptoms", "Chest pain and breathing difficulty")
    location = req.get("location", "Civil Lines")
    preferred_time = req.get("preferred_time", datetime.now().strftime("%Y-%m-%d %H:%M"))
    
    # 1. Classify symptoms
    ai_res = classify_symptoms(symptoms)
    ai_res["urgency"] = "EMERGENCY" # Force emergency
    
    # 2. Resolve coordinates
    lat, lon = resolve_location_to_coords(location)
    
    # 3. Find and rank doctors
    rec = find_and_rank_doctors(db, lat, lon, ai_res["specialty"])
    if not rec["doctors"]:
        # Fallback to General Medicine if no specialist
        rec = find_and_rank_doctors(db, lat, lon, "General Medicine")
        
    best_doc = rec["doctors"][0]
    
    # 4. Schedule the emergency patient immediately
    schedule_res = calculate_appointment_slot(
        db=db,
        doctor_id=best_doc["doctor_id"],
        priority="EMERGENCY",
        preferred_time_str=preferred_time,
        duration_mins=best_doc["consultation_duration"]
    )
    
    # Create patient
    p = Patient(
        name=name, age=age, symptoms=symptoms, location_name=location,
        latitude=lat, longitude=lon, preferred_date=preferred_time.split()[0],
        preferred_time=preferred_time.split()[1]
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    
    # Save appointment
    app_id = f"E{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    db_app = Appointment(
        appointment_id=app_id,
        patient_id=p.patient_id,
        patient_name=p.name,
        doctor_id=best_doc["doctor_id"],
        hospital_id=best_doc["hospital"]["hospital_id"],
        appointment_time=schedule_res["scheduled_time"],
        priority="EMERGENCY",
        estimated_duration=best_doc["consultation_duration"],
        status="BOOKED",
        notes="🚨 EMERGENCY CASE SCHEDULED IMMEDIATELY."
    )
    db.add(db_app)
    db.commit()
    
    # Update doctor status to make them busy/occupied
    doc = db.query(Doctor).filter(Doctor.doctor_id == best_doc["doctor_id"]).first()
    if doc:
        doc.available_now = True # Keeps queue active
        
    db.commit()
    
    return {
        "message": "Emergency successfully scheduled.",
        "patient": {
            "name": name,
            "specialty": ai_res["specialty"],
            "urgency": "EMERGENCY"
        },
        "assigned_doctor": best_doc["name"],
        "assigned_hospital": best_doc["hospital"]["name"],
        "scheduled_time": schedule_res["scheduled_time"],
        "shifted_appointments": schedule_res["shifted_appointments"]
    }


@app.post("/api/events/doctor-unavailable")
def simulate_doctor_unavailable(req: Dict[str, str], db: Session = Depends(get_db)):
    """
    Simulates a doctor becoming unavailable:
    - Identifies all affected appointments
    - Finds alternative doctors of same specialty
    - Reallocates appointments based on scores
    """
    doctor_id = req.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=400, detail="doctor_id required")
        
    doc = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    # Mark doctor unavailable
    doc.available_now = False
    db.commit()
    
    # Find affected appointments
    affected_apps = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status != "CANCELLED"
    ).all()
    
    reallocations = []
    for app in affected_apps:
        old_time = app.appointment_time
        # Resolve patient location coords (fallback if patient_id missing)
        p_lat, p_lon = 26.456, 80.331
        if app.patient:
            p_lat = app.patient.latitude or p_lat
            p_lon = app.patient.longitude or p_lon
            
        # Find alternative doctor
        alt_rec = find_and_rank_doctors(db, p_lat, p_lon, doc.specialty)
        # Filter out the unavailable doctor
        valid_docs = [d for d in alt_rec["doctors"] if d["doctor_id"] != doctor_id]
        
        if valid_docs:
            best_alt = valid_docs[0]
            # Schedule appointment with alternative doctor
            sched_res = calculate_appointment_slot(
                db=db,
                doctor_id=best_alt["doctor_id"],
                priority=app.priority,
                preferred_time_str=app.appointment_time,
                duration_mins=best_alt["consultation_duration"]
            )
            
            # Update appointment
            app.doctor_id = best_alt["doctor_id"]
            app.hospital_id = best_alt["hospital"]["hospital_id"]
            app.appointment_time = sched_res["scheduled_time"]
            app.status = "REALLOCATED"
            app.notes = f"Reallocated from Dr. {doc.name} (unavailable) to Dr. {best_alt['name']} at {best_alt['hospital']['name']}."
            
            reallocations.append({
                "appointment_id": app.appointment_id,
                "patient_name": app.patient_name,
                "original_doctor": doc.name,
                "reallocated_doctor": best_alt["name"],
                "reallocated_hospital": best_alt["hospital"]["name"],
                "old_time": old_time,
                "new_time": sched_res["scheduled_time"],
                "notes": app.notes
            })
        else:
            # Escalation fallback if no alternative found
            app.status = "REALLOCATED"
            app.notes = f"Unassigned: No alternative specialist in {doc.specialty} available. Specialist Escalation triggered."
            reallocations.append({
                "appointment_id": app.appointment_id,
                "patient_name": app.patient_name,
                "original_doctor": doc.name,
                "reallocated_doctor": "Specialist Escalation Needed",
                "reallocated_hospital": "N/A",
                "old_time": old_time,
                "new_time": "N/A",
                "notes": app.notes
            })
            
    # Reset doctor queue count and workload
    doc.queue_count = 0
    doc.workload = 0.0
    db.commit()
    
    return {
        "message": f"Doctor {doc.name} marked unavailable.",
        "affected_appointments_count": len(affected_apps),
        "reallocations": reallocations
    }


@app.post("/api/events/cancel")
def simulate_cancel_appointment(req: Dict[str, str], db: Session = Depends(get_db)):
    appointment_id = req.get("appointment_id")
    if not appointment_id:
        raise HTTPException(status_code=400, detail="appointment_id required")
    res = cancel_appointment_and_pull_forward(db, appointment_id)
    return res


@app.post("/api/optimization/reallocate")
def trigger_queue_rebalancing(db: Session = Depends(get_db)):
    """
    Queue Overload balancer:
    - Finds doctors with overloaded queues (queue size > 5)
    - Reallocates their LOW priority patients to other available doctors with shorter queues.
    """
    overloaded_docs = db.query(Doctor).filter(Doctor.queue_count > 5, Doctor.available_now == True).all()
    
    reallocations = []
    for doc in overloaded_docs:
        # Find LOW priority active appointments
        low_apps = db.query(Appointment).filter(
            Appointment.doctor_id == doc.doctor_id,
            Appointment.priority == "LOW",
            Appointment.status != "CANCELLED"
        ).all()
        
        for app in low_apps:
            # Find coordinates
            p_lat, p_lon = 26.456, 80.331
            if app.patient:
                p_lat = app.patient.latitude or p_lat
                p_lon = app.patient.longitude or p_lon
                
            # Look for less busy doctor in same specialty
            alt_rec = find_and_rank_doctors(db, p_lat, p_lon, doc.specialty)
            # Find best doctor who has queue_count < doc.queue_count
            better_alts = [d for d in alt_rec["doctors"] if d["doctor_id"] != doc.doctor_id and d["queue_count"] < doc.queue_count - 1]
            
            if better_alts:
                best_alt = better_alts[0]
                old_time = app.appointment_time
                
                # Reschedule
                sched_res = calculate_appointment_slot(
                    db=db,
                    doctor_id=best_alt["doctor_id"],
                    priority="LOW",
                    preferred_time_str=app.appointment_time,
                    duration_mins=best_alt["consultation_duration"]
                )
                
                # Update appointment
                app.doctor_id = best_alt["doctor_id"]
                app.hospital_id = best_alt["hospital"]["hospital_id"]
                app.appointment_time = sched_res["scheduled_time"]
                app.status = "REALLOCATED"
                app.notes = f"Rebalanced from overloaded queue of Dr. {doc.name} to Dr. {best_alt['name']}."
                
                reallocations.append({
                    "appointment_id": app.appointment_id,
                    "patient_name": app.patient_name,
                    "original_doctor": doc.name,
                    "reallocated_doctor": best_alt["name"],
                    "old_time": old_time,
                    "new_time": sched_res["scheduled_time"],
                    "reason": app.notes
                })
                
                # Update original doctor queue count
                doc.queue_count = max(0, doc.queue_count - 1)
                db.commit()
                
    return {
        "message": f"Queue rebalancing completed. Reallocated {len(reallocations)} appointments.",
        "reallocations": reallocations
    }


@app.get("/api/hospitals/{id}/dashboard")
def get_hospital_dashboard_stats(id: str, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.hospital_id == id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    doctors = db.query(Doctor).filter(Doctor.hospital_id == id).all()
    docs_available = sum(1 for d in doctors if d.available_now)
    total_docs = len(doctors)
    
    # Patients waiting (active appointments today)
    date_str = datetime.now().strftime("%Y-%m-%d")
    waiting_count = db.query(Appointment).filter(
        Appointment.hospital_id == id,
        # Appointment.appointment_time.like(f"{date_str}%"),
        Appointment.status != "CANCELLED"
    ).count()
    
    # Calculate simulated wait time
    avg_wait = 21 # default base minutes
    if waiting_count > 0:
        avg_wait = min(90, 10 + (waiting_count * 2))
        
    return {
        "hospital_id": hosp.hospital_id,
        "name": hosp.name,
        "doctors_available": f"{docs_available} / {total_docs}",
        "doctors_available_count": docs_available,
        "total_doctors_count": total_docs,
        "patients_waiting": waiting_count,
        "average_waiting_time_minutes": avg_wait,
        "capacity_percentage": round((hosp.current_occupancy / hosp.total_capacity) * 100, 1) if hosp.total_capacity > 0 else 0,
        "emergency_capacity_percentage": round((hosp.icu_occupancy / hosp.icu_capacity) * 100, 1) if hosp.icu_capacity > 0 else 0,
    }


@app.get("/api/analytics")
def get_analytics_data(db: Session = Depends(get_db)):
    # Total stats
    total_hospitals = db.query(Hospital).count()
    total_doctors = db.query(Doctor).count()
    active_appointments = db.query(Appointment).filter(Appointment.status != "CANCELLED").count()
    
    # Average waiting time
    # Sum queue count across doctors
    total_queue = db.query(Doctor).with_entities(Doctor.queue_count).all()
    avg_waiting_time = 21 # base default
    q_sum = sum(q[0] for q in total_queue if q[0] is not None)
    if total_doctors > 0:
        avg_waiting_time = max(10, min(120, int(q_sum * 15 / total_doctors)))
        
    # Hospital utilization rate
    hospitals = db.query(Hospital).all()
    util_sum = sum((h.current_occupancy / h.total_capacity) for h in hospitals if h.total_capacity > 0)
    avg_util = round((util_sum / len(hospitals)) * 100, 1) if hospitals else 0.0
    
    # Emergency cases
    emergency_count = db.query(Appointment).filter(Appointment.priority == "EMERGENCY").count()
    
    # Charts data:
    # 1. Hospital Capacity
    hospital_capacity_chart = []
    for h in hospitals[:8]: # top 8
        hospital_capacity_chart.append({
            "name": h.name.split("(")[0].strip(),
            "occupancy": h.current_occupancy,
            "capacity": h.total_capacity,
            "occupancy_rate": round((h.current_occupancy / h.total_capacity) * 100, 1) if h.total_capacity > 0 else 0
        })
        
    # 2. Doctor Workload (top 10 busy doctors)
    docs = db.query(Doctor).order_by(Doctor.workload.desc()).limit(8).all()
    doctor_workload_chart = []
    for d in docs:
        doctor_workload_chart.append({
            "name": d.name,
            "specialty": d.specialty,
            "workload": d.workload
        })
        
    # 3. Specialty Demand (count of appointments by specialty)
    spec_counts = {}
    apps = db.query(Appointment).all()
    for a in apps:
        doc = db.query(Doctor).filter(Doctor.doctor_id == a.doctor_id).first()
        if doc:
            spec_counts[doc.specialty] = spec_counts.get(doc.specialty, 0) + 1
            
    specialty_demand_chart = [{"name": spec, "value": count} for spec, count in spec_counts.items()]
    if not specialty_demand_chart:
        # Fallback dummy data if no appointments booked yet
        specialty_demand_chart = [
            {"name": "Cardiology", "value": 5},
            {"name": "Neurology", "value": 3},
            {"name": "Pulmonology", "value": 4},
            {"name": "General Medicine", "value": 8},
        ]

    # 4. Appointment Distribution by Priority
    priorities = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"]
    priority_dist = []
    for p in priorities:
        count = db.query(Appointment).filter(Appointment.priority == p).count()
        priority_dist.append({"name": p, "value": count})
        
    # 5. Waiting time by Specialty
    # (specialty average queue * avg consultation duration)
    specialties = list(set(d.specialty for d in db.query(Doctor).all()))
    waiting_time_by_specialty = []
    for spec in specialties[:6]:
        spec_docs = db.query(Doctor).filter(Doctor.specialty == spec).all()
        if spec_docs:
            avg_q = sum(d.queue_count for d in spec_docs) / len(spec_docs)
            avg_wait = round(avg_q * 20, 0)
            waiting_time_by_specialty.append({
                "specialty": spec,
                "waiting_time": max(5, avg_wait)
            })
            
    return {
        "summary": {
            "total_hospitals": total_hospitals,
            "total_doctors": total_doctors,
            "active_appointments": active_appointments,
            "average_waiting_time": f"{avg_waiting_time} min",
            "hospital_utilization": f"{avg_util}%",
            "emergency_cases": emergency_count
        },
        "charts": {
            "hospital_capacity": hospital_capacity_chart,
            "doctor_workload": doctor_workload_chart,
            "specialty_demand": specialty_demand_chart,
            "priority_distribution": priority_dist,
            "waiting_time_by_specialty": waiting_time_by_specialty
        }
    }
