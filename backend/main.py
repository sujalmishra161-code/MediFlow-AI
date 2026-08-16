from fastapi import FastAPI, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from database import engine, Base, get_db
from models import Hospital, Doctor, Patient, Appointment
import schemas
from ai import classify_symptoms
from matching import (
    resolve_location_to_coords,
    find_and_rank_doctors,
    calculate_doctor_score,
)
from scheduler import (
    calculate_appointment_slot,
    cancel_appointment_and_pull_forward,
    parse_time,
    format_time,
    preview_appointment_slot,
)


# ============================================================
# APP CONFIGURATION
# ============================================================

app = FastAPI(
    title="MediFlow AI Backend",
    version="1.1.0",
    description="AI Dynamic Appointment & Hospital Resource Optimization Engine",
)


# ============================================================
# CORS
# ============================================================
# IMPORTANT:
# Do NOT use allow_origins=["*"] together with
# allow_credentials=True.
#
# Your frontend is deployed on GitHub Pages and your backend
# is deployed on Railway.

ALLOWED_ORIGINS = [
    "https://sujalmishra161-code.github.io",
    "https://mediflow-ai-production-2f71.up.railway.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MediFlow AI Backend",
        "version": "1.1.0",
        "time": datetime.now().isoformat(),
    }


# ============================================================
# AI CLASSIFICATION
# ============================================================

@app.post("/api/ai/classify", response_model=schemas.AIClassifyResponse)
def classify_patient_symptoms(request: Dict[str, str]):
    symptoms = request.get("symptoms")

    if not symptoms:
        raise HTTPException(
            status_code=400,
            detail="Symptoms text required"
        )

    result = classify_symptoms(symptoms)

    return result


# ============================================================
# PATIENT REQUEST
# ============================================================

@app.post("/api/patient/request")
def patient_request(
    req: schemas.PatientRequest,
    db: Session = Depends(get_db)
):
    """
    Registers patient request.

    Pipeline:
    1. AI specialty + urgency classification
    2. Location resolution
    3. Patient creation
    4. Doctor/hospital matching
    5. Appointment slot optimization
    """

    # --------------------------------------------------------
    # 1. AI CLASSIFICATION
    # --------------------------------------------------------

    ai_res = classify_symptoms(req.symptoms)

    # --------------------------------------------------------
    # 2. LOCATION
    # --------------------------------------------------------

    lat, lon = resolve_location_to_coords(req.location)

    # --------------------------------------------------------
    # 3. CREATE PATIENT
    # --------------------------------------------------------

    db_patient = Patient(
        name=req.name,
        age=req.age,
        symptoms=req.symptoms,
        location_name=req.location,
        latitude=lat,
        longitude=lon,
        preferred_date=req.preferred_date,
        preferred_time=req.preferred_time,
    )

    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    # --------------------------------------------------------
    # 4. FIND DOCTORS
    # --------------------------------------------------------

    recommendations = find_and_rank_doctors(
        db,
        lat,
        lon,
        ai_res["specialty"]
    )

    # --------------------------------------------------------
    # 5. OPTIMIZE APPOINTMENT SLOT
    # --------------------------------------------------------

    appointment_recommendation = None

    preferred_datetime = (
        f"{req.preferred_date} {req.preferred_time}"
    )

    available_candidates = [
        doctor
        for doctor in recommendations.get("doctors", [])
        if doctor["available_now"]
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

        except (ValueError, TypeError, KeyError):
            continue

        # Waiting-time penalty.
        # Every 20 minutes of waiting reduces effective score by 1.
        wait_penalty = min(
            slot["wait_minutes"] / 20,
            20
        )

        effective_score = round(
            doctor["score"] - wait_penalty,
            1
        )

        candidate_slots.append({
            **doctor,
            **slot,
            "effective_score": effective_score,
        })

    if candidate_slots:

        candidate_slots.sort(
            key=lambda candidate: (
                -candidate["effective_score"],
                candidate["wait_minutes"],
                candidate["distance_km"],
            )
        )

        best = candidate_slots[0]

        if best["wait_minutes"] == 0:
            delay_description = "at the preferred time"
        else:
            delay_description = (
                f"after an estimated "
                f"{best['wait_minutes']}-minute delay"
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
                f"Best available slot {delay_description}, based on "
                "specialty match, availability, distance, queue, "
                "workload, hospital capacity, and existing appointments."
            ),
        }

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "patient_id": db_patient.patient_id,
        "classification": ai_res,
        "location": {
            "latitude": lat,
            "longitude": lon,
        },
        "recommendations": recommendations,
        "appointment_recommendation": appointment_recommendation,
    }


