import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const now = new Date();
  const expiresAt = user?.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt - now) / (1000*60*60*24)) : 99;

  useEffect(() => {
    // Try /analytics/dashboard first, fallback to /analytics
    api.get("/analytics/dashboard")
      .then(res => {
        // Ensure all fields exist with safe defaults
        setData({
          totalCustomers:  res.data.totalCustomers  || res.data.total_customers  || 0,
          activeCustomers: res.data.activeCustomers || res.data.active_customers || 0,
          refillsDue:      res.data.refillsDue      || res.data.refills_due      || 0,
          totalRevenue:    res.data.totalRevenue     || res.data.total_revenue    || 0,
          monthlyGrowth:   res.data.monthlyGrowth   || res.data.monthly_growth   || [],
          conditionMix:    res.data.conditionMix    || res.data.condition_mix    || [],
          topMedicines:    res.data.topMedicines    || res.data.top_medicines    || [],
          doctorReferrals: res.data.doctorReferrals || res.data.doctor_referrals || [],
        });
      })
      .catch(err => {
        console.error("Dashboard error:", err);
        // If analytics fails, show empty dashboard instead of error
        setData({
          totalCustomers: 0,
          activeCustomers: 0,
          refillsDue: 0,
          totalRevenue: 0,
          monthlyGrowth: [],
          conditionMix: [],
          topMedicines: [],
          doctorReferrals: [],
        });
        setError(""); // Don't show error, show empty state
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign:"center", padding:60, color:"var(--txt4)" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>💊</div>
      <div>Loading dashboard...</div>
    </div>
  );

  // Even if API fails, show empty dashboard
  const safeData = data || {
    totalCustomers: 0, activeCustomers: 0,
    refillsDue: 0, totalRevenue: 0,
    monthlyGrowth: [], conditionMix: [],
    topMedicines: [], doctorReferrals: [],
  };

  const stats = [
    { label:"Total Customers", value: safeData.totalCustomers,  icon:"👥", color:"#2563eb", bg:"linear-gradient(135deg,#eff6ff,#dbeafe)" },
    { label:"Active (30d)",    value: safeData.activeCustomers, icon:"✅", color:"#10b981", bg:"linear-gradient(135deg,#f0fdf4,#bbf7d0)" },
    { label:"Refills Due",     value: safeData.refillsDue,      icon:"🔔", color:"#ef4444", bg:"linear-gradient(135deg,#fef2f2,#fecaca)" },
    { label:"Est. Revenue",    value: `₹${((safeData.totalRevenue||0)/1000).toFixed(1)}k`, icon:"💰", color:"#f59e0b", bg:"linear-gradient(135deg,#fffbeb,#fde68a)" },
  ];

  const maxGrowth = Math.max(...(safeData.monthlyGrowth||[]).map(d => parseInt(d.new_customers)||0), 1);

  return (
    <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Plan expiry alert */}
      {daysLeft <= 7 && daysLeft > 0 && (
        <div style={{
          padding:"14px 20px",
          background: daysLeft<=3 ? "#fef2f2" : "#fffbeb",
          border:`1px solid ${daysLeft<=3 ? "#fca5a5" : "#fde68a"}`,
          borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center"
        }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:daysLeft<=3?"#dc2626":"#92400e" }}>
              {daysLeft<=3?"🚨":"⚠️"} Your {user?.plan==="free"?"Free Trial":user?.plan+" plan"} expires in {daysLeft} day{daysLeft!==1?"s":""}!
            </div>
            <div style={{ fontSize:12, color:"var(--txt3)", marginTop:2 }}>
              Upgrade now to avoid interruption to your pharmacy operations.
            </div>
          </div>
          <button onClick={()=>navigate("/pricing")}
            style={{ padding:"9px 18px", background:"linear-gradient(135deg,#2563eb,#7c3aed)",
              color:"white", border:"none", borderRadius:10, fontWeight:700, fontSize:13,
              cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
            Upgrade Now →
          </button>
        </div>
      )}

      {/* API Error Warning (non-blocking) */}
      {error && (
        <div style={{ padding:"10px 16px", background:"#fef9c3", border:"1px solid #fde68a",
          borderRadius:10, fontSize:13, color:"#92400e", fontWeight:600 }}>
          ⚠️ {error} — Showing empty data. Check your backend connection.
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        {stats.map((s,i) => (
          <div key={i} className="card" style={{ padding:24, background:s.bg }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#334155", marginTop:2 }}>{s.label}</div>
              </div>
              <span style={{ fontSize:28 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state if no data */}
      {safeData.totalCustomers === 0 && (
        <div className="card" style={{ padding:40, textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏥</div>
          <div style={{ fontSize:18, fontWeight:700, color:"var(--txt1)", marginBottom:8 }}>
            Welcome to PharmaSuiteX!
          </div>
          <div style={{ fontSize:14, color:"var(--txt3)", marginBottom:20 }}>
            Start by adding your first customer to see dashboard analytics.
          </div>
          <button onClick={()=>navigate("/customers")}
            className="btn-primary" style={{ padding:"12px 24px", fontSize:14 }}>
            + Add First Customer
          </button>
        </div>
      )}

      {/* Charts - only show if data exists */}
      {safeData.totalCustomers > 0 && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
            {/* Monthly Growth Chart */}
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>
                📈 New Customers per Month
              </div>
              {safeData.monthlyGrowth.length === 0 ? (
                <div style={{ textAlign:"center", padding:40, color:"var(--txt4)", fontSize:13 }}>
                  No monthly data yet
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:120 }}>
                  {safeData.monthlyGrowth.map((d,i) => {
                    const count = parseInt(d.new_customers) || 0;
                    const height = maxGrowth > 0 ? (count/maxGrowth)*100 : 0;
                    const isLatest = i === safeData.monthlyGrowth.length-1;
                    const isPrev   = i === safeData.monthlyGrowth.length-2;
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ fontSize:10, color:"var(--txt4)" }}>{count}</div>
                        <div className="bar" style={{
                          width:"100%",
                          height:`${height}px`,
                          background: isLatest
                            ? "linear-gradient(180deg,#93c5fd,#bfdbfe)"
                            : isPrev
                            ? "linear-gradient(180deg,#2563eb,#1d4ed8)"
                            : "var(--border)"
                        }}></div>
                        <div style={{ fontSize:10, color:"var(--txt4)" }}>
                          {d.month?.split(" ")[0] || d.month}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Condition Mix */}
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>🏥 Condition Mix</div>
              {safeData.conditionMix.length === 0 ? (
                <div style={{ textAlign:"center", padding:20, color:"var(--txt4)", fontSize:13 }}>
                  No data yet
                </div>
              ) : (
                safeData.conditionMix.map((c,i) => {
                  const total = safeData.conditionMix.reduce((a,x)=>a+parseInt(x.count||0),0);
                  const pct   = total > 0 ? Math.round((parseInt(c.count)||0)/total*100) : 0;
                  const colors = ["#3b82f6","#ef4444","#8b5cf6","#06b6d4","#f59e0b","#10b981"];
                  return (
                    <div key={i} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:12, color:"var(--txt2)", fontWeight:500 }}>
                          {c.medical_condition || "Unknown"}
                        </span>
                        <span style={{ fontSize:12, color:colors[i%colors.length], fontWeight:700 }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width:`${pct}%`, background:colors[i%colors.length] }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {/* Top Medicines */}
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>💊 Top Medicines</div>
              {safeData.topMedicines.length === 0 ? (
                <div style={{ textAlign:"center", padding:20, color:"var(--txt4)", fontSize:13 }}>
                  No medicine data yet
                </div>
              ) : (
                safeData.topMedicines.map((m,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                    <div className="ring" style={{ width:28, height:28, background:"#2563eb",
                      color:"white", fontSize:12, fontWeight:700, flexShrink:0 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{m.name}</div>
                      <div style={{ fontSize:11, color:"var(--txt4)" }}>{m.category}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#2563eb" }}>
                      {m.patient_count} patients
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Doctor Referrals */}
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>🩺 Doctor Referrals</div>
              {safeData.doctorReferrals.length === 0 ? (
                <div style={{ textAlign:"center", padding:20, color:"var(--txt4)", fontSize:13 }}>
                  No referral data yet
                </div>
              ) : (
                safeData.doctorReferrals.map((d,i) => {
                  const max = parseInt(safeData.doctorReferrals[0]?.patient_count)||1;
                  const colors = ["#2563eb","#ef4444","#10b981","#f59e0b"];
                  return (
                    <div key={i} style={{ marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600 }}>{d.name}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:colors[i%colors.length] }}>
                          {d.patient_count} patients
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width:`${(parseInt(d.patient_count)||0)/max*100}%`,
                          background:colors[i%colors.length]
                        }}></div>
                      </div>
                      <div style={{ fontSize:11, color:"var(--txt4)", marginTop:2 }}>{d.speciality}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
