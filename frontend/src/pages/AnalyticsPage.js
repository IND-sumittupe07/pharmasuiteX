    import { useState, useEffect } from "react";
import api from "../api/client";

export function AnalyticsPage() {
  const [data, setData]       = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    Promise.allSettled([
      api.get("/analytics/dashboard"),
      api.get("/analytics/revenue"),
    ]).then(([dashRes, revRes]) => {
      if (dashRes.status === "fulfilled") {
        setData(dashRes.value.data);
      } else {
        console.error("Dashboard analytics failed:", dashRes.reason);
        setData({
          totalCustomers: 0, activeCustomers: 0,
          refillsDue: 0, totalRevenue: 0,
          doctorReferrals: [], conditionMix: [],
        });
        setError("Some analytics data couldn't load");
      }

      if (revRes.status === "fulfilled") {
        setRevenue(Array.isArray(revRes.value.data) ? revRes.value.data : []);
      } else {
        console.error("Revenue analytics failed:", revRes.reason);
        setRevenue([]);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign:"center", padding:60, color:"var(--txt4)" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
        <div>Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign:"center", padding:60 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <div style={{ color:"var(--txt1)", fontWeight:600, marginBottom:16 }}>
          Could not load analytics
        </div>
        <button onClick={()=>window.location.reload()} className="btn-primary">
          🔄 Retry
        </button>
      </div>
    );
  }

  const maxRev = Math.max(...revenue.map(r => parseFloat(r.revenue) || 0), 1);

  return (
    <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {error && (
        <div style={{
          padding:"10px 16px", borderRadius:10,
          background:"rgba(245,158,11,0.1)", border:"1px solid #fde68a",
          fontSize:12, color:"#92400e", fontWeight:600
        }}>
          ⚠️ {error} — showing partial data.
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
        {[
          ["Total Customers", data.totalCustomers||0, "👥", "#2563eb"],
          ["Active (30d)",    data.activeCustomers||0, "✅", "#10b981"],
          ["Refills Due",     data.refillsDue||0,       "🔔", "#ef4444"],
          ["Total Revenue",   `₹${((data.totalRevenue||0)/1000).toFixed(1)}k`, "💰", "#f59e0b"],
        ].map(([l,v,i,c],idx)=>(
          <div key={idx} className="card" style={{padding:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:24}}>{i}</span>
              <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
            </div>
            <div style={{fontSize:13,color:"var(--txt3)",marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,3fr) minmax(0,2fr)",gap:16}}>

        {/* Monthly Revenue */}
        <div className="card" style={{padding:24, minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:"var(--txt1)",marginBottom:16}}>
            📈 Monthly Revenue (₹)
          </div>
          {revenue.length === 0 ? (
            <div style={{textAlign:"center",padding:32,color:"var(--txt4)",fontSize:13}}>
              No revenue data yet — create invoices to see trends!
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"flex-end",gap:8,height:140}}>
              {revenue.map((r,i)=>{
                const rev = parseFloat(r.revenue) || 0;
                return (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:0}}>
                    <div style={{fontSize:9,color:"var(--txt4)"}}>
                      {rev > 0 ? `₹${(rev/1000).toFixed(1)}k` : "—"}
                    </div>
                    <div className="bar" style={{
                      width:"100%",
                      height:`${Math.max((rev/maxRev)*120, rev>0?4:0)}px`,
                      background: i===revenue.length-1
                        ? "linear-gradient(180deg,#93c5fd,#bfdbfe)"
                        : i===revenue.length-2
                        ? "linear-gradient(180deg,#2563eb,#1d4ed8)"
                        : "var(--border)"
                    }}></div>
                    <div style={{fontSize:9,color:"var(--txt4)"}}>{r.month?.split(" ")[0]}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Doctor Referrals */}
        <div className="card" style={{padding:24, minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:"var(--txt1)",marginBottom:16}}>
            🩺 Doctor Referrals
          </div>
          {(data.doctorReferrals||[]).length === 0 ? (
            <div style={{textAlign:"center",padding:32,color:"var(--txt4)",fontSize:13}}>
              No doctor referrals recorded yet
            </div>
          ) : (
            (data.doctorReferrals||[]).map((d,i)=>{
              const max = data.doctorReferrals[0]?.patient_count||1;
              const colors=["#2563eb","#ef4444","#10b981","#f59e0b"];
              return(
                <div key={i} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--txt1)"}}>{d.name}</span>
                    <span style={{fontSize:13,fontWeight:700,color:colors[i%4]}}>{d.patient_count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:`${(d.patient_count/max)*100}%`,background:colors[i%4]}}></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Condition Mix - bonus section */}
      {(data.conditionMix||[]).length > 0 && (
        <div className="card" style={{padding:24}}>
          <div style={{fontSize:15,fontWeight:700,color:"var(--txt1)",marginBottom:16}}>
            🏥 Condition Mix
          </div>
          {data.conditionMix.map((c,i)=>{
            const total = data.conditionMix.reduce((a,x)=>a+parseInt(x.count||0),0);
            const pct = total>0 ? Math.round((parseInt(c.count)/total)*100) : 0;
            const colors=["#3b82f6","#ef4444","#8b5cf6","#06b6d4","#f59e0b","#10b981"];
            return (
              <div key={i} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:"var(--txt2)",fontWeight:500,textTransform:"capitalize"}}>
                    {c.medical_condition}
                  </span>
                  <span style={{fontSize:12,color:colors[i%colors.length],fontWeight:700}}>{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width:`${pct}%`,background:colors[i%colors.length]}}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;