# ============================================================
# GET DOCTORS
# ============================================================

@app.get(
    "/api/doctors",
    response_model=List[Dict[str, Any]]
)
def get_doctors(
    specialty: Optional[str] = None,
    db: Session = Depends(get_db)
):

    query = db.query(Doctor)

    if specialty:
        query = query.filter(
            Doctor.specialty.ilike(specialty)
        )

    docs = query.all()

    result = []

    for doctor in docs:

        result.append({
            "doctor_id": doctor.doctor_id,
            "name": doctor.name,
            "specialty": doctor.specialty,
            "qualification": doctor.qualification,
            "experience_years": doctor.experience_years,
            "available_now": doctor.available_now,
            "queue_count": doctor.queue_count,
            "workload": doctor.workload,
            "rating": doctor.rating,
            "hospital_name": (
                doctor.hospital.name
                if doctor.hospital
                else "Private Clinic"
            ),
        })

    return result


# ============================================================
# RECOMMENDED DOCTORS
# ============================================================

@app.get(
    "/api/doctors/recommend",
    response_model=schemas.DoctorRecommendResponse
)
def get_recommended_doctors(
    location: str = Query(
        ...,
        description="Patient location name"
    ),
    specialty: str = Query(
        ...,
        description="Target medical specialty"
    ),
    db: Session = Depends(get_db)
):

    lat, lon = resolve_location_to_coords(location)

    return find_and_rank_doctors(
        db,
        lat,
        lon,
        specialty
    )


# ============================================================
# NEARBY HOSPITALS
# ============================================================

@app.get("/api/hospitals/nearby")
def get_nearby_hospitals(
    location: str,
    db: Session = Depends(get_db)
):

    lat, lon = resolve_location_to_coords(location)

    hospitals = db.query(Hospital).all()

    from distance import haversine_distance

    result = []

    for hospital in hospitals:

        distance = haversine_distance(
            hospital.latitude,
            hospital.longitude,
            lat,
            lon
        )

        occupancy_rate = (
            (hospital.current_occupancy /
             hospital.total_capacity) * 100
            if hospital.total_capacity > 0
            else 0
        )

        icu_occupancy_rate = (
            (hospital.icu_occupancy /
             hospital.icu_capacity) * 100
            if hospital.icu_capacity > 0
            else 0
        )

        result.append({
            "hospital_id": hospital.hospital_id,
            "name": hospital.name,
            "address": hospital.address,
            "distance_km": round(distance, 2),
            "occupancy_rate": round(
                occupancy_rate,
                1
            ),
            "icu_occupancy_rate": round(
                icu_occupancy_rate,
                1
            ),
            "emergency_available": hospital.emergency_available,
        })

    result.sort(
        key=lambda x: x["distance_km"]
    )

    return result


# ============================================================
# CREATE APPOINTMENT
# ============================================================

