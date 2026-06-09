import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const CATEGORIES = ["all","Diabetes","BP","Cardiac","Thyroid","Respiratory","Pain Relief","Antibiotic","Gastro","Allergy","Supplements","Other"];
const UNITS = ["tablet","capsule","syrup","injection","cream","inhaler","drops","piece","sachet"];

const emptyForm = { name:"", category:"", manufacturer:"", unit:"tablet", costPrice:"", pricePerUnit:"", stockQty:"", lowStockAlert:"10", description:"" };

export default function MedicinesPage() {
  const [medicines, setMedicines]   = useState([]);
  const [summary, setSummary]       = useState({ total:0, lowStock:0, categories:[], totalValue:0 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [modal, setModal]           = useState(null); // null | "add" | "edit" | "stock"
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [stockAdj, setStockAdj]     = useState("");
  const [stockType, setStockType]   = useState("add"); // add | remove | set

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

    Promise.all([
      api.get(`/medicines?${params}`),
      api.get("/medicines/summary"),
    ]).then(([m, s]) => {
      setMedicines(m.data);
      setSummary(s.data);
    }).catch(() => showToast("Failed to load medicines", "error"))
    .finally(() => setLoading(false));
  }, [search, category, showLowStock]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(emptyForm); setSelected(null); setModal("add"); };
  const openEdit = (m) => {
    setSelected(m);
    setForm({
      name: m.name, category: m.category||"", manufacturer: m.manufacturer||"",
      unit: m.unit||"tablet", costPrice: m.cost_price||"", pricePerUnit: m.price_per_unit||"",
      stockQty: m.stock_qty||"", lowStockAlert: m.low_stock_alert||10, description: m.description||""
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
    if (m.stock_qty === 0) return { label: "Out of Stock", color: "#ef4444", bg: "#fef2f2" };
    if (m.stock_qty <= m.low_stock_alert) return { label: "Low Stock", color: "#f59e0b", bg: "#fffbeb" };
    return { label: "In Stock", color: "#10b981", bg: "#f0fdf4" };
  };

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  return (
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,
          background:toast.type==="error"?"#fef2f2":"#f0fdf4",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a",
          fontWeight:600,fontSize:14,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[
          {label:"Total Medicines", value:summary.total,        icon:"💊", color:"#2563eb", bg:"#eff6ff"},
          {label:"Low Stock Alert", value:summary.lowStock,     icon:"⚠️", color:"#f59e0b", bg:"#fffbeb"},
          {label:"Categories",      value:summary.categories?.length||0, icon:"📂", color:"#7c3aed", bg:"#f5f3ff"},
          {label:"Stock Value",     value:`₹${((summary.totalValue||0)/1000).toFixed(1)}k`, icon:"💰", color:"#10b981", bg:"#f0fdf4"},
        ].map((s,i)=>(
          <div key={i} className="card" style={{padding:20,background:s.bg}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:26}}>{s.icon}</span>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:12,color:"#64748b"}}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <input className="input" placeholder="🔍 Search medicines..." value={search}
          onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:200}} />
        <select className="input" value={category} onChange={e=>setCategory(e.target.value)} style={{width:160}}>
          {CATEGORIES.map(c=><option key={c} value={c}>{c==="all"?"All Categories":c}</option>)}
        </select>
        <button onClick={()=>setShowLowStock(s=>!s)}
          style={{padding:"10px 16px",border:`1.5px solid ${showLowStock?"#f59e0b":"#e2e8f0"}`,
            borderRadius:10,background:showLowStock?"#fffbeb":"white",color:showLowStock?"#d97706":"#64748b",
            fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"inherit",whiteSpace:"nowrap"}}>
          ⚠️ Low Stock {showLowStock?"ON":"OFF"}
        </button>
        <button className="btn-primary" onClick={openAdd} style={{whiteSpace:"nowrap"}}>+ Add Medicine</button>
      </div>

      {/* Medicine Table */}
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{medicines.length} medicines found</div>
          {summary.lowStock > 0 && (
            <div style={{fontSize:12,background:"#fffbeb",color:"#d97706",padding:"4px 12px",borderRadius:20,fontWeight:700}}>
              ⚠️ {summary.lowStock} items need restocking
            </div>
          )}
        </div>

        {loading ? (
          <div style={{textAlign:"center",padding:60,color:"#94a3b8"}}>Loading medicines...</div>
        ) : medicines.length === 0 ? (
          <div style={{textAlign:"center",padding:60}}>
            <div style={{fontSize:48,marginBottom:12}}>💊</div>
            <div style={{fontSize:16,fontWeight:700,color:"#1e293b",marginBottom:8}}>No medicines found</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:20}}>Add your first medicine to start tracking stock</div>
            <button className="btn-primary" onClick={openAdd}>+ Add Medicine</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Cost Price</th>
                <th>Sell Price</th>
                <th>Margin</th>
                <th>Patients</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map(m => {
                const st = stockStatus(m);
                const mg = profit(m);
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{fontWeight:700,color:"#1e293b",fontSize:14}}>{m.name}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>{m.manufacturer} · {m.unit}</div>
                    </td>
                    <td>
                      <span style={{background:"#f1f5f9",color:"#475569",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20}}>
                        {m.category||"—"}
                      </span>
                    </td>
                    <td>
                      <div style={{fontWeight:800,fontSize:16,color:st.color}}>{m.stock_qty}</div>
                      <div style={{fontSize:10,color:"#94a3b8"}}>alert at {m.low_stock_alert}</div>
                    </td>
                    <td>
                      <span style={{background:st.bg,color:st.color,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20}}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{color:"#64748b",fontWeight:500}}>₹{parseFloat(m.cost_price||0).toFixed(2)}</td>
                    <td style={{color:"#1e293b",fontWeight:700}}>₹{parseFloat(m.price_per_unit||0).toFixed(2)}</td>
                    <td>
                      {mg !== null ? (
                        <span style={{color:mg>20?"#10b981":mg>10?"#f59e0b":"#ef4444",fontWeight:700,fontSize:13}}>
                          {mg}%
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <span style={{color:"#2563eb",fontWeight:700}}>{m.patient_count||0}</span>
                    </td>
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>openStock(m)}
                          style={{padding:"6px 10px",background:"#f0fdf4",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#16a34a",fontFamily:"inherit"}}>
                          📦 Stock
                        </button>
                        <button onClick={()=>openEdit(m)}
                          style={{padding:"6px 10px",background:"#eff6ff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#2563eb",fontFamily:"inherit"}}>
                          ✏️
                        </button>
                        <button onClick={()=>deleteMedicine(m.id, m.name)}
                          style={{padding:"6px 10px",background:"#fef2f2",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,color:"#ef4444",fontFamily:"inherit"}}>
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

      {/* Add / Edit Modal */}
      {(modal==="add"||modal==="edit") && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="card fade-in" style={{padding:32,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,color:"#1e293b",marginBottom:20}}>
              {modal==="add"?"➕ Add New Medicine":"✏️ Edit Medicine"}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {/* Name */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Medicine Name *</label>
                <input className="input" placeholder="e.g. Metformin 500mg" value={form.name} onChange={set("name")} />
              </div>

              {/* Category */}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Category</label>
                <select className="input" value={form.category} onChange={set("category")}>
                  <option value="">Select category</option>
                  {CATEGORIES.filter(c=>c!=="all").map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Unit</label>
                <select className="input" value={form.unit} onChange={set("unit")}>
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Manufacturer */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Manufacturer</label>
                <input className="input" placeholder="e.g. Sun Pharma, Cipla" value={form.manufacturer} onChange={set("manufacturer")} />
              </div>

              {/* Cost Price */}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Cost Price (₹)</label>
                <input className="input" type="number" placeholder="0.00" value={form.costPrice} onChange={set("costPrice")} />
              </div>

              {/* Sell Price */}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Selling Price (₹)</label>
                <input className="input" type="number" placeholder="0.00" value={form.pricePerUnit} onChange={set("pricePerUnit")} />
              </div>

              {/* Margin preview */}
              {form.costPrice && form.pricePerUnit && (
                <div style={{gridColumn:"1/-1",padding:"10px 14px",background:"#f0fdf4",borderRadius:10,fontSize:13}}>
                  💹 Profit margin: <strong style={{color:"#16a34a"}}>
                    {Math.round(((form.pricePerUnit - form.costPrice)/form.pricePerUnit)*100)}%
                  </strong> &nbsp;·&nbsp; Profit per unit: <strong style={{color:"#16a34a"}}>₹{(form.pricePerUnit - form.costPrice).toFixed(2)}</strong>
                </div>
              )}

              {/* Stock */}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Current Stock (qty)</label>
                <input className="input" type="number" placeholder="0" value={form.stockQty} onChange={set("stockQty")} />
              </div>

              {/* Low stock alert */}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Low Stock Alert at</label>
                <input className="input" type="number" placeholder="10" value={form.lowStockAlert} onChange={set("lowStockAlert")} />
              </div>

              {/* Description */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Notes (optional)</label>
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

      {/* Stock Update Modal */}
      {modal==="stock" && selected && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="card fade-in" style={{padding:32,width:"100%",maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,color:"#1e293b",marginBottom:4}}>📦 Update Stock</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:20}}>{selected.name}</div>

            {/* Current stock display */}
            <div style={{padding:16,background:"#f8fafc",borderRadius:12,textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:4}}>CURRENT STOCK</div>
              <div style={{fontSize:36,fontWeight:800,color:selected.stock_qty<=selected.low_stock_alert?"#f59e0b":"#1e293b"}}>
                {selected.stock_qty}
              </div>
              <div style={{fontSize:12,color:"#94a3b8"}}>{selected.unit}s</div>
            </div>

            {/* Type selector */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
              {[
                {value:"add",    label:"➕ Add",    desc:"Restock"},
                {value:"remove", label:"➖ Remove", desc:"Sold/Used"},
                {value:"set",    label:"✏️ Set",    desc:"Exact count"},
              ].map(t=>(
                <button key={t.value} onClick={()=>setStockType(t.value)}
                  style={{padding:"10px 8px",border:`1.5px solid ${stockType===t.value?"#2563eb":"#e2e8f0"}`,
                    borderRadius:10,background:stockType===t.value?"#eff6ff":"white",
                    cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,color:stockType===t.value?"#2563eb":"#374151"}}>{t.label}</div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{t.desc}</div>
                </button>
              ))}
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:6}}>
                {stockType==="set"?"Set stock to":"Quantity"}
              </label>
              <input className="input" type="number" placeholder="Enter quantity..."
                value={stockAdj} onChange={e=>setStockAdj(e.target.value)}
                style={{fontSize:18,textAlign:"center",fontWeight:700}} />
              {stockAdj && stockType!=="set" && (
                <div style={{fontSize:12,color:"#64748b",marginTop:6,textAlign:"center"}}>
                  New stock will be: <strong style={{color:"#1e293b"}}>
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
