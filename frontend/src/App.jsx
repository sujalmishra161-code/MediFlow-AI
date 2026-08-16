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
        loadHospitalDashboard();
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
        loadHospitalDashboard();
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
        loadHospitalDashboard();
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
        loadHospitalDashboard();
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


  const selectedHospital = localHospitals.find(h => h.hospital_id === selectedHospitalId);

  const departmentLoad = (() => {
    const grouped = {};
    localDoctors.forEach(doc => {
      const key = doc.specialty || 'General Medicine';
      if (!grouped[key]) grouped[key] = { name: key, total: 0, count: 0 };
      grouped[key].total += Number(doc.workload || 0);
      grouped[key].count += 1;
    });
    return Object.values(grouped)
      .map(item => ({
        name: item.name,
        value: Math.round(item.total / Math.max(item.count, 1))
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  })();

  const capacityData = [
    { name: 'Available', value: Math.max(0, 100 - Number(hospitalStats?.capacity_percentage || 0)) },
    { name: 'Occupied', value: Number(hospitalStats?.capacity_percentage || 0) },
    { name: 'Critical', value: Number(hospitalStats?.emergency_capacity_percentage || 0) },
  ];

  const queueTrendData = (() => {
    const base = Math.max(1, hospitalQueue.length);
    return ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'].map((time, i) => ({
      time,
      patients: Math.max(0, Math.round(base * (0.35 + [0.35, 0.55, 0.9, 1.35, 1.25, 0.8, 0.25][i])))
    }));
  })();

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#1E2B35] text-[14px] sm:text-[15px]">
      {/* Redesigned desktop shell: top navigation instead of the old sidebar */}
      <header className="sticky top-0 z-40 border-b border-[#E3EAF0] bg-white/95 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto h-[82px] px-4 sm:px-6 xl:px-10 flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#3978A8]">
              Care coordination
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#20313D] mt-1">
              {activeTab === 'patient'
                ? 'Find the right care'
                : activeTab === 'hospital'
                ? 'Live hospital dashboard'
                : 'Healthcare network analytics'}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#F5FAFC] border border-[#D8E8F0]">
              <div className="h-10 w-10 rounded-xl bg-[#3978A8] flex items-center justify-center shadow-sm">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-[15px] font-extrabold tracking-tight text-[#20313D]">
                  MediFlow <span className="text-[#3978A8]">AI</span>
                </p>
                <p className="text-[9px] font-semibold text-[#8A98A4] mt-0.5">Smart care coordination</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#E5EBEF] bg-[#FAFBFC]">
              <span className={`h-2.5 w-2.5 rounded-full ${isLocalMode ? 'bg-[#E2A44A]' : 'bg-[#5CB477]'}`} />
              <span className="text-[10px] font-bold text-[#687780]">
                {isLocalMode ? 'Local simulator' : 'FastAPI connected'}
              </span>
            </div>

            <div className="h-10 w-10 rounded-full bg-[#EAF3F8] border border-[#D7E7EF] flex items-center justify-center">
              <User className="h-6 w-6 text-[#3978A8]" />
            </div>
            <div className="hidden lg:block">
              <p className="text-[13px] font-bold text-[#334650]">Sujal Mishra</p>
              <p className="text-[10px] text-[#98A4AC]">Administrator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Large three-tab workspace navigation */}
      <nav className="sticky top-[82px] z-30 border-b border-[#E5EBEF] bg-white/95 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-10 py-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { id: 'patient', icon: Stethoscope, label: 'Find Care', sub: 'AI-powered care matching' },
              { id: 'hospital', icon: Building, label: 'Hospital', sub: 'Operations & resources' },
              { id: 'admin', icon: BarChart3, label: 'Analytics', sub: 'Performance insights' }
            ].map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group flex items-center justify-center sm:justify-start gap-3 sm:gap-4 rounded-2xl px-3 sm:px-6 py-3.5 sm:py-4 text-left transition-all border ${
                    active
                      ? 'bg-[#EAF3F8] border-[#C9E0EB] text-[#3978A8] shadow-sm'
                      : 'bg-white border-transparent text-[#6E7C86] hover:bg-[#F7FAFC] hover:border-[#E5EBEF]'
                  }`}
                >
                  <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    active ? 'bg-white text-[#3978A8] shadow-sm' : 'bg-[#F5F7F9] text-[#8A98A4]'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm sm:text-base font-extrabold ${active ? 'text-[#3978A8]' : 'text-[#445761]'}`}>
                      {item.label}
                    </p>
                    <p className="hidden sm:block text-[9px] sm:text-[10px] mt-0.5 text-[#8B98A0]">
                      {item.sub}
                    </p>
                  </div>
                  {active && <ChevronRight className="hidden sm:block ml-auto h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-10 py-7 sm:py-9">
        {toast && (
          <div className={`fixed right-5 bottom-5 z-[100] max-w-sm flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-xl ${
            toast.type === 'success'
              ? 'bg-white border-[#BFE2CA] text-[#3F8F59]'
              : toast.type === 'error'
              ? 'bg-white border-[#F0C3C8] text-[#C24F5D]'
              : toast.type === 'warning'
              ? 'bg-white border-[#F0D9AA] text-[#A87924]'
              : 'bg-white border-[#C9DFEB] text-[#3978A8]'
          }`}>
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="text-[11px] font-semibold leading-relaxed">{toast.message}</span>
          </div>
        )}

          {activeTab === 'patient' && (
            <div className="space-y-6">
              {/* Hero */}
              <section className="rounded-3xl bg-white border border-[#E1E9EE] p-6 sm:p-8 xl:p-10 shadow-[0_8px_30px_rgba(35,55,70,0.05)]">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3F8] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#3978A8]">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI-assisted care routing
                    </div>
                    <h1 className="text-4xl sm:text-5xl xl:text-[56px] leading-[1.05] font-extrabold tracking-tight text-[#20313D] mt-5">
                      Find the right doctor without the guesswork.
                    </h1>
                    <p className="text-base sm:text-lg text-[#7A8993] max-w-3xl mt-4 leading-relaxed">
                      MediFlow analyzes specialty, urgency, distance, queue load, doctor workload and hospital capacity to create a ranked care recommendation.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 min-w-0 xl:min-w-[430px]">
                    {[
                      ['01', 'AI Triage', 'Specialty + urgency'],
                      ['02', 'Smart Match', '6 allocation signals'],
                      ['03', 'Dynamic Flow', 'Queue reallocation']
                    ].map(([num, title, sub]) => (
                      <div key={num} className="rounded-2xl border border-[#E7EDF1] bg-[#FAFBFC] p-4">
                        <span className="text-[9px] font-bold text-[#9AA6AF]">{num}</span>
                        <p className="text-sm font-extrabold text-[#334650] mt-1.5">{title}</p>
                        <p className="text-[10px] text-[#8C99A2] mt-1 leading-relaxed">{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Assessment form */}
                <section className="xl:col-span-5 bg-white rounded-3xl border border-[#E1E9EE] shadow-[0_8px_30px_rgba(35,55,70,0.05)] overflow-hidden">
                  <div className="px-6 sm:px-7 py-6 border-b border-[#EEF1F4] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-[#EAF3F8] flex items-center justify-center">
                        <User className="h-6 w-6 text-[#3978A8]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-[#2B3E49]">Patient assessment</h3>
                        <p className="text-[10px] text-[#99A5AD] mt-1">Enter details for AI routing</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-[#5CB477]">STEP 1 / 2</span>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <button onClick={() => prefillDemoScenario(1)} className="rounded-xl border border-[#DCEAF2] bg-[#F5FAFC] hover:bg-[#EDF6FA] px-3 py-2.5 text-left transition-colors">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[#3978A8]">Demo scenario</span>
                        <span className="block text-[11px] font-bold text-[#334650] mt-1">Cardiac priority</span>
                      </button>
                      <button onClick={() => prefillDemoScenario(4)} className="rounded-xl border border-[#E5DFF1] bg-[#FAF8FD] hover:bg-[#F6F2FA] px-3 py-2.5 text-left transition-colors">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[#8067A5]">Demo scenario</span>
                        <span className="block text-[11px] font-bold text-[#334650] mt-1">Specialist escalation</span>
                      </button>
                    </div>

                    <form onSubmit={handlePatientSearch} className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#6F7F89] mb-2.5">Patient name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#A0ABB2]" />
                          <input
                            type="text"
                            value={patientName}
                            onChange={e => setPatientName(e.target.value)}
                            className="w-full rounded-xl border border-[#DFE6EB] bg-white pl-12 pr-4 py-4 text-base text-[#334650] outline-none focus:border-[#3978A8] focus:ring-2 focus:ring-[#3978A8]/10"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#6F7F89] mb-2.5">Age</label>
                          <input
                            type="number"
                            value={patientAge}
                            onChange={e => setPatientAge(parseInt(e.target.value))}
                            className="w-full rounded-xl border border-[#DFE6EB] bg-white px-4 py-4 text-base text-[#334650] outline-none focus:border-[#3978A8]"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#6F7F89] mb-2.5">Location</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3978A8]" />
                            <select
                              value={patientLocation}
                              onChange={e => setPatientLocation(e.target.value)}
                              className="w-full appearance-none rounded-xl border border-[#DFE6EB] bg-white pl-12 pr-12 py-4 text-base text-[#334650] outline-none focus:border-[#3978A8]"
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
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6F7F89]">Symptoms / reason for visit</label>
                          <span className="text-[8px] text-[#A1ABB1]">AI triage input</span>
                        </div>
                        <textarea
                          value={patientSymptoms}
                          onChange={e => setPatientSymptoms(e.target.value)}
                          rows={5}
                          className="w-full rounded-xl border border-[#DFE6EB] bg-white px-4 py-4 text-base text-[#334650] outline-none focus:border-[#3978A8] focus:ring-2 focus:ring-[#3978A8]/10 resize-none"
                          placeholder="Describe symptoms or reason for consultation..."
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#6F7F89] mb-2.5">Preferred date</label>
                          <div className="relative">
                            <Calendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#3978A8]" />
                            <input
                              type="date"
                              value={prefDate}
                              onChange={e => setPrefDate(e.target.value)}
                              className="w-full rounded-xl border border-[#DFE6EB] bg-white pl-12 pr-12 py-4 text-base text-[#334650] outline-none focus:border-[#3978A8] focus:ring-2 focus:ring-[#3978A8]/10"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#6F7F89] mb-2.5">Preferred time</label>
                          <div className="relative">
                            <Clock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#3978A8]" />
                            <input
                              type="time"
                              value={prefTime}
                              onChange={e => setPrefTime(e.target.value)}
                              className="w-full rounded-xl border border-[#DFE6EB] bg-white pl-12 pr-12 py-4 text-base text-[#334650] outline-none focus:border-[#3978A8] focus:ring-2 focus:ring-[#3978A8]/10"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#F7FAFC] border border-[#E8EDF1] px-3 py-2.5 text-[9px] text-[#8A969E] leading-relaxed">
                        MediFlow uses symptoms for <span className="font-bold text-[#596A74]">specialty and urgency routing</span>. It does not provide a medical diagnosis.
                      </div>

                      <button
                        type="submit"
                        disabled={isSearching}
                        className="w-full rounded-xl bg-[#3978A8] hover:bg-[#306B98] disabled:opacity-60 text-white py-5 sm:py-5 text-xs font-extrabold tracking-[0.08em] transition-colors flex items-center justify-center gap-2"
                      >
                        {isSearching ? (
                          <><RefreshCw className="h-4 w-4 animate-spin" /> ANALYZING REQUEST...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> FIND BEST CARE PATH <ChevronRight className="h-3.5 w-3.5" /></>
                        )}
                      </button>
                    </form>
                  </div>
                </section>

                {/* Results */}
                <section className="xl:col-span-7 space-y-5">
                  {!searchResult && !isSearching && (
                    <div className="min-h-[620px] bg-white rounded-2xl border border-[#E4EAF0] flex flex-col items-center justify-center text-center p-8">
                      <div className="h-16 w-16 rounded-2xl bg-[#F0F6F9] flex items-center justify-center mb-5">
                        <Stethoscope className="h-7 w-7 text-[#3978A8]" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#3978A8]">Ready for assessment</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-[#2A3C47] mt-2">Your care recommendation appears here</h3>
                      <p className="text-sm text-[#8A969E] max-w-lg mt-2 leading-relaxed">
                        Submit the patient details to see AI specialty classification, urgency, ranked doctors, estimated waiting time and escalation options.
                      </p>
                      <div className="grid grid-cols-3 gap-3 w-full max-w-lg mt-7">
                        {[
                          [Activity, 'AI Triage', 'Specialty + urgency'],
                          [UserCheck, 'Best Match', 'Doctor ranking'],
                          [Calendar, 'Allocation', 'Appointment slot']
                        ].map(([Icon, title, sub]) => (
                          <div key={title} className="rounded-xl border border-[#E8EDF1] bg-[#FAFBFC] p-3">
                            <Icon className="h-4 w-4 text-[#3978A8] mx-auto" />
                            <p className="text-[9px] font-bold text-[#556771] mt-2">{title}</p>
                            <p className="text-[8px] text-[#9AA5AD] mt-1">{sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSearching && (
                    <div className="min-h-[620px] bg-white rounded-2xl border border-[#DDE8EF] flex flex-col items-center justify-center text-center p-8">
                      <div className="h-20 w-20 rounded-full border-4 border-[#E5EFF4] border-t-[#3978A8] animate-spin flex items-center justify-center">
                        <Activity className="h-7 w-7 text-[#3978A8] animate-pulse" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#3978A8] mt-6">Processing request</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-[#2A3C47] mt-2">Running AI specialty triage</h3>
                      <p className="text-sm text-[#8A969E] max-w-lg mt-2 leading-relaxed">
                        Assessing symptoms, resolving patient location and calculating matching scores across available physicians.
                      </p>
                      <div className="w-full max-w-md mt-6 space-y-2">
                        {['Classifying specialty & urgency', 'Resolving nearby care options', 'Calculating doctor allocation score'].map((label, i) => (
                          <div key={label} className="flex items-center gap-3 rounded-xl border border-[#E8EDF1] bg-[#FAFBFC] px-4 py-3">
                            <span className="h-5 w-5 rounded-full bg-[#EAF3F8] text-[#3978A8] text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                            <span className="text-[10px] text-[#687780]">{label}</span>
                            <RefreshCw className="ml-auto h-3.5 w-3.5 text-[#3978A8] animate-spin" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResult && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl border border-[#DDE8EF] p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-[#5CB477]" />
                              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#3978A8]">AI assessment complete</span>
                            </div>
                            <h3 className="text-2xl font-extrabold text-[#243743] mt-2">{searchResult.classification.specialty}</h3>
                            <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-[#89969E]">
                              <span>Confidence <b className="text-[#3E505A]">{Math.round(searchResult.classification.confidence * 100)}%</b></span>
                              <span>Radius <b className="text-[#3E505A]">{searchResult.recommendations.radius_km} km</b></span>
                            </div>
                          </div>
                          <div className="sm:text-right">
                            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8D99A1] mb-2">Priority</span>
                            <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[10px] font-extrabold border ${
                              searchResult.classification.urgency === 'HIGH' || searchResult.classification.urgency === 'EMERGENCY'
                                ? 'bg-[#FFF1F2] text-[#C65562] border-[#F4CDD1]'
                                : searchResult.classification.urgency === 'MEDIUM'
                                ? 'bg-[#FFF8E9] text-[#B17C28] border-[#F1DFB7]'
                                : 'bg-[#EDF8F1] text-[#4C9B67] border-[#CDE9D5]'
                            }`}>
                              {(searchResult.classification.urgency === 'HIGH' || searchResult.classification.urgency === 'EMERGENCY') && <AlertTriangle className="h-3.5 w-3.5" />}
                              {searchResult.classification.urgency}
                            </span>
                          </div>
                        </div>
                      </div>

                      {bookingMessage && bookingMessage.appointment && (
                        <div className="rounded-2xl border border-[#CBE6D3] bg-[#F3FAF5] p-5">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-white border border-[#D7EBDD] flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-[#55A86E]" />
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-sm font-extrabold text-[#41895A]">Appointment confirmed</h4>
                                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-white text-[#4E9B65] border border-[#D4EAD9]">{bookingMessage.appointment.status || 'BOOKED'}</span>
                              </div>
                              <p className="text-[10px] text-[#688074] mt-1">
                                Booked with <b className="text-[#467A58]">{bookingMessage.appointment.doctor_name}</b> at <b className="text-[#467A58]">{bookingMessage.appointment.hospital_name}</b>.
                              </p>
                              <div className="inline-flex items-center gap-2 mt-3 rounded-lg bg-white border border-[#E0ECE3] px-3 py-1.5 text-[9px] font-mono text-[#63756A]">
                                <Clock className="h-3 w-3" /> {bookingMessage.appointment.appointment_time}
                              </div>
                            </div>
                          </div>
                          {bookingMessage.shifted_appointments && bookingMessage.shifted_appointments.length > 0 && (
                            <div className="mt-4 ml-12 rounded-xl bg-[#FFF9EC] border border-[#F0DEB5] p-3">
                              <p className="text-[9px] font-bold text-[#A5792B] flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Queue optimization applied</p>
                              <ul className="mt-2 space-y-1 text-[9px] text-[#8C7958]">
                                {bookingMessage.shifted_appointments.map((shift, idx) => <li key={idx}>{shift.patient_name} → {shift.new_time.split(' ')[1]}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {!searchResult.recommendations.escalated ? (
                        <div>
                          <div className="flex items-end justify-between mb-3">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#3978A8]">Allocation results</p>
                              <h4 className="text-lg font-extrabold text-[#2B3E49] mt-1">Recommended doctors</h4>
                            </div>
                            <span className="text-[10px] text-[#98A4AC]">Top {searchResult.recommendations.doctors.length} matches</span>
                          </div>

                          <div className="space-y-3">
                            {searchResult.recommendations.doctors.map((doc, idx) => (
                              <div key={doc.doctor_id} className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all ${
                                idx === 0 ? 'border-[#BFD8E5] shadow-[0_6px_22px_rgba(57,120,168,0.08)]' : 'border-[#E4EAF0]'
                              }`}>
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className={`h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                                      idx === 0 ? 'bg-[#EAF3F8] text-[#3978A8]' : 'bg-[#F5F7F9] text-[#8997A0]'
                                    }`}>
                                      <Stethoscope className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h5 className="font-extrabold text-[#2C3F4A] truncate">{doc.name}</h5>
                                        {idx === 0 && (
                                          <span className="px-2 py-0.5 rounded-full bg-[#EAF3F8] border border-[#D3E5EE] text-[8px] font-extrabold uppercase tracking-widest text-[#3978A8]">Best match</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-[#7F8C94] mt-1">{doc.qualification} • {doc.specialty}</p>
                                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[9px] text-[#8D999F]">
                                        <span className="flex items-center gap-1"><Building className="h-3 w-3" />{doc.hospital.name}</span>
                                        <span className="flex items-center gap-1 text-[#637580]"><MapPin className="h-3 w-3 text-[#3978A8]" />{doc.distance_km} km</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="lg:w-[235px] flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-4">
                                      <div>
                                        <span className="text-[8px] uppercase tracking-widest text-[#9AA5AC] font-bold">Match score</span>
                                        <div className="flex items-end gap-2">
                                          <span className="text-xl font-extrabold text-[#2C3F4A]">{doc.score}%</span>
                                          <div className="w-20 h-1.5 bg-[#E8EDF1] rounded-full overflow-hidden mb-1">
                                            <div className="h-full rounded-full bg-[#3978A8]" style={{ width: `${Math.min(100, doc.score)}%` }} />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[8px] uppercase tracking-widest text-[#9AA5AC] font-bold">Est. wait</span>
                                        <p className="text-xs font-extrabold text-[#3978A8] mt-1">{doc.queue_count * doc.consultation_duration} min</p>
                                      </div>
                                    </div>
                                    <button onClick={() => handleBookAppointment(doc)} className="w-full rounded-xl bg-[#3978A8] hover:bg-[#306B98] text-white py-2.5 text-[9px] font-extrabold transition-colors flex items-center justify-center gap-2">
                                      BOOK APPOINTMENT <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-[#EEF1F4] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                  {[
                                    ['Specialty', doc.breakdown.specialty_match],
                                    ['Availability', doc.breakdown.availability],
                                    ['Distance', doc.breakdown.distance_score],
                                    ['Queue', doc.breakdown.queue_score],
                                    ['Workload', doc.breakdown.workload_score],
                                    ['Hospital', doc.breakdown.hospital_capacity_score]
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg bg-[#F8FAFB] px-2 py-1.5 border border-[#EEF1F4]">
                                      <p className="text-[7px] text-[#9BA6AD] uppercase">{label}</p>
                                      <p className="text-[10px] text-[#52636D] font-bold mt-0.5">{value}%</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-[#F0CDD2] bg-[#FFF7F8] p-5 flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-[#C65562] flex-shrink-0" />
                            <div>
                              <h4 className="font-extrabold text-[#B64F5B]">Local specialist unavailable</h4>
                              <p className="text-[10px] text-[#8B7A7D] mt-1">MediFlow expanded the search radius from 10 km → 25 km → 50 km and activated specialist escalation.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border border-[#E4EAF0] p-5">
                              <div className="flex items-center gap-2 mb-4"><Building className="h-4 w-4 text-[#3978A8]" /><h5 className="font-extrabold text-sm text-[#334650]">Recommended hospitals</h5></div>
                              <div className="space-y-2">
                                {searchResult.recommendations.escalation_options.recommended_hospitals.map((h, i) => (
                                  <div key={i} className="rounded-xl border border-[#EDF1F4] bg-[#FAFBFC] p-3">
                                    <div className="flex justify-between gap-2"><span className="text-[10px] font-bold text-[#445761]">{h.name}</span><span className="text-[9px] font-bold text-[#3978A8]">{h.distance_km} km</span></div>
                                    <div className="flex justify-between mt-2 text-[8px] text-[#929EA5]"><span>{h.specialty}</span><span>Slot {h.available_time}</span></div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-[#E4EAF0] p-5">
                              <div className="flex items-center gap-2 mb-4"><Stethoscope className="h-4 w-4 text-[#8067A5]" /><h5 className="font-extrabold text-sm text-[#334650]">Teleconsultation</h5></div>
                              <div className="space-y-2">
                                {searchResult.recommendations.escalation_options.teleconsultation.length > 0 ? searchResult.recommendations.escalation_options.teleconsultation.map((t, i) => (
                                  <div key={i} className="rounded-xl border border-[#EDF1F4] bg-[#FAFBFC] p-3">
                                    <div className="flex justify-between gap-2"><span className="text-[10px] font-bold text-[#445761]">{t.name}</span><span className="text-[9px] font-bold text-[#4F9A65]">Online</span></div>
                                    <div className="flex justify-between mt-2 text-[8px] text-[#929EA5]"><span>{t.specialty}</span><span>{t.available_time}</span></div>
                                  </div>
                                )) : <div className="text-center text-[9px] text-[#98A4AC] py-5">Teleconsultation specialists offline.</div>}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[#DDD6EA] bg-[#FAF8FD] p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <p className="text-[9px] uppercase tracking-widest font-extrabold text-[#8067A5]">Digital referral</p>
                                <p className="text-[10px] text-[#7E7787] mt-1 leading-relaxed">{searchResult.recommendations.escalation_options.referral.message}</p>
                              </div>
                              <button onClick={() => showToast("Referral Certificate Generated!", "success")} className="flex-shrink-0 rounded-xl bg-white hover:bg-[#F7F4FB] border border-[#DED8E9] px-4 py-2.5 text-[9px] font-extrabold text-[#5D536A]">
                                {searchResult.recommendations.escalation_options.referral.action}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {activeTab === 'hospital' && (
            <div className="space-y-6">
              {/* HOSPITAL COMMAND CENTER */}
              <section className="overflow-hidden rounded-[28px] bg-[#102A43] text-white shadow-[0_18px_50px_rgba(16,42,67,0.18)]">
                <div className="relative p-6 sm:p-8">
                  <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#3978A8]/30 blur-3xl" />
                  <div className="absolute right-20 bottom-0 h-40 w-40 rounded-full bg-[#5CB477]/10 blur-3xl" />

                  <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-7">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#BFE3F2]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#62D08A] animate-pulse" />
                        Live operations center
                      </div>

                      <h1 className="mt-4 text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight">
                        Hospital Command Center
                      </h1>

                      <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-[#B8C9D5]">
                        Real-time visibility into patient flow, doctor workload, appointment queues and emergency capacity.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 min-w-[210px]">
                        <p className="text-[8px] uppercase tracking-[0.18em] font-bold text-[#91A8B8]">Selected facility</p>
                        <select
                          value={selectedHospitalId}
                          onChange={e => setSelectedHospitalId(e.target.value)}
                          className="mt-1.5 w-full bg-transparent text-sm font-extrabold text-white outline-none"
                        >
                          {localHospitals.map(h => (
                            <option key={h.hospital_id} value={h.hospital_id} className="text-[#263946]">
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={fetchHospitalDashboard}
                        className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-[10px] font-extrabold hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        REFRESH
                      </button>
                    </div>
                  </div>

                  <div className="relative mt-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      ["System status", isLocalMode ? "SIMULATOR" : "ONLINE", isLocalMode ? "Fallback mode" : "FastAPI connected"],
                      ["Queue status", hospitalQueue.length > 5 ? "BUSY" : "STABLE", `${hospitalQueue.length} active appointments`],
                      ["AI routing", "ACTIVE", "Dynamic allocation enabled"],
                      ["Last sync", "LIVE", "Data refresh ready"]
                    ].map(([label, value, sub]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                        <p className="text-[8px] uppercase tracking-[0.18em] font-bold text-[#8FA7B8]">{label}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#62D08A]" />
                          <span className="text-sm font-black">{value}</span>
                        </div>
                        <p className="mt-1 text-[8px] text-[#9FB2BF]">{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* KPI STRIP */}
              {hospitalStats && (
                <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    ["Doctors available", hospitalStats.doctors_available, "On-duty physicians", "doctor"],
                    ["Patients waiting", hospitalStats.patients_waiting, "Active queue", "patient"],
                    ["Average wait", `${hospitalStats.average_waiting_time_minutes} min`, "Estimated", "clock"],
                    ["Hospital capacity", `${hospitalStats.capacity_percentage}%`, "Facility utilization", "capacity"],
                    ["Emergency / ICU", `${hospitalStats.emergency_capacity_percentage}%`, "Critical capacity", "emergency"]
                  ].map(([label, value, sub, type]) => (
                    <div
                      key={label}
                      className={`rounded-2xl border p-4 sm:p-5 bg-white ${
                        type === "emergency"
                          ? "border-[#F2CDD2]"
                          : "border-[#E3EAF0]"
                      } shadow-[0_8px_25px_rgba(35,55,70,0.04)]`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[8px] uppercase tracking-[0.16em] font-extrabold text-[#8B99A2]">{label}</p>
                        {type === "emergency" ? (
                          <AlertTriangle className="h-4 w-4 text-[#D45D69]" />
                        ) : type === "capacity" ? (
                          <Building className="h-4 w-4 text-[#3978A8]" />
                        ) : type === "clock" ? (
                          <Clock className="h-4 w-4 text-[#8067A5]" />
                        ) : type === "doctor" ? (
                          <UserCheck className="h-4 w-4 text-[#3978A8]" />
                        ) : (
                          <User className="h-4 w-4 text-[#3978A8]" />
                        )}
                      </div>

                      <p className={`mt-3 text-2xl sm:text-3xl font-black ${
                        type === "emergency" ? "text-[#C65562]" : "text-[#203744]"
                      }`}>
                        {value}
                      </p>
                      <p className="mt-1 text-[8px] text-[#98A5AD]">{sub}</p>

                      {(type === "capacity" || type === "emergency") && (
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EDF1F4]">
                          <div
                            className={`h-full rounded-full ${type === "emergency" ? "bg-[#D45D69]" : "bg-[#3978A8]"}`}
                            style={{
                              width: `${type === "capacity" ? hospitalStats.capacity_percentage : hospitalStats.emergency_capacity_percentage}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {/* MAIN OPERATIONS GRID */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Queue */}
                <section className="xl:col-span-8 rounded-2xl border border-[#E3EAF0] bg-white overflow-hidden shadow-[0_8px_25px_rgba(35,55,70,0.04)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF1F4] px-5 py-5">
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.18em] font-extrabold text-[#3978A8]">Patient flow</p>
                      <h2 className="mt-1 text-xl font-black text-[#243743]">Live appointment queue</h2>
                      <p className="mt-1 text-[9px] text-[#97A3AA]">Appointments currently being managed by MediFlow AI.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#EDF8F1] px-3 py-1.5 text-[8px] font-extrabold text-[#4C9B67]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#5CB477] animate-pulse" />
                        LIVE
                      </span>
                      <span className="rounded-full bg-[#F5F7F9] px-3 py-1.5 text-[8px] font-bold text-[#7F8D96]">
                        {hospitalQueue.length} CASES
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-2.5">
                    {hospitalQueue.length > 0 ? hospitalQueue.map((app, index) => (
                      <div
                        key={app.appointment_id}
                        className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          app.priority === "EMERGENCY"
                            ? "border-[#F0C8CD] bg-[#FFF7F8]"
                            : app.status === "SHIFTED"
                            ? "border-[#F1DEB5] bg-[#FFFCF5]"
                            : "border-[#E8EDF1] bg-[#FCFDFE]"
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[48px_1fr_auto] gap-4 items-center">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-xs ${
                            app.priority === "EMERGENCY"
                              ? "bg-[#FDEBED] text-[#C65562]"
                              : "bg-[#EAF3F8] text-[#3978A8]"
                          }`}>
                            #{String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-black text-[#334650]">{app.patient_name}</h3>
                              <span className="font-mono text-[8px] text-[#A0ABB2]">{app.appointment_id}</span>
                            </div>

                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-[#8B989F]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-[#3978A8]" />
                                {app.appointment_time?.split(" ")[1] || "--:--"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Stethoscope className="h-3 w-3 text-[#8067A5]" />
                                {localDoctors.find(d => d.doctor_id === app.doctor_id)?.name || app.doctor_id}
                              </span>
                            </div>

                            {app.notes && (
                              <p className="mt-2 text-[8px] text-[#9AA5AC] truncate max-w-[520px]">{app.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 md:justify-end">
                            <span className={`rounded-lg border px-2.5 py-1.5 text-[8px] font-black ${
                              app.priority === "EMERGENCY" || app.priority === "HIGH"
                                ? "border-[#F0CDD2] bg-[#FFF0F1] text-[#C65562]"
                                : app.priority === "MEDIUM"
                                ? "border-[#F1DFB7] bg-[#FFF8E9] text-[#B17C28]"
                                : "border-[#CDE9D5] bg-[#EDF8F1] text-[#4C9B67]"
                            }`}>
                              {app.priority}
                            </span>

                            <span className={`rounded-lg bg-white px-2.5 py-1.5 text-[8px] font-black border border-[#E8EDF1] ${
                              app.status === "CANCELLED"
                                ? "text-[#9DA7AD]"
                                : app.status === "SHIFTED"
                                ? "text-[#B17C28]"
                                : app.status === "REALLOCATED"
                                ? "text-[#8067A5]"
                                : "text-[#4F9A65]"
                            }`}>
                              {app.status}
                            </span>

                            {app.status !== "CANCELLED" && (
                              <button
                                onClick={() => handleCancelAppointment(app.appointment_id)}
                                className="h-8 w-8 rounded-lg border border-[#E6EBEF] bg-white flex items-center justify-center text-[#9AA5AC] hover:text-[#C65562] hover:border-[#F0CDD2] transition-colors"
                                title="Cancel appointment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center">
                        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#F3F7F9] flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-[#8FA0AA]" />
                        </div>
                        <h3 className="mt-4 text-sm font-black text-[#42545E]">Queue is clear</h3>
                        <p className="mt-1 text-[9px] text-[#9AA5AC]">No active appointments in this facility.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Right column */}
                <div className="xl:col-span-4 space-y-5">
                  {/* Capacity visualization */}
                  <section className="rounded-2xl border border-[#E3EAF0] bg-white p-5 shadow-[0_8px_25px_rgba(35,55,70,0.04)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[8px] uppercase tracking-[0.18em] font-extrabold text-[#3978A8]">Resource health</p>
                        <h3 className="mt-1 text-lg font-black text-[#334650]">Facility capacity</h3>
                      </div>
                      <Building className="h-5 w-5 text-[#9AA7AF]" />
                    </div>

                    <div className="mt-5 grid grid-cols-2 items-center gap-3">
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Occupied", value: hospitalStats?.capacity_percentage || 0 },
                                { name: "Available", value: Math.max(0, 100 - (hospitalStats?.capacity_percentage || 0)) }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              startAngle={90}
                              endAngle={-270}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              <Cell fill="#3978A8" />
                              <Cell fill="#E7EEF2" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="relative -mt-[122px] text-center pointer-events-none">
                          <p className="text-2xl font-black text-[#263A46]">{hospitalStats?.capacity_percentage || 0}%</p>
                          <p className="text-[7px] uppercase tracking-widest text-[#98A5AC]">occupied</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="font-bold text-[#74838C]">Hospital beds</span>
                            <span className="font-black text-[#334650]">{hospitalStats?.capacity_percentage || 0}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-[#EDF1F4] overflow-hidden">
                            <div className="h-full rounded-full bg-[#3978A8]" style={{ width: `${hospitalStats?.capacity_percentage || 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="font-bold text-[#74838C]">Emergency / ICU</span>
                            <span className="font-black text-[#C65562]">{hospitalStats?.emergency_capacity_percentage || 0}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-[#F4E7E9] overflow-hidden">
                            <div className="h-full rounded-full bg-[#D45D69]" style={{ width: `${hospitalStats?.emergency_capacity_percentage || 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Simulation */}
                  <section className="rounded-2xl border border-[#E3EAF0] bg-white p-5 shadow-[0_8px_25px_rgba(35,55,70,0.04)]">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#FFF0F1] flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-[#D45D69]" />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-[0.18em] font-extrabold text-[#C65562]">Scenario engine</p>
                        <h3 className="mt-1 text-sm font-black text-[#334650]">Dynamic optimization</h3>
                        <p className="mt-1 text-[9px] text-[#99A5AC]">Test how MediFlow reacts to live disruptions.</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSimulateEmergency}
                      className="mt-5 w-full rounded-xl bg-[#D45D69] hover:bg-[#C95562] text-white py-3.5 text-[9px] font-black tracking-wider transition-colors"
                    >
                      🚨 SIMULATE EMERGENCY
                    </button>

                    <div className="my-4 h-px bg-[#EEF1F4]" />

                    <label className="text-[8px] uppercase tracking-[0.16em] font-black text-[#8D999F] block mb-2">
                      Doctor availability
                    </label>

                    <div className="flex gap-2">
                      <select
                        value={unavailableDoctorId}
                        onChange={e => setUnavailableDoctorId(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-[#DFE6EB] bg-white px-3 py-2.5 text-[9px] text-[#465964] outline-none focus:border-[#3978A8]"
                      >
                        {hospitalDoctorsList.map(d => (
                          <option key={d.doctor_id} value={d.doctor_id}>
                            {d.name} ({d.specialty})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleDoctorUnavailable}
                        className="rounded-xl border border-[#F0DEB8] bg-[#FFF8E9] px-3 text-[8px] font-black text-[#A5792B] hover:bg-[#FFF4DC]"
                      >
                        OFFLINE
                      </button>
                    </div>

                    <button
                      onClick={handleRebalanceQueues}
                      className="mt-3 w-full rounded-xl border border-[#DFE6EB] bg-[#F8FAFB] hover:bg-[#F2F6F8] py-3 text-[8px] font-black text-[#5C6D76] transition-colors"
                    >
                      ⚖️ REBALANCE QUEUES
                    </button>
                  </section>
                </div>
              </div>

              {/* BEFORE / AFTER SIMULATION */}
              {beforeAfterQueue && (
                <section className="rounded-2xl border border-[#F0CDD2] bg-white overflow-hidden shadow-[0_8px_25px_rgba(35,55,70,0.04)]">
                  <div className="flex items-center justify-between border-b border-[#F3E2E4] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-[#FFF0F1] flex items-center justify-center">
                        <Activity className="h-4 w-4 text-[#D45D69]" />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-[0.18em] font-black text-[#D45D69]">Reallocation engine</p>
                        <h3 className="mt-0.5 text-sm font-black text-[#394A54]">Emergency impact simulation</h3>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#FFF0F1] px-3 py-1.5 text-[8px] font-black text-[#C65562]">AUTO-OPTIMIZED</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 p-5">
                    <div className="rounded-2xl border border-[#E9EEF2] bg-[#FAFBFC] p-4">
                      <p className="text-[8px] uppercase tracking-[0.16em] font-black text-[#9AA5AC] mb-3">Before event</p>
                      <div className="space-y-2">
                        {beforeAfterQueue.before.map((app, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-xl bg-white border border-[#EEF1F4] px-3 py-3">
                            <span className="text-[9px] font-bold text-[#53656F]">{app.patient_name}</span>
                            <span className="font-mono text-[9px] font-bold text-[#8C999F]">{app.appointment_time.split(" ")[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#F2E0E2] bg-[#FFF8F8] p-4">
                      <p className="text-[8px] uppercase tracking-[0.16em] font-black text-[#D45D69] mb-3">After event</p>
                      <div className="space-y-2">
                        {beforeAfterQueue.after.map((app, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between rounded-xl border px-3 py-3 ${
                              app.priority === "EMERGENCY"
                                ? "bg-[#FFF0F1] border-[#F0C8CD]"
                                : app.status === "SHIFTED"
                                ? "bg-[#FFF9EC] border-[#F1E0B8]"
                                : "bg-white border-[#EEF1F4]"
                            }`}
                          >
                            <span className={`text-[9px] font-bold ${
                              app.priority === "EMERGENCY" ? "text-[#B74F5B]" : "text-[#53656F]"
                            }`}>
                              {app.priority === "EMERGENCY" && "🚨 "}
                              {app.patient_name}
                            </span>
                            <span className="font-mono text-[9px] font-black text-[#53656F]">
                              {app.appointment_time.split(" ")[1]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mx-5 mb-5 rounded-xl border border-[#E8EDF1] bg-[#F8FAFB] px-4 py-3 text-[9px] leading-relaxed text-[#7D8B94]">
                    <b className="text-[#4E606A]">AI recalculation:</b> {beforeAfterQueue.explanation}
                  </div>
                </section>
              )}

              {/* EVENT STREAM */}
              <section className="rounded-2xl border border-[#E3EAF0] bg-white overflow-hidden shadow-[0_8px_25px_rgba(35,55,70,0.04)]">
                <div className="flex items-center justify-between border-b border-[#EEF1F4] px-5 py-4">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.18em] font-black text-[#3978A8]">System event stream</p>
                    <h3 className="mt-1 text-lg font-black text-[#334650]">MediFlow dispatch log</h3>
                  </div>
                  <Activity className="h-5 w-5 text-[#3978A8]" />
                </div>

                <div className="p-5">
                  <div className="rounded-2xl border border-[#EEF1F4] bg-[#FAFBFC] p-4 max-h-[240px] overflow-y-auto space-y-3">
                    {simulationLogs.length > 0 ? simulationLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-3 border-b border-[#EDF0F2] last:border-0 pb-3 last:pb-0">
                        <span className="mt-1 h-2 w-2 rounded-full bg-[#3978A8] flex-shrink-0" />
                        <p className="text-[9px] leading-relaxed text-[#697982] font-mono">{log}</p>
                      </div>
                    )) : (
                      <div className="py-8 text-center">
                        <CheckCircle2 className="h-5 w-5 text-[#5CB477] mx-auto" />
                        <p className="mt-2 text-[9px] font-bold text-[#7E8B93]">System ready</p>
                        <p className="mt-1 text-[8px] text-[#A0AAB1]">Emergency and reallocation events will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
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