@app.post("/api/appointments")
def create_appointment(
    req: schemas.AppointmentCreate,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. LOCATION
    # --------------------------------------------------------

    lat, lon = resolve_location_to_coords(
        req.location
    )

    # --------------------------------------------------------
    # 2. FIND / CREATE PATIENT
    # --------------------------------------------------------

    patient = (
        db.query(Patient)
        .filter(
            Patient.name == req.name,
            Patient.symptoms == req.symptoms
        )
        .first()
    )

    if not patient:

        appointment_date = req.appointment_time.split()[0]
        appointment_time = req.appointment_time.split()[1]

        patient = Patient(
            name=req.name,
            age=req.age,
            symptoms=req.symptoms,
            location_name=req.location,
            latitude=lat,
            longitude=lon,
            preferred_date=appointment_date,
            preferred_time=appointment_time,
        )

        db.add(patient)
        db.commit()
        db.refresh(patient)

    # --------------------------------------------------------
    # 3. CHECK DOCTOR
    # --------------------------------------------------------

    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.doctor_id == req.doctor_id
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail=f"Doctor '{req.doctor_id}' not found"
        )

    # --------------------------------------------------------
    # 4. OPTIMIZE SLOT
    # --------------------------------------------------------

    schedule_res = calculate_appointment_slot(
        db=db,
        doctor_id=req.doctor_id,
        priority=req.priority,
        preferred_time_str=req.appointment_time,
        duration_mins=doctor.consultation_duration,
    )

    # --------------------------------------------------------
    # 5. CREATE APPOINTMENT ID
    # --------------------------------------------------------

    app_id = (
        f"A"
        f"{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    )

    # --------------------------------------------------------
    # 6. SAVE APPOINTMENT
    # --------------------------------------------------------

    db_app = Appointment(
        appointment_id=app_id,
        patient_id=patient.patient_id,
        patient_name=patient.name,
        doctor_id=req.doctor_id,
        hospital_id=req.hospital_id,
        appointment_time=schedule_res["scheduled_time"],
        priority=req.priority,
        estimated_duration=doctor.consultation_duration,
        status=schedule_res["status"],
        notes=schedule_res["notes"],
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
            "doctor_name": doctor.name,
            "hospital_id": db_app.hospital_id,
            "hospital_name": (
                doctor.hospital.name
                if doctor.hospital
                else "Private Clinic"
            ),
            "appointment_time": db_app.appointment_time,
            "priority": db_app.priority,
            "status": db_app.status,
            "notes": db_app.notes,
        },
        "shifted_appointments":
            schedule_res["shifted_appointments"],
    }


# ============================================================
# GET SINGLE APPOINTMENT
# ============================================================

@app.get("/api/appointments/{id}")
def get_appointment(
    id: str,
    db: Session = Depends(get_db)
):

    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.appointment_id == id
        )
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    return appointment


# ============================================================
# GET ALL APPOINTMENTS
# ============================================================

@app.get("/api/appointments")
def get_all_appointments(
    db: Session = Depends(get_db)
):

    appointments = db.query(Appointment).all()

    result = []

    for appointment in appointments:

        doctor = (
            db.query(Doctor)
            .filter(
                Doctor.doctor_id ==
                appointment.doctor_id
            )
            .first()
        )

        hospital = (
            db.query(Hospital)
            .filter(
                Hospital.hospital_id ==
                appointment.hospital_id
            )
            .first()
        )

        result.append({
            "appointment_id":
                appointment.appointment_id,

            "patient_name":
                appointment.patient_name,

            "doctor_name":
                doctor.name
                if doctor
                else appointment.doctor_id,

            "hospital_name":
                hospital.name
                if hospital
                else appointment.hospital_id,

            "appointment_time":
                appointment.appointment_time,

            "priority":
                appointment.priority,

            "status":
                appointment.status,

            "notes":
                appointment.notes,
        })

    return result


# ============================================================
# EMERGENCY SIMULATION
# ============================================================

