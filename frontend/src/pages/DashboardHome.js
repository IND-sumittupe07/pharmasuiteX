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
  const daysLeft  = expiresAt ? Math.ceil((expiresAt - now) / (1000*60*60*24)) : 99;

  useEffect(() => {
    api.get("/analytics/dashboard")
      .then(res => setData(res.data))
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading dashboard...</div>;
  if (error) return <div style={{ textAlign: "center", padding: 60, color: "#ef4444" }}>{error}</div>;

  const stats = [
    { label: "Total Customers", value: data.totalCustomers, icon: "👥", color: "#2563eb", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
    { label: "Active (30d)", value: data.activeCustomers, icon: "✅", color: "#10b981", bg: "linear-gradient(135deg,#f0fdf4,#bbf7d0)" },
    { label: "Refills Due", value: data.refillsDue, icon: "🔔", color: "#ef4444", bg: "linear-gradient(135deg,#fef2f2,#fecaca)" },
    { label: "Est. Revenue", value: `₹${(data.totalRevenue / 1000).toFixed(1)}k`, icon: "💰", color: "#f59e0b", bg: "linear-gradient(135deg,#fffbeb,#fde68a)" },
  ];

  const maxGrowth = Math.max(...(data.monthlyGrowth || []).map(d => d.new_customers));

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Plan expiry alert */}
      {daysLeft <= 7 && daysLeft > 0 && (
        <div style={{ padding:"14px 20px", background:daysLeft<=3?"#fef2f2":"#fffbeb",
          border:`1px solid ${daysLeft<=3?"#fca5a5":"#fde68a"}`,
          borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:daysLeft<=3?"#dc2626":"#92400e" }}>
              {daysLeft<=3?"🚨":"⚠️"} Your {user?.plan === "free" ? "Free Trial" : user?.plan + " plan"} expires in {daysLeft} day{daysLeft!==1?"s":""}!
            </div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Upgrade now to avoid interruption to your pharmacy operations.</div>
          </div>
          <button onClick={()=>navigate("/pricing")}
            style={{ padding:"9px 18px", background:"linear-gradient(135deg,#2563eb,#7c3aed)", color:"white",
              border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit",
              boxShadow:"0 4px 12px rgba(37,99,235,0.35)", whiteSpace:"nowrap" }}>
            Upgrade Now →
          </button>
        </div>
      )}
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ padding: 24, background: s.bg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>{s.label}</div>
              </div>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Monthly growth bar chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>New Customers per Month</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
            {(data.monthlyGrowth || []).map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{d.new_customers}</div>
                <div className="bar" style={{
                  width: "100%",
                  height: `${maxGrowth > 0 ? (d.new_customers / maxGrowth) * 100 : 0}px`,
                  background: i === (data.monthlyGrowth.length - 1) ? "linear-gradient(180deg,#93c5fd,#bfdbfe)" : i === (data.monthlyGrowth.length - 2) ? "linear-gradient(180deg,#2563eb,#1d4ed8)" : "#e2e8f0"
                }}></div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{d.month?.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Condition mix */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>Condition Mix</div>
          {(data.conditionMix || []).map((c, i) => {
            const total = data.conditionMix.reduce((a, x) => a + parseInt(x.count), 0);
            const pct = Math.round((c.count / total) * 100);
            const colors = ["#3b82f6","#ef4444","#8b5cf6","#06b6d4","#f59e0b","#10b981"];
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{c.medical_condition}</span>
                  <span style={{ fontSize: 12, color: colors[i % colors.length], fontWeight: 700 }}>{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i % colors.length] }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top Medicines */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>💊 Top Medicines</div>
          {(data.topMedicines || []).map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div className="ring" style={{ width: 28, height: 28, background: "#2563eb", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{m.category}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}>{m.patient_count} patients</div>
            </div>
          ))}
        </div>

        {/* Doctor Referrals */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>🩺 Doctor Referrals</div>
          {(data.doctorReferrals || []).map((d, i) => {
            const max = data.doctorReferrals[0]?.patient_count || 1;
            const colors = ["#2563eb","#ef4444","#10b981","#f59e0b"];
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{d.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors[i % colors.length] }}>{d.patient_count} patients</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(d.patient_count / max) * 100}%`, background: colors[i % colors.length] }}></div>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{d.speciality}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}