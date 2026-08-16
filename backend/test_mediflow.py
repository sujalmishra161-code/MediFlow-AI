import unittest
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
from models import Hospital, Doctor, Appointment, Patient
from ai import classify_symptoms
from distance import haversine_distance
from matching import resolve_location_to_coords, find_and_rank_doctors
from scheduler import (
    calculate_appointment_slot,
    cancel_appointment_and_pull_forward,
    parse_time,
    preview_appointment_slot,
)

class TestMediFlowAI(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Create database and seed it
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()
        
    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        
    def test_symptom_classification_demo(self):
        # Scenario 1 details: "Chest pain and breathing difficulty" -> Cardiology, HIGH
        res = classify_symptoms("Chest pain and breathing difficulty")
        self.assertEqual(res["specialty"], "Cardiology")
        self.assertEqual(res["urgency"], "HIGH")
        self.assertGreaterEqual(res["confidence"], 0.90)

    def test_haversine_distance(self):
        # Distance between H001 (26.4674, 80.3208) and H002 (26.459, 80.343)
        # Should be ~2.4 km
        dist = haversine_distance(26.4674, 80.3208, 26.459, 80.343)
        self.assertAlmostEqual(dist, 2.39, places=1)
        
    def test_location_resolution(self):
        coords = resolve_location_to_coords("Kalyanpur")
        self.assertEqual(coords, (26.512, 80.27))
        
        # Test coordinates string parsing
        coords_str = resolve_location_to_coords("26.48, 80.32")
        self.assertEqual(coords_str, (26.48, 80.32))

    def test_doctor_ranking_and_recommendation(self):
        # Recommended doctors for Cardiology from Kalyanpur
        lat, lon = resolve_location_to_coords("Kalyanpur")
        rec = find_and_rank_doctors(self.db, lat, lon, "Cardiology")
        
        self.assertFalse(rec["escalated"])
        self.assertGreater(len(rec["doctors"]), 0)
        # Verify recommended doctor (top element) has highest score
        scores = [d["score"] for d in rec["doctors"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_appointment_scheduling_and_queue_shifting(self):
        # Seed a doctor and create mock appointments
        doc = self.db.query(Doctor).filter(Doctor.specialty == "Cardiology").first()
        self.assertIsNotNone(doc)
        
        # Delete any existing test appointments for this doctor to start fresh
        self.db.query(Appointment).filter(
            Appointment.doctor_id == doc.doctor_id,
            Appointment.patient_name.like("Test Patient%")
        ).delete()
        self.db.commit()
        
        # 1. Create a LOW priority appointment at 10:00 AM
        sched1 = calculate_appointment_slot(
            db=self.db,
            doctor_id=doc.doctor_id,
            priority="LOW",
            preferred_time_str="2026-08-14 10:00",
            duration_mins=doc.consultation_duration
        )
        self.assertEqual(sched1["scheduled_time"], "2026-08-14 10:00")
        
        # Create appointment in DB
        app1 = Appointment(
            appointment_id="TEST_LOW_1",
            patient_name="Test Patient Low",
            doctor_id=doc.doctor_id,
            hospital_id=doc.hospital_id,
            appointment_time=sched1["scheduled_time"],
            priority="LOW",
            estimated_duration=doc.consultation_duration,
            status="BOOKED"
        )
        self.db.add(app1)
        self.db.commit()
        
        # 2. Create another LOW priority patient at 10:00 AM preferred time
        # Since 10:00-10:20 is taken, they should get placed at 10:20 AM
        sched2 = calculate_appointment_slot(
            db=self.db,
            doctor_id=doc.doctor_id,
            priority="LOW",
            preferred_time_str="2026-08-14 10:00",
            duration_mins=doc.consultation_duration
        )
        self.assertEqual(sched2["scheduled_time"], "2026-08-14 10:20")
        
        app2 = Appointment(
            appointment_id="TEST_LOW_2",
            patient_name="Test Patient Low 2",
            doctor_id=doc.doctor_id,
            hospital_id=doc.hospital_id,
            appointment_time=sched2["scheduled_time"],
            priority="LOW",
            estimated_duration=doc.consultation_duration,
            status="BOOKED"
        )
        self.db.add(app2)
        self.db.commit()
        
        # 3. An EMERGENCY priority patient arrives at 10:00 AM
        # They should get placed at 10:00 AM immediately.
        # TEST_LOW_1 (originally 10:00 AM) should be pushed to 10:20 AM.
        # TEST_LOW_2 (originally 10:20 AM) should be pushed to 10:40 AM.
        sched_emerg = calculate_appointment_slot(
            db=self.db,
            doctor_id=doc.doctor_id,
            priority="EMERGENCY",
            preferred_time_str="2026-08-14 10:00",
            duration_mins=doc.consultation_duration
        )
        self.assertEqual(sched_emerg["scheduled_time"], "2026-08-14 10:00")
        
        app_emerg = Appointment(
            appointment_id="TEST_EMERG",
            patient_name="Test Patient Emergency",
            doctor_id=doc.doctor_id,
            hospital_id=doc.hospital_id,
            appointment_time=sched_emerg["scheduled_time"],
            priority="EMERGENCY",
            estimated_duration=doc.consultation_duration,
            status="BOOKED"
        )
        self.db.add(app_emerg)
        self.db.commit()
        
        # Fetch updated times from DB
        a1 = self.db.query(Appointment).filter(Appointment.appointment_id == "TEST_LOW_1").first()
        a2 = self.db.query(Appointment).filter(Appointment.appointment_id == "TEST_LOW_2").first()
        
        self.assertEqual(a1.appointment_time, "2026-08-14 10:20")
        self.assertEqual(a1.status, "SHIFTED")
        
        self.assertEqual(a2.appointment_time, "2026-08-14 10:40")
        self.assertEqual(a2.status, "SHIFTED")

    def test_slot_preview_finds_a_free_time_without_changing_records(self):
        doc = self.db.query(Doctor).filter(Doctor.specialty == "Cardiology").first()
        self.db.query(Appointment).filter(
            Appointment.appointment_id.like("PREVIEW_TEST%")
        ).delete()
        self.db.commit()

        appointment = Appointment(
            appointment_id="PREVIEW_TEST_1",
            patient_name="Preview Test",
            doctor_id=doc.doctor_id,
            hospital_id=doc.hospital_id,
            appointment_time="2026-09-01 10:00",
            priority="LOW",
            estimated_duration=20,
            status="BOOKED",
        )
        self.db.add(appointment)
        self.db.commit()

        original_queue = doc.queue_count
        preview = preview_appointment_slot(
            self.db, doc.doctor_id, "2026-09-01 10:00", 20
        )

        self.assertEqual(preview["scheduled_time"], "2026-09-01 10:20")
        self.assertEqual(preview["wait_minutes"], 20)
        self.assertEqual(doc.queue_count, original_queue)

    def test_cancellation_and_pull_forward(self):
        doc = self.db.query(Doctor).filter(Doctor.specialty == "Cardiology").first()
        
        # Clear test items
        self.db.query(Appointment).filter(
            Appointment.doctor_id == doc.doctor_id,
            Appointment.patient_name.like("Cancel Test%")
        ).delete()
        self.db.commit()
        
        # Create three appointments sequentially
        a1 = Appointment(appointment_id="C_TEST_1", patient_name="Cancel Test 1", doctor_id=doc.doctor_id, hospital_id=doc.hospital_id, appointment_time="2026-08-14 12:00", priority="LOW", estimated_duration=20, status="BOOKED")
        a2 = Appointment(appointment_id="C_TEST_2", patient_name="Cancel Test 2", doctor_id=doc.doctor_id, hospital_id=doc.hospital_id, appointment_time="2026-08-14 12:20", priority="LOW", estimated_duration=20, status="BOOKED")
        a3 = Appointment(appointment_id="C_TEST_3", patient_name="Cancel Test 3", doctor_id=doc.doctor_id, hospital_id=doc.hospital_id, appointment_time="2026-08-14 12:40", priority="LOW", estimated_duration=20, status="BOOKED")
        self.db.add_all([a1, a2, a3])
        self.db.commit()
        
        # Cancel C_TEST_2 (12:20)
        # C_TEST_3 (12:40) should be pulled forward to 12:20 (shifted by 20m)
        res = cancel_appointment_and_pull_forward(self.db, "C_TEST_2")
        
        # Refresh from DB
        a2_fresh = self.db.query(Appointment).filter(Appointment.appointment_id == "C_TEST_2").first()
        a3_fresh = self.db.query(Appointment).filter(Appointment.appointment_id == "C_TEST_3").first()
        
        self.assertEqual(a2_fresh.status, "CANCELLED")
        self.assertEqual(a3_fresh.appointment_time, "2026-08-14 12:20")
        self.assertEqual(a3_fresh.status, "SHIFTED")

if __name__ == "__main__":
    unittest.main()
