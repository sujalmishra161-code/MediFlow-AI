import re
from sqlalchemy.orm import Session
from models import Doctor, Hospital
from distance import haversine_distance

# Coordinates for common Kanpur locations referenced in the dataset
KANPUR_LOCATIONS = {
    "llr hospital": (26.4674, 80.3208),
    "hallet": (26.4674, 80.3208),
    "darshan purwa": (26.4674, 80.3208),
    "sarvodaya nagar": (26.477, 80.313),
    "regency": (26.477, 80.313),
    "meston road": (26.459, 80.343),
    "parade": (26.459, 80.343),
    "uhm": (26.459, 80.343),
    "birhana road": (26.4598, 80.3465),
    "kpm hospital": (26.4598, 80.3465),
    "naughara": (26.4598, 80.3465),
    "mall road": (26.4695, 80.3455),
    "chunniganj": (26.4695, 80.3455),
    "apollo spectra": (26.4695, 80.3455),
    "tatmil chauraha": (26.4475, 80.3425),
    "harris ganj": (26.4475, 80.3425),
    "krishna": (26.4475, 80.3425),
    "khalasi line": (26.481, 80.319),
    "ujala cygnus noble": (26.481, 80.319),
    "kanishk": (26.4805, 80.317),
    "kakadeo": (26.487, 80.305),
    "ujala cygnus kulwanti": (26.487, 80.305),
    "neuron": (26.49, 80.3),
    "panacea": (26.488, 80.302),
    "lajpat nagar": (26.465, 80.311),
    "lotus": (26.465, 80.311),
    "govind nagar": (26.465, 80.3095),
    "kanpur medical centre": (26.465, 80.3095),
    "double pulia": (26.49, 80.3),
    "kalyanpur": (26.512, 80.27),
    "lifetron": (26.512, 80.27),
    "vasant vihar": (26.414, 80.331),
    "naubasta": (26.414, 80.331),
    "dhanvantri": (26.414, 80.331),
    "mahadeva": (26.4145, 80.332),
    "hanspuram": (26.41, 80.33),
    "family hospital": (26.41, 80.33),
    "paramount": (26.409, 80.326),
    "baba nagar": (26.416, 80.338),
    "utkarsh": (26.416, 80.338),
    "new azad nagar": (26.43, 80.255),
    "k.p.s. hospital": (26.43, 80.255),
    "civil lines": (26.472, 80.354),
    "kidwai nagar": (26.43, 80.34),
    "kanpur": (26.456, 80.331),  # center fallback
}

def resolve_location_to_coords(location_str: str) -> tuple[float, float]:
    """
    Resolve patient address/location name to (latitude, longitude) coordinates.
    Tries regex coordinates first, then Kanpur lookup table, and defaults to Kanpur center.
    """
    if not location_str:
        return KANPUR_LOCATIONS["kanpur"]

    # Check if input is coordinates "lat, lon"
    match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", location_str)
    if match:
        return float(match.group(1)), float(match.group(2))

    norm_str = location_str.strip().lower()
    # Try exact matches in our lookup
    if norm_str in KANPUR_LOCATIONS:
        return KANPUR_LOCATIONS[norm_str]

    # Try partial matching
    for key, coords in KANPUR_LOCATIONS.items():
        if key in norm_str or norm_str in key:
            return coords

    # Default fallback to central Kanpur
    return KANPUR_LOCATIONS["kanpur"]


def calculate_doctor_score(
    doctor: Doctor,
    patient_lat: float,
    patient_lon: float,
    search_radius: float,
    target_specialty: str
) -> dict:
    """
    Implements the weighted ranking algorithm:
    - 30% Specialty Match
    - 20% Availability
    - 15% Distance
    - 15% Queue length
    - 10% Doctor Workload
    - 10% Hospital Capacity (Available capacity)
    """
    # 1. Specialty Match (30%)
    specialty_match = 1.0 if doctor.specialty.lower() == target_specialty.lower() else 0.0

    # 2. Availability (20%)
    availability = 1.0 if doctor.available_now else 0.0

    # 3. Distance (15%)
    dist = haversine_distance(
        doctor.hospital.latitude, doctor.hospital.longitude,
        patient_lat, patient_lon
    )
    if search_radius > 0:
        dist_score = max(0.0, 1.0 - (dist / search_radius))
    else:
        dist_score = 0.0

    # 4. Queue (15%)
    # Less queue is better. Normalize between 0 and 1. Cap max queue at 10.
    queue_score = max(0.0, 1.0 - (doctor.queue_count / 10.0))

    # 5. Doctor Workload (10%)
    # Lower workload percentage is better.
    workload_score = max(0.0, min(1.0, 1.0 - (doctor.workload / 100.0)))

    # 6. Hospital Capacity (10%)
    # More available capacity (lower occupancy) is better.
    h = doctor.hospital
    if h.total_capacity > 0:
        hosp_cap_score = max(0.0, min(1.0, 1.0 - (h.current_occupancy / h.total_capacity)))
    else:
        hosp_cap_score = 0.0

    # Combined score
    weighted_score = (
        0.30 * specialty_match +
        0.20 * availability +
        0.15 * dist_score +
        0.15 * queue_score +
        0.10 * workload_score +
        0.10 * hosp_cap_score
    )

    score_percent = round(weighted_score * 100, 1)

    return {
        "score": score_percent,
        "distance_km": round(dist, 2),
        "details": {
            "specialty_match": round(specialty_match * 100, 1),
            "availability": round(availability * 100, 1),
            "distance_score": round(dist_score * 100, 1),
            "queue_score": round(queue_score * 100, 1),
            "workload_score": round(workload_score * 100, 1),
            "hospital_capacity_score": round(hosp_cap_score * 100, 1)
        }
    }