@app.post("/api/events/emergency")
def simulate_emergency(
    req: Dict[str, Any] = Body(default={}),
    db: Session = Depends(get_db)
):

    """
    Simulates emergency patient arrival.

    Steps:
    1. Classify symptoms
    2. Force EMERGENCY priority
    3. Find best available doctor
    4. Schedule immediately
    5. Shift affected appointments
    """

    name = req.get(
        "name",
        "Emergency Patient"
    )

    age = req.get(
        "age",
        45
    )

    symptoms = req.get(
        "symptoms",
        "Chest pain and breathing difficulty"
    )

    location = req.get(
        "location",
        "Civil Lines"
    )

    preferred_time = req.get(
        "preferred_time",
        datetime.now().strftime(
            "%Y-%m-%d %H:%M"
        )
    )

    # --------------------------------------------------------
    # 1. CLASSIFY
    # --------------------------------------------------------

    ai_res = classify_symptoms(symptoms)

    # Emergency overrides normal urgency.
    ai_res["urgency"] = "EMERGENCY"

    # --------------------------------------------------------
    # 2. LOCATION
    # --------------------------------------------------------

    lat, lon = resolve_location_to_coords(
        location
    )

    # --------------------------------------------------------
    # 3. FIND DOCTORS
    # --------------------------------------------------------

    recommendations = find_and_rank_doctors(
        db,
        lat,
        lon,
        ai_res["specialty"]
    )

    if not recommendations.get("doctors"):

        recommendations = find_and_rank_doctors(
            db,
            lat,
            lon,
            "General Medicine"
        )

    if not recommendations.get("doctors"):
        raise HTTPException(
            status_code=503,
            detail="No available doctors found for emergency."
        )

    best_doc = recommendations["doctors"][0]

    # --------------------------------------------------------
    # 4. SCHEDULE EMERGENCY
    # --------------------------------------------------------

    schedule_res = calculate_appointment_slot(
        db=db,
        doctor_id=best_doc["doctor_id"],
        priority="EMERGENCY",
        preferred_time_str=preferred_time,
        duration_mins=best_doc["consultation_duration"],
    )

    # --------------------------------------------------------
    # 5. CREATE PATIENT
    # --------------------------------------------------------

    p = Patient(
        name=name,
        age=age,
        symptoms=symptoms,
        location_name=location,
        latitude=lat,
        longitude=lon,
        preferred_date=preferred_time.split()[0],
        preferred_time=preferred_time.split()[1],
    )

    db.add(p)
    db.commit()
    db.refresh(p)

    # --------------------------------------------------------
    # 6. CREATE EMERGENCY APPOINTMENT
    # --------------------------------------------------------

    app_id = (
        f"E"
        f"{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
    )

    emergency_appointment = Appointment(
        appointment_id=app_id,
        patient_id=p.patient_id,
        patient_name=p.name,
        doctor_id=best_doc["doctor_id"],
        hospital_id=best_doc["hospital"]["hospital_id"],
        appointment_time=schedule_res["scheduled_time"],
        priority="EMERGENCY",
        estimated_duration=best_doc["consultation_duration"],
        status="BOOKED",
        notes="🚨 EMERGENCY CASE SCHEDULED IMMEDIATELY.",
    )

    db.add(emergency_appointment)
    db.commit()

    # --------------------------------------------------------
    # 7. KEEP DOCTOR ACTIVE
    # --------------------------------------------------------

    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.doctor_id ==
            best_doc["doctor_id"]
        )
        .first()
    )

    if doctor:
        doctor.available_now = True
        doctor.queue_count = (
            (doctor.queue_count or 0) + 1
        )

    db.commit()

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message":
            "Emergency successfully scheduled.",

        "appointment_id":
            app_id,

        "patient": {
            "name":
                name,

            "specialty":
                ai_res["specialty"],

            "urgency":
                "EMERGENCY",
        },

        "assigned_doctor":
            best_doc["name"],

        "assigned_hospital":
            best_doc["hospital"]["name"],

        "scheduled_time":
            schedule_res["scheduled_time"],

        "shifted_appointments":
            schedule_res["shifted_appointments"],
    }


# ============================================================
# DOCTOR UNAVAILABLE
# ============================================================

