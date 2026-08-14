from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Hospital(Base):
    __tablename__ = "hospitals"

    hospital_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    hospital_type = Column(String)
    address = Column(String)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_capacity = Column(Integer, default=100)
    current_occupancy = Column(Integer, default=0)
    icu_capacity = Column(Integer, default=0)
    icu_occupancy = Column(Integer, default=0)
    emergency_available = Column(Boolean, default=True)
    teleconsultation_available = Column(Boolean, default=False)

    doctors = relationship("Doctor", back_populates="hospital")
    appointments = relationship("Appointment", back_populates="hospital")

class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    qualification = Column(String)
    specialty = Column(String, nullable=False)
    clinic_or_affiliation = Column(String)
    hospital_id = Column(String, ForeignKey("hospitals.hospital_id"))
    experience_years = Column(Integer, default=0)
    consultation_duration = Column(Integer, default=15)  # minutes
    available_now = Column(Boolean, default=True)
    queue_count = Column(Integer, default=0)
    max_daily_patients = Column(Integer, default=20)
    workload = Column(Float, default=0.0)  # percentage
    emergency_available = Column(Boolean, default=True)
    teleconsultation_available = Column(Boolean, default=False)
    rating = Column(Float, default=4.0)

    hospital = relationship("Hospital", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    symptoms = Column(String, nullable=False)
    location_name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    preferred_date = Column(String)
    preferred_time = Column(String)

    appointments = relationship("Appointment", back_populates="patient")

class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id = Column(String, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=True)
    patient_name = Column(String, nullable=False)
    doctor_id = Column(String, ForeignKey("doctors.doctor_id"), nullable=False)
    hospital_id = Column(String, ForeignKey("hospitals.hospital_id"), nullable=False)
    appointment_time = Column(String, nullable=False)  # stored as string "YYYY-MM-DD HH:MM"
    priority = Column(String, default="LOW")  # LOW, MEDIUM, HIGH, EMERGENCY
    estimated_duration = Column(Integer, default=15)  # minutes
    status = Column(String, default="BOOKED")  # BOOKED, CANCELLED, SHIFTED, REALLOCATED
    notes = Column(String, nullable=True)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    hospital = relationship("Hospital", back_populates="appointments")
