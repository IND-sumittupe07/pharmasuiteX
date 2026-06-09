import { useState, useEffect } from "react";
import api from "../api/client";

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState([]);
  useEffect(() => {
    Promise.all([api.get("/analytics/dashboard"), api.get("/analytics/revenue")])
      .then(([d, r]) => { setData(d.data); setRevenue(r.data); });
  }, []);
  if (!data) return <div style={{ textAlign:"center",padding:60,color:"#94a3b8" }}>Loading analytics...</div>;
  const maxRev = Math.max(...revenue.map(r => parseFloat(r.revenue) || 0), 1);
  return (
    <div className="fade-in" style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16 }}>
        {[
          ["Total Customers", data.totalCustomers, "👥", "#2563eb"],
          ["Active (30d)", data.activeCustomers, "✅", "#10b981"],
          ["Refills Due", data.refillsDue, "🔔", "#ef4444"],
          ["Total Revenue", `₹${(data.totalRevenue/1000).toFixed(1)}k`, "💰", "#f59e0b"],
        ].map(([l,v,i,c],idx)=>(
          <div key={idx} className="card" style={{padding:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:24}}>{i}</span>
              <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
            </div>
            <div style={{fontSize:13,color:"#64748b",marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16}}>
        <div className="card" style={{padding:24}}>
          <div style={{fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:16}}>Monthly Revenue (₹)</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:140}}>
            {revenue.map((r,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:9,color:"#94a3b8"}}>₹{(parseFloat(r.revenue)/1000).toFixed(0)}k</div>
                <div className="bar" style={{width:"100%",height:`${(parseFloat(r.revenue)/maxRev)*120}px`,background:i===revenue.length-1?"linear-gradient(180deg,#93c5fd,#bfdbfe)":i===revenue.length-2?"linear-gradient(180deg,#2563eb,#1d4ed8)":"#e2e8f0"}}></div>
                <div style={{fontSize:9,color:"#94a3b8"}}>{r.month?.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{padding:24}}>
          <div style={{fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:16}}>Doctor Referrals</div>
          {(data.doctorReferrals||[]).map((d,i)=>{
            const max=data.doctorReferrals[0]?.patient_count||1;
            const colors=["#2563eb","#ef4444","#10b981","#f59e0b"];
            return(
              <div key={i} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{d.name}</span>
                  <span style={{fontSize:13,fontWeight:700,color:colors[i%4]}}>{d.patient_count}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width:`${(d.patient_count/max)*100}%`,background:colors[i%4]}}></div></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export default AnalyticsPage;