@app.post("/api/events/doctor-unavailable")
def simulate_doctor_unavailable(
    req: Dict[str, str] = Body(default={}),
    doctor_id: Optional[str] = Query(
        None,
        description="Doctor ID"
    ),
    db: Session = Depends(get_db)
):

    # Accept doctor_id either from:
    # JSON body OR query parameter.

    requested_doctor_id = (
        req.get("doctor_id")
        if req
        else None
    )

    requested_doctor_id = (
        requested_doctor_id
        or doctor_id
    )

    if not requested_doctor_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "doctor_id required. "
                "Example: "
                '{"doctor_id":"D001"}'
            )
        )

    # --------------------------------------------------------
    # FIND DOCTOR
    # --------------------------------------------------------

    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.doctor_id ==
            requested_doctor_id
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    # --------------------------------------------------------
    # MARK UNAVAILABLE
    # --------------------------------------------------------

    doctor.available_now = False
    db.commit()

    # --------------------------------------------------------
    # FIND AFFECTED APPOINTMENTS
    # --------------------------------------------------------

    affected_apps = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id ==
            requested_doctor_id,
            Appointment.status != "CANCELLED"
        )
        .all()
    )

    reallocations = []

    # --------------------------------------------------------
    # REALLOCATE EACH APPOINTMENT
    # --------------------------------------------------------

    for appointment in affected_apps:

        old_time = appointment.appointment_time

        # Default Kanpur coordinates.
        p_lat = 26.456
        p_lon = 80.331

        if appointment.patient:

            if appointment.patient.latitude:
                p_lat = appointment.patient.latitude

            if appointment.patient.longitude:
                p_lon = appointment.patient.longitude

        alternative_recommendations = (
            find_and_rank_doctors(
                db,
                p_lat,
                p_lon,
                doctor.specialty
            )
        )

        valid_doctors = [
            d
            for d in alternative_recommendations.get(
                "doctors",
                []
            )
            if (
                d["doctor_id"] !=
                requested_doctor_id
                and d["available_now"]
            )
        ]

        # ----------------------------------------------------
        # ALTERNATIVE FOUND
        # ----------------------------------------------------

        if valid_doctors:

            best_alt = valid_doctors[0]

            schedule_result = calculate_appointment_slot(
                db=db,
                doctor_id=best_alt["doctor_id"],
                priority=appointment.priority,
                preferred_time_str=appointment.appointment_time,
                duration_mins=best_alt[
                    "consultation_duration"
                ],
            )

            appointment.doctor_id = (
                best_alt["doctor_id"]
            )

            appointment.hospital_id = (
                best_alt["hospital"]["hospital_id"]
            )

            appointment.appointment_time = (
                schedule_result["scheduled_time"]
            )

            appointment.status = "REALLOCATED"

            appointment.notes = (
                f"Reallocated from {doctor.name} "
                f"(unavailable) to "
                f"{best_alt['name']} at "
                f"{best_alt['hospital']['name']}."
            )

            reallocations.append({
                "appointment_id":
                    appointment.appointment_id,

                "patient_name":
                    appointment.patient_name,

                "original_doctor":
                    doctor.name,

                "reallocated_doctor":
                    best_alt["name"],

                "reallocated_hospital":
                    best_alt["hospital"]["name"],

                "old_time":
                    old_time,

                "new_time":
                    schedule_result[
                        "scheduled_time"
                    ],

                "notes":
                    appointment.notes,
            })

        # ----------------------------------------------------
        # NO ALTERNATIVE
        # ----------------------------------------------------

        else:

            appointment.status = "REALLOCATED"

            appointment.notes = (
                f"Unassigned: No alternative "
                f"specialist in {doctor.specialty} "
                f"available. Specialist escalation "
                f"triggered."
            )

            reallocations.append({
                "appointment_id":
                    appointment.appointment_id,

                "patient_name":
                    appointment.patient_name,

                "original_doctor":
                    doctor.name,

                "reallocated_doctor":
                    "Specialist Escalation Needed",

                "reallocated_hospital":
                    "N/A",

                "old_time":
                    old_time,

                "new_time":
                    "N/A",

                "notes":
                    appointment.notes,
            })

    # --------------------------------------------------------
    # RESET ORIGINAL DOCTOR
    # --------------------------------------------------------

    doctor.queue_count = 0
    doctor.workload = 0.0

    db.commit()

    return {
        "message":
            f"Doctor {doctor.name} marked unavailable.",

        "affected_appointments_count":
            len(affected_apps),

        "reallocations":
            reallocations,
    }


