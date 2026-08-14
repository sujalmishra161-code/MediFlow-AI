from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class PatientRequest(BaseModel):
    name: str
    age: int
    symptoms: str
    location: str
    preferred_date: str  # YYYY-MM-DD
    preferred_time: str  # HH:MM

class AIClassifyResponse(BaseModel):
    specialty: str
    urgency: str
    confidence: float

class DoctorRecommendation(BaseModel):
    doctor_id: str
    name: str
    specialty: str
    qualification: str
    rating: float
    available_now: bool
    hospital: Dict[str, Any]
    distance_km: float
    score: float
    breakdown: Dict[str, float]
    consultation_duration: int
    queue_count: int
    workload: float

class DoctorRecommendResponse(BaseModel):
    radius_km: float
    escalated: bool
    message: str
    doctors: List[DoctorRecommendation]
    escalation_options: Optional[Dict[str, Any]] = None

class AppointmentCreate(BaseModel):
    name: str
    age: int
    symptoms: str
    location: str
    doctor_id: str
    hospital_id: str
    appointment_time: str  # YYYY-MM-DD HH:MM
    priority: str

class AppointmentResponse(BaseModel):
    appointment_id: str
    patient_name: str
    doctor_name: str
    hospital_name: str
    appointment_time: str
    priority: str
    status: str
    notes: Optional[str] = None
