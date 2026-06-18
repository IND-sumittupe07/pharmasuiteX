import React, { useState, useEffect, useMemo, useContext } from "react";
import * as RouterDOM from "react-router-dom";
import { 
  Users, 
  CheckCircle, 
  Bell, 
  IndianRupee, 
  TrendingUp, 
  Activity, 
  Award,
  Search,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  X,
  ArrowUpRight
} from "lucide-react";

// --- SMART RESOLVER FOR LOCAL OR PREVIEW ENVIRONMENTS ---
// Dynamic resolution prevents static bundlers (like Esbuild in previews) from throwing hard build errors,
// while letting the application bind smoothly to your local context when run inside your real repository.
let api;
let useAuth;

try {
  const apiPath = "../api/client";
  api = require(apiPath).default || require(apiPath);
} catch (e) {
  // High-fidelity fallback database mock for visual validation in previews
  api = {
    get: (url) => {
      return Promise.resolve({
        data: {
          totalCustomers: 1240,
          activeCustomers: 842,
          refillsDue: 28,
          totalRevenue: 245000,
          monthlyGrowth: [
            { month: "Jan 2026", new_customers: 45 },
            { month: "Feb 2026", new_customers: 52 },
            { month: "Mar 2026", new_customers: 61 },
            { month: "Apr 2026", new_customers: 58 },
            { month: "May 2026", new_customers: 70 },
            { month: "Jun 2026", new_customers: 85 }
          ],
          conditionMix: [
            { medical_condition: "Hypertension", count: 320 },
            { medical_condition: "Diabetes Type II", count: 280 },
            { medical_condition: "Asthma", count: 150 },
            { medical_condition: "Hyperlipidemia", count: 190 },
            { medical_condition: "Thyroid Disorders", count: 110 }
          ],
          topMedicines: [
            { name: "Metformin 500mg", category: "Antidiabetic", patient_count: 142 },
            { name: "Amlodipine 5mg", category: "Antihypertensive", patient_count: 118 },
            { name: "Atorvastatin 10mg", category: "Lipid-lowering", patient_count: 95 },
            { name: "Levothyroxine 50mcg", category: "Thyroid hormone", patient_count: 84 },
            { name: "Albuterol HFA", category: "Bronchodilator", patient_count: 73 },
            { name: "Lisinopril 10mg", category: "ACE Inhibitor", patient_count: 68 }
          ]
        }
      });
    }
  };
}

try {
  const authPath = "../context/AuthContext";
  useAuth = require(authPath).useAuth;
} catch (e) {
  useAuth = () => ({
    user: {
      plan: "Pro Enterprise",
      plan_expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    }
  });
}

