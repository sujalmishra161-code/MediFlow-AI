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

const API_BASE = "https://mediflow-ai-production-2f71.up.railway.app/api";
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
  <div className="min-h-screen bg-[#F6F8FB] text-[#1E2B35] text-[14px] sm:text-[15px]">

    {/* TOP HEADER */}
    <header className="border-b border-[#E3EAF0] bg-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 xl:px-10">
        <div className="min-h-[86px] flex items-center justify-between gap-6">

          {/* LEFT */}
          <div>
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#3978A8]">
              Care coordination
            </p>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#20313D] mt-1">
              {activeTab === 'patient'
                ? 'Find the right care'
                : activeTab === 'hospital'
                ? 'Live hospital dashboard'
                : 'Healthcare network analytics'}
            </h2>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">

            {/* MediFlow Logo */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#F5FAFC] border border-[#D8E8F0]">
              <div className="h-10 w-10 rounded-xl bg-[#3978A8] flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>

              <div className="leading-tight">
                <p className="text-[15px] font-extrabold text-[#20313D]">
                  MediFlow <span className="text-[#3978A8]">AI</span>
                </p>

                <p className="text-[9px] font-semibold text-[#8A98A4] mt-0.5">
                  Smart care coordination
                </p>
              </div>
            </div>

            {/* Backend status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#E5EBEF] bg-[#FAFBFC]">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isLocalMode ? 'bg-[#E2A44A]' : 'bg-[#5CB477]'
                }`}
              />

              <span className="text-[10px] font-bold text-[#687780]">
                {isLocalMode ? 'Local simulator' : 'FastAPI connected'}
              </span>
            </div>

            {/* User */}
            <div className="h-10 w-10 rounded-full bg-[#EAF3F8] border border-[#D7E7EF] flex items-center justify-center">
              <User className="h-5 w-5 text-[#3978A8]" />
            </div>

            <div className="hidden lg:block">
              <p className="text-[13px] font-bold text-[#334650]">
                Sujal Mishra
              </p>
              <p className="text-[10px] text-[#98A4AC]">
                Administrator
              </p>
            </div>

          </div>
        </div>
      </div>
    </header>


    {/* MAIN NAVIGATION */}
    <nav className="border-b border-[#E5EBEF] bg-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 xl:px-10">
        <div className="grid grid-cols-3">

          {[
            {
              id: 'patient',
              icon: Stethoscope,
              label: 'Find Care',
              sub: 'AI-powered care matching'
            },
            {
              id: 'hospital',
              icon: Building,
              label: 'Hospital',
              sub: 'Operations & resources'
            },
            {
              id: 'admin',
              icon: BarChart3,
              label: 'Analytics',
              sub: 'Performance insights'
            }
          ].map(item => {

            const Icon = item.icon;
            const active = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center justify-center gap-3 sm:gap-4 px-4 sm:px-8 py-4 sm:py-5 transition-all border-r border-[#E5EBEF] last:border-r-0 ${
                  active
                    ? 'bg-[#EAF3F8]'
                    : 'bg-white hover:bg-[#F8FAFC]'
                }`}
              >

                {/* Active blue line */}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#3978A8]" />
                )}

                {/* Icon */}
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    active
                      ? 'bg-white text-[#3978A8]'
                      : 'bg-[#F5F7F9] text-[#7E8C96]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Text */}
                <div className="text-left">
                  <p
                    className={`text-sm sm:text-base font-extrabold ${
                      active
                        ? 'text-[#3978A8]'
                        : 'text-[#445761]'
                    }`}
                  >
                    {item.label}
                  </p>

                  <p className="hidden sm:block text-[9px] sm:text-[10px] mt-0.5 text-[#8B98A0]">
                    {item.sub}
                  </p>
                </div>

                {active && (
                  <ChevronRight className="hidden lg:block h-4 w-4 text-[#3978A8]" />
                )}

              </button>
            );
          })}

        </div>
      </div>
    </nav>


    {/* MAIN CONTENT */}
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-10 py-7 sm:py-9">

      {toast && (
        <div
          className={`fixed right-5 bottom-5 z-[100] max-w-sm flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-xl ${
            toast.type === 'success'
              ? 'bg-white border-[#BFE2CA] text-[#3F8F59]'
              : toast.type === 'error'
              ? 'bg-white border-[#F0C3C8] text-[#C24F5D]'
              : toast.type === 'warning'
              ? 'bg-white border-[#F0D9AA] text-[#A87924]'
              : 'bg-white border-[#C9DFEB] text-[#3978A8]'
          }`}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="text-[11px] font-semibold leading-relaxed">
            {toast.message}
          </span>
        </div>
      )}

      
        

          {activeTab === 'patient' && (
  <div className="mf-page">

    {/* =====================================================
        HEADER
    ====================================================== */}

    <div className="mf-header" style={{ margin: "-34px -28px 0" }}>
      <div className="mf-header-top">

        <div>
          <div className="mf-eyebrow">
            Care Coordination
          </div>

          <h1 className="mf-title">
            Find the right care
          </h1>
        </div>

        {/* MediFlow AI logo */}
        <div className="mf-brand">
          <div className="mf-logo">
            MF
          </div>

          <div>
            <div className="mf-brand-name">
              MediFlow AI
            </div>

            <div className="mf-brand-subtitle">
              Smart Patient Routing
            </div>
          </div>
        </div>

      </div>

      {/* Main tabs */}
      <div className="mf-nav">

        <button
          type="button"
          onClick={() => setActiveTab("patient")}
          className={`mf-nav-button ${
            activeTab === "patient" ? "active" : ""
          }`}
        >
          <Stethoscope
            style={{
              width: 21,
              height: 21,
              verticalAlign: "middle",
              marginRight: 8
            }}
          />
          Find Care
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hospital")}
          className={`mf-nav-button ${
            activeTab === "hospital" ? "active" : ""
          }`}
        >
          <Building
            style={{
              width: 21,
              height: 21,
              verticalAlign: "middle",
              marginRight: 8
            }}
          />
          Hospital
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("admin")}
          className={`mf-nav-button ${
            activeTab === "admin" ? "active" : ""
          }`}
        >
          <BarChart3
            style={{
              width: 21,
              height: 21,
              verticalAlign: "middle",
              marginRight: 8
            }}
          />
          Analytics
        </button>

      </div>
    </div>


    {/* =====================================================
        HERO
    ====================================================== */}

    <section style={{ marginTop: 35 }}>

      <div className="mf-section-label">
        <Sparkles size={20} />
        AI-assisted care routing
      </div>

      <h2 className="mf-hero-title">
        Find the right doctor without the guesswork.
      </h2>

      <p className="mf-hero-description">
        MediFlow analyzes specialty, urgency, distance, queue load,
        doctor workload and hospital capacity to create a ranked
        care recommendation.
      </p>

      <div className="mf-process">

        <div className="mf-process-card">
          <div className="mf-process-number">
            01
          </div>

          <div className="mf-process-title">
            AI Triage
          </div>

          <div className="mf-process-subtitle">
            Specialty + urgency
          </div>
        </div>

        <div className="mf-process-card">
          <div className="mf-process-number">
            02
          </div>

          <div className="mf-process-title">
            Smart Match
          </div>

          <div className="mf-process-subtitle">
            6 allocation signals
          </div>
        </div>

        <div className="mf-process-card">
          <div className="mf-process-number">
            03
          </div>

          <div className="mf-process-title">
            Dynamic Flow
          </div>

          <div className="mf-process-subtitle">
            Queue reallocation
          </div>
        </div>

      </div>

    </section>


    {/* =====================================================
        PATIENT ASSESSMENT
    ====================================================== */}

    <section className="mf-assessment">

      <div className="mf-assessment-header">

        <div className="mf-assessment-heading">

          <div className="mf-assessment-icon">
            <User size={23} />
          </div>

          <div>
            <div className="mf-assessment-title">
              Patient assessment
            </div>

            <div className="mf-assessment-subtitle">
              Enter details for AI routing
            </div>
          </div>

        </div>

        <div className="mf-step">
          STEP 1 / 2
        </div>

      </div>


      {/* Demo scenarios */}

      <div className="mf-scenarios">

        <button
          type="button"
          onClick={() => prefillDemoScenario(1)}
          className="mf-scenario"
          style={{
            border: 0,
            textAlign: "left",
            width: "100%"
          }}
        >
          <div className="mf-scenario-label">
            Demo Scenario
          </div>

          <div className="mf-scenario-name">
            Cardiac priority
          </div>
        </button>


        <button
          type="button"
          onClick={() => prefillDemoScenario(4)}
          className="mf-scenario"
          style={{
            border: 0,
            textAlign: "left",
            width: "100%"
          }}
        >
          <div className="mf-scenario-label">
            Demo Scenario
          </div>

          <div className="mf-scenario-name">
            Specialist escalation
          </div>
        </button>

      </div>


      {/* FORM */}

      <form
        className="mf-form"
        onSubmit={handlePatientSearch}
      >

        {/* Patient name */}

        <div className="mf-field">

          <label className="mf-label">
            Patient name
          </label>

          <div className="mf-input-wrapper">

            <User className="mf-input-icon" />

            <input
              type="text"
              value={patientName}
              onChange={(e) =>
                setPatientName(e.target.value)
              }
              className="mf-input"
              placeholder="Enter patient name"
              required
            />

          </div>

        </div>


        {/* Age + Location */}

        <div className="mf-field-row">

          <div className="mf-field">

            <label className="mf-label">
              Age
            </label>

            <div className="mf-input-wrapper">

              <Calendar className="mf-input-icon" />

              <input
                type="number"
                min="0"
                max="120"
                value={patientAge}
                onChange={(e) =>
                  setPatientAge(parseInt(e.target.value) || 0)
                }
                className="mf-input"
                required
              />

            </div>

          </div>


          <div className="mf-field">

            <label className="mf-label">
              Location
            </label>

            <div className="mf-input-wrapper">

              <MapPin className="mf-input-icon" />

              <select
                value={patientLocation}
                onChange={(e) =>
                  setPatientLocation(e.target.value)
                }
                className="mf-select"
              >

                <option value="Kalyanpur">
                  Kalyanpur (West)
                </option>

                <option value="Kakadeo">
                  Kakadeo (Central-West)
                </option>

                <option value="Swaroop Nagar">
                  Swaroop Nagar (Central)
                </option>

                <option value="Civil Lines">
                  Civil Lines (North-Central)
                </option>

                <option value="Naubasta">
                  Naubasta (South)
                </option>

                <option value="Kidwai Nagar">
                  Kidwai Nagar (South-East)
                </option>

                <option value="Bidhuna">
                  Bidhuna (Rural &gt;60km)
                </option>

              </select>

            </div>

          </div>

        </div>


        {/* Symptoms */}

        <div className="mf-field">

          <label className="mf-label">
            Symptoms / Reason for visit
          </label>

          <div className="mf-input-wrapper">

            <Activity
              className="mf-input-icon"
              style={{ top: 20, transform: "none" }}
            />

            <textarea
              value={patientSymptoms}
              onChange={(e) =>
                setPatientSymptoms(e.target.value)
              }
              className="mf-textarea"
              placeholder="Describe symptoms or reason for visit..."
              required
            />

          </div>

        </div>


        {/* Date + Time */}

        <div className="mf-field-row">

          <div className="mf-field">

            <label className="mf-label">
              Preferred date
            </label>

            <div className="mf-input-wrapper">

              <Calendar className="mf-input-icon" />

              <input
                type="date"
                value={prefDate}
                onChange={(e) =>
                  setPrefDate(e.target.value)
                }
                className="mf-input"
                required
              />

            </div>

          </div>


          <div className="mf-field">

            <label className="mf-label">
              Preferred time
            </label>

            <div className="mf-input-wrapper">

              <Clock className="mf-input-icon" />

              <input
                type="time"
                value={prefTime}
                onChange={(e) =>
                  setPrefTime(e.target.value)
                }
                className="mf-input"
                required
              />

            </div>

          </div>

        </div>


        <div className="mf-disclaimer">
          MediFlow uses symptoms for specialty and urgency
          routing. It does not provide a medical diagnosis.
        </div>


        {/* Search */}

        <button
          type="submit"
          disabled={isSearching}
          className="mf-submit"
          style={{ marginTop: 18 }}
        >

          {isSearching ? (
            <>
              <RefreshCw
                size={18}
                style={{
                  verticalAlign: "middle",
                  marginRight: 8,
                  animation: "spin 1s linear infinite"
                }}
              />

              ANALYZING SYMPTOMS...
            </>
          ) : (
            <>
              <Sparkles
                size={18}
                style={{
                  verticalAlign: "middle",
                  marginRight: 8
                }}
              />

              FIND BEST CARE PATH
            </>
          )}

        </button>

      </form>

    </section>


    {/* =====================================================
    SEARCH RESULT
====================================================== */}

{searchResult && (
    // paste my new doctor-list code here
)}

</div>
)}

  </div>
)}

          {activeTab === 'hospital' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-[#E4EAF0] p-5 sm:p-6 shadow-[0_6px_24px_rgba(35,55,70,0.04)]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#EAF3F8] flex items-center justify-center"><Building className="h-6 w-6 text-[#3978A8]" /></div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#3978A8]">Operations center</p>
                      <h2 className="text-xl font-extrabold text-[#2B3E49] mt-1">Live Hospital Dashboard</h2>
                      <p className="text-[11px] text-[#929EA5] mt-1">Monitor queues and simulate dynamic hospital events.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#929EA5]">Facility</span>
                    <select value={selectedHospitalId} onChange={e => setSelectedHospitalId(e.target.value)} className="bg-white border border-[#DFE6EB] rounded-xl px-4 py-3 text-[10px] font-bold text-[#40535E] outline-none focus:border-[#3978A8] min-w-[230px]">
                      {localHospitals.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {hospitalStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {[
                    ['Doctors available', hospitalStats.doctors_available, 'On-duty active', 'blue'],
                    ['Patients waiting', hospitalStats.patients_waiting, 'Scheduled today', 'cyan'],
                    ['Average wait', `${hospitalStats.average_waiting_time_minutes} min`, 'Queue load', 'violet'],
                    ['Hospital capacity', `${hospitalStats.capacity_percentage}%`, 'Facility utilization', 'blue'],
                    ['Emergency / ICU', `${hospitalStats.emergency_capacity_percentage}%`, 'Critical capacity', 'rose']
                  ].map(([label, value, sub, tone]) => (
                    <div key={label} className="bg-white rounded-2xl border border-[#E4EAF0] p-4 sm:p-5">
                      <div className="flex items-start justify-between">
                        <span className="text-[8px] uppercase tracking-widest text-[#96A1A8] font-extrabold">{label}</span>
                        <span className={`h-2 w-2 rounded-full ${tone === 'rose' ? 'bg-[#D86470]' : tone === 'violet' ? 'bg-[#8A70AA]' : 'bg-[#3978A8]'}`} />
                      </div>
                      <p className="text-xl sm:text-2xl font-extrabold text-[#2C3F4A] mt-2">{value}</p>
                      <p className="text-[8px] text-[#9AA5AC] mt-1">{sub}</p>
                      {(label === 'Hospital capacity' || label === 'Emergency / ICU') && (
                        <div className="h-1.5 rounded-full bg-[#EDF1F4] mt-3 overflow-hidden">
                          <div className={`h-full rounded-full ${tone === 'rose' ? 'bg-[#D86470]' : 'bg-[#3978A8]'}`} style={{ width: `${label === 'Hospital capacity' ? hospitalStats.capacity_percentage : hospitalStats.emergency_capacity_percentage}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {beforeAfterQueue && (
                <section className="bg-white rounded-2xl border border-[#F0D2D6] overflow-hidden">
                  <div className="p-5 border-b border-[#F2E4E6] flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#FFF0F1] flex items-center justify-center"><Activity className="h-4 w-4 text-[#D45D69]" /></div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-extrabold text-[#D45D69]">Dynamic recalculation</p>
                      <h3 className="font-extrabold text-[#394A54] mt-0.5">Emergency impact simulation</h3>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 p-5">
                    <div className="rounded-xl bg-[#FAFBFC] border border-[#E9EEF2] p-4">
                      <p className="text-[8px] uppercase tracking-widest font-extrabold text-[#9AA5AC] mb-3">Before event</p>
                      <div className="space-y-2">
                        {beforeAfterQueue.before.map((app, idx) => (
                          <div key={idx} className="flex justify-between rounded-lg bg-white border border-[#EEF1F4] px-3 py-2.5 text-[9px]">
                            <span className="font-bold text-[#53656F]">{app.patient_name}</span>
                            <span className="font-mono text-[#8C999F]">{app.appointment_time.split(' ')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#FFF8F8] border border-[#F2E0E2] p-4">
                      <p className="text-[8px] uppercase tracking-widest font-extrabold text-[#D45D69] mb-3">After event</p>
                      <div className="space-y-2">
                        {beforeAfterQueue.after.map((app, idx) => (
                          <div key={idx} className={`flex justify-between rounded-lg border px-3 py-2.5 text-[9px] ${
                            app.priority === 'EMERGENCY'
                              ? 'bg-[#FFF0F1] border-[#F0C8CD] text-[#B74F5B]'
                              : app.status === 'SHIFTED'
                              ? 'bg-[#FFF9EC] border-[#F1E0B8] text-[#9A762F]'
                              : 'bg-white border-[#EEF1F4] text-[#53656F]'
                          }`}>
                            <span className="font-bold">{app.priority === 'EMERGENCY' && '🚨 '}{app.patient_name}</span>
                            <span className="font-mono font-bold">{app.appointment_time.split(' ')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mx-5 mb-5 rounded-xl bg-[#F8FAFB] border border-[#E8EDF1] px-4 py-3 text-[9px] text-[#7D8B94] leading-relaxed">
                    <b className="text-[#4E606A]">Recalculation:</b> {beforeAfterQueue.explanation}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <section className="xl:col-span-8 bg-white rounded-2xl border border-[#E4EAF0] overflow-hidden">
                  <div className="p-5 border-b border-[#EEF1F4] flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-extrabold text-[#3978A8]">Queue monitor</p>
                      <h3 className="font-extrabold text-[#334650] mt-1">Live appointment queue</h3>
                    </div>
                    <span className="inline-flex items-center gap-2 text-[9px] text-[#4F9A65] font-bold"><span className="h-1.5 w-1.5 rounded-full bg-[#5CB477] animate-pulse" /> LIVE</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left">
                      <thead>
                        <tr className="bg-[#FAFBFC] border-b border-[#EEF1F4] text-[8px] uppercase tracking-widest text-[#9AA5AC]">
                          <th className="px-4 py-3">Appointment</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F2F4]">
                        {hospitalQueue.length > 0 ? hospitalQueue.map(app => (
                          <tr key={app.appointment_id} className="hover:bg-[#FBFCFD]">
                            <td className="px-4 py-4 font-mono text-[9px] text-[#7E8C95] font-bold">{app.appointment_id}</td>
                            <td className="px-4 py-4"><p className="text-[10px] font-bold text-[#334650]">{app.patient_name}</p>{app.notes && <p className="text-[8px] text-[#9AA5AC] mt-1 max-w-[240px] truncate">{app.notes}</p>}</td>
                            <td className="px-4 py-4 font-mono text-[10px] text-[#4D5E68] font-bold">{app.appointment_time.split(' ')[1]}</td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-1 rounded-md text-[8px] font-extrabold border ${
                                app.priority === 'EMERGENCY' || app.priority === 'HIGH'
                                  ? 'bg-[#FFF0F1] text-[#C65562] border-[#F0CED2]'
                                  : app.priority === 'MEDIUM'
                                  ? 'bg-[#FFF8E9] text-[#B17C28] border-[#F1DFB7]'
                                  : 'bg-[#EDF8F1] text-[#4C9B67] border-[#CDE9D5]'
                              }`}>{app.priority}</span>
                            </td>
                            <td className="px-4 py-4"><span className={`text-[9px] font-bold ${app.status === 'CANCELLED' ? 'text-[#9DA7AD]' : app.status === 'SHIFTED' ? 'text-[#B17C28]' : app.status === 'REALLOCATED' ? 'text-[#8067A5]' : 'text-[#4F9A65]'}`}>{app.status}</span></td>
                            <td className="px-4 py-4">{app.status !== 'CANCELLED' && <button onClick={() => handleCancelAppointment(app.appointment_id)} className="h-8 w-8 rounded-lg border border-[#E7ECF0] bg-white hover:bg-[#FFF4F5] hover:border-[#F0CDD2] text-[#8E9AA1] hover:text-[#C65562] flex items-center justify-center" title="Cancel Appointment"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="6" className="p-14 text-center text-[10px] text-[#98A4AC]">No active appointments in this hospital queue.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="xl:col-span-4 space-y-6">
                  <section className="bg-white rounded-2xl border border-[#E4EAF0] p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-9 w-9 rounded-xl bg-[#FFF0F1] flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-[#D45D69]" /></div>
                      <div><h3 className="font-extrabold text-sm text-[#334650]">Simulation controls</h3><p className="text-[9px] text-[#9AA5AC] mt-0.5">Trigger dynamic optimization</p></div>
                    </div>
                    <button onClick={handleSimulateEmergency} className="w-full rounded-xl bg-[#D45D69] hover:bg-[#C95562] text-white py-3 text-[9px] font-extrabold transition-colors">🚨 SIMULATE EMERGENCY</button>
                    <div className="my-4 h-px bg-[#EEF1F4]" />
                    <label className="text-[9px] uppercase tracking-widest font-extrabold text-[#8D999F] block mb-2">Doctor unavailable</label>
                    <div className="flex gap-2">
                      <select value={unavailableDoctorId} onChange={e => setUnavailableDoctorId(e.target.value)} className="min-w-0 flex-1 bg-white border border-[#DFE6EB] rounded-xl px-3 py-2.5 text-[9px] text-[#465964] outline-none focus:border-[#3978A8]">
                        {hospitalDoctorsList.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.name} ({d.specialty})</option>)}
                      </select>
                      <button onClick={handleDoctorUnavailable} className="rounded-xl bg-[#FFF8E9] border border-[#F0DEB8] px-3 text-[9px] font-extrabold text-[#A5792B]">Go offline</button>
                    </div>
                    <button onClick={handleRebalanceQueues} className="w-full mt-3 rounded-xl border border-[#E1E7EB] bg-[#FAFBFC] hover:bg-[#F4F7F9] text-[#596A74] py-3 text-[9px] font-extrabold transition-colors">⚖️ REBALANCE QUEUES</button>
                  </section>

                  <section className="bg-white rounded-2xl border border-[#E4EAF0] p-5 min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <div><p className="text-[9px] uppercase tracking-widest font-extrabold text-[#3978A8]">Event stream</p><h3 className="font-extrabold text-sm text-[#334650] mt-1">Dispatch log</h3></div>
                      <Activity className="h-4 w-4 text-[#3978A8]" />
                    </div>
                    <div className="rounded-xl bg-[#FAFBFC] border border-[#EEF1F4] p-3 max-h-[330px] overflow-y-auto space-y-2">
                      {simulationLogs.length > 0 ? simulationLogs.map((log, idx) => <div key={idx} className="border-b border-[#EDF0F2] last:border-0 pb-2 last:pb-0 text-[8px] leading-relaxed text-[#697982] font-mono">{log}</div>) : <div className="py-12 text-center text-[9px] text-[#A0AAB1]">System ready. Event logs will stream here.</div>}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-[#E4EAF0] p-5 sm:p-7">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] font-extrabold text-[#3978A8]">
                      <BarChart3 className="h-3.5 w-3.5" /> System intelligence
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#293C47] mt-2">Healthcare network analytics</h2>
                    <p className="text-xs text-[#8A969E] mt-1">Operational view of capacity, physician workload, demand and waiting time.</p>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-[#F7FAFB] border border-[#E8EDF1] text-[9px] text-[#7E8B93]">
                    <span className="text-[#5CB477] font-bold">●</span> Current system state
                  </div>
                </div>
              </section>

              {analytics && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {[
                      ['Hospitals', analytics.summary.total_hospitals, 'Active locations'],
                      ['Doctors', analytics.summary.total_doctors, 'Physician records'],
                      ['Appointments', analytics.summary.active_appointments, "Today's active"],
                      ['Avg wait', analytics.summary.average_waiting_time, 'Dispatch lag'],
                      ['Utilization', analytics.summary.hospital_utilization, 'Average beds'],
                      ['Emergency', analytics.summary.emergency_cases, 'Priority cases']
                    ].map(([label, value, sub], idx) => (
                      <div key={label} className="bg-white rounded-2xl border border-[#E4EAF0] p-4 sm:p-5">
                        <span className="text-[8px] uppercase tracking-widest text-[#96A1A8] font-extrabold">{label}</span>
                        <p className={`text-2xl font-extrabold mt-2 ${label === 'Emergency' ? 'text-[#C65562]' : 'text-[#2C3F4A]'}`}>{value}</p>
                        <p className="text-[8px] text-[#9AA5AC] mt-1">{sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E4EAF0] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><p className="text-[9px] uppercase tracking-widest font-extrabold text-[#3978A8]">Capacity intelligence</p><h3 className="font-extrabold text-[#334650] mt-1">Hospital beds: occupancy vs capacity</h3></div>
                        <Building className="h-4 w-4 text-[#9BA6AD]" />
                      </div>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.charts.hospital_capacity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" />
                            <XAxis dataKey="name" stroke="#8A969E" fontSize={9} tickLine={false} />
                            <YAxis stroke="#8A969E" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1E7EB', borderRadius: '10px', fontSize: '10px' }} />
                            <Legend wrapperStyle={{ fontSize: '9px' }} />
                            <Bar dataKey="occupancy" name="Occupied" fill="#3978A8" radius={[5, 5, 0, 0]} />
                            <Bar dataKey="capacity" name="Capacity" fill="#DCE8EF" radius={[5, 5, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E4EAF0] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><p className="text-[9px] uppercase tracking-widest font-extrabold text-[#8067A5]">Demand mix</p><h3 className="font-extrabold text-[#334650] mt-1">Clinical specialty demand</h3></div>
                        <TrendingUp className="h-4 w-4 text-[#9BA6AD]" />
                      </div>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={analytics.charts.specialty_demand} cx="50%" cy="45%" innerRadius={65} outerRadius={92} paddingAngle={4} dataKey="value">
                              {analytics.charts.specialty_demand.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1E7EB', borderRadius: '10px', fontSize: '10px' }} />
                            <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '9px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E4EAF0] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><p className="text-[9px] uppercase tracking-widest font-extrabold text-[#8067A5]">Workload intelligence</p><h3 className="font-extrabold text-[#334650] mt-1">Doctor load factor</h3></div>
                        <UserCheck className="h-4 w-4 text-[#9BA6AD]" />
                      </div>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.charts.doctor_workload} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" />
                            <XAxis type="number" domain={[0, 100]} stroke="#8A969E" fontSize={9} tickLine={false} />
                            <YAxis dataKey="name" type="category" stroke="#8A969E" fontSize={8} width={95} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1E7EB', borderRadius: '10px', fontSize: '10px' }} />
                            <Bar dataKey="workload" name="Workload %" fill="#8067A5" radius={[0, 5, 5, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E4EAF0] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><p className="text-[9px] uppercase tracking-widest font-extrabold text-[#4F9A65]">Service performance</p><h3 className="font-extrabold text-[#334650] mt-1">Average waiting time by specialty</h3></div>
                        <Clock className="h-4 w-4 text-[#9BA6AD]" />
                      </div>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.charts.waiting_time_by_specialty}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" />
                            <XAxis dataKey="specialty" stroke="#8A969E" fontSize={8} tickLine={false} />
                            <YAxis stroke="#8A969E" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E1E7EB', borderRadius: '10px', fontSize: '10px' }} />
                            <Line type="monotone" dataKey="waiting_time" name="Avg wait (min)" stroke="#5CB477" strokeWidth={3} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
  );
}
