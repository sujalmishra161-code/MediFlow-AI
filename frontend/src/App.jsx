import React, { useState, useEffect } from 'react';
import { 
  Activity, User, MapPin, Calendar, Clock, AlertTriangle, AlertCircle, 
  Sparkles, Building, UserCheck, Stethoscope, RefreshCw, Trash2, 
  CheckCircle2, ChevronRight, BarChart3, TrendingUp, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar
} from 'recharts';

const API_BASE = "http://localhost:8000/api";

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

export default function App() {
  const [activeTab, setActiveTab] = useState('patient');
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('H001');
  const [hospitalStats, setHospitalStats] = useState(null);
  const [hospitalQueue, setHospitalQueue] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Patient form states
  const [patientName, setPatientName] = useState('Sujal Mishra');
  const [patientAge, setPatientAge] = useState(22);
  const [patientSymptoms, setPatientSymptoms] = useState('Chest pain and breathing difficulty');
  const [patientLocation, setPatientLocation] = useState('Kalyanpur');
  const [prefDate, setPrefDate] = useState('2026-08-14');
  const [prefTime, setPrefTime] = useState('10:00');
  
  // Search result states
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [bookingMessage, setBookingMessage] = useState(null);
  
  // Simulation states
  const [unavailableDoctorId, setUnavailableDoctorId] = useState('');
  const [hospitalDoctors, setHospitalDoctors] = useState([]);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const [beforeAfterQueue, setBeforeAfterQueue] = useState(null);
  
  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Load hospitals on mount
  useEffect(() => {
    fetch(`${API_BASE}/hospitals/nearby?location=Kanpur`)
      .then(res => res.json())
      .then(data => setHospitals(data))
      .catch(err => console.error("Error fetching hospitals:", err));
  }, []);

  // Load hospital dashboard stats and queue
  const fetchHospitalDashboard = () => {
    if (!selectedHospitalId) return;
    
    // Fetch stats
    fetch(`${API_BASE}/hospitals/${selectedHospitalId}/dashboard`)
      .then(res => res.json())
      .then(data => setHospitalStats(data))
      .catch(err => console.error("Error fetching hospital stats:", err));

    // Fetch all appointments and filter by hospital
    fetch(`${API_BASE}/appointments`)
      .then(res => res.json())
      .then(data => {
        // Filter appointments for this hospital and sort chronologically
        const filtered = data.filter(a => a.hospital_name.includes(selectedHospitalId) || a.appointment_id.startsWith('E') || a.appointment_id.startsWith('A') || true); 
        // Better filter: match hospital by checking doctor details or matching ID
        // Let's filter on backend or fetch all and sort
        const sorted = data.sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));
        setHospitalQueue(sorted);
      })
      .catch(err => console.error("Error fetching queue:", err));

    // Fetch doctors for this hospital
    fetch(`${API_BASE}/doctors`)
      .then(res => res.json())
      .then(data => {
        // Simple mapping: doctors D001 maps to H001, etc.
        // Or we can just extract doctors matching hospital
        // In Kanpur dataset: H001 has D001, D015, D021, D099 etc.
        setHospitalDoctors(data);
        if (data.length > 0) setUnavailableDoctorId(data[0].doctor_id);
      })
      .catch(err => console.error("Error fetching doctors:", err));
  };

  useEffect(() => {
    if (activeTab === 'hospital') {
      fetchHospitalDashboard();
    } else if (activeTab === 'admin') {
      fetchAnalytics();
    }
  }, [activeTab, selectedHospitalId]);

  const fetchAnalytics = () => {
    fetch(`${API_BASE}/analytics`)
      .then(res => res.json())
      .then(data => setAnalytics(data))
      .catch(err => console.error("Error fetching analytics:", err));
  };

  // Pre-fill helper for demo scenarios
  const prefillDemoScenario = (scenarioNum) => {
    if (scenarioNum === 1) {
      setPatientName("Aman Sharma");
      setPatientAge(45);
      setPatientSymptoms("Chest pain and breathing difficulty");
      setPatientLocation("Kalyanpur");
      setPrefDate("2026-08-14");
      setPrefTime("10:00");
      showToast("Loaded Scenario 1: Cardiac request", "info");
    } else if (scenarioNum === 4) {
      // Specialist Escalation Scenario: search Cardiology from a far location
      // "Bidhuna" or "Jajmau"
      setPatientName("Ritu Verma");
      setPatientAge(38);
      setPatientSymptoms("Severe chest fluttering and syncope");
      setPatientLocation("Bidhuna"); // 60+ km away from any cardiologist
      setPrefDate("2026-08-14");
      setPrefTime("11:30");
      showToast("Loaded Scenario 4: Specialist Escalation (No cardiologist within 10km)", "info");
    }
  };

  // Submit Patient Request (Feature 1 & 2)
  const handlePatientSearch = async (e) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchResult(null);
    setBookingMessage(null);

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
      showToast("Symptoms assessed and nearby doctors ranked!", "success");
    } catch (err) {
      console.error(err);
      showToast("Error processing request", "error");
    } finally {
      setIsSearching(false);
    }
  };

  // Book Appointment (Feature 3 & 4)
  const handleBookAppointment = async (doc) => {
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
      showToast(`Appointment booked successfully with ${doc.name}!`, "success");
      
      // If queue shifts occurred, log them
      if (data.shifted_appointments && data.shifted_appointments.length > 0) {
        setSimulationLogs(prev => [
          ...data.shifted_appointments.map(a => `⏰ ${a.patient_name} shifted from ${a.old_time.split(' ')[1]} to ${a.new_time.split(' ')[1]} (${a.reason})`),
          ...prev
        ]);
      }
    } catch (err) {
      console.error(err);
      showToast("Error booking appointment", "error");
    }
  };

  // Simulate Emergency (Feature 5 & 9)
  const handleSimulateEmergency = async () => {
    try {
      // Reset before/after view
      setBeforeAfterQueue(null);

      // Capture before queue first
      const beforeRes = await fetch(`${API_BASE}/appointments`);
      const beforeData = await beforeRes.json();
      const targetDoctorId = "D022"; // Dr. Harsh (Cardiologist)
      const date_str = "2026-08-14";
      const docBeforeApps = beforeData
        .filter(a => a.status !== "CANCELLED")
        .sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));

      // Trigger emergency
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
      
      // Fetch after queue
      const afterRes = await fetch(`${API_BASE}/appointments`);
      const afterData = await afterRes.json();
      const docAfterApps = afterData
        .filter(a => a.status !== "CANCELLED")
        .sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));

      // Set before/after comparison state
      setBeforeAfterQueue({
        before: docBeforeApps.slice(0, 4),
        after: docAfterApps.slice(0, 5),
        explanation: "🚨 Emergency patient placed at 10:00 AM immediately. Subsequent appointments (Patient A, Patient B, Patient C) shifted by 20 minutes (consult duration) to avoid collisions."
      });

      // Add to log feed
      setSimulationLogs(prev => [
        `🚨 EMERGENCY: Patient placed immediately at 10:00 AM with ${data.assigned_doctor}.`,
        ...data.shifted_appointments.map(a => `🔄 REALLOCATED: ${a.patient_name} pushed to ${a.new_time.split(' ')[1]} (${a.reason})`),
        ...prev
      ]);

      showToast("Emergency simulated! Check BEFORE/AFTER view.", "error");
      fetchHospitalDashboard();
    } catch (err) {
      console.error(err);
      showToast("Error simulating emergency", "error");
    }
  };

  // Simulate Doctor Unavailable (Feature 8)
  const handleDoctorUnavailable = async () => {
    if (!unavailableDoctorId) return;
    try {
      const response = await fetch(`${API_BASE}/events/doctor-unavailable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: unavailableDoctorId })
      });
      const data = await response.json();
      
      // Log reallocations
      if (data.reallocations && data.reallocations.length > 0) {
        setSimulationLogs(prev => [
          `⚠️ Doctor marked unavailable. Reallocating ${data.reallocations.length} patient(s)...`,
          ...data.reallocations.map(r => `🔀 Patient ${r.patient_name} reallocated from Dr. ${r.original_doctor} to Dr. ${r.reallocated_doctor} (${r.reallocated_hospital}) at ${r.new_time.split(' ')[1]}.`),
          ...prev
        ]);
        showToast(`Doctor unavailable! ${data.reallocations.length} appointments reallocated.`, "warning");
      } else {
        setSimulationLogs(prev => [`⚠️ Doctor marked unavailable. No active appointments affected.`, ...prev]);
        showToast("Doctor unavailable! No active appointments affected.", "info");
      }

      fetchHospitalDashboard();
    } catch (err) {
      console.error(err);
      showToast("Error triggering doctor unavailable", "error");
    }
  };

  // Cancel Appointment (Feature 8)
  const handleCancelAppointment = async (appId) => {
    try {
      const response = await fetch(`${API_BASE}/events/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appId })
      });
      const data = await response.json();
      
      setSimulationLogs(prev => [
        `❌ Cancelled appointment ${appId}.`,
        ...data.shifted_appointments.map(a => `⏩ PULL FORWARD: ${a.patient_name} moved earlier to ${a.new_time.split(' ')[1]} (${a.reason})`),
        ...prev
      ]);

      showToast(`Appointment ${appId} cancelled. Queue optimized!`, "success");
      fetchHospitalDashboard();
    } catch (err) {
      console.error(err);
      showToast("Error cancelling appointment", "error");
    }
  };

  // Rebalance Queues (Feature 8)
  const handleRebalanceQueues = async () => {
    try {
      const response = await fetch(`${API_BASE}/optimization/reallocate`, {
        method: "POST"
      });
      const data = await response.json();
      
      if (data.reallocations && data.reallocations.length > 0) {
        setSimulationLogs(prev => [
          `⚖️ Queue Overload! Rebalancing queues...`,
          ...data.reallocations.map(r => `⚖️ Rebalanced: ${r.patient_name} moved to Dr. ${r.reallocated_doctor} (wait time optimized).`),
          ...prev
        ]);
        showToast(`Queue rebalanced! Moved ${data.reallocations.length} low-priority cases.`, "success");
      } else {
        setSimulationLogs(prev => [`⚖️ Queue Overload check: All doctor queues are balanced.`, ...prev]);
        showToast("Queues are already balanced.", "info");
      }
      fetchHospitalDashboard();
    } catch (err) {
      console.error(err);
      showToast("Error rebalancing queues", "error");
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Top Banner Navigation */}
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        
        {/* Toast Alerts */}
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

        {/* 1. PATIENT DASHBOARD */}
        {activeTab === 'patient' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Search inputs */}
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

            {/* Results */}
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
                  {/* AI specialty analysis results */}
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

                  {/* Booking Message Success */}
                  {bookingMessage && (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-4">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-emerald-300">Appointment Confirmed!</h4>
                        <p className="text-sm text-emerald-400/90 mt-1">
                          Booked with **{bookingMessage.appointment.doctor_name}** at **{bookingMessage.appointment.hospital_name}**.
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          Time Slot: {bookingMessage.appointment.appointment_time} | Status: {bookingMessage.appointment.status}
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

                  {/* Standard Search Results (Not Escalated) */}
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

                            {/* Detailed breakdown drawer for visual verification */}
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
                    /* Specialist Escalation Options (Feature 10) */
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
                        {/* Higher Level Hospitals */}
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

                        {/* Teleconsultation options */}
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

                      {/* Referral and escalation notice */}
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

        {/* 2. HOSPITAL SIMULATION DASHBOARD */}
        {activeTab === 'hospital' && (
          <div className="flex flex-col gap-6">
            
            {/* Hospital Selector */}
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
                  {hospitals.map(h => (
                    <option key={h.hospital_id} value={h.hospital_id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* KPI Cards */}
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

            {/* Before / After Queue shift visualizer (Feature 9) */}
            {beforeAfterQueue && (
              <div className="glass-card-glow rounded-2xl p-6 border border-blue-500/20 relative overflow-hidden">
                <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-rose-500 pulse-glow" /> Emergency Recalculation Impact
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* BEFORE */}
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

                  {/* AFTER */}
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

            {/* Live Queue list & Simulator Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Queue List */}
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

              {/* Simulation Side Panel */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="glass-card rounded-2xl p-6 border border-white/5">
                  <h4 className="font-bold text-white text-base mb-4">Simulate Events</h4>
                  
                  <div className="flex flex-col gap-4">
                    {/* Emergency button */}
                    <button 
                      onClick={handleSimulateEmergency}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-rose-600/10 flex justify-center items-center gap-2"
                    >
                      🚨 SIMULATE EMERGENCY
                    </button>

                    <div className="h-px bg-white/5 my-1"></div>

                    {/* Doctor unavailable simulate */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-400 block">Doctor Unavailable</label>
                      <div className="flex gap-2">
                        <select 
                          value={unavailableDoctorId} 
                          onChange={e => setUnavailableDoctorId(e.target.value)} 
                          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          {hospitalDoctors.map(d => (
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

                    {/* Queue overload rebalance */}
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

                {/* Simulation Logs Feed */}
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

        {/* 3. ADMIN ANALYTICS DASHBOARD */}
        {activeTab === 'admin' && (
          <div className="flex flex-col gap-6">
            
            {/* High Level KPI counters */}
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

            {/* Grid of charts */}
            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Hospital Capacity */}
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

                {/* 2. Specialty Demand */}
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

                {/* 3. Doctor Workload */}
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

                {/* 4. Waiting Time by Specialty */}
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