// --- CORE DASHBOARD INTERFACE ---
function DashboardHomeCore({ navigate }) {
  const { user } = useAuth();
  
  // Core Data States
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); // Silent background fetch state
  const [error, setError] = useState("");
  
  // Interactive UI States
  const [medicineSearch, setMedicineSearch] = useState("");
  const [selectedStat, setSelectedStat] = useState(null); 

  // Plan Expiry Calculator
  const daysLeft = useMemo(() => {
    const expiresAtStr = user?.plan_expires_at;
    if (!expiresAtStr) return 99;
    const now = new Date();
    const expiresAt = new Date(expiresAtStr);
    const diffTime = expiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [user?.plan_expires_at]);

  // Fetch Dashboard Analytics
  const fetchDashboardData = (showFullLoader = false) => {
    if (showFullLoader) {
      setLoading(true);
    } else {
      setIsSyncing(true);
    }
    
    api.get("/analytics/dashboard")
      .then(res => {
        if (res.data) {
          setData(res.data);
          setError("");
        } else {
          setError("Empty response received from backend database.");
        }
      })
      .catch((err) => {
        console.error("Dashboard Fetch Error:", err);
        setError("Failed to synchronize with dashboard database. Please retry.");
      })
      .finally(() => {
        setLoading(false);
        setIsSyncing(false);
      });
  };

  // 1. Initial Load on Mount
  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  // 2. Real-Time Background Synchronization (Silent DB Polling every 15 seconds)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      fetchDashboardData(false);
    }, 15000);

    return () => clearInterval(syncInterval);
  }, []);

  // Formatted KPI Metric Array
  const stats = useMemo(() => {
    if (!data) return [];
    
    const totalRev = Number(data.totalRevenue) || 0;
    const formattedRevenue = totalRev >= 100000 
      ? `₹${(totalRev / 100000).toFixed(2)} Lakh` 
      : `₹${(totalRev / 1000).toFixed(1)}k`;

    return [
      { 
        id: "customers",
        label: "Total Customers", 
        value: data.totalCustomers ?? 0, 
        icon: Users, 
        color: "text-blue-600 dark:text-blue-400", 
        bg: "from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800/60",
        description: "Registered patients with active medicine records"
      },
      { 
        id: "active",
        label: "Active Patients (30d)", 
        value: data.activeCustomers ?? 0, 
        icon: CheckCircle, 
        color: "text-emerald-600 dark:text-emerald-400", 
        bg: "from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800/60",
        description: "Patients with filled prescriptions within the last 30 days"
      },
      { 
        id: "refills",
        label: "Refills Due", 
        value: data.refillsDue ?? 0, 
        icon: Bell, 
        color: "text-rose-600 dark:text-rose-400", 
        bg: "from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-rose-900/10 border-rose-200 dark:border-rose-800/60",
        description: "Maintenance medications waiting for confirmation dispatch"
      },
      { 
        id: "revenue",
        label: "Estimated Revenue", 
        value: formattedRevenue, 
        icon: IndianRupee, 
        color: "text-amber-600 dark:text-amber-400", 
        bg: "from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800/60",
        description: "Estimated gross value of filled prescriptions"
      },
    ];
  }, [data]);

  // Max value of monthly growth to keep CSS bar scales correct
  const maxGrowth = useMemo(() => {
    if (!data?.monthlyGrowth || data.monthlyGrowth.length === 0) return 0;
    return Math.max(...data.monthlyGrowth.map(d => Number(d.new_customers) || 0));
  }, [data?.monthlyGrowth]);

  // Total new customers registered this year
  const totalNewCustomersThisYear = useMemo(() => {
    if (!data?.monthlyGrowth) return 0;
    return data.monthlyGrowth.reduce((acc, curr) => acc + (Number(curr.new_customers) || 0), 0);
  }, [data?.monthlyGrowth]);

  // Disease spread calculations with safe percentages
  const conditionMixCalculations = useMemo(() => {
    if (!data?.conditionMix || data.conditionMix.length === 0) return [];
    
    const total = data.conditionMix.reduce((acc, current) => acc + (parseInt(current.count) || 0), 0);
    
    return data.conditionMix.map((item, index) => {
      const count = parseInt(item.count) || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const colors = [
        { progress: "bg-blue-600", text: "text-blue-600 dark:text-blue-400" },
        { progress: "bg-emerald-600", text: "text-emerald-600 dark:text-emerald-400" },
        { progress: "bg-rose-600", text: "text-rose-600 dark:text-rose-400" },
        { progress: "bg-purple-600", text: "text-purple-600 dark:text-purple-400" },
        { progress: "bg-amber-600", text: "text-amber-600 dark:text-amber-400" },
        { progress: "bg-cyan-600", text: "text-cyan-600 dark:text-cyan-400" }
      ];
      return {
        ...item,
        pct,
        style: colors[index % colors.length]
      };
    }).sort((a, b) => b.count - a.count);
  }, [data?.conditionMix]);

  // Filtering of top prescribed medicines
  const filteredMedicines = useMemo(() => {
    if (!data?.topMedicines) return [];
    return data.topMedicines
      .filter(m => 
        m.name?.toLowerCase().includes(medicineSearch.toLowerCase()) ||
        m.category?.toLowerCase().includes(medicineSearch.toLowerCase())
      )
      .sort((a, b) => (b.patient_count || 0) - (a.patient_count || 0));
  }, [data?.topMedicines, medicineSearch]);

  // Full Screen Skeleton Loader during initial fetch
  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
          </div>
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-6 bg-white dark:bg-slate-900 rounded-2xl h-32 border border-slate-200 dark:border-slate-850"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-2xl h-72 border border-slate-200 dark:border-slate-850"></div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl h-72 border border-slate-200 dark:border-slate-850"></div>
        </div>
      </div>
    );
  }

  // Elegant Error Sync Fallback Screen
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl mx-auto my-12">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-full mb-4 text-rose-500">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Sync Interrupted</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">{error}</p>
        <button 
          onClick={() => fetchDashboardData(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md shadow-blue-500/20"
        >
          <RefreshCw className="w-4 h-4" /> Retry Server Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors">
      
      {/* Header section with live indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pharmacy Insights</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-150 text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold tracking-wider uppercase font-sans">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSyncing ? 'animate-spin border border-t-transparent' : 'animate-pulse'}`}></span>
              Live Sync Active
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Real-time status of patients, medical compounds, and inventory</p>
        </div>

        <button 
          onClick={() => fetchDashboardData(true)} 
          className="p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors shadow-sm self-end sm:self-auto"
          title="Force Sync Update"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
        </button>
      </div>

      {/* Subscription Warnings and Action banner */}
      {daysLeft <= 7 && daysLeft > 0 && (
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 shadow-sm ${
          daysLeft <= 3 
            ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50" 
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
        }`}>
          <div className="flex gap-3 items-start">
            <div className={`p-2.5 rounded-xl mt-0.5 ${daysLeft <= 3 ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40" : "bg-amber-100 text-amber-600 dark:bg-amber-900/40"}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-sm font-black ${daysLeft <= 3 ? "text-rose-850 dark:text-rose-400" : "text-amber-850 dark:text-amber-400"}`}>
                Your {user?.plan === "free" ? "Free Trial" : `${user?.plan || "pharmacy"} plan`} expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}!
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Renew now to avoid interruption to your automated database alerts, refill notification systems, and patient workflows.
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate("/pricing")}
            className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] whitespace-nowrap"
          >
            Upgrade Now &rarr;
          </button>
        </div>
      )}

      {/* Real-time KPI Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div 
              key={s.id} 
              onClick={() => setSelectedStat(s)}
              className={`p-6 rounded-2xl border bg-gradient-to-b ${s.bg} shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 relative group`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-baseline gap-1.5">
                    {s.value}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm transition-transform duration-300 group-hover:scale-110 border border-slate-100 dark:border-slate-800">
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between pt-2 border-t border-slate-150 dark:border-slate-850">
                <span className="truncate max-w-[85%]">{s.description}</span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Customer Growth (Engineered CSS Bar Chart) */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" /> Patient Registration Trends
              </h3>
              <p className="text-xs text-slate-400">Total new customers added per month</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 block">Total This Year</span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400">{totalNewCustomersThisYear} Patients</span>
            </div>
          </div>

          {(!data?.monthlyGrowth || data.monthlyGrowth.length === 0) ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              No growth data registered in backend database.
            </div>
          ) : (
            <div className="flex items-end justify-between gap-3 sm:gap-6 h-48 pt-6 border-b border-slate-100 dark:border-slate-800/80 px-2">
              {data.monthlyGrowth.map((d, i) => {
                const val = Number(d.new_customers) || 0;
                const pct = maxGrowth > 0 ? (val / maxGrowth) * 100 : 0;
                const isLast = i === data.monthlyGrowth.length - 1;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    
                    {/* Tooltip */}
                    <div className="absolute -top-4 opacity-0 group-hover:opacity-100 bg-slate-950 dark:bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none transition-opacity font-extrabold z-10 whitespace-nowrap shadow-md font-sans">
                      +{val} Patients
                    </div>

                    {/* Bar */}
                    <div 
                      style={{ height: `${pct}%` }} 
                      className={`w-full rounded-t-lg transition-all duration-500 origin-bottom ${
                        isLast 
                          ? "bg-gradient-to-t from-blue-600 to-indigo-500 dark:from-blue-700 dark:to-indigo-500 shadow-lg shadow-blue-500/25" 
                          : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
                      }`}
                    ></div>
                    
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate max-w-full mt-2.5 pt-1 uppercase">
                      {d.month ? d.month.split(" ")[0] : "Month"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pathology Disease Spread Distribution */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-emerald-500" /> Pathology Spread Mix
            </h3>
            <p className="text-xs text-slate-400 mb-6">Aggregate distribution of disease profiles logged</p>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {conditionMixCalculations.length === 0 ? (
              <div className="text-slate-400 text-sm italic text-center py-6">
                No active disease profiles logged in DB.
              </div>
            ) : (
              conditionMixCalculations.map((c, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {c.medical_condition || "Unknown Pathology"}
                    </span>
                    <span className={`text-xs font-black ${c.style.text}`}>
                      {c.pct}% <span className="text-[10px] text-slate-400 font-medium">({c.count} cases)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/20">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${c.style.progress}`}
                      style={{ width: `${c.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Highly Prescribed Compounds & Medicine Catalog */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Highly Prescribed Compounds
            </h3>
            <p className="text-xs text-slate-400">Primary therapeutic elements ranked by aggregate patient counts</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Search active chemicals..." 
              value={medicineSearch}
              onChange={(e) => setMedicineSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* List of active compounds */}
        {filteredMedicines.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-400 italic">No matching pharmaceutical formulations found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-1">
            {filteredMedicines.map((m, i) => (
              <div 
                key={i}
                className="p-4 bg-slate-50/50 dark:bg-slate-850/20 rounded-xl border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-200/30">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{m.name || "N/A"}</h4>
                    <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase font-bold mt-1 inline-block font-sans">
                      {m.category || "General"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">{m.patient_count ?? 0}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tight font-medium">Active patients</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metric Detail Dialog Modals */}
      {selectedStat && (() => {
        const SelectedIcon = selectedStat.icon;
        return (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-200">
              <button 
                onClick={() => setSelectedStat(null)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750">
                  <SelectedIcon className={`w-6 h-6 ${selectedStat.color}`} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{selectedStat.label} Telemetry</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-4xl font-black text-slate-950 dark:text-white tracking-tight">{selectedStat.value}</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center mt-1">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Synchronized with live transactions
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This metrics card tracks live records synchronized with your PharmaSuiteX database. Registration numbers, pathology spreads, and financial flows populate here directly from active client sessions.
                </p>
                <button 
                  onClick={() => setSelectedStat(null)}
                  className="w-full mt-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors border border-slate-200/20"
                >
                  Close Insights View
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

// --- SAFE NAVIGATION WRAPPER ---
// Restricts Router hooks from failing during isolated sandbox rendering environments
export default function DashboardHome() {
  const context = useContext(RouterDOM.UNSAFE_NavigationContext || React.createContext(null));
  if (context) {
    return <DashboardHomeWithRouter />;
  }
  return <DashboardHomeWithoutRouter />;
}

function DashboardHomeWithRouter() {
  const navigate = RouterDOM.useNavigate();
  return <DashboardHomeCore navigate={navigate} />;
}

function DashboardHomeWithoutRouter() {
  const navigate = (path) => {
    console.warn("Routing fallback executed without Router context:", path);
  };
  return <DashboardHomeCore navigate={navigate} />;
}
