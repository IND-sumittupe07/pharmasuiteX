import { useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "/api";

export default function ExportPage() {
  const [downloaded, setDownloaded] = useState({});

  const download = async (key, endpoint, filename) => {
    const token = localStorage.getItem("medtrack_token");
    try {
      const res = await fetch(`${API_BASE}/export/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      setDownloaded(d => ({ ...d, [key]: true }));
      setTimeout(() => setDownloaded(d => ({ ...d, [key]: false })), 3000);
    } catch (err) { alert("Export failed: " + err.message); }
  };

  const today = new Date().toISOString().split("T")[0];
  const exports = [
    { key:"customers", icon:"👥", title:"Customer Database", desc:"All customer profiles, contacts, conditions, doctors and spend history", color:"#2563eb", bg:"#eff6ff", endpoint:"customers", file:`MedTrack_Customers_${today}.csv` },
    { key:"medicines", icon:"💊", title:"Medicine Stats", desc:"Prescription counts and dispensing data per medicine", color:"#8b5cf6", bg:"#f5f3ff", endpoint:"medicines", file:`MedTrack_Medicines_${today}.csv` },
    { key:"refills",   icon:"🔔", title:"Refill Queue", desc:"All upcoming refills within 30 days with urgency levels", color:"#ef4444", bg:"#fef2f2", endpoint:"refills",   file:`MedTrack_Refills_${today}.csv` },
    { key:"campaigns", icon:"📣", title:"Campaign Report", desc:"All campaigns with targets, channels and delivery counts", color:"#f59e0b", bg:"#fffbeb", endpoint:"campaigns", file:`MedTrack_Campaigns_${today}.csv` },
    { key:"purchases", icon:"🧾", title:"Purchase History", desc:"All customer purchase records with invoice details and amounts", color:"#10b981", bg:"#f0fdf4", endpoint:"purchases", file:`MedTrack_Purchases_${today}.csv` },
  ];

  return (
    <div className="fade-in" style={{ display:"flex",flexDirection:"column",gap:20 }}>
      {/* Header */}
      <div className="card" style={{ padding:24,background:"linear-gradient(135deg,#1e293b,#1d4ed8)",border:"none" }}>
        <div style={{ fontSize:20,fontWeight:800,color:"white",marginBottom:6 }}>⬇️ Export Centre</div>
        <div style={{ fontSize:13,color:"#93c5fd" }}>Download real pharmacy data as CSV — open in Excel, Google Sheets, or Python for analysis</div>
      </div>

      {/* Export cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
        {exports.map(e=>(
          <div key={e.key} className="card" style={{ padding:24,display:"flex",flexDirection:"column",gap:16,border:`1.5px solid ${e.bg}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div className="ring" style={{ width:48,height:48,background:e.bg,fontSize:22 }}>{e.icon}</div>
            </div>
            <div>
              <div style={{ fontSize:15,fontWeight:700,color:"#1e293b" }}>{e.title}</div>
              <div style={{ fontSize:12,color:"#94a3b8",marginTop:4,lineHeight:1.6 }}>{e.desc}</div>
            </div>
            <button onClick={()=>download(e.key,e.endpoint,e.file)}
              style={{ marginTop:"auto",padding:"11px",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:13,transition:"all 0.2s",
                background: downloaded[e.key]?"#f0fdf4":`linear-gradient(135deg,${e.color},${e.color}dd)`,
                color: downloaded[e.key]?"#16a34a":"white",
                boxShadow: downloaded[e.key]?"none":`0 4px 12px ${e.color}44`
              }}>
              {downloaded[e.key]?"✅ Downloaded!":"⬇️ Download CSV"}
            </button>
          </div>
        ))}

        {/* Dark full-export card */}
        <div className="card" style={{ padding:24,background:"linear-gradient(135deg,#1e293b,#0f172a)",border:"none",display:"flex",flexDirection:"column",gap:16 }}>
          <div className="ring" style={{ width:48,height:48,background:"rgba(255,255,255,0.08)",fontSize:22 }}>📦</div>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:"white" }}>Full Data Bundle</div>
            <div style={{ fontSize:12,color:"#94a3b8",marginTop:4,lineHeight:1.6 }}>Download all 5 CSVs one by one — use them together for complete pharmacy analysis</div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:8,padding:"10px 12px" }}>
            {exports.map(e=><div key={e.key} style={{ fontSize:11,color:"#93c5fd",marginBottom:3 }}>✓ {e.title}</div>)}
          </div>
          <button onClick={()=>exports.forEach((e,i)=>setTimeout(()=>download(e.key,e.endpoint,e.file),i*500))}
            style={{ marginTop:"auto",padding:"12px",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:13,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"white",boxShadow:"0 4px 16px rgba(37,99,235,0.4)" }}>
            ⬇️ Download All
          </button>
        </div>
      </div>

      {/* How to use */}
      <div className="card" style={{ padding:24 }}>
        <div style={{ fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:16 }}>💡 How to Use Exported Data</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
          {[
            { icon:"📊", tool:"Microsoft Excel", tip:"Open CSV → Data tab → From Text/CSV. Use Pivot Tables to analyze sales by month, condition, or doctor." },
            { icon:"📈", tool:"Google Sheets", tip:"File → Import → Upload CSV. Use VLOOKUP or Query formula to cross-reference customer and medicine data." },
            { icon:"🐍", tool:"Python / Pandas", tip:"pd.read_csv('file.csv') and use groupby, merge, and visualize with matplotlib for advanced analytics." },
          ].map((t,i)=>(
            <div key={i} style={{ background:"#f8fafc",borderRadius:12,padding:16 }}>
              <div style={{ fontSize:22,marginBottom:8 }}>{t.icon}</div>
              <div style={{ fontSize:13,fontWeight:700,color:"#1e293b",marginBottom:4 }}>{t.tool}</div>
              <div style={{ fontSize:12,color:"#64748b",lineHeight:1.5 }}>{t.tip}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
