import React, { useState, useEffect } from 'react';
import { 
  Activity, User, MapPin, Calendar, Clock, AlertTriangle, AlertCircle, 
  Sparkles, Building, UserCheck, Stethoscope, RefreshCw, Trash2, 
  CheckCircle2, ChevronRight, BarChart3, TrendingUp, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { INITIAL_HOSPITALS, INITIAL_DOCTORS, INITIAL_APPOINTMENTS } from './data';

const API_BASE = "http://localhost:8000/api";
const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

const KANPUR_LOCATIONS = {
  "llr hospital": [26.4674, 80.3208],
  "hallet": [26.4674, 80.3208],
  "darshan purwa": [26.4674, 80.3208],
  "sarvodaya nagar": [26.477, 80.313],
  "regency": [26.477, 80.313],
  "meston road": [26.459, 80.343],
  "parade": [26.459, 80.343],
  "uhm": [26.459, 80.343],
  "birhana road": [26.4598, 80.3465],
  "kpm hospital": [26.4598, 80.3465],
  "naughara": [26.4598, 80.3465],
  "mall road": [26.4695, 80.3455],
  "chunniganj": [26.4695, 80.3455],
  "apollo spectra": [26.4695, 80.3455],
  "tatmil chauraha": [26.4475, 80.3425],
  "harris ganj": [26.4475, 80.3425],
  "krishna": [26.4475, 80.3425],
  "khalasi line": [26.481, 80.319],
  "ujala cygnus noble": [26.481, 80.319],
  "kanishk": [26.4805, 80.317],
  "kakadeo": [26.487, 80.305],
  "ujala cygnus kulwanti": [26.487, 80.305],
  "neuron": [26.49, 80.3],
  "panacea": [26.488, 80.302],
  "lajpat nagar": [26.465, 80.311],
  "lotus": [26.465, 80.311],
  "govind nagar": [26.465, 80.3095],
  "kanpur medical centre": [26.465, 80.3095],
  "double pulia": [26.49, 80.3],
  "kalyanpur": [26.512, 80.27],
  "lifetron": [26.512, 80.27],
  "vasant vihar": [26.414, 80.331],
  "naubasta": [26.414, 80.331],
  "dhanvantri": [26.414, 80.331],
  "mahadeva": [26.4145, 80.332],
  "hanspuram": [26.41, 80.33],
  "family hospital": [26.41, 80.33],
  "paramount": [26.409, 80.326],
  "baba nagar": [26.416, 80.338],
  "utkarsh": [26.416, 80.338],
  "new azad nagar": [26.43, 80.255],
  "k.p.s. hospital": [26.43, 80.255],
  "civil lines": [26.472, 80.354],
  "kidwai nagar": [26.43, 80.34],
  "kanpur": [26.456, 80.331]
};

function jsHaversine(lat1, lon1, lat2, lon2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function jsResolveLocation(locStr) {
  if (!locStr) return KANPUR_LOCATIONS["kanpur"];
  const clean = locStr.trim().toLowerCase();
  
  const match = clean.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])];

  if (KANPUR_LOCATIONS[clean]) return KANPUR_LOCATIONS[clean];
  
  for (const [k, coords] of Object.entries(KANPUR_LOCATIONS)) {
    if (clean.includes(k) || k.includes(clean)) return coords;
  }
  return KANPUR_LOCATIONS["kanpur"];
}

