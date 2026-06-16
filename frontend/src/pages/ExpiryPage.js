import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const conditionColor = {
  diabetes: "#3b82f6",
  hypertension: "#ef4444",
  asthma: "#f59e0b",
  arthritis: "#8b5cf6",
};

export default function ExpiryPage() {
  const [batches, setBatches]     = useState([]);
  const [summary, setSummary]     = useState({});
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [days, setDays]           = useState(365);
  const [showAdd, setShowAdd]     = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [toast, setToast]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall]       = useState(false);
  const [form, setForm] = useState({
    medicineId:"", medicineName:"", batchNumber:"",
    expiryDate:"", quantity:"", purchasePrice:"", sellingPrice:"", supplierId:""
  });

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") { setShowInstall(false); setDeferredPrompt(null); }
  };

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    setLoading(true); setError("");
    Promise.allSettled([
      api.get(`/expiry?filter=${filter}&days=${days}`),
      api.get("/expiry/summary"),
      api.get("/medicines"),
      api.get("/suppliers"),
    ]).then(([b, s, m, sup]) => {
      if (b.status === "fulfilled") {
        setBatches(b.value.data);
      } else {
        console.error("Batch list error:", b.reason);
        setError("Failed to load batches. Check console.");
      }
      if (s.status === "fulfilled") setSummary(s.value.data);
      if (m.status === "fulfilled") setMedicines(m.value.data);
      if (sup.status === "fulfilled") setSuppliers(sup.value.data);
    }).finally(() => setLoading(false));
  }, [filter, days]);

  useEffect(() => { load(); }, [load]);

  const addBatch = async () => {
    if (!form.medicineName || !form.batchNumber || !form.expiryDate || !form.quantity) {
      showToast("Fill all required fields", "error"); return;
    }
    setSaving(true);
    try {
      await api.post("/expiry/batch", form);
      showToast("✅ Batch added!");
      setShowAdd(false);
      setForm({ medicineId:"", medicineName:"", batchNumber:"", expiryDate:"", quantity:"", purchasePrice:"", sellingPrice:"", supplierId:"" });
      load();
    } catch(e) { showToast(e.response?.data?.error||"Failed", "error"); }
    finally { setSaving(false); }
  };

  const expiryStatus = (days) => {
    if (days < 0)   return { label:"Expired",        color:"#ef4444", bg:"rgba(239, 68, 68, 0.15)" };
    if (days <= 30) return { label:`${days}d left`,  color:"#ef4444", bg:"rgba(239, 68, 68, 0.15)" };
    if (days <= 90) return { label:`${days}d left`,  color:"#f59e0b", bg:"rgba(245, 158, 11, 0.15)" };
    return              { label:`${days}d left`,  color:"#10b981", bg:"rgba(16, 185, 129, 0.15)" };
  };

  return (
    <div className="fade-in" style={{display:"flex", flexDirection:"column", gap:20, width:"100%", boxSizing:"border-box"}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,
          background:toast.type==="error"?"rgba(239, 68, 68, 0.15)":"var(--bg2)",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a",fontWeight:600,fontSize:14,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstall && (
        <div style={{padding:"14px 20px",background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:14,
          display:"flex",justifyContent:"space-between",alignItems:"center", flexWrap:"wrap", gap:12, width:"100%", boxSizing:"border-box"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>📱 Install PharmaSuiteX App</div>
            <div style={{fontSize:12,color:"#bfdbfe",marginTop:2}}>Add to your desktop for quick access — works offline too!</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={installApp}
              style={{padding:"9px 20px",background:"white",color:"#2563eb",border:"none",
                borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              📥 Install App
            </button>
            <button onClick={()=>setShowInstall(false)}
              style={{padding:"9px 14px",background:"rgba(255,255,255,0.15)",color:"white",border:"none",
                borderRadius:10,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
              ✕
            </button>
          </div>
        </div>
      )}

      {error && (<div style={{padding:"12px 16px",background:"rgba(239, 68, 68, 0.15)",border:"1px solid #fca5a5",borderRadius:10,color:"#dc2626",fontSize:13,fontWeight:600}}>⚠️ {error}</div>)}

      {/* Summary Cards Grid: Fixed to repeat adaptively without compressing */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:16, width:"100%"}}>
        {[
          {label:"Expired",       value:summary.expired||0,      icon:"💀", color:"#ef4444", bg:"rgba(239, 68, 68, 0.1)"},
          {label:"Expiring (30d)",value:summary.expiring30||0,   icon:"🚨", color:"#ef4444", bg:"rgba(239, 68, 68, 0.1)"},
          {label:"Expiring (90d)",value:summary.expiring90||0,   icon:"⚠️", color:"#f59e0b", bg:"rgba(245, 158, 11, 0.1)"},
          {label:"Total Batches", value:summary.totalBatches||0, icon:"📦", color:"var(--primary, #2563eb)", bg:"rgba(37, 99, 235, 0.1)"},
        ].map((s,i)=>(
          <div key={i} className="card" style={{padding:20, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:26, width:48, height:48, borderRadius:10, background:s.bg, display:"flex", alignItems:"center", justifyContent: "center"}}>{s.icon}</div>
              <div>
                <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:12,color:"var(--txt4)"}}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar Setup */}
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap", width:"100%"}}>
        <div style={{display:"flex",gap:4,background:"var(--border)",borderRadius:12,padding:4}}>
          {[["all","All"],["expiring","Expiring"],["expired","Expired"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)}
              style={{padding:"8px 16px",border:"none",borderRadius:8,cursor:"pointer",
                fontFamily:"inherit",fontWeight:600,fontSize:12,
                background:filter===v?"var(--bg1)":"transparent",
                color:filter===v?"var(--primary, #2563eb)":"var(--txt3)",
                boxShadow:filter===v?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>
              {l}
            </button>
          ))}
        </div>
        <select className="input" value={days} onChange={e=>setDays(e.target.value)} style={{width:160, height:40, background:"var(--bg2)", color:"var(--txt1)"}}>
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={90}>Next 90 days</option>
          <option value={180}>Next 6 months</option>
          <option value={365}>Next 1 year</option>
          <option value={9999}>All time</option>
        </select>
        <button className="btn-primary" style={{marginLeft:"auto", height:40}} onClick={()=>setShowAdd(true)}>
          + Add Batch
        </button>
      </div>

      {/* Batches Table Container Card */}
      <div className="card" style={{width:"100%", overflowX: "auto", background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
        {loading ? (
          <div style={{textAlign:"center",padding:48,color:"var(--txt4)"}}>Loading batch listings...</div>
        ) : batches.length === 0 ? (
          <div style={{textAlign:"center",padding:60}}>
            <div style={{fontSize:48,marginBottom:12}}>📦</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--txt1)",marginBottom:8}}>No batches found</div>
            <div style={{fontSize:13,color:"var(--txt4)",marginBottom:20}}>
              {filter==="expired" ? "No expired batches — great job!" : "Add medicine batches to track expiry timelines"}
            </div>
            {filter==="all" && <button className="btn-primary" onClick={()=>setShowAdd(true)}>+ Add First Batch</button>}
          </div>
        ) : (
          <table className="data-table" style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
            <thead>
              <tr style={{background:"var(--table-head)"}}>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Medicine Name</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Batch No.</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Expiry Date</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Status</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Qty</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Buy Price</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Sell Price</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => {
                const daysLeft = parseInt(b.days_to_expiry) || 0;
                const st = expiryStatus(daysLeft);
                return (
                  <tr key={b.id} style={{borderBottom:"1px solid var(--border)"}}>
                    <td style={{padding:"14px 20px"}}>
                      <div style={{fontWeight:700,color:"var(--txt1)", fontSize:14}}>{b.medicine_name}</div>
                    </td>
                    <td style={{padding:"14px 20px", fontFamily:"monospace",color:"var(--txt2)",fontWeight:600, fontSize:13}}>{b.batch_number}</td>
                    <td style={{padding:"14px 20px", fontWeight:600,color:"var(--txt1)", fontSize:13}}>
                      {new Date(b.expiry_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
                    </td>
                    <td style={{padding:"14px 20px"}}>
                      <span style={{background:st.bg,color:st.color,padding:"4px 12px",
                        borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{padding:"14px 20px", fontWeight:700,fontSize:14, color:"var(--txt1)"}}>{b.quantity}</td>
                    <td style={{padding:"14px 20px", color:"var(--txt3)", fontSize:13}}>₹{parseFloat(b.purchase_price||0).toFixed(2)}</td>
                    <td style={{padding:"14px 20px", color:"#10b981",fontWeight:600, fontSize:13}}>₹{parseFloat(b.selling_price||0).toFixed(2)}</td>
                    <td style={{padding:"14px 20px", color:"var(--txt4)",fontSize:13}}>{b.supplier_name||"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Batch Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={()=>setShowAdd(false)}>
          <div className="card fade-in" style={{padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto", background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:800,color:"var(--txt1)",marginBottom:18}}>📦 Add Medicine Batch</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Medicine *</label>
                <select className="input" value={form.medicineId} onChange={e => {
                  const med = medicines.find(m=>m.id===e.target.value);
                  setForm(f=>({...f, medicineId:e.target.value, medicineName:med?.name||""}));
                }} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                  <option value="">Select medicine...</option>
                  {medicines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {medicines.length === 0 && (
                  <div style={{fontSize:11,color:"#f59e0b",marginTop:4}}>
                    ⚠️ No medicines found. Add medicines in the Medicines page first.
                  </div>
                )}
              </div>
              {[
                ["batchNumber","Batch Number *","text","e.g. BN20240101"],
                ["expiryDate","Expiry Date *","date",""],
                ["quantity","Quantity *","number","e.g. 100"],
                ["purchasePrice","Purchase Price (₹)","number","0.00"],
                ["sellingPrice","Selling Price (₹)","number","0.00"],
              ].map(([k,l,t,p])=>(
                <div key={k}>
                  <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>{l}</label>
                  <input className="input" type={t} placeholder={p} value={form[k]}
                    onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
                </div>
              ))}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Supplier</label>
                <select className="input" value={form.supplierId}
                  onChange={e=>setForm(f=>({...f,supplierId:e.target.value}))} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button className="btn-primary" style={{flex:1, height:42}} onClick={addBatch} disabled={saving}>
                {saving?"Adding...":"Add Batch"}
              </button>
              <button className="btn-secondary" style={{flex:1, height:42}} onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