def find_and_rank_doctors(
    db: Session,
    patient_lat: float,
    patient_lon: float,
    target_specialty: str
) -> dict:
    """
    Search doctors sequentially: 10 km -> 25 km -> 50 km.
    If still unavailable, trigger specialist escalation.
    """
    all_doctors = db.query(Doctor).join(Hospital).all()

    radii = [10.0, 25.0, 50.0]
    for r in radii:
        candidates = []
        for doc in all_doctors:
            # Must match specialty for standard search
            if doc.specialty.lower() == target_specialty.lower():
                dist = haversine_distance(
                    doc.hospital.latitude, doc.hospital.longitude,
                    patient_lat, patient_lon
                )
                if dist <= r:
                    score_info = calculate_doctor_score(doc, patient_lat, patient_lon, r, target_specialty)
                    candidates.append({
                        "doctor_id": doc.doctor_id,
                        "name": doc.name,
                        "specialty": doc.specialty,
                        "qualification": doc.qualification,
                        "rating": doc.rating,
                        "available_now": doc.available_now,
                        "hospital": {
                            "hospital_id": doc.hospital.hospital_id,
                            "name": doc.hospital.name,
                            "latitude": doc.hospital.latitude,
                            "longitude": doc.hospital.longitude,
                            "address": doc.hospital.address,
                        },
                        "distance_km": score_info["distance_km"],
                        "score": score_info["score"],
                        "breakdown": score_info["details"],
                        "consultation_duration": doc.consultation_duration,
                        "queue_count": doc.queue_count,
                        "workload": doc.workload
                    })

        if candidates:
            # Sort by score descending, then distance ascending
            candidates.sort(key=lambda x: (-x["score"], x["distance_km"]))
            return {
                "radius_km": r,
                "escalated": False,
                "message": f"Found {len(candidates)} doctors within {r} km.",
                "doctors": candidates[:3]  # Top 3
            }

    # If no doctor of that specialty found within 50 km, trigger Specialist Escalation
    return trigger_specialist_escalation(db, patient_lat, patient_lon, target_specialty)


def trigger_specialist_escalation(
    db: Session,
    patient_lat: float,
    patient_lon: float,
    target_specialty: str
) -> dict:
    """
    Specialist Escalation mode:
    - Finds nearest hospitals with target specialty (regardless of distance)
    - Finds teleconsultation available doctors for target specialty
    - Provides referrals
    """
    all_docs = db.query(Doctor).join(Hospital).all()
    
    # 1. Find nearest hospitals that have doctors in target specialty
    hospitals_offering = {}
    for doc in all_docs:
        if doc.specialty.lower() == target_specialty.lower():
            dist = haversine_distance(
                doc.hospital.latitude, doc.hospital.longitude,
                patient_lat, patient_lon
            )
            h_id = doc.hospital.hospital_id
            if h_id not in hospitals_offering or dist < hospitals_offering[h_id]["distance_km"]:
                hospitals_offering[h_id] = {
                    "hospital_id": doc.hospital.hospital_id,
                    "name": doc.hospital.name,
                    "distance_km": round(dist, 2),
                    "specialty": doc.specialty,
                    "available_time": "2:30 PM" if doc.doctor_id == "D022" else "4:00 PM" # Simulated availability
                }
    
    sorted_hospitals = sorted(list(hospitals_offering.values()), key=lambda x: x["distance_km"])

    # 2. Find teleconsultation options
    teleconsults = []
    for doc in all_docs:
        if doc.specialty.lower() == target_specialty.lower() and doc.teleconsultation_available:
            teleconsults.append({
                "doctor_id": doc.doctor_id,
                "name": doc.name,
                "specialty": doc.specialty,
                "qualification": doc.qualification,
                "available_time": "1:30 PM", # Simulated availability
                "rating": doc.rating
            })

    return {
        "radius_km": 50.0,
        "escalated": True,
        "message": f"No suitable specialist available within 10 km, 25 km, or 50 km. Activating Specialist Escalation.",
        "doctors": [],
        "escalation_options": {
            "recommended_hospitals": sorted_hospitals[:2],
            "teleconsultation": teleconsults[:2],
            "referral": {
                "message": "Referral to higher-level tertiary center (e.g., SGPGI Lucknow or GSVM Kanpur) is recommended.",
                "action": "Generate Digital Referral Certificate"
            }
        }
    }
