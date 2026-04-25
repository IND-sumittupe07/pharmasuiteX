import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

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
    if (days < 0)   return { label:"Expired",        color:"#ef4444", bg:"#fef2f2" };
    if (days <= 30) return { label:`${days}d left`,  color:"#ef4444", bg:"#fef2f2" };
    if (days <= 90) return { label:`${days}d left`,  color:"#f59e0b", bg:"#fffbeb" };
    return              { label:`${days}d left`,  color:"#10b981", bg:"#f0fdf4" };
  };

  return (
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,
          background:toast.type==="error"?"#fef2f2":"#f0fdf4",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a",fontWeight:600,fontSize:14,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstall && (
        <div style={{padding:"14px 20px",background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:14,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>📱 Install MedTrack App</div>
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

      {error && (<div style={{padding:"12px 16px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,color:"#dc2626",fontSize:13,fontWeight:600}}>⚠️ {error}</div>)}

      {/* Summary Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[
          {label:"Expired",       value:summary.expired||0,      icon:"💀", color:"#ef4444", bg:"#fef2f2"},
          {label:"Expiring (30d)",value:summary.expiring30||0,   icon:"🚨", color:"#ef4444", bg:"#fef2f2"},
          {label:"Expiring (90d)",value:summary.expiring90||0,   icon:"⚠️", color:"#f59e0b", bg:"#fffbeb"},
          {label:"Total Batches", value:summary.totalBatches||0, icon:"📦", color:"#2563eb", bg:"#eff6ff"},
        ].map((s,i)=>(
          <div key={i} className="card" style={{padding:20,background:s.bg}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:26}}>{s.icon}</span>
              <div>
                <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:12,color:"#64748b"}}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6,background:"#f1f5f9",borderRadius:12,padding:4}}>
          {[["all","All"],["expiring","Expiring"],["expired","Expired"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)}
              style={{padding:"8px 14px",border:"none",borderRadius:8,cursor:"pointer",
                fontFamily:"inherit",fontWeight:600,fontSize:12,
                background:filter===v?"white":"transparent",
                color:filter===v?"#2563eb":"#64748b",
                boxShadow:filter===v?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>
              {l}
            </button>
          ))}
        </div>
        <select className="input" value={days} onChange={e=>setDays(e.target.value)} style={{width:160}}>
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={90}>Next 90 days</option>
          <option value={180}>Next 6 months</option>
          <option value={365}>Next 1 year</option>
          <option value={9999}>All time</option>
        </select>
        <button className="btn-primary" style={{marginLeft:"auto"}} onClick={()=>setShowAdd(true)}>
          + Add Batch
        </button>
      </div>

      {/* Batches Table */}
      <div className="card" style={{overflow:"hidden"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:48,color:"#94a3b8"}}>Loading...</div>
        ) : batches.length === 0 ? (
          <div style={{textAlign:"center",padding:60}}>
            <div style={{fontSize:48,marginBottom:12}}>📦</div>
            <div style={{fontSize:16,fontWeight:700,color:"#1e293b",marginBottom:8}}>No batches found</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:20}}>
              {filter==="expired" ? "No expired batches — great!" : "Add medicine batches to track expiry dates"}
            </div>
            {filter==="all" && <button className="btn-primary" onClick={()=>setShowAdd(true)}>+ Add First Batch</button>}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Batch No.</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Qty</th>
                <th>Buy Price</th>
                <th>Sell Price</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => {
                const daysLeft = parseInt(b.days_to_expiry) || 0;
                const st = expiryStatus(daysLeft);
                return (
                  <tr key={b.id}>
                    <td>
                      <div style={{fontWeight:700,color:"#1e293b"}}>{b.medicine_name}</div>
                    </td>
                    <td style={{fontFamily:"monospace",color:"#475569",fontWeight:600}}>{b.batch_number}</td>
                    <td style={{fontWeight:600,color:"#1e293b"}}>
                      {new Date(b.expiry_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
                    </td>
                    <td>
                      <span style={{background:st.bg,color:st.color,padding:"4px 12px",
                        borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{fontWeight:700,fontSize:15}}>{b.quantity}</td>
                    <td style={{color:"#64748b"}}>₹{parseFloat(b.purchase_price||0).toFixed(2)}</td>
                    <td style={{color:"#10b981",fontWeight:600}}>₹{parseFloat(b.selling_price||0).toFixed(2)}</td>
                    <td style={{color:"#64748b",fontSize:12}}>{b.supplier_name||"—"}</td>
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
          <div className="card fade-in" style={{padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:800,color:"#1e293b",marginBottom:18}}>📦 Add Medicine Batch</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Medicine *</label>
                <select className="input" value={form.medicineId} onChange={e => {
                  const med = medicines.find(m=>m.id===e.target.value);
                  setForm(f=>({...f, medicineId:e.target.value, medicineName:med?.name||""}));
                }}>
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
                  <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>{l}</label>
                  <input className="input" type={t} placeholder={p} value={form[k]}
                    onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Supplier</label>
                <select className="input" value={form.supplierId}
                  onChange={e=>setForm(f=>({...f,supplierId:e.target.value}))}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button className="btn-primary" style={{flex:1}} onClick={addBatch} disabled={saving}>
                {saving?"Adding...":"Add Batch"}
              </button>
              <button className="btn-secondary" style={{flex:1}} onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}