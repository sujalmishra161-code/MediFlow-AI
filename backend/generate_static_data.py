import csv
import json

def generate_static_data():
    hospitals = []
    with open("hospitals.csv", mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            hospitals.append({
                "hospital_id": row["hospital_id"].strip(),
                "name": row["hospital_name"].strip(),
                "hospital_type": row["hospital_type"].strip(),
                "address": row["address"].strip(),
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "total_capacity": int(row["total_capacity_SIMULATED"]),
                "current_occupancy": int(row["current_occupancy_SIMULATED"]),
                "icu_capacity": int(row["icu_capacity_SIMULATED"]),
                "icu_occupancy": int(row["icu_occupancy_SIMULATED"]),
                "emergency_available": row["emergency_available_SIMULATED"].strip().lower() in ("true", "1"),
                "teleconsultation_available": row["teleconsultation_SIMULATED"].strip().lower() in ("true", "1")
            })

    doctors = []
    with open("doctors.csv", mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            doctors.append({
                "doctor_id": row["doctor_id"].strip(),
                "name": row["doctor_name"].strip(),
                "qualification": row["qualification"].strip(),
                "specialty": row["specialty"].strip(),
                "clinic_or_affiliation": row["clinic_or_affiliation"].strip(),
                "hospital_id": row["hospital_id"].strip(),
                "experience_years": int(row["experience_years_SIMULATED"]),
                "consultation_duration": int(row["consultation_minutes_SIMULATED"]),
                "available_now": row["available_now_SIMULATED"].strip().lower() in ("true", "1"),
                "queue_count": int(row["current_queue_SIMULATED"]),
                "max_daily_patients": int(row["max_daily_patients_SIMULATED"]),
                "workload": float(row["workload_percent_SIMULATED"]),
                "emergency_available": row["emergency_available_SIMULATED"].strip().lower() in ("true", "1"),
                "teleconsultation_available": row["teleconsultation_SIMULATED"].strip().lower() in ("true", "1"),
                "rating": float(row["rating_SIMULATED"])
            })

    appointments = []
    with open("appointments_seed.csv", mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            appointments.append({
                "appointment_id": row["appointment_id"].strip(),
                "patient_name": f"Patient {row['appointment_id'].strip()}",
                "doctor_id": row["doctor_id"].strip(),
                "hospital_id": row["hospital_id"].strip(),
                "appointment_time": row["appointment_time"].strip(),
                "priority": row["priority"].strip(),
                "estimated_duration": int(row["estimated_duration_minutes_SIMULATED"]),
                "status": row["status"].strip(),
                "notes": "Initial seeded appointment."
            })

    output_content = f"""// Auto-generated from Kanpur CSV datasets. Do not edit directly.
export const INITIAL_HOSPITALS = {json.dumps(hospitals, indent=2)};
export const INITIAL_DOCTORS = {json.dumps(doctors, indent=2)};
export const INITIAL_APPOINTMENTS = {json.dumps(appointments, indent=2)};
"""

    with open("frontend/src/data.js", mode="w", encoding="utf-8") as f:
        f.write(output_content)
    print("Successfully generated frontend/src/data.js with static fallback datasets!")

if __name__ == "__main__":
    generate_static_data()