function jsClassifySymptoms(symptoms) {
  const s = symptoms.toLowerCase();
  if (s.includes("chest pain") && s.includes("breathing difficulty")) {
    return { specialty: "Cardiology", urgency: "HIGH", confidence: 0.91 };
  }
  if (s.includes("chest pain")) {
    return { specialty: "Cardiology", urgency: "HIGH", confidence: 0.95 };
  }
  if (s.includes("heart") || s.includes("cardio") || s.includes("palpitation")) {
    return { specialty: "Cardiology", urgency: "HIGH", confidence: 0.92 };
  }
  if (s.includes("headache") || s.includes("migraine") || s.includes("seizure") || s.includes("numb") || s.includes("paralysis") || s.includes("stroke") || s.includes("brain")) {
    const urg = (s.includes("stroke") || s.includes("paralysis") || s.includes("seizure")) ? "HIGH" : "MEDIUM";
    return { specialty: "Neurology", urgency: urg, confidence: 0.90 };
  }
  if (s.includes("cough") || s.includes("lung") || s.includes("pulmonary") || s.includes("asthma") || s.includes("breathless") || s.includes("wheezing")) {
    const urg = s.includes("breathless") ? "HIGH" : "MEDIUM";
    return { specialty: "Pulmonology", urgency: urg, confidence: 0.89 };
  }
  if (s.includes("skin") || s.includes("rash") || s.includes("acne") || s.includes("itching") || s.includes("eczema")) {
    return { specialty: "Dermatology", urgency: "LOW", confidence: 0.93 };
  }
  if (s.includes("ear") || s.includes("throat") || s.includes("hearing") || s.includes("sinus") || s.includes("nose") || s.includes("ent")) {
    return { specialty: "ENT", urgency: "LOW", confidence: 0.88 };
  }
  if (s.includes("pregnant") || s.includes("pregnancy") || s.includes("menstrual") || s.includes("period") || s.includes("gyne") || s.includes("obstetrics")) {
    return { specialty: "Obstetrics & Gynaecology", urgency: "MEDIUM", confidence: 0.91 };
  }
  if (s.includes("baby") || s.includes("child") || s.includes("infant") || s.includes("pediatric") || s.includes("paediatric")) {
    return { specialty: "Paediatrics", urgency: "MEDIUM", confidence: 0.90 };
  }
  if (s.includes("fracture") || s.includes("bone") || s.includes("joint") || s.includes("knee") || s.includes("back pain")) {
    const urg = s.includes("fracture") ? "HIGH" : "MEDIUM";
    return { specialty: "Orthopaedics", urgency: urg, confidence: 0.94 };
  }
  if (s.includes("eye") || s.includes("vision") || s.includes("cataract") || s.includes("blurry")) {
    return { specialty: "Ophthalmology", urgency: "LOW", confidence: 0.92 };
  }
  if (s.includes("surgery") || s.includes("appendic") || s.includes("hernia") || s.includes("gallbladder")) {
    return { specialty: "General Surgery", urgency: "HIGH", confidence: 0.88 };
  }
  if (s.includes("fever") || s.includes("cold") || s.includes("body ache") || s.includes("vomit") || s.includes("stomach") || s.includes("diarrhea")) {
    const urg = (s.includes("vomit") || s.includes("diarrhea")) ? "MEDIUM" : "LOW";
    return { specialty: "General Medicine", urgency: urg, confidence: 0.90 };
  }
  return { specialty: "General Medicine", urgency: "LOW", confidence: 0.70 };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('patient');
  const [engineMode, setEngineMode] = useState('Checking backend...');
  const [isLocalMode, setIsLocalMode] = useState(true);

  const [localHospitals, setLocalHospitals] = useState(INITIAL_HOSPITALS);
  const [localDoctors, setLocalDoctors] = useState(INITIAL_DOCTORS);
  const [localAppointments, setLocalAppointments] = useState(INITIAL_APPOINTMENTS);

  const [selectedHospitalId, setSelectedHospitalId] = useState('H001');
  const [hospitalStats, setHospitalStats] = useState(null);
  const [hospitalQueue, setHospitalQueue] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [patientName, setPatientName] = useState('Sujal Mishra');
  const [patientAge, setPatientAge] = useState(22);
  const [patientSymptoms, setPatientSymptoms] = useState('Chest pain and breathing difficulty');
  const [patientLocation, setPatientLocation] = useState('Kalyanpur');
  const [prefDate, setPrefDate] = useState('2026-08-14');
  const [prefTime, setPrefTime] = useState('10:00');

  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [bookingMessage, setBookingMessage] = useState(null);

  const [unavailableDoctorId, setUnavailableDoctorId] = useState('');
  const [hospitalDoctorsList, setHospitalDoctorsList] = useState([]);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const [beforeAfterQueue, setBeforeAfterQueue] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(() => {
        setIsLocalMode(false);
        setEngineMode('Connected to FastAPI');
      })
      .catch(() => {
        setIsLocalMode(true);
        setEngineMode('Local Simulator (Backend offline/Mixed-content blocked)');
      });
  }, []);

  useEffect(() => {
    if (activeTab === 'hospital') {
      loadHospitalDashboard();
    } else if (activeTab === 'admin') {
      loadAdminDashboard();
    }
  }, [activeTab, selectedHospitalId, isLocalMode, localAppointments, localDoctors, localHospitals]);

  const loadHospitalDashboard = () => {
    if (!selectedHospitalId) return;

    if (!isLocalMode) {
      fetch(`${API_BASE}/hospitals/${selectedHospitalId}/dashboard`)
        .then(res => res.json())
        .then(data => setHospitalStats(data))
        .catch(() => loadHospitalDashboardLocal());

      fetch(`${API_BASE}/appointments`)
        .then(res => res.json())
        .then(data => {
          const sorted = data.sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));
          setHospitalQueue(sorted);
        })
        .catch(() => loadHospitalDashboardLocal());

      fetch(`${API_BASE}/doctors`)
        .then(res => res.json())
        .then(data => {
          setHospitalDoctorsList(data);
          if (data.length > 0) setUnavailableDoctorId(data[0].doctor_id);
        })
        .catch(() => loadHospitalDashboardLocal());
    } else {
      loadHospitalDashboardLocal();
    }
  };

  const loadHospitalDashboardLocal = () => {
    const hosp = localHospitals.find(h => h.hospital_id === selectedHospitalId);
    if (!hosp) return;

    const docs = localDoctors.filter(d => d.hospital_id === selectedHospitalId);
    const docsAvailable = docs.filter(d => d.available_now).length;
    
    const activeApps = localAppointments.filter(
      a => a.status !== "CANCELLED"
    ).sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));

    setHospitalQueue(activeApps);
    setHospitalDoctorsList(docs);
    if (docs.length > 0) {
      setUnavailableDoctorId(docs[0].doctor_id);
    }

    const queueCount = activeApps.length;
    const avgWait = queueCount > 0 ? Math.min(90, 10 + queueCount * 2) : 21;

    setHospitalStats({
      hospital_id: hosp.hospital_id,
      name: hosp.name,
      doctors_available: `${docsAvailable} / ${docs.length}`,
      patients_waiting: queueCount,
      average_waiting_time_minutes: avgWait,
      capacity_percentage: Math.round((hosp.current_occupancy / hosp.total_capacity) * 100),
      emergency_capacity_percentage: Math.round((hosp.icu_occupancy / hosp.icu_capacity) * 100),
    });
  };

  const loadAdminDashboard = () => {
    if (!isLocalMode) {
      fetch(`${API_BASE}/analytics`)
        .then(res => res.json())
        .then(data => setAnalytics(data))
        .catch(() => loadAdminDashboardLocal());
    } else {
      loadAdminDashboardLocal();
    }
  };

  const loadAdminDashboardLocal = () => {
    const totalHospitals = localHospitals.length;
    const totalDoctors = localDoctors.length;
    const activeAppsCount = localAppointments.filter(a => a.status !== "CANCELLED").length;
    
    const totalQueueSum = localDoctors.reduce((acc, d) => acc + (d.queue_count || 0), 0);
    const avgWaitingMin = totalDoctors > 0 ? Math.max(10, Math.min(120, Math.round(totalQueueSum * 15 / totalDoctors))) : 21;

    const utilSum = localHospitals.reduce((acc, h) => acc + (h.current_occupancy / h.total_capacity), 0);
    const avgUtil = Math.round((utilSum / totalHospitals) * 100);

    const emergencyCases = localAppointments.filter(a => a.priority === "EMERGENCY" && a.status !== "CANCELLED").length;

    const capacityChart = localHospitals.slice(0, 8).map(h => ({
      name: h.name.split("(")[0].trim(),
      occupancy: h.current_occupancy,
      capacity: h.total_capacity,
      occupancy_rate: Math.round((h.current_occupancy / h.total_capacity) * 100)
    }));

    const sortedDocs = [...localDoctors].sort((a,b) => b.workload - a.workload).slice(0, 8);
    const workloadChart = sortedDocs.map(d => ({
      name: d.name,
      specialty: d.specialty,
      workload: d.workload
    }));

    const specCounts = {};
    localAppointments.forEach(a => {
      const doc = localDoctors.find(d => d.doctor_id === a.doctor_id);
      if (doc) {
        specCounts[doc.specialty] = (specCounts[doc.specialty] || 0) + 1;
      }
    });
    const demandChart = Object.entries(specCounts).map(([spec, count]) => ({ name: spec, value: count }));
    if (demandChart.length === 0) {
      demandChart.push(
        { name: "Cardiology", value: 6 },
        { name: "Neurology", value: 3 },
        { name: "Pulmonology", value: 4 },
        { name: "General Medicine", value: 8 }
      );
    }

    const priorities = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];
    const priorityDist = priorities.map(p => ({
      name: p,
      value: localAppointments.filter(a => a.priority === p && a.status !== "CANCELLED").length
    }));

    const specialties = [...new Set(localDoctors.map(d => d.specialty))].slice(0, 6);
    const waitingTimeBySpecialty = specialties.map(spec => {
      const specDocs = localDoctors.filter(d => d.specialty === spec);
      const avgQ = specDocs.reduce((acc, d) => acc + d.queue_count, 0) / specDocs.length;
      return {
        specialty: spec,
        waiting_time: Math.max(5, Math.round(avgQ * 20))
      };
    });

    setAnalytics({
      summary: {
        total_hospitals: totalHospitals,
        total_doctors: totalDoctors,
        active_appointments: activeAppsCount,
        average_waiting_time: `${avgWaitingMin} min`,
        hospital_utilization: `${avgUtil}%`,
        emergency_cases: emergencyCases
      },
      charts: {
        hospital_capacity: capacityChart,
        doctor_workload: workloadChart,
        specialty_demand: demandChart,
        priority_distribution: priorityDist,
        waiting_time_by_specialty: waitingTimeBySpecialty
      }
    });
  };

  const prefillDemoScenario = (scenarioNum) => {
    if (scenarioNum === 1) {
      setPatientName("Aman Sharma");
      setPatientAge(45);
      setPatientSymptoms("Chest pain and breathing difficulty");
      setPatientLocation("Kalyanpur");
      setPrefDate("2026-08-14");
      setPrefTime("10:00");
      showToast("Loaded Scenario 1: Cardiac symptoms", "info");
    } else if (scenarioNum === 4) {
      setPatientName("Ritu Verma");
      setPatientAge(38);
      setPatientSymptoms("Severe chest fluttering and syncope");
      setPatientLocation("Bidhuna");
      setPrefDate("2026-08-14");
      setPrefTime("11:30");
      showToast("Loaded Scenario 4: Escalation (No cardiologist within 10km)", "info");
    }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchResult(null);
    setBookingMessage(null);

    if (!isLocalMode) {
      try {
        const response = await fetch(`${API_BASE}/patient/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: patientName,
            age: patientAge,
            symptoms: patientSymptoms,
            location: patientLocation,
            preferred_date: prefDate,
            preferred_time: prefTime
          })
        });
        const data = await response.json();
        setSearchResult(data);
        showToast("Assessment complete!", "success");
      } catch {
        runPatientSearchLocal();
      } finally {
        setIsSearching(false);
      }
    } else {
      setTimeout(() => {
        runPatientSearchLocal();
        setIsSearching(false);
      }, 600);
    }
  };

  const runPatientSearchLocal = () => {
    const aiRes = jsClassifySymptoms(patientSymptoms);
    const [pLat, pLon] = jsResolveLocation(patientLocation);

    const radii = [10.0, 25.0, 50.0];
    let matchedDoctors = [];
    let searchRadiusUsed = 50.0;
    let escalated = false;

    for (const r of radii) {
      const tempMatched = [];
      localDoctors.forEach(doc => {
        if (doc.specialty.toLowerCase() === aiRes.specialty.toLowerCase()) {
          const hosp = localHospitals.find(h => h.hospital_id === doc.hospital_id);
          if (hosp) {
            const dist = jsHaversine(hosp.latitude, hosp.longitude, pLat, pLon);
            if (dist <= r) {
              const specialtyMatch = doc.specialty.toLowerCase() === aiRes.specialty.toLowerCase() ? 1.0 : 0.0;
              const availability = doc.available_now ? 1.0 : 0.0;
              const distScore = r > 0 ? Math.max(0.0, 1.0 - (dist / r)) : 0.0;
              const queueScore = Math.max(0.0, 1.0 - (doc.queue_count / 10.0));
              const workloadScore = Math.max(0.0, Math.min(1.0, 1.0 - (doc.workload / 100.0)));
              const hospCapScore = hosp.total_capacity > 0 ? Math.max(0.0, Math.min(1.0, 1.0 - (hosp.current_occupancy / hosp.total_capacity))) : 0.0;
              
              const score = (
                0.30 * specialtyMatch +
                0.20 * availability +
                0.15 * distScore +
                0.15 * queueScore +
                0.10 * workloadScore +
                0.10 * hospCapScore
              );
              
              tempMatched.push({
                doctor_id: doc.doctor_id,
                name: doc.name,
                specialty: doc.specialty,
                qualification: doc.qualification,
                rating: doc.rating,
                available_now: doc.available_now,
                hospital: {
                  hospital_id: hosp.hospital_id,
                  name: hosp.name,
                  latitude: hosp.latitude,
                  longitude: hosp.longitude,
                  address: hosp.address
                },
                distance_km: Math.round(dist * 10) / 10,
                score: Math.round(score * 1000) / 10,
                breakdown: {
                  specialty_match: Math.round(specialtyMatch * 100),
                  availability: Math.round(availability * 100),
                  distance_score: Math.round(distScore * 100),
                  queue_score: Math.round(queueScore * 100),
                  workload_score: Math.round(workloadScore * 100),
                  hospital_capacity_score: Math.round(hospCapScore * 100)
                },
                consultation_duration: doc.consultation_duration,
                queue_count: doc.queue_count,
                workload: doc.workload
              });
            }
          }
        }
      });

      if (tempMatched.length > 0) {
        tempMatched.sort((a,b) => b.score - a.score || a.distance_km - b.distance_km);
        matchedDoctors = tempMatched.slice(0, 3);
        searchRadiusUsed = r;
        break;
      }
    }

    let escalationOptions = null;
    if (matchedDoctors.length === 0) {
      escalated = true;
      
      const nearbyHospMap = {};
      localDoctors.forEach(doc => {
        if (doc.specialty.toLowerCase() === aiRes.specialty.toLowerCase()) {
          const hosp = localHospitals.find(h => h.hospital_id === doc.hospital_id);
          if (hosp) {
            const dist = jsHaversine(hosp.latitude, hosp.longitude, pLat, pLon);
            if (!nearbyHospMap[hosp.hospital_id] || dist < nearbyHospMap[hosp.hospital_id].distance_km) {
              nearbyHospMap[hosp.hospital_id] = {
                hospital_id: hosp.hospital_id,
                name: hosp.name,
                distance_km: Math.round(dist * 10) / 10,
                specialty: doc.specialty,
                available_time: doc.doctor_id === "D022" ? "2:30 PM" : "4:00 PM"
              };
            }
          }
        }
      });
      const sortedHops = Object.values(nearbyHospMap).sort((a,b) => a.distance_km - b.distance_km).slice(0, 2);

      const teleconsults = localDoctors
        .filter(d => d.specialty.toLowerCase() === aiRes.specialty.toLowerCase() && d.teleconsultation_available)
        .slice(0, 2)
        .map(d => ({
          doctor_id: d.doctor_id,
          name: d.name,
          specialty: d.specialty,
          qualification: d.qualification,
          available_time: "1:30 PM",
          rating: d.rating
        }));

      escalationOptions = {
        recommended_hospitals: sortedHops,
        teleconsultation: teleconsults,
        referral: {
          message: "Referral to higher-level tertiary center (e.g., SGPGI Lucknow or GSVM Kanpur) is recommended.",
          action: "Generate Digital Referral Certificate"
        }
      };
    }

    setSearchResult({
      patient_id: Math.round(Math.random() * 10000),
      classification: aiRes,
      location: { latitude: pLat, longitude: pLon },
      recommendations: {
        radius_km: searchRadiusUsed,
        escalated: escalated,
        message: escalated ? "Escalation path activated" : `Found doctors in ${searchRadiusUsed}km`,
        doctors: matchedDoctors,
        escalation_options: escalationOptions
      }
    });
    showToast("Symptoms assessed locally!", "success");
  };

  const handleBookAppointment = async (doc) => {
    if (!isLocalMode) {
      try {
        const response = await fetch(`${API_BASE}/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: patientName,
            age: patientAge,
            symptoms: patientSymptoms,
            location: patientLocation,
            doctor_id: doc.doctor_id,
            hospital_id: doc.hospital.hospital_id,
            appointment_time: `${prefDate} ${prefTime}`,
            priority: searchResult.classification.urgency
          })
        });
        const data = await response.json();
        setBookingMessage(data);
        showToast("Booked successfully!", "success");
        if (data.shifted_appointments && data.shifted_appointments.length > 0) {
          setSimulationLogs(prev => [
            ...data.shifted_appointments.map(a => `⏰ ${a.patient_name} shifted to ${a.new_time.split(' ')[1]} (${a.reason})`),
            ...prev
          ]);
        }
        return;
      } catch {
        // Fallback
      }
    }
    
    const newTime = `${prefDate} ${prefTime}`;
    const urg = searchResult.classification.urgency;
    const duration = doc.consultation_duration;
    
    const activeApps = localAppointments.filter(
      a => a.doctor_id === doc.doctor_id && a.appointment_time.startsWith(prefDate) && a.status !== "CANCELLED"
    ).sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));

    let scheduledTimeStr = newTime;
    let shifted = [];

    if (urg === "HIGH" || urg === "EMERGENCY") {
      const prefDateObj = new Date(`${prefDate}T${prefTime}`);
      const updatedApps = localAppointments.map(app => {
        if (app.doctor_id === doc.doctor_id && app.appointment_time.startsWith(prefDate) && app.status !== "CANCELLED") {
          const appDate = new Date(app.appointment_time.replace(' ', 'T'));
          if (appDate >= prefDateObj) {
            const oldTime = app.appointment_time;
            const newDate = new Date(appDate.getTime() + duration * 60000);
            const formatted = newDate.getFullYear() + '-' + 
                              String(newDate.getMonth()+1).padStart(2,'0') + '-' + 
                              String(newDate.getDate()).padStart(2,'0') + ' ' + 
                              String(newDate.getHours()).padStart(2,'0') + ':' + 
                              String(newDate.getMinutes()).padStart(2,'0');
            
            const reason = `Delayed by ${duration}m due to priority patient ${urg} scheduled at ${prefTime}.`;
            shifted.push({
              appointment_id: app.appointment_id,
              patient_name: app.patient_name,
              old_time: oldTime,
              new_time: formatted,
              reason: reason
            });

            return {
              ...app,
              appointment_time: formatted,
              status: "SHIFTED",
              notes: reason
            };
          }
        }
        return app;
      });
      setLocalAppointments(updatedApps);
    } else {
      let slotStart = new Date(`${prefDate}T${prefTime}`);
      let conflict = true;
      while (conflict) {
        conflict = false;
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        for (const app of activeApps) {
          const appStart = new Date(app.appointment_time.replace(' ', 'T'));
          const appEnd = new Date(appStart.getTime() + app.estimated_duration * 60000);
          if (!(slotEnd <= appStart || slotStart >= appEnd)) {
            conflict = true;
            slotStart = appEnd;
            break;
          }
        }
      }
      scheduledTimeStr = slotStart.getFullYear() + '-' + 
                         String(slotStart.getMonth()+1).padStart(2,'0') + '-' + 
                         String(slotStart.getDate()).padStart(2,'0') + ' ' + 
                         String(slotStart.getHours()).padStart(2,'0') + ':' + 
                         String(slotStart.getMinutes()).padStart(2,'0');
    }

    const newAppId = `A${Math.round(Math.random() * 1000000)}`;
    const newAppointment = {
      appointment_id: newAppId,
      patient_id: searchResult.patient_id,
      patient_name: patientName,
      doctor_id: doc.doctor_id,
      hospital_id: doc.hospital.hospital_id,
      appointment_time: scheduledTimeStr,
      priority: urg,
      estimated_duration: duration,
      status: "BOOKED",
      notes: (urg === "HIGH" || urg === "EMERGENCY") ? "Priority reservation" : "Scheduled at available slot"
    };

    setLocalAppointments(prev => [...prev, newAppointment]);
    setLocalDoctors(prev => prev.map(d => {
      if (d.doctor_id === doc.doctor_id) {
        const newQueue = d.queue_count + 1;
        return {
          ...d,
          queue_count: newQueue,
          workload: Math.min(100, Math.round((newQueue * d.consultation_duration / 480) * 100))
        };
      }
      return d;
    }));

    setLocalHospitals(prev => prev.map(h => {
      if (h.hospital_id === doc.hospital.hospital_id) {
        return {
          ...h,
          current_occupancy: Math.min(h.total_capacity, h.current_occupancy + 1)
        };
      }
      return h;
    }));

    setBookingMessage({
      appointment: {
        appointment_id: newAppId,
        patient_name: patientName,
        doctor_name: doc.name,
        hospital_name: doc.hospital.name,
        appointment_time: scheduledTimeStr,
        status: "BOOKED"
      },
      shifted_appointments: shifted
    });

    if (shifted.length > 0) {
      setSimulationLogs(prev => [
        ...shifted.map(s => `⏰ ${s.patient_name} shifted to ${s.new_time.split(' ')[1]} (${s.reason})`),
        ...prev
      ]);
    }

    showToast("Booked locally!", "success");
  };

  const handleSimulateEmergency = async () => {
    if (!isLocalMode) {
      try {
        setBeforeAfterQueue(null);
        const beforeRes = await fetch(`${API_BASE}/appointments`);
        const beforeData = await beforeRes.json();
        
        const response = await fetch(`${API_BASE}/events/emergency`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Emergency Patient (Cardiac)",
            age: 52,
            symptoms: "Severe crushing chest pain and dyspnea",
            location: "Regency Hospital",
            preferred_time: "2026-08-14 10:00"
          })
        });
        const data = await response.json();
        
        const afterRes = await fetch(`${API_BASE}/appointments`);
        const afterData = await afterRes.json();

        setBeforeAfterQueue({
          before: beforeData.slice(0, 4),
          after: afterData.slice(0, 5),
          explanation: "🚨 Emergency patient placed at 10:00 AM immediately. Subsequent appointments shifted forward by 20 mins to prevent overlaps."
        });

        setSimulationLogs(prev => [
          `🚨 EMERGENCY: Patient placed immediately at 10:00 AM with ${data.assigned_doctor}.`,
          ...data.shifted_appointments.map(a => `🔄 REALLOCATED: ${a.patient_name} pushed to ${a.new_time.split(' ')[1]}`),
          ...prev
        ]);
        showToast("Emergency simulated!", "error");
        fetchHospitalDashboard();
        return;
      } catch {
        // Fallback
      }
    }

    const targetDocId = "D022";
    const targetHospId = "H004";
    const prefTimeStr = "2026-08-14 10:00";
    const duration = 20;

    const beforeApps = localAppointments
      .filter(a => a.doctor_id === targetDocId && a.appointment_time.startsWith("2026-08-14") && a.status !== "CANCELLED")
      .sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));

    const prefDateObj = new Date("2026-08-14T10:00:00");
    const shifted = [];

    const updatedApps = localAppointments.map(app => {
      if (app.doctor_id === targetDocId && app.appointment_time.startsWith("2026-08-14") && app.status !== "CANCELLED") {
        const appDate = new Date(app.appointment_time.replace(' ', 'T'));
        if (appDate >= prefDateObj) {
          const oldTime = app.appointment_time;
          const newDate = new Date(appDate.getTime() + duration * 60000);
          const formatted = newDate.getFullYear() + '-' + 
                            String(newDate.getMonth()+1).padStart(2,'0') + '-' + 
                            String(newDate.getDate()).padStart(2,'0') + ' ' + 
                            String(newDate.getHours()).padStart(2,'0') + ':' + 
                            String(newDate.getMinutes()).padStart(2,'0');
          
          shifted.push({
            appointment_id: app.appointment_id,
            patient_name: app.patient_name,
            old_time: oldTime,
            new_time: formatted,
            priority: app.priority,
            status: "SHIFTED"
          });

          return {
            ...app,
            appointment_time: formatted,
            status: "SHIFTED",
            notes: `Delayed by ${duration}m due to incoming EMERGENCY case scheduled at 10:00.`
          };
        }
      }
      return app;
    });

    const emergApp = {
      appointment_id: `E${Math.round(Math.random() * 1000000)}`,
      patient_name: "Emergency Patient (Cardiac)",
      doctor_id: targetDocId,
      hospital_id: targetHospId,
      appointment_time: prefTimeStr,
      priority: "EMERGENCY",
      estimated_duration: duration,
      status: "BOOKED",
      notes: "🚨 EMERGENCY CASE INSERTED IMMEDIATELY"
    };

    const finalAfterApps = [...updatedApps, emergApp].filter(
      a => a.doctor_id === targetDocId && a.appointment_time.startsWith("2026-08-14") && a.status !== "CANCELLED"
    ).sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));

    setLocalAppointments([...updatedApps, emergApp]);
    setLocalHospitals(prev => prev.map(h => h.hospital_id === targetHospId ? { ...h, current_occupancy: h.current_occupancy + 1 } : h));
    setLocalDoctors(prev => prev.map(d => d.doctor_id === targetDocId ? { ...d, queue_count: d.queue_count + 1 } : d));

    setBeforeAfterQueue({
      before: beforeApps.slice(0, 4),
      after: finalAfterApps.slice(0, 5),
      explanation: "🚨 Emergency patient placed at 10:00 AM immediately. Subsequent appointments (Patient A, Patient B, Patient C) shifted by 20 minutes (consult duration) to prevent overlaps."
    });

    setSimulationLogs(prev => [
      `🚨 EMERGENCY: Patient placed immediately at 10:00 AM with Dr. Harsh Kumar Agarwal.`,
      ...shifted.map(s => `🔄 REALLOCATED: ${s.patient_name} pushed to ${s.new_time.split(' ')[1]}`),
      ...prev
    ]);

    showToast("Emergency simulated locally!", "error");
  };

  const handleDoctorUnavailable = async () => {
    if (!unavailableDoctorId) return;

    if (!isLocalMode) {
      try {
        const response = await fetch(`${API_BASE}/events/doctor-unavailable`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctor_id: unavailableDoctorId })
        });
        const data = await response.json();
        if (data.reallocations && data.reallocations.length > 0) {
          setSimulationLogs(prev => [
            `⚠️ Doctor marked offline. Reallocating ${data.reallocations.length} patient(s)...`,
            ...data.reallocations.map(r => `🔀 Patient ${r.patient_name} reallocated from Dr. ${r.original_doctor} to Dr. ${r.reallocated_doctor} at ${r.reallocated_hospital} (${r.new_time.split(' ')[1]})`),
            ...prev
          ]);
          showToast(`Doctor offline! ${data.reallocations.length} appointments reallocated.`, "warning");
        } else {
          showToast("Doctor offline! No active appointments affected.", "info");
        }
        fetchHospitalDashboard();
        return;
      } catch {
        // Fallback
      }
    }

    const doc = localDoctors.find(d => d.doctor_id === unavailableDoctorId);
    if (!doc) return;

    setLocalDoctors(prev => prev.map(d => d.doctor_id === unavailableDoctorId ? { ...d, available_now: false, queue_count: 0, workload: 0 } : d));
    
    const reallocations = [];
    const updatedApps = localAppointments.map(app => {
      if (app.doctor_id === unavailableDoctorId && app.status !== "CANCELLED") {
        const alts = localDoctors.filter(
          d => d.specialty === doc.specialty && d.doctor_id !== unavailableDoctorId && d.available_now
        );
        if (alts.length > 0) {
          const bestAlt = alts[0];
          const altHosp = localHospitals.find(h => h.hospital_id === bestAlt.hospital_id);
          
          reallocations.push({
            patient_name: app.patient_name,
            original_doctor: doc.name,
            reallocated_doctor: bestAlt.name,
            reallocated_hospital: altHosp ? altHosp.name : "Alternative Hospital",
            new_time: app.appointment_time
          });

          return {
            ...app,
            doctor_id: bestAlt.doctor_id,
            hospital_id: bestAlt.hospital_id,
            status: "REALLOCATED",
            notes: `Reallocated from offline Dr. ${doc.name} to Dr. ${bestAlt.name}.`
          };
        } else {
          reallocations.push({
            patient_name: app.patient_name,
            original_doctor: doc.name,
            reallocated_doctor: "Escalated Specialist Needed",
            reallocated_hospital: "N/A",
            new_time: "N/A"
          });
          return {
            ...app,
            status: "REALLOCATED",
            notes: `Offline: No alternative local specialist found. Escalation needed.`
          };
        }
      }
      return app;
    });

    setLocalAppointments(updatedApps);
    
    if (reallocations.length > 0) {
      setSimulationLogs(prev => [
        `⚠️ Doctor ${doc.name} offline. Reallocating ${reallocations.length} appointment(s)...`,
        ...reallocations.map(r => `🔀 Patient ${r.patient_name} reallocated to Dr. ${r.reallocated_doctor} at ${r.reallocated_hospital}`),
        ...prev
      ]);
      showToast(`Doctor offline! ${reallocations.length} reallocations completed.`, "warning");
    } else {
      showToast("Doctor offline! No active appointments affected.", "info");
    }
  };

  const handleCancelAppointment = async (appId) => {
    if (!isLocalMode) {
      try {
        const response = await fetch(`${API_BASE}/events/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: appId })
        });
        const data = await response.json();
        setSimulationLogs(prev => [
          `❌ Cancelled appointment ${appId}.`,
          ...data.shifted_appointments.map(a => `⏩ PULL FORWARD: ${a.patient_name} moved earlier to ${a.new_time.split(' ')[1]}`),
          ...prev
        ]);
        showToast("Cancelled and optimized!", "success");
        fetchHospitalDashboard();
        return;
      } catch {
        // Fallback
      }
    }

    const app = localAppointments.find(a => a.appointment_id === appId);
    if (!app || app.status === "CANCELLED") return;

    const duration = app.estimated_duration;
    const dateStr = app.appointment_time.split(' ')[0];
    const appTime = new Date(app.appointment_time.replace(' ', 'T'));

    const updated = localAppointments.map(a => {
      if (a.appointment_id === appId) {
        return { ...a, status: "CANCELLED", notes: "Cancelled." };
      }
      if (a.doctor_id === app.doctor_id && a.appointment_time.startsWith(dateStr) && a.status !== "CANCELLED") {
        const aStart = new Date(a.appointment_time.replace(' ', 'T'));
        if (aStart > appTime) {
          const pulled = new Date(aStart.getTime() - duration * 60000);
          const formatted = pulled.getFullYear() + '-' + 
                            String(pulled.getMonth()+1).padStart(2,'0') + '-' + 
                            String(pulled.getDate()).padStart(2,'0') + ' ' + 
                            String(pulled.getHours()).padStart(2,'0') + ':' + 
                            String(pulled.getMinutes()).padStart(2,'0');
          return {
            ...a,
            appointment_time: formatted,
            status: "SHIFTED",
            notes: `Pulled forward by ${duration}m due to cancellation at ${app.appointment_time.split(' ')[1]}.`
          };
        }
      }
      return a;
    });

    setLocalAppointments(updated);
    showToast("Cancelled and optimized!", "success");
    setSimulationLogs(prev => [
      `❌ Cancelled appointment ${appId}.`,
      ...prev
    ]);
  };

  const handleRebalanceQueues = async () => {
    if (!isLocalMode) {
      try {
        const response = await fetch(`${API_BASE}/optimization/reallocate`, {
          method: "POST"
        });
        const data = await response.json();
        if (data.reallocations && data.reallocations.length > 0) {
          setSimulationLogs(prev => [
            `⚖️ Queues Rebalanced!`,
            ...data.reallocations.map(r => `⚖️ Rebalanced: ${r.patient_name} moved to Dr. ${r.reallocated_doctor}`),
            ...prev
          ]);
          showToast(`Rebalanced ${data.reallocations.length} patients!`, "success");
        } else {
          showToast("Queues are already balanced.", "info");
        }
        fetchHospitalDashboard();
        return;
      } catch {
        // Fallback
      }
    }

    const overloaded = localDoctors.filter(d => d.queue_count > 4);
    if (overloaded.length === 0) {
      showToast("Queues are already balanced.", "info");
      return;
    }

    let count = 0;
    const updated = localAppointments.map(app => {
      const doc = localDoctors.find(d => d.doctor_id === app.doctor_id);
      if (doc && doc.queue_count > 4 && app.priority === "LOW" && app.status !== "CANCELLED") {
        const alts = localDoctors.filter(
          d => d.specialty === doc.specialty && d.doctor_id !== doc.doctor_id && d.queue_count < doc.queue_count - 1 && d.available_now
        );
        if (alts.length > 0) {
          const best = alts[0];
          best.queue_count++;
          doc.queue_count--;
          count++;
          return {
            ...app,
            doctor_id: best.doctor_id,
            hospital_id: best.hospital_id,
            status: "REALLOCATED",
            notes: `Rebalanced from overloaded queue of Dr. ${doc.name} to Dr. ${best.name}.`
          };
        }
      }
      return app;
    });

    if (count > 0) {
      setLocalAppointments(updated);
      setSimulationLogs(prev => [
        `⚖️ Dynamic optimization: Rebalanced ${count} overloaded low-priority case(s)...`,
        ...prev
      ]);
      showToast(`Rebalanced ${count} queues successfully!`, "success");
    } else {
      showToast("Queues are balanced.", "info");
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <nav className="glass-card sticky top-0 z-50 border-b border-white/5 py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Activity className="h-6 w-6 text-white pulse-glow" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-glow-blue text-white">MediFlow AI</h1>
            <p className="text-xs text-blue-400 font-medium">Dynamic Triage & Allocation Engine</p>
          </div>
        </div>

        <div className="text-[10px] font-mono px-3 py-1 bg-slate-900/80 border border-white/10 rounded-full text-gray-400">
          Engine Mode: <span className="text-blue-400 font-bold">{engineMode}</span>
        </div>

        <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('patient')} 
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'patient' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-gray-400 hover:text-white'}`}
          >
            Find a Doctor
          </button>
          <button 
            onClick={() => setActiveTab('hospital')} 
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'hospital' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-gray-400 hover:text-white'}`}
          >
            Hospital Simulation
          </button>
          <button 
            onClick={() => setActiveTab('admin')} 
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-gray-400 hover:text-white'}`}
          >
            Admin Analytics
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl transition-all duration-300 ${
            toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' :
            toast.type === 'error' ? 'bg-rose-950/80 border-rose-500/40 text-rose-300' :
            toast.type === 'warning' ? 'bg-amber-950/80 border-amber-500/40 text-amber-300' :
            'bg-slate-900/90 border-blue-500/40 text-blue-300'
          }`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {activeTab === 'patient' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-5 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-blue-500/5 rounded-bl-2xl">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                </div>
                
                <div>
                  <h2 className="text-xl font-bold text-white">Find a Doctor</h2>
                  <p className="text-xs text-gray-400 mt-1">Submit symptoms to classify priority & match optimal care</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => prefillDemoScenario(1)} 
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-blue-950/50 hover:bg-blue-900/40 text-xs font-semibold text-blue-300 border border-blue-800/30"
                  >
                    Scenario 1 (Cardiac)
                  </button>
                  <button 
                    onClick={() => prefillDemoScenario(4)} 
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-purple-950/50 hover:bg-purple-900/40 text-xs font-semibold text-purple-300 border border-purple-800/30"
                  >
                    Scenario 4 (Escalation)
                  </button>
                </div>

                <form onSubmit={handlePatientSearch} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Patient Name</label>
                    <input 
                      type="text" 
                      value={patientName} 
                      onChange={e => setPatientName(e.target.value)} 
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Age</label>
                      <input 
                        type="number" 
                        value={patientAge} 
                        onChange={e => setPatientAge(parseInt(e.target.value))} 
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                        required 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Location (Kanpur region)</label>
                      <select 
                        value={patientLocation} 
                        onChange={e => setPatientLocation(e.target.value)} 
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Kalyanpur">Kalyanpur (West)</option>
                        <option value="Kakadeo">Kakadeo (Central-West)</option>
                        <option value="Swaroop Nagar">Swaroop Nagar (Central)</option>
                        <option value="Civil Lines">Civil Lines (North-Central)</option>
                        <option value="Naubasta">Naubasta (South)</option>
                        <option value="Kidwai Nagar">Kidwai Nagar (South-East)</option>
                        <option value="Bidhuna">Bidhuna (Rural &gt;60km)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Symptoms / Reason for Visit</label>
                    <textarea 
                      value={patientSymptoms} 
                      onChange={e => setPatientSymptoms(e.target.value)} 
                      rows={3}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" 
                      placeholder="Describe symptoms in detail..."
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Preferred Date</label>
                      <input 
                        type="date" 
                        value={prefDate} 
                        onChange={e => setPrefDate(e.target.value)} 
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Preferred Time</label>
                      <input 
                        type="time" 
                        value={prefTime} 
                        onChange={e => setPrefTime(e.target.value)} 
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                        required 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSearching}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/10 flex justify-center items-center gap-2 mt-2"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Analyzing Symptoms...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        SEARCH MEDICAL DISPATCH
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-6">
              {!searchResult && !isSearching && (
                <div className="glass-card rounded-2xl p-12 border border-white/5 flex flex-col items-center justify-center text-center h-full">
                  <div className="h-16 w-16 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-gray-500 mb-4">
                    <Stethoscope className="h-8 w-8 text-blue-500/60" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">No Active Assessment</h3>
                  <p className="text-sm text-gray-400 max-w-sm">Enter the patient's symptoms on the left to activate the AI Triage & Doctor allocation engine.</p>
                </div>
              )}

              {isSearching && (
                <div className="glass-card rounded-2xl p-12 border border-white/5 flex flex-col items-center justify-center text-center h-full">
                  <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Running AI Specialty Triage</h3>
                  <p className="text-sm text-gray-400 max-w-sm">Assessing symptoms, resolving patient geolocation, and calculating matching scores for available physicians...</p>
                </div>
              )}

              {searchResult && (
                <div className="flex flex-col gap-6">
                  <div className="glass-card-glow rounded-2xl p-6 border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 bg-blue-500/5 rounded-bl-2xl">
                      <Sparkles className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">AI Assessment</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mt-1">{searchResult.classification.specialty}</h3>
                      <p className="text-xs text-gray-400 mt-1">Classification Confidence: <span className="font-semibold text-gray-200">{Math.round(searchResult.classification.confidence * 100)}%</span></p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold text-gray-400 mb-1">Urgency Level</span>
                      <span className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider ${
                        searchResult.classification.urgency === 'HIGH' || searchResult.classification.urgency === 'EMERGENCY' 
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40 text-glow-purple' 
                          : searchResult.classification.urgency === 'MEDIUM' 
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40' 
                          : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {searchResult.classification.urgency}
                      </span>
                    </div>
                  </div>

                  {bookingMessage && (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-4">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-emerald-300">Appointment Confirmed!</h4>
                        <p className="text-sm text-emerald-400/90 mt-1">
                          Booked with **{bookingMessage.appointment.doctor_name}** at **{bookingMessage.appointment.hospital_name}**.
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          Time Slot: {bookingMessage.appointment.appointment_time} | Status: {bookingMessage.appointment.status || "BOOKED"}
                        </p>
                        {bookingMessage.shifted_appointments && bookingMessage.shifted_appointments.length > 0 && (
                          <div className="mt-3 p-3 bg-slate-950/70 border border-white/5 rounded-xl">
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mb-1">
                              <AlertTriangle className="h-3 w-3" /> Queue optimization active:
                            </span>
                            <ul className="text-[11px] text-gray-400 space-y-1 list-disc pl-4 font-mono">
                              {bookingMessage.shifted_appointments.map((shift, idx) => (
                                <li key={idx}>
                                  {shift.patient_name} shifted to {shift.new_time.split(' ')[1]}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!searchResult.recommendations.escalated ? (
                    <div className="flex flex-col gap-4">
                      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recommended Doctors</h4>
                      
                      <div className="flex flex-col gap-4">
                        {searchResult.recommendations.doctors.map((doc, idx) => (
                          <div 
                            key={doc.doctor_id} 
                            className={`glass-card rounded-2xl p-5 border transition-all ${
                              idx === 0 
                                ? 'border-blue-500/30 bg-blue-950/10 shadow-lg shadow-blue-500/5' 
                                : 'border-white/5'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${idx === 0 ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-900 text-gray-400'}`}>
                                  <Stethoscope className="h-6 w-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-white text-lg">{doc.name}</h5>
                                    {idx === 0 && (
                                      <span className="bg-blue-900/60 text-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-800/40 uppercase tracking-wider">
                                        Best Match
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-400 mt-0.5">{doc.qualification} • {doc.specialty}</p>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" /> {doc.hospital.name}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 font-semibold text-gray-300"><MapPin className="h-3.5 w-3.5 text-blue-400" /> {doc.distance_km} km</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-start md:items-end w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0 mt-3 md:mt-0">
                                <div className="flex justify-between md:justify-end items-center w-full md:w-auto gap-4 mb-2">
                                  <div className="text-left md:text-right">
                                    <span className="text-[10px] font-bold text-gray-500 block uppercase">Matching Score</span>
                                    <span className="text-xl font-black text-white">{doc.score}%</span>
                                  </div>
                                  <div className="text-left md:text-right">
                                    <span className="text-[10px] font-bold text-gray-500 block uppercase">Est. Wait</span>
                                    <span className="text-sm font-bold text-blue-400">{doc.queue_count * doc.consultation_duration} mins</span>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => handleBookAppointment(doc)}
                                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10"
                                >
                                  BOOK APPOINTMENT
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] text-gray-500 font-mono">
                              <div>Specialty: {doc.breakdown.specialty_match}%</div>
                              <div>Availability: {doc.breakdown.availability}%</div>
                              <div>Distance: {doc.breakdown.distance_score}%</div>
                              <div>Queue: {doc.breakdown.queue_score}%</div>
                              <div>Workload: {doc.breakdown.workload_score}%</div>
                              <div>Hosp Cap: {doc.breakdown.hospital_capacity_score}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 flex items-start gap-4">
                        <ShieldAlert className="h-6 w-6 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-rose-300">No Cardiology Specialist within 10 km</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Radius expanded: searched 10km → 25km → 50km. Activating **Best Available Specialist Matching**.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass-card rounded-2xl p-5 border border-white/5">
                          <h5 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                            <Building className="h-4 w-4 text-blue-400" /> Recommended Hospitals
                          </h5>
                          <div className="flex flex-col gap-3">
                            {searchResult.recommendations.escalation_options.recommended_hospitals.map((h, i) => (
                              <div key={i} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-gray-200">{h.name}</span>
                                  <span className="text-[10px] text-blue-400 font-semibold">{h.distance_km} km</span>
                                </div>
                                <div className="flex justify-between items-center mt-2 text-gray-500">
                                  <span>Cardiology Department</span>
                                  <span>Slot: {h.available_time}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="glass-card rounded-2xl p-5 border border-white/5">
                          <h5 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-purple-400" /> Teleconsultation Options
                          </h5>
                          <div className="flex flex-col gap-3">
                            {searchResult.recommendations.escalation_options.teleconsultation.length > 0 ? (
                              searchResult.recommendations.escalation_options.teleconsultation.map((t, i) => (
                                <div key={i} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-200">{t.name}</span>
                                    <span className="text-[10px] text-purple-400 font-semibold">Online</span>
                                  </div>
                                  <div className="flex justify-between items-center mt-2 text-gray-500">
                                    <span>{t.specialty}</span>
                                    <span>Available: {t.available_time}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500 text-xs">
                                Teleconsultation specialists offline.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="glass-card rounded-2xl p-5 border border-white/5 text-xs">
                        <h5 className="font-bold text-white mb-2">Digital Referral & Escalation</h5>
                        <p className="text-gray-400 leading-relaxed">
                          {searchResult.recommendations.escalation_options.referral.message}
                        </p>
                        <button 
                          onClick={() => showToast("Referral Certificate Generated!", "success")}
                          className="mt-3 bg-slate-900 hover:bg-slate-800 text-gray-300 font-bold px-4 py-2 rounded-lg border border-white/5 transition-all text-[11px]"
                        >
                          {searchResult.recommendations.escalation_options.referral.action}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hospital' && (
          <div className="flex flex-col gap-6">
            <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <Building className="h-6 w-6 text-blue-500" />
                <div>
                  <h3 className="font-bold text-white">Live Hospital Dashboard</h3>
                  <p className="text-xs text-gray-400">Select hospital location to simulate events & inspect schedules</p>
                </div>
              </div>
              <div>
                <select 
                  value={selectedHospitalId} 
                  onChange={e => setSelectedHospitalId(e.target.value)} 
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  {localHospitals.map(h => (
                    <option key={h.hospital_id} value={h.hospital_id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hospitalStats && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Doctors Available</span>
                  <div className="text-2xl font-black text-white mt-1">{hospitalStats.doctors_available}</div>
                  <span className="text-[10px] text-emerald-400 font-medium">On-Duty active</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Patients Waiting</span>
                  <div className="text-2xl font-black text-white mt-1">{hospitalStats.patients_waiting}</div>
                  <span className="text-[10px] text-blue-400 font-medium">Scheduled today</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Avg Wait Time</span>
                  <div className="text-2xl font-black text-white mt-1">{hospitalStats.average_waiting_time_minutes} min</div>
                  <span className="text-[10px] text-blue-400 font-medium">Queue load factor</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Hospital Capacity</span>
                  <div className="text-2xl font-black text-white mt-1">{hospitalStats.capacity_percentage}%</div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${hospitalStats.capacity_percentage}%` }}></div>
                  </div>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5 col-span-2 lg:col-span-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Emergency/ICU Capacity</span>
                  <div className="text-2xl font-black text-white mt-1">{hospitalStats.emergency_capacity_percentage}%</div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${hospitalStats.emergency_capacity_percentage}%` }}></div>
                  </div>
                </div>
              </div>
            )}

            {beforeAfterQueue && (
              <div className="glass-card-glow rounded-2xl p-6 border border-blue-500/20 relative overflow-hidden">
                <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-rose-500 pulse-glow" /> Emergency Recalculation Impact
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-4 bg-slate-950/60 rounded-xl border border-white/5">
                    <span className="text-xs font-extrabold text-gray-400 block mb-3 uppercase tracking-wider">Before Event</span>
                    <div className="space-y-2">
                      {beforeAfterQueue.before.map((app, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-900/40 rounded-lg border border-white/5 font-mono">
                          <span className="text-gray-300 font-bold">{app.patient_name}</span>
                          <span className="text-gray-500">{app.appointment_time.split(' ')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/60 rounded-xl border border-rose-500/20">
                    <span className="text-xs font-extrabold text-rose-400 block mb-3 uppercase tracking-wider">After Event</span>
                    <div className="space-y-2">
                      {beforeAfterQueue.after.map((app, idx) => (
                        <div key={idx} className={`flex justify-between items-center text-xs p-2.5 rounded-lg border font-mono ${
                          app.priority === 'EMERGENCY' 
                            ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' 
                            : app.status === 'SHIFTED'
                            ? 'bg-slate-900/60 border-amber-500/30 text-amber-300'
                            : 'bg-slate-900/40 border-white/5 text-gray-300'
                        }`}>
                          <span className="font-bold flex items-center gap-1.5">
                            {app.priority === 'EMERGENCY' && <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>}
                            {app.patient_name}
                          </span>
                          <span className="font-bold">{app.appointment_time.split(' ')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3.5 bg-slate-950/80 rounded-xl border border-white/5 text-xs text-gray-400">
                  <span className="font-bold text-white block mb-1">Recalculation Explanation:</span>
                  {beforeAfterQueue.explanation}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-white/5 flex justify-between items-center">
                    <h4 className="font-bold text-white text-base">Live Queue</h4>
                    <span className="text-xs text-gray-400 font-mono">Real-time update active</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/40 text-xs text-gray-400 uppercase font-semibold">
                          <th className="p-4 font-bold">App ID</th>
                          <th className="p-4 font-bold">Patient</th>
                          <th className="p-4 font-bold">Time</th>
                          <th className="p-4 font-bold">Priority</th>
                          <th className="p-4 font-bold">Status</th>
                          <th className="p-4 font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                        {hospitalQueue.length > 0 ? (
                          hospitalQueue.map((app) => (
                            <tr key={app.appointment_id} className="hover:bg-slate-900/30">
                              <td className="p-4 font-mono font-bold text-gray-400">{app.appointment_id}</td>
                              <td className="p-4 font-bold text-white">
                                <div>{app.patient_name}</div>
                                {app.notes && <div className="text-[10px] text-gray-500 font-medium mt-0.5">{app.notes}</div>}
                              </td>
                              <td className="p-4 font-mono font-semibold">{app.appointment_time.split(' ')[1]}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                                  app.priority === 'EMERGENCY' || app.priority === 'HIGH'
                                    ? 'bg-rose-950/80 text-rose-400 border border-rose-500/20'
                                    : app.priority === 'MEDIUM'
                                    ? 'bg-amber-950/80 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {app.priority}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`font-semibold ${
                                  app.status === 'CANCELLED' ? 'text-gray-500' :
                                  app.status === 'SHIFTED' ? 'text-amber-400' :
                                  app.status === 'REALLOCATED' ? 'text-purple-400' :
                                  'text-emerald-400'
                                }`}>
                                  {app.status}
                                </span>
                              </td>
                              <td className="p-4">
                                {app.status !== 'CANCELLED' && (
                                  <button 
                                    onClick={() => handleCancelAppointment(app.appointment_id)}
                                    className="p-1.5 bg-slate-950 hover:bg-rose-950/40 text-gray-500 hover:text-rose-400 border border-white/5 hover:border-rose-800/40 rounded-lg transition-all"
                                    title="Cancel Appointment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="p-12 text-center text-gray-500">
                              No active appointments in this hospital queue.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="glass-card rounded-2xl p-6 border border-white/5">
                  <h4 className="font-bold text-white text-base mb-4">Simulate Events</h4>
                  
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={handleSimulateEmergency}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-rose-600/10 flex justify-center items-center gap-2"
                    >
                      🚨 SIMULATE EMERGENCY
                    </button>

                    <div className="h-px bg-white/5 my-1"></div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-400 block">Doctor Unavailable</label>
                      <div className="flex gap-2">
                        <select 
                          value={unavailableDoctorId} 
                          onChange={e => setUnavailableDoctorId(e.target.value)} 
                          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          {hospitalDoctorsList.map(d => (
                            <option key={d.doctor_id} value={d.doctor_id}>
                              {d.name} ({d.specialty})
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={handleDoctorUnavailable}
                          className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-4 py-2.5 rounded-xl border border-white/5 text-xs transition-all flex-shrink-0"
                        >
                          Go Offline
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <label className="text-xs font-semibold text-gray-400 block">Queue Rebalancing</label>
                      <button 
                        onClick={handleRebalanceQueues}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-gray-300 font-bold py-3 px-4 rounded-xl border border-white/5 transition-all text-xs flex justify-center items-center gap-2"
                      >
                        ⚖️ Rebalance Overloaded Queues
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 border border-white/5 flex-1 flex flex-col min-h-[300px]">
                  <h4 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-blue-500" /> Dispatch Log Feed
                  </h4>
                  <div className="flex-1 bg-slate-950/70 border border-white/5 rounded-xl p-4 overflow-y-auto font-mono text-[10px] text-gray-400 space-y-2.5 max-h-[300px]">
                    {simulationLogs.length > 0 ? (
                      simulationLogs.map((log, idx) => (
                        <div key={idx} className="pb-2 border-b border-white/5 last:border-b-0 leading-relaxed text-gray-300">
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-600 py-12">
                        System ready. Event logs will stream here.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="flex flex-col gap-6">
            {analytics && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Total Hospitals</span>
                  <div className="text-3xl font-black text-white mt-1">{analytics.summary.total_hospitals}</div>
                  <span className="text-[10px] text-blue-400 font-medium">Active locations</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Total Doctors</span>
                  <div className="text-3xl font-black text-white mt-1">{analytics.summary.total_doctors}</div>
                  <span className="text-[10px] text-blue-400 font-medium">Physician records</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Active Appointments</span>
                  <div className="text-3xl font-black text-white mt-1">{analytics.summary.active_appointments}</div>
                  <span className="text-[10px] text-emerald-400 font-medium">Today's booked cases</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Avg Wait Time</span>
                  <div className="text-3xl font-black text-white mt-1">{analytics.summary.average_waiting_time}</div>
                  <span className="text-[10px] text-blue-400 font-medium">Mean dispatch lag</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Hospital Util.</span>
                  <div className="text-3xl font-black text-white mt-1">{analytics.summary.hospital_utilization}</div>
                  <span className="text-[10px] text-emerald-400 font-medium">Beds occupied average</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-white/5 col-span-2 lg:col-span-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Emergency Cases</span>
                  <div className="text-3xl font-black text-rose-400 mt-1">{analytics.summary.emergency_cases}</div>
                  <span className="text-[10px] text-rose-400/80 font-medium">🚨 High-priority dispatches</span>
                </div>
              </div>
            )}

            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="glass-card rounded-2xl p-5 border border-white/5 lg:col-span-7">
                  <h4 className="font-bold text-white text-sm mb-4">Hospital Bed Allocations (Capacity vs Occupancy)</h4>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.charts.hospital_capacity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#6B7280" fontSize={9} tickLine={false} />
                        <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: 'rgba(255,255,255,0.1)' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="occupancy" name="Occupied Beds" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="capacity" name="Total Capacity" fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth={1} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-white/5 lg:col-span-5">
                  <h4 className="font-bold text-white text-sm mb-4">Clinical Specialty Demand</h4>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.charts.specialty_demand}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analytics.charts.specialty_demand.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px' }} />
                        <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '9px', color: '#9CA3AF' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-white/5 lg:col-span-6">
                  <h4 className="font-bold text-white text-sm mb-4">Doctor Workload Load Factor (%)</h4>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.charts.doctor_workload} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" domain={[0, 100]} stroke="#6B7280" fontSize={10} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={8} width={90} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: 'rgba(255,255,255,0.1)' }} />
                        <Bar dataKey="workload" name="Workload %" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-white/5 lg:col-span-6">
                  <h4 className="font-bold text-white text-sm mb-4">Average Waiting Time by Medical Specialty (min)</h4>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.charts.waiting_time_by_specialty}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="specialty" stroke="#6B7280" fontSize={9} tickLine={false} />
                        <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: 'rgba(255,255,255,0.1)' }} />
                        <Line type="monotone" dataKey="waiting_time" name="Avg Wait Time" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
