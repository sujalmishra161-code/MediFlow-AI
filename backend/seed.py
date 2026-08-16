import csv
import os

from database import SessionLocal, Base, engine
from models import Hospital, Doctor, Appointment


def str_to_bool(val):
    return val.strip().lower() in ("true", "1", "yes")


# Get the directory where seed.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# CSV files are currently in the repository root
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))


def seed_database():
    # Create tables if they don't already exist.
    # NEVER drop existing tables here.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # Check whether database is already seeded
        # ---------------------------------------------------------
        if db.query(Doctor).count() > 0:
            print("Database already seeded. Skipping seed.")
            return

        # ---------------------------------------------------------
        # 1. Seed Hospitals
        # ---------------------------------------------------------
        hospitals_path = os.path.join(DATA_DIR, "hospitals.csv")

        print(f"Seeding hospitals from {hospitals_path}...")

        if not os.path.exists(hospitals_path):
            raise FileNotFoundError(
                f"hospitals.csv not found at: {hospitals_path}"
            )

        with open(hospitals_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row in reader:
                hospital = Hospital(
                    hospital_id=row["hospital_id"].strip(),
                    name=row["hospital_name"].strip(),
                    hospital_type=row["hospital_type"].strip(),
                    address=row["address"].strip(),
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    total_capacity=int(
                        row["total_capacity_SIMULATED"]
                    ),
                    current_occupancy=int(
                        row["current_occupancy_SIMULATED"]
                    ),
                    icu_capacity=int(
                        row["icu_capacity_SIMULATED"]
                    ),
                    icu_occupancy=int(
                        row["icu_occupancy_SIMULATED"]
                    ),
                    emergency_available=str_to_bool(
                        row["emergency_available_SIMULATED"]
                    ),
                    teleconsultation_available=str_to_bool(
                        row["teleconsultation_SIMULATED"]
                    )
                )

                db.add(hospital)

        db.commit()
        print("Hospitals seeded successfully.")

        # ---------------------------------------------------------
        # 2. Seed Doctors
        # ---------------------------------------------------------
        doctors_path = os.path.join(DATA_DIR, "doctors.csv")

        print(f"Seeding doctors from {doctors_path}...")

        if not os.path.exists(doctors_path):
            raise FileNotFoundError(
                f"doctors.csv not found at: {doctors_path}"
            )

        with open(doctors_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row in reader:
                doctor = Doctor(
                    doctor_id=row["doctor_id"].strip(),
                    name=row["doctor_name"].strip(),
                    qualification=row["qualification"].strip(),
                    specialty=row["specialty"].strip(),
                    clinic_or_affiliation=row[
                        "clinic_or_affiliation"
                    ].strip(),
                    hospital_id=row["hospital_id"].strip(),
                    experience_years=int(
                        row["experience_years_SIMULATED"]
                    ),
                    consultation_duration=int(
                        row["consultation_minutes_SIMULATED"]
                    ),
                    available_now=str_to_bool(
                        row["available_now_SIMULATED"]
                    ),
                    queue_count=int(
                        row["current_queue_SIMULATED"]
                    ),
                    max_daily_patients=int(
                        row["max_daily_patients_SIMULATED"]
                    ),
                    workload=float(
                        row["workload_percent_SIMULATED"]
                    ),
                    emergency_available=str_to_bool(
                        row["emergency_available_SIMULATED"]
                    ),
                    teleconsultation_available=str_to_bool(
                        row["teleconsultation_SIMULATED"]
                    ),
                    rating=float(
                        row["rating_SIMULATED"]
                    )
                )

                db.add(doctor)

        db.commit()
        print("Doctors seeded successfully.")

        # ---------------------------------------------------------
        # 3. Seed Appointments
        # ---------------------------------------------------------
        appointments_path = os.path.join(
            DATA_DIR,
            "appointments_seed.csv"
        )

        print(
            f"Seeding appointments from {appointments_path}..."
        )

        if not os.path.exists(appointments_path):
            raise FileNotFoundError(
                f"appointments_seed.csv not found at: "
                f"{appointments_path}"
            )

        with open(
            appointments_path,
            mode="r",
            encoding="utf-8"
        ) as f:

            reader = csv.DictReader(f)

            for row in reader:
                appointment_id = row[
                    "appointment_id"
                ].strip()

                patient_name = f"Patient {appointment_id}"

                appointment = Appointment(
                    appointment_id=appointment_id,
                    patient_id=None,
                    patient_name=patient_name,
                    doctor_id=row["doctor_id"].strip(),
                    hospital_id=row["hospital_id"].strip(),
                    appointment_time=row[
                        "appointment_time"
                    ].strip(),
                    priority=row["priority"].strip(),
                    estimated_duration=int(
                        row[
                            "estimated_duration_minutes_SIMULATED"
                        ]
                    ),
                    status=row["status"].strip(),
                    notes="Initial seeded appointment."
                )

                db.add(appointment)

        db.commit()

        print("Appointments seeded successfully.")
        print("======================================")
        print("DATABASE SEEDED SUCCESSFULLY!")
        print("======================================")

    except Exception as e:
        db.rollback()

        print("======================================")
        print("ERROR SEEDING DATABASE")
        print("======================================")
        print(e)

        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
