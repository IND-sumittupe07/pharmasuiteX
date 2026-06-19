import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const CATEGORIES = ["all","Diabetes","BP","Cardiac","Thyroid","Respiratory","Pain Relief","Antibiotic","Gastro","Allergy","Supplements","Other"];
const UNITS = ["tablet","capsule","syrup","injection","cream","inhaler","drops","piece","sachet"];

const emptyForm = {
  name:"", category:"", manufacturer:"", unit:"tablet",
  costPrice:"", pricePerUnit:"", stockQty:"", lowStockAlert:"10",
  description:"", expiryDate:"", batchNumber:"", rackLocation:""
};

export default function MedicinesPage() {
  const [medicines, setMedicines]   = useState([]);
  const [summary, setSummary]       = useState({ total:0, lowStock:0, categories:[], totalValue:0, expiringSoon:0, expired:0 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  const [modal, setModal]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [stockAdj, setStockAdj]     = useState("");
  const [stockType, setStockType]   = useState("add");

  const showToast = (msg, type="success") => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category !== "all") params.append("category", category);
    if (showLowStock) params.append("lowStock", "true");
    if (showExpiring) params.append("expiringSoon", "true");

    Promise.all([
      api.get(`/medicines?${params}`),
      api.get("/medicines/summary"),
    ]).then(([m, s]) => {
      setMedicines(m.data);
      setSummary(s.data);
    }).catch(() => showToast("Failed to load medicines", "error"))
    .finally(() => setLoading(false));
  }, [search, category, showLowStock, showExpiring]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(emptyForm); setSelected(null); setModal("add"); };
  const openEdit = (m) => {
    setSelected(m);
    setForm({
      name: m.name, category: m.category||"", manufacturer: m.manufacturer||"",
      unit: m.unit||"tablet", costPrice: m.cost_price||"", pricePerUnit: m.price_per_unit||"",
      stockQty: m.stock_qty||"", lowStockAlert: m.low_stock_alert||10, description: m.description||"",
      expiryDate: m.expiry_date ? m.expiry_date.split("T")[0] : "",
      batchNumber: m.batch_number||"", rackLocation: m.rack_location||""
    });
    setModal("edit");
  };
  const openStock = (m) => { setSelected(m); setStockAdj(""); setStockType("add"); setModal("stock"); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const save = async () => {
    if (!form.name.trim()) { showToast("Medicine name is required", "error"); return; }
    setSaving(true);
    try {
      if (modal === "edit") {
        await api.put(`/medicines/${selected.id}`, form);
        showToast("✅ Medicine updated!");
      } else {
        await api.post("/medicines", form);
        showToast("✅ Medicine added!");
      }
      load(); closeModal();
    } catch(e) {
      showToast(e.response?.data?.error || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  const updateStock = async () => {
    if (!stockAdj) { showToast("Enter quantity", "error"); return; }
    setSaving(true);
    try {
      const adj = stockType === "remove" ? -Math.abs(parseInt(stockAdj)) : parseInt(stockAdj);
      await api.patch(`/medicines/${selected.id}/stock`, { adjustment: adj, type: stockType === "set" ? "set" : "add" });
      showToast("✅ Stock updated!");
      load(); closeModal();
    } catch { showToast("Failed to update stock", "error"); }
    finally { setSaving(false); }
  };

  const deleteMedicine = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await api.delete(`/medicines/${id}`); showToast("Deleted"); load(); }
    catch { showToast("Failed to delete", "error"); }
  };

  const profit = (m) => {
    const p = parseFloat(m.price_per_unit) || 0;
    const c = parseFloat(m.cost_price) || 0;
    if (!c || !p) return null;
    return Math.round(((p - c) / p) * 100);
  };

  const stockStatus = (m) => {
    if (m.stock_qty === 0) return { label: "Out of Stock", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" };
    if (m.stock_qty <= m.low_stock_alert) return { label: "Low Stock", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" };
    return { label: "In Stock", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" };
  };

  // ✅ NEW: Expiry status badge
  const expiryStatus = (m) => {
    if (!m.expiry_date) return null;
    const days = m.days_to_expiry !== undefined ? m.days_to_expiry : Math.ceil((new Date(m.expiry_date) - new Date()) / 86400000);
    if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, color: "#991b1b", bg: "rgba(220,38,38,0.15)" };
    if (days <= 30) return { label: `Expires in ${days}d`, color: "#dc2626", bg: "rgba(239,68,68,0.12)" };
    if (days <= 90) return { label: `Expires in ${days}d`, color: "#d97706", bg: "rgba(245,158,11,0.12)" };
    return { label: new Date(m.expiry_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}), color: "var(--txt3)", bg: "var(--bg3)" };
  };

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  return (
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:20, width:"100%"}}>

      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,
          background:toast.type==="error"?"rgba(239, 68, 68, 0.15)":"var(--bg2)",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a",
          fontWeight:600,fontSize:14,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* Summary Cards - now 6 cards with expiry stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))",gap:14}}>
        {[
          {label:"Total Medicines", value:summary.total,        icon:"💊", color:"#2563eb"},
          {label:"Low Stock",       value:summary.lowStock,     icon:"⚠️", color:"#f59e0b"},
          {label:"Categories",      value:summary.categories?.length||0, icon:"📂", color:"#7c3aed"},
          {label:"Stock Value",     value:`₹${((summary.totalValue||0)/1000).toFixed(1)}k`, icon:"💰", color:"#10b981"},
          {label:"Expiring Soon",   value:summary.expiringSoon||0, icon:"⏳", color:"#dc2626", onClick:()=>setShowExpiring(true)},
          {label:"Expired",         value:summary.expired||0,    icon:"❌", color:"#991b1b"},
        ].map((s,i)=>(
          <div key={i} className="card" onClick={s.onClick} style={{padding:18, background:"var(--bg2)", border:"1px solid var(--border)", cursor:s.onClick?"pointer":"default"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22, flexShrink:0}}>{s.icon}</span>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:s.color,lineHeight:1.2}}>{s.value}</div>
                <div style={{fontSize:11,color:"var(--txt3)",marginTop:2}}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap", width:"100%"}}>
        <input className="input" placeholder="🔍 Search medicines..." value={search}
          onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:200}} />
        <select className="input" value={category} onChange={e=>setCategory(e.target.value)} style={{width:160, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
          {CATEGORIES.map(c=><option key={c} value={c}>{c==="all"?"All Categories":c}</option>)}
        </select>
        <button onClick={()=>setShowLowStock(s=>!s)}
          style={{padding:"10px 16px",border:`1.5px solid ${showLowStock?"#f59e0b":"var(--border)"}`,
            borderRadius:10,background:showLowStock?"rgba(245, 158, 11, 0.15)":"var(--bg2)",color:showLowStock?"#d97706":"var(--txt2)",
            fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"inherit",whiteSpace:"nowrap",height:42,boxSizing:"border-box"}}>
          ⚠️ Low Stock {showLowStock?"ON":"OFF"}
        </button>
        {/* ✅ NEW: Expiring filter toggle */}
        <button onClick={()=>setShowExpiring(s=>!s)}
          style={{padding:"10px 16px",border:`1.5px solid ${showExpiring?"#dc2626":"var(--border)"}`,
            borderRadius:10,background:showExpiring?"rgba(239, 68, 68, 0.15)":"var(--bg2)",color:showExpiring?"#dc2626":"var(--txt2)",
            fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"inherit",whiteSpace:"nowrap",height:42,boxSizing:"border-box"}}>
          ⏳ Expiring Soon {showExpiring?"ON":"OFF"}
        </button>
        <button className="btn-primary" onClick={openAdd} style={{whiteSpace:"nowrap", height:42}}>+ Add Medicine</button>
      </div>

      {/* Table */}
      <div className="card" style={{overflowX:"auto", width:"100%", background:"var(--bg2)", border:"1px solid var(--border)"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--txt1)"}}>{medicines.length} medicines found</div>
          <div style={{display:"flex",gap:8}}>
            {summary.lowStock > 0 && (
              <div style={{fontSize:12,background:"rgba(245, 158, 11, 0.15)",color:"#d97706",padding:"4px 12px",borderRadius:20,fontWeight:700}}>
                ⚠️ {summary.lowStock} low stock
              </div>
            )}
            {summary.expiringSoon > 0 && (
              <div style={{fontSize:12,background:"rgba(239, 68, 68, 0.15)",color:"#dc2626",padding:"4px 12px",borderRadius:20,fontWeight:700}}>
                ⏳ {summary.expiringSoon} expiring soon
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{textAlign:"center",padding:60,color:"var(--txt4)"}}>Loading medicines...</div>
        ) : medicines.length === 0 ? (
          <div style={{textAlign:"center",padding:60}}>
            <div style={{fontSize:48,marginBottom:12}}>💊</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--txt1)",marginBottom:8}}>No medicines found</div>
            <div style={{fontSize:13,color:"var(--txt4)",marginBottom:20}}>Add your first medicine to start tracking stock</div>
            <button className="btn-primary" onClick={openAdd}>+ Add Medicine</button>
          </div>
        ) : (
          <table className="data-table" style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
            <thead>
              <tr>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:180}}>Medicine</th>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:120}}>Category</th>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:90}}>Stock</th>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:110}}>Status</th>
                {/* ✅ NEW: Expiry column */}
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:140}}>Expiry</th>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:110}}>Cost Price</th>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:110}}>Sell Price</th>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:90}}>Margin</th>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:90}}>Patients</th>
                <th style={{color:"var(--txt4)", background:"var(--table-head)", padding:"12px 16px", textAlign:"left", minWidth:160}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map(m => {
                const st = stockStatus(m);
                const mg = profit(m);
                const exp = expiryStatus(m);
                return (
                  <tr key={m.id} style={{borderBottom:"1px solid var(--border)"}}>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{fontWeight:700,color:"var(--txt1)",fontSize:14}}>{m.name}</div>
                      <div style={{fontSize:11,color:"var(--txt4)",marginTop:2}}>{m.manufacturer} · {m.unit}</div>
                      {m.batch_number && <div style={{fontSize:10,color:"var(--txt4)"}}>Batch: {m.batch_number}</div>}
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{background:"var(--bg3)",color:"var(--txt2)",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap"}}>
                        {m.category||"—"}
                      </span>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{fontWeight:800,fontSize:16,color:st.color}}>{m.stock_qty}</div>
                      <div style={{fontSize:10,color:"var(--txt4)"}}>alert at {m.low_stock_alert}</div>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{background:st.bg,color:st.color,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,whiteSpace:"nowrap"}}>
                        {st.label}
                      </span>
                    </td>
                    {/* ✅ NEW: Expiry cell */}
                    <td style={{padding:"12px 16px"}}>
                      {exp ? (
                        <span style={{background:exp.bg,color:exp.color,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,whiteSpace:"nowrap"}}>
                          {exp.label}
                        </span>
                      ) : (
                        <span style={{color:"var(--txt4)",fontSize:12}}>Not set</span>
                      )}
                    </td>
                    <td style={{padding:"12px 16px",color:"var(--txt3)",fontWeight:500}}>₹{parseFloat(m.cost_price||0).toFixed(2)}</td>
                    <td style={{padding:"12px 16px",color:"var(--txt1)",fontWeight:700}}>₹{parseFloat(m.price_per_unit||0).toFixed(2)}</td>
                    <td style={{padding:"12px 16px"}}>
                      {mg !== null ? (
                        <span style={{color:mg>20?"#10b981":mg>10?"#f59e0b":"#ef4444",fontWeight:700,fontSize:13}}>
                          {mg}%
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{color:"var(--primary)",fontWeight:700}}>{m.patient_count||0}</span>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>openStock(m)}
                          style={{padding:"6px 10px",background:"rgba(16, 185, 129, 0.15)",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#10b981",fontFamily:"inherit"}}>
                          📦
                        </button>
                        <button onClick={()=>openEdit(m)}
                          style={{padding:"6px 10px",background:"rgba(37, 99, 235, 0.15)",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#2563eb",fontFamily:"inherit"}}>
                          ✏️
                        </button>
                        <button onClick={()=>deleteMedicine(m.id, m.name)}
                          style={{padding:"6px 10px",background:"rgba(239, 68, 68, 0.15)",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,color:"#ef4444",fontFamily:"inherit"}}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal — now with expiry, batch, rack location */}
      {(modal==="add"||modal==="edit") && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="card fade-in" style={{padding:32,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto", background:"var(--bg2)", border:"1px solid var(--border)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,color:"var(--txt1)",marginBottom:20}}>
              {modal==="add"?"➕ Add New Medicine":"✏️ Edit Medicine"}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Medicine Name *</label>
                <input className="input" placeholder="e.g. Metformin 500mg" value={form.name} onChange={set("name")} />
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Category</label>
                <select className="input" value={form.category} onChange={set("category")} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                  <option value="">Select category</option>
                  {CATEGORIES.filter(c=>c!=="all").map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Unit</label>
                <select className="input" value={form.unit} onChange={set("unit")} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Manufacturer</label>
                <input className="input" placeholder="e.g. Sun Pharma, Cipla" value={form.manufacturer} onChange={set("manufacturer")} />
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Cost Price (₹)</label>
                <input className="input" type="number" placeholder="0.00" value={form.costPrice} onChange={set("costPrice")} />
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Selling Price (₹)</label>
                <input className="input" type="number" placeholder="0.00" value={form.pricePerUnit} onChange={set("pricePerUnit")} />
              </div>

              {form.costPrice && form.pricePerUnit && (
                <div style={{gridColumn:"1/-1",padding:"10px 14px",background:"rgba(16, 185, 129, 0.15)",borderRadius:10,fontSize:13, color:"var(--txt1)"}}>
                  💹 Profit margin: <strong style={{color:"#10b981"}}>
                    {Math.round(((form.pricePerUnit - form.costPrice)/form.pricePerUnit)*100)}%
                  </strong> &nbsp;·&nbsp; Profit per unit: <strong style={{color:"#10b981"}}>₹{(form.pricePerUnit - form.costPrice).toFixed(2)}</strong>
                </div>
              )}

              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Current Stock (qty)</label>
                <input className="input" type="number" placeholder="0" value={form.stockQty} onChange={set("stockQty")} />
              </div>

              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Low Stock Alert at</label>
                <input className="input" type="number" placeholder="10" value={form.lowStockAlert} onChange={set("lowStockAlert")} />
              </div>

              {/* ✅ NEW: Expiry Date field */}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>📅 Expiry Date</label>
                <input className="input" type="date" value={form.expiryDate} onChange={set("expiryDate")}
                  style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
              </div>

              {/* ✅ NEW: Batch Number field */}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Batch Number</label>
                <input className="input" placeholder="e.g. B2024-001" value={form.batchNumber} onChange={set("batchNumber")} />
              </div>

              {/* ✅ NEW: Rack Location field */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Rack/Shelf Location (optional)</label>
                <input className="input" placeholder="e.g. Rack A-3, Shelf 2" value={form.rackLocation} onChange={set("rackLocation")} />
              </div>

              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:5}}>Notes (optional)</label>
                <textarea className="input" rows={2} placeholder="Any notes about this medicine..." value={form.description} onChange={set("description")} style={{resize:"none"}} />
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button className="btn-primary" style={{flex:1}} onClick={save} disabled={saving}>
                {saving?"Saving...":modal==="add"?"Add Medicine":"Save Changes"}
              </button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal — unchanged */}
      {modal==="stock" && selected && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="card fade-in" style={{padding:32,width:"100%",maxWidth:420, background:"var(--bg2)", border:"1px solid var(--border)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,color:"var(--txt1)",marginBottom:4}}>📦 Update Stock</div>
            <div style={{fontSize:13,color:"var(--txt4)",marginBottom:20}}>{selected.name}</div>

            <div style={{padding:16,background:"var(--bg3)",borderRadius:12,textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:11,color:"var(--txt4)",fontWeight:700,marginBottom:4}}>CURRENT STOCK</div>
              <div style={{fontSize:36,fontWeight:800,color:selected.stock_qty<=selected.low_stock_alert?"#f59e0b":"var(--txt1)"}}>
                {selected.stock_qty}
              </div>
              <div style={{fontSize:12,color:"var(--txt4)"}}>{selected.unit}s</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
              {[
                {value:"add",    label:"➕ Add",    desc:"Restock"},
                {value:"remove", label:"➖ Remove", desc:"Sold/Used"},
                {value:"set",    label:"✏️ Set",    desc:"Exact count"},
              ].map(t=>(
                <button key={t.value} onClick={()=>setStockType(t.value)}
                  style={{padding:"10px 8px",border:`1.5px solid ${stockType===t.value?"var(--primary)":"var(--border)"}`,
                    borderRadius:10,background:stockType===t.value?"var(--nav-hover)":"var(--bg2)",
                    cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,color:stockType===t.value?"var(--primary)":"var(--txt1)"}}>{t.label}</div>
                  <div style={{fontSize:10,color:"var(--txt4)"}}>{t.desc}</div>
                </button>
              ))}
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:700,color:"var(--txt3)",display:"block",marginBottom:6}}>
                {stockType==="set"?"Set stock to":"Quantity"}
              </label>
              <input className="input" type="number" placeholder="Enter quantity..."
                value={stockAdj} onChange={e=>setStockAdj(e.target.value)}
                style={{fontSize:18,textAlign:"center",fontWeight:700}} />
              {stockAdj && stockType!=="set" && (
                <div style={{fontSize:12,color:"var(--txt3)",marginTop:6,textAlign:"center"}}>
                  New stock will be: <strong style={{color:"var(--txt1)"}}>
                    {stockType==="add"
                      ? parseInt(selected.stock_qty)+parseInt(stockAdj||0)
                      : Math.max(0, parseInt(selected.stock_qty)-parseInt(stockAdj||0))}
                  </strong> {selected.unit}s
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:10}}>
              <button className="btn-primary" style={{flex:1}} onClick={updateStock} disabled={saving}>
                {saving?"Updating...":"Update Stock"}
              </button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