# ============================================================
# CANCEL APPOINTMENT
# ============================================================

@app.post("/api/events/cancel")
def simulate_cancel_appointment(
    req: Dict[str, str] = Body(default={}),
    appointment_id: Optional[str] = Query(
        None,
        description="Appointment ID"
    ),
    db: Session = Depends(get_db)
):

    requested_appointment_id = (
        req.get("appointment_id")
        if req
        else None
    )

    requested_appointment_id = (
        requested_appointment_id
        or appointment_id
    )

    if not requested_appointment_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "appointment_id required. "
                "Example: "
                '{"appointment_id":"A001"}'
            )
        )

    # Verify appointment exists before calling scheduler.

    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.appointment_id ==
            requested_appointment_id
        )
        .first()
    )

    if not appointment:

        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.status == "CANCELLED":

        return {
            "message":
                f"Appointment "
                f"{requested_appointment_id} "
                f"is already cancelled.",

            "shifted_appointments": []
        }

    result = cancel_appointment_and_pull_forward(
        db,
        requested_appointment_id
    )

    return result


# ============================================================
# QUEUE REBALANCING
# ============================================================

@app.post("/api/optimization/reallocate")
def trigger_queue_rebalancing(
    db: Session = Depends(get_db)
):

    overloaded_doctors = (
        db.query(Doctor)
        .filter(
            Doctor.queue_count > 5,
            Doctor.available_now == True
        )
        .all()
    )

    reallocations = []

    for doctor in overloaded_doctors:

        low_priority_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id ==
                doctor.doctor_id,

                Appointment.priority ==
                "LOW",

                Appointment.status !=
                "CANCELLED"
            )
            .all()
        )

        for appointment in low_priority_appointments:

            p_lat = 26.456
            p_lon = 80.331

            if appointment.patient:

                if appointment.patient.latitude:
                    p_lat = (
                        appointment.patient.latitude
                    )

                if appointment.patient.longitude:
                    p_lon = (
                        appointment.patient.longitude
                    )

            recommendations = (
                find_and_rank_doctors(
                    db,
                    p_lat,
                    p_lon,
                    doctor.specialty
                )
            )

            better_alternatives = [
                d
                for d in recommendations.get(
                    "doctors",
                    []
                )
                if (
                    d["doctor_id"] !=
                    doctor.doctor_id
                    and d["available_now"]
                    and d["queue_count"] <
                    doctor.queue_count - 1
                )
            ]

            if not better_alternatives:
                continue

            best_alt = better_alternatives[0]

            old_time = appointment.appointment_time

            schedule_result = calculate_appointment_slot(
                db=db,
                doctor_id=best_alt["doctor_id"],
                priority="LOW",
                preferred_time_str=old_time,
                duration_mins=best_alt[
                    "consultation_duration"
                ],
            )

            appointment.doctor_id = (
                best_alt["doctor_id"]
            )

            appointment.hospital_id = (
                best_alt["hospital"]["hospital_id"]
            )

            appointment.appointment_time = (
                schedule_result["scheduled_time"]
            )

            appointment.status = "REALLOCATED"

            appointment.notes = (
                f"Rebalanced from overloaded "
                f"queue of {doctor.name} to "
                f"{best_alt['name']}."
            )

            reallocations.append({
                "appointment_id":
                    appointment.appointment_id,

                "patient_name":
                    appointment.patient_name,

                "original_doctor":
                    doctor.name,

                "reallocated_doctor":
                    best_alt["name"],

                "reallocated_hospital":
                    best_alt["hospital"]["name"],

                "old_time":
                    old_time,

                "new_time":
                    schedule_result[
                        "scheduled_time"
                    ],

                "reason":
                    appointment.notes,
            })

            doctor.queue_count = max(
                0,
                doctor.queue_count - 1
            )

            db.commit()

    return {
        "message":
            "Queue rebalancing completed. "
            f"Reallocated "
            f"{len(reallocations)} appointments.",

        "reallocations":
            reallocations,
    }


# ============================================================
# HOSPITAL DASHBOARD
# ============================================================

@app.get("/api/hospitals/{id}/dashboard")
def get_hospital_dashboard_stats(
    id: str,
    db: Session = Depends(get_db)
):

    hospital = (
        db.query(Hospital)
        .filter(
            Hospital.hospital_id == id
        )
        .first()
    )

    if not hospital:

        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    doctors = (
        db.query(Doctor)
        .filter(
            Doctor.hospital_id == id
        )
        .all()
    )

    available_doctors = sum(
        1
        for doctor in doctors
        if doctor.available_now
    )

    total_doctors = len(doctors)

    # --------------------------------------------------------
    # ACTIVE PATIENTS
    # --------------------------------------------------------

    waiting_count = (
        db.query(Appointment)
        .filter(
            Appointment.hospital_id == id,
            Appointment.status != "CANCELLED"
        )
        .count()
    )

    # --------------------------------------------------------
    # WAIT TIME
    # --------------------------------------------------------

    if waiting_count > 0:
        average_wait = min(
            90,
            10 + (waiting_count * 2)
        )
    else:
        average_wait = 21

    # --------------------------------------------------------
    # CAPACITY
    # --------------------------------------------------------

    capacity_percentage = (
        hospital.current_occupancy /
        hospital.total_capacity * 100
        if hospital.total_capacity > 0
        else 0
    )

    emergency_capacity_percentage = (
        hospital.icu_occupancy /
        hospital.icu_capacity * 100
        if hospital.icu_capacity > 0
        else 0
    )

    return {
        "hospital_id":
            hospital.hospital_id,

        "name":
            hospital.name,

        "doctors_available":
            f"{available_doctors} / {total_doctors}",

        "doctors_available_count":
            available_doctors,

        "total_doctors_count":
            total_doctors,

        "patients_waiting":
            waiting_count,

        "average_waiting_time_minutes":
            average_wait,

        "capacity_percentage":
            round(
                capacity_percentage,
                1
            ),

        "emergency_capacity_percentage":
            round(
                emergency_capacity_percentage,
                1
            ),
    }


# ============================================================
# ANALYTICS
# ============================================================

