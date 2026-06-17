import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const emptyForm = { name:"", contactPerson:"", mobile:"", email:"", gstNumber:"", drugLicense:"", address:"", city:"", creditDays:30 };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders]       = useState([]);
  const [tab, setTab]             = useState("suppliers");
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [medicines, setMedicines] = useState([]);

  // PO form
  const [poForm, setPoForm]       = useState({ supplierId:"", invoiceNumber:"", invoiceDate:"", items:[], notes:"" });
  const [poItems, setPoItems]     = useState([{medicineId:"",name:"",quantity:"",purchasePrice:"",sellingPrice:"",gstPercent:12,batchNumber:"",expiryDate:""}]);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    Promise.all([
      api.get("/suppliers"),
      api.get("/suppliers/purchase-orders"),
      api.get("/medicines"),
    ]).then(([s, po, m]) => { setSuppliers(s.data || []); setOrders(po.data || []); setMedicines(m.data || []); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSupplier = async () => {
    if (!form.name) { showToast("Supplier name required","error"); return; }
    setSaving(true);
    try {
      if (modal === "edit") await api.put(`/suppliers/${selected.id}`, form);
      else await api.post("/suppliers", form);
      showToast(`✅ Supplier ${modal==="edit"?"updated":"added"}!`);
      setModal(null); load();
    } catch(e) { showToast("Failed","error"); }
    finally { setSaving(false); }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm("Delete supplier?")) return;
    try { await api.delete(`/suppliers/${id}`); showToast("Deleted"); load(); }
    catch { showToast("Failed","error"); }
  };

  const createPO = async () => {
    if (!poForm.supplierId || poItems.some(i=>!i.name||!i.quantity||!i.purchasePrice)) {
      showToast("Fill all required fields","error"); return;
    }
    setSaving(true);
    try {
      const items = poItems.map(i=>({
        ...i,
        medicineId: i.medicineId||null,
        quantity: parseInt(i.quantity),
        purchasePrice: parseFloat(i.purchasePrice),
        sellingPrice: parseFloat(i.sellingPrice||0),
      }));
      const res = await api.post("/suppliers/purchase-orders", { ...poForm, items });
      showToast(`✅ PO ${res.data.poNumber} created! Stock updated.`);
      setModal(null); load();
    } catch(e) { showToast(e.response?.data?.error||"Failed","error"); }
    finally { setSaving(false); }
  };

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  return (
    <div className="fade-in" style={{display:"flex", flexDirection:"column", gap:20, width:"100%", boxSizing:"border-box"}}>
      
      {/* Toast Alert popups */}
      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,
          background:toast.type==="error"?"rgba(239, 68, 68, 0.15)":"var(--bg2)",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a",fontWeight:600,fontSize:14,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* Tabs + Actions Navigation */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, width:"100%"}}>
        <div style={{display:"flex", gap:4, background:"var(--border)", borderRadius:12, padding:4}}>
          {[["suppliers","🏭 Suppliers"],["orders","📋 Purchase Orders"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)}
              style={{padding:"9px 16px", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:13,
                background:tab===v?"var(--bg1)":"transparent", color:tab===v?"var(--primary, #2563eb)":"var(--txt3)",
                boxShadow:tab===v?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn-secondary" style={{height:40}} onClick={()=>{setModal("po");}}>📋 New Purchase Order</button>
          <button className="btn-primary" style={{height:40}} onClick={()=>{setForm(emptyForm);setSelected(null);setModal("add");}}>+ Add Supplier</button>
        </div>
      </div>

      {/* TAB 1: Suppliers Responsive Card Grid */}
      {tab==="suppliers" && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:16, width:"100%"}}>
          {suppliers.length===0 ? (
            <div style={{gridColumn:"1/-1", textAlign:"center", padding:60, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16}}>
              <div style={{fontSize:48, marginBottom:12}}>🏭</div>
              <div style={{fontSize:16, fontWeight:700, color:"var(--txt1)", marginBottom:8}}>No suppliers yet</div>
              <button className="btn-primary" onClick={()=>{setForm(emptyForm);setModal("add");}}>+ Add First Supplier</button>
            </div>
          ) : suppliers.map(s=>(
            <div key={s.id} className="card" style={{padding:20, display:"flex", flexDirection:"column", gap:14, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8}}>
                <div>
                  <div style={{fontSize:15, fontWeight:700, color:"var(--txt1)"}}>{s.name}</div>
                  <div style={{fontSize:12, color:"var(--txt4)", marginTop:2}}>{s.contact_person || "—"}</div>
                </div>
                <span style={{background:"rgba(16, 185, 129, 0.15)", color:"#10b981", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, whiteSpace:"nowrap"}}>
                  {s.credit_days || 0}d credit
                </span>
              </div>
              
              <div style={{fontSize:12, color:"var(--txt3)", display:"flex", flexDirection:"column", gap:6}}>
                {s.mobile && <span>📱 {s.mobile}</span>}
                {s.city && <span>📍 {s.city}</span>}
                {s.gst_number && <span>🏷️ GST: {s.gst_number}</span>}
              </div>

              <div style={{display:"flex", gap:8, paddingTop:10, borderTop:"1px solid var(--border)", marginTop:"auto"}}>
                <div style={{flex:1, textAlign:"center"}}>
                  <div style={{fontSize:16, fontWeight:800, color:"var(--primary, #2563eb)"}}>{s.total_orders||0}</div>
                  <div style={{fontSize:10, color:"var(--txt4)"}}>Orders</div>
                </div>
                <div style={{flex:1, textAlign:"center"}}>
                  <div style={{fontSize:14, fontWeight:800, color:"#10b981"}}>₹{(parseFloat(s.total_purchased||0)/1000).toFixed(1)}k</div>
                  <div style={{fontSize:10, color:"var(--txt4)"}}>Purchased</div>
                </div>
              </div>

              <div style={{display:"flex", gap:8, marginTop:4}}>
                <button onClick={()=>{setSelected(s); setForm({name:s.name, contactPerson:s.contact_person||"", mobile:s.mobile||"", email:s.email||"", gstNumber:s.gst_number||"", drugLicense:s.drug_license||"", address:s.address||"", city:s.city||"", creditDays:s.credit_days||30}); setModal("edit");}}
                  style={{flex:1, padding:"8px", background:"var(--border)", border:"none", borderRadius:8, cursor:"pointer", color:"var(--primary, #2563eb)", Moreton:"var(--txt1)", fontWeight:700, fontSize:12, fontFamily:"inherit"}}>
                  ✏️ Edit
                </button>
                <button onClick={()=>deleteSupplier(s.id)}
                  style={{padding:"8px 14px", background:"rgba(239, 68, 68, 0.1)", border:"none", borderRadius:8, cursor:"pointer", color:"#ef4444", fontSize:12, fontFamily:"inherit"}}>
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Purchase Orders Table Layout */}
      {tab==="orders" && (
        <div className="card" style={{width:"100%", overflowX:"auto", background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
          <table className="data-table" style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
            <thead>
              <tr style={{background:"var(--table-head)"}}>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>PO Number</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Supplier</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Invoice No.</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Date</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Amount</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>GST</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"14px 20px"}}><span style={{fontWeight:700, color:"var(--primary, #2563eb)"}}>{o.po_number}</span></td>
                  <td style={{padding:"14px 20px"}}>
                    <div style={{fontWeight:700, color:"var(--txt1)"}}>{o.supplier_name||"—"}</div>
                    <div style={{fontSize:11, color:"var(--txt4)", marginTop:2}}>{o.supplier_mobile}</div>
                  </td>
                  <td style={{padding:"14px 20px", color:"var(--txt2)"}}>{o.invoice_number||"—"}</td>
                  <td style={{padding:"14px 20px", color:"var(--txt3)"}}>{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                  <td style={{padding:"14px 20px"}}><span style={{fontWeight:700, color:"var(--txt1)"}}>₹{parseFloat(o.total_amount).toFixed(2)}</span></td>
                  <td style={{padding:"14px 20px", color:"var(--txt3)"}}>₹{parseFloat(o.gst_amount||0).toFixed(2)}</td>
                  <td style={{padding:"14px 20px"}}>
                    <span style={{
                      background: o.payment_status==="paid"?"rgba(16, 185, 129, 0.15)":"rgba(245, 158, 11, 0.15)",
                      color: o.payment_status==="paid"?"#10b981":"#d97706",
                      padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, textTransform:"capitalize"
                    }}>
                      {o.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length===0 && (
                <tr>
                  <td colSpan={7} style={{textAlign:"center", padding:40, color:"var(--txt4)"}}>No purchase orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Add / Edit Supplier */}
      {(modal==="add"||modal==="edit") && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="card fade-in" style={{padding:28, width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto", background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17, fontWeight:800, color:"var(--txt1)", marginBottom:20}}>{modal==="add"?"➕ Add Supplier":"✏️ Edit Supplier"}</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
              {[
                ["name","Supplier Name *","text","e.g. Mehta Pharma",true],
                ["contactPerson","Contact Person","text","e.g. Rajesh Mehta",false],
                ["mobile","Mobile","tel","10-digit number",false],
                ["email","Email","email","supplier@email.com",false],
                ["gstNumber","GST Number","text","27AABCM...",false],
                ["drugLicense","Drug License No.","text","DL-12345",false],
                ["city","City","text","e.g. Pune",false],
                ["creditDays","Credit Days","number","30",false],
              ].map(([k,l,t,p,req])=>(
                <div key={k}>
                  <label style={{fontSize:12, fontWeight:700, color:"var(--txt3)", display:"block", marginBottom:5}}>{l}</label>
                  <input className="input" type={t} placeholder={p} required={req} value={form[k]} onChange={set(k)} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
                </div>
              ))}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12, fontWeight:700, color:"var(--txt3)", display:"block", marginBottom:5}}>Address</label>
                <textarea className="input" rows={2} placeholder="Full address..." value={form.address} onChange={set("address")} style={{resize:"none", background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
              </div>
            </div>
            <div style={{display:"flex", gap:10, marginTop:24}}>
              <button className="btn-primary" style={{flex:1, height:42}} onClick={saveSupplier} disabled={saving}>{saving?"Saving...":"Save Supplier"}</button>
              <button className="btn-secondary" style={{flex:1, height:42}} onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Purchase Order Form */}
      {modal==="po" && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="card fade-in" style={{padding:28, width:"100%", maxWidth:740, maxHeight:"90vh", overflowY:"auto", background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17, fontWeight:800, color:"var(--txt1)", marginBottom:20}}>📋 New Purchase Order</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20}}>
              <div>
                <label style={{fontSize:12, fontWeight:700, color:"var(--txt3)", display:"block", marginBottom:5}}>Supplier *</label>
                <select className="input" value={poForm.supplierId} onChange={e=>setPoForm(f=>({...f,supplierId:e.target.value}))} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12, fontWeight:700, color:"var(--txt3)", display:"block", marginBottom:5}}>Supplier Invoice No.</label>
                <input className="input" placeholder="INV-2024-001" value={poForm.invoiceNumber} onChange={e=>setPoForm(f=>({...f,invoiceNumber:e.target.value}))} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
              </div>
            </div>

            {/* PO Dynamic Dynamic Items Table Form */}
            <div style={{fontSize:13, fontWeight:700, color:"var(--txt1)", marginBottom:12, borderBottom:"1px solid var(--border)", paddingBottom:6}}>Items Directory</div>
            
            {/* Stable header tracking row outside item rendering map loop */}
            <div style={{display:"grid", gridTemplateColumns:"1.8fr 70px 80px 80px 90px 100px 36px", gap:8, marginBottom:6}}>
              {["Medicine","Qty","Buy ₹","Sell ₹","Batch No.","Expiry",""].map((h,j)=>(
                <div key={j} style={{fontSize:11, fontWeight:700, color:"var(--txt4)"}}>{h}</div>
              ))}
            </div>

            {poItems.map((item,i)=>(
              <div key={i} style={{display:"grid", gridTemplateColumns:"1.8fr 70px 80px 80px 90px 100px 36px", gap:8, marginBottom:10, alignItems:"center"}}>
                <select className="input" value={item.medicineId} onChange={e=>{
                  const med=medicines.find(m=>m.id===e.target.value);
                  setPoItems(items=>items.map((it,idx)=>idx===i?{...it,medicineId:e.target.value,name:med?.name||""}:it));
                }} style={{fontSize:12, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                  <option value="">Select...</option>
                  {medicines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                
                {["quantity","purchasePrice","sellingPrice","batchNumber"].map(k=>(
                  <input key={k} className="input" type={k==="batchNumber"?"text":"number"} placeholder={k==="batchNumber"?"BN001":"0"} value={item[k]}
                    onChange={e=>setPoItems(items=>items.map((it,idx)=>idx===i?{...it,[k]:e.target.value}:it))}
                    style={{fontSize:12, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
                ))}
                
                <input className="input" type="date" value={item.expiryDate}
                  onChange={e=>setPoItems(items=>items.map((it,idx)=>idx===i?{...it,expiryDate:e.target.value}:it))}
                  style={{fontSize:11, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)", padding:"4px 6px"}} />
                
                {poItems.length>1 ? (
                  <button onClick={()=>setPoItems(items=>items.filter((_,idx)=>idx!==i))}
                    style={{width:36, height:38, background:"rgba(239, 68, 68, 0.1)", border:"none", borderRadius:8, cursor:"pointer", color:"#ef4444", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center"}}>×</button>
                ) : <div />}
              </div>
            ))}

            <button className="btn-secondary" style={{fontSize:12, marginBottom:20, marginTop:4, height:36}} onClick={()=>setPoItems(i=>[...i,{medicineId:"",name:"",quantity:"",purchasePrice:"",sellingPrice:"",gstPercent:12,batchNumber:"",expiryDate:""}])}>
              ➕ Add Another Item
            </button>

            <div style={{display:"flex", gap:10, borderTop:"1px solid var(--border)", paddingTop:16}}>
              <button className="btn-primary" style={{flex:1, height:42}} onClick={createPO} disabled={saving}>{saving?"Creating...":"Create PO + Update Stock"}</button>
              <button className="btn-secondary" style={{flex:1, height:42}} onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