@app.get("/api/analytics")
def get_analytics_data(
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    total_hospitals = (
        db.query(Hospital).count()
    )

    total_doctors = (
        db.query(Doctor).count()
    )

    active_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.status !=
            "CANCELLED"
        )
        .count()
    )

    # --------------------------------------------------------
    # WAITING TIME
    # --------------------------------------------------------

    doctor_queues = (
        db.query(Doctor.queue_count)
        .all()
    )

    queue_sum = sum(
        q[0]
        for q in doctor_queues
        if q[0] is not None
    )

    if total_doctors > 0:

        average_waiting_time = max(
            10,
            min(
                120,
                int(
                    queue_sum *
                    15 /
                    total_doctors
                )
            )
        )

    else:
        average_waiting_time = 21

    # --------------------------------------------------------
    # HOSPITAL UTILIZATION
    # --------------------------------------------------------

    hospitals = (
        db.query(Hospital).all()
    )

    utilization_values = [
        (
            h.current_occupancy /
            h.total_capacity
        )
        for h in hospitals
        if h.total_capacity > 0
    ]

    if utilization_values:

        average_utilization = round(
            (
                sum(utilization_values) /
                len(utilization_values)
            ) * 100,
            1
        )

    else:
        average_utilization = 0.0

    # --------------------------------------------------------
    # EMERGENCY CASES
    # --------------------------------------------------------

    emergency_count = (
        db.query(Appointment)
        .filter(
            Appointment.priority ==
            "EMERGENCY"
        )
        .count()
    )

    # --------------------------------------------------------
    # HOSPITAL CAPACITY CHART
    # --------------------------------------------------------

    hospital_capacity_chart = []

    for hospital in hospitals[:8]:

        occupancy_rate = (
            hospital.current_occupancy /
            hospital.total_capacity * 100
            if hospital.total_capacity > 0
            else 0
        )

        hospital_capacity_chart.append({
            "name":
                hospital.name
                .split("(")[0]
                .strip(),

            "occupancy":
                hospital.current_occupancy,

            "capacity":
                hospital.total_capacity,

            "occupancy_rate":
                round(
                    occupancy_rate,
                    1
                ),
        })

    # --------------------------------------------------------
    # DOCTOR WORKLOAD
    # --------------------------------------------------------

    doctors = (
        db.query(Doctor)
        .order_by(
            Doctor.workload.desc()
        )
        .limit(8)
        .all()
    )

    doctor_workload_chart = []

    for doctor in doctors:

        doctor_workload_chart.append({
            "name":
                doctor.name,

            "specialty":
                doctor.specialty,

            "workload":
                doctor.workload,
        })

    # --------------------------------------------------------
    # SPECIALTY DEMAND
    # --------------------------------------------------------

    specialty_counts = {}

    appointments = (
        db.query(Appointment).all()
    )

    for appointment in appointments:

        doctor = (
            db.query(Doctor)
            .filter(
                Doctor.doctor_id ==
                appointment.doctor_id
            )
            .first()
        )

        if doctor:

            specialty_counts[
                doctor.specialty
            ] = (
                specialty_counts.get(
                    doctor.specialty,
                    0
                ) + 1
            )

    specialty_demand_chart = [
        {
            "name": specialty,
            "value": count
        }
        for specialty, count
        in specialty_counts.items()
    ]

    # --------------------------------------------------------
    # FALLBACK CHART DATA
    # --------------------------------------------------------

    if not specialty_demand_chart:

        specialty_demand_chart = [
            {
                "name": "Cardiology",
                "value": 5
            },
            {
                "name": "Neurology",
                "value": 3
            },
            {
                "name": "Pulmonology",
                "value": 4
            },
            {
                "name": "General Medicine",
                "value": 8
            },
        ]

    # --------------------------------------------------------
    # PRIORITY DISTRIBUTION
    # --------------------------------------------------------

    priorities = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "EMERGENCY"
    ]

    priority_distribution = []

    for priority in priorities:

        count = (
            db.query(Appointment)
            .filter(
                Appointment.priority ==
                priority
            )
            .count()
        )

        priority_distribution.append({
            "name":
                priority,

            "value":
                count,
        })

    # --------------------------------------------------------
    # WAITING TIME BY SPECIALTY
    # --------------------------------------------------------

    specialties = list(
        set(
            doctor.specialty
            for doctor
            in db.query(Doctor).all()
        )
    )

    waiting_time_by_specialty = []

    for specialty in specialties[:6]:

        specialty_doctors = (
            db.query(Doctor)
            .filter(
                Doctor.specialty ==
                specialty
            )
            .all()
        )

        if specialty_doctors:

            average_queue = (
                sum(
                    doctor.queue_count
                    for doctor
                    in specialty_doctors
                )
                /
                len(specialty_doctors)
            )

            average_wait = round(
                average_queue * 20,
                0
            )

            waiting_time_by_specialty.append({
                "specialty":
                    specialty,

                "waiting_time":
                    max(
                        5,
                        average_wait
                    ),
            })

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "summary": {

            "total_hospitals":
                total_hospitals,

            "total_doctors":
                total_doctors,

            "active_appointments":
                active_appointments,

            "average_waiting_time":
                f"{average_waiting_time} min",

            "hospital_utilization":
                f"{average_utilization}%",

            "emergency_cases":
                emergency_count,
        },

        "charts": {

            "hospital_capacity":
                hospital_capacity_chart,

            "doctor_workload":
                doctor_workload_chart,

            "specialty_demand":
                specialty_demand_chart,

            "priority_distribution":
                priority_distribution,

            "waiting_time_by_specialty":
                waiting_time_by_specialty,
        },
    }
