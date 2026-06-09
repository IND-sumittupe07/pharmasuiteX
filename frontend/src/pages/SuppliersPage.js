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
    ]).then(([s, po, m]) => { setSuppliers(s.data); setOrders(po.data); setMedicines(m.data); });
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
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:16}}>
      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,
          background:toast.type==="error"?"#fef2f2":"#f0fdf4",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a",fontWeight:600,fontSize:14,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* Tabs + Actions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:6,background:"#f1f5f9",borderRadius:12,padding:4}}>
          {[["suppliers","🏭 Suppliers"],["orders","📋 Purchase Orders"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)}
              style={{padding:"9px 16px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,
                background:tab===v?"white":"transparent",color:tab===v?"#2563eb":"#64748b",
                boxShadow:tab===v?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn-secondary" onClick={()=>{setModal("po");}}>📋 New Purchase Order</button>
          <button className="btn-primary" onClick={()=>{setForm(emptyForm);setSelected(null);setModal("add");}}>+ Add Supplier</button>
        </div>
      </div>

      {/* Suppliers List */}
      {tab==="suppliers" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {suppliers.length===0 ? (
            <div style={{gridColumn:"1/-1",textAlign:"center",padding:60,background:"white",borderRadius:16}}>
              <div style={{fontSize:48,marginBottom:12}}>🏭</div>
              <div style={{fontSize:16,fontWeight:700,color:"#1e293b",marginBottom:8}}>No suppliers yet</div>
              <button className="btn-primary" onClick={()=>{setForm(emptyForm);setModal("add");}}>+ Add First Supplier</button>
            </div>
          ) : suppliers.map(s=>(
            <div key={s.id} className="card" style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"#1e293b"}}>{s.name}</div>
                  <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{s.contact_person}</div>
                </div>
                <span style={{background:"#f0fdf4",color:"#16a34a",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{s.credit_days}d credit</span>
              </div>
              <div style={{fontSize:12,color:"#64748b",display:"flex",flexDirection:"column",gap:4}}>
                {s.mobile && <span>📱 {s.mobile}</span>}
                {s.city && <span>📍 {s.city}</span>}
                {s.gst_number && <span>🏷️ GST: {s.gst_number}</span>}
              </div>
              <div style={{display:"flex",gap:8,paddingTop:4,borderTop:"1px solid #f1f5f9"}}>
                <div style={{flex:1,textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:800,color:"#2563eb"}}>{s.total_orders||0}</div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>Orders</div>
                </div>
                <div style={{flex:1,textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#10b981"}}>₹{(parseFloat(s.total_purchased||0)/1000).toFixed(1)}k</div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>Purchased</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setSelected(s);setForm({name:s.name,contactPerson:s.contact_person||"",mobile:s.mobile||"",email:s.email||"",gstNumber:s.gst_number||"",drugLicense:s.drug_license||"",address:s.address||"",city:s.city||"",creditDays:s.credit_days||30});setModal("edit");}}
                  style={{flex:1,padding:"8px",background:"#eff6ff",border:"none",borderRadius:8,cursor:"pointer",color:"#2563eb",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>
                  ✏️ Edit
                </button>
                <button onClick={()=>deleteSupplier(s.id)}
                  style={{padding:"8px 12px",background:"#fef2f2",border:"none",borderRadius:8,cursor:"pointer",color:"#ef4444",fontSize:12,fontFamily:"inherit"}}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Orders */}
      {tab==="orders" && (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="data-table">
            <thead><tr><th>PO Number</th><th>Supplier</th><th>Invoice No.</th><th>Date</th><th>Amount</th><th>GST</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}>
                  <td><span style={{fontWeight:700,color:"#2563eb"}}>{o.po_number}</span></td>
                  <td><div style={{fontWeight:600}}>{o.supplier_name||"—"}</div><div style={{fontSize:11,color:"#94a3b8"}}>{o.supplier_mobile}</div></td>
                  <td style={{color:"#64748b"}}>{o.invoice_number||"—"}</td>
                  <td style={{color:"#64748b"}}>{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                  <td><span style={{fontWeight:700}}>₹{parseFloat(o.total_amount).toFixed(2)}</span></td>
                  <td style={{color:"#64748b"}}>₹{parseFloat(o.gst_amount||0).toFixed(2)}</td>
                  <td><span style={{background:o.payment_status==="paid"?"#f0fdf4":"#fffbeb",color:o.payment_status==="paid"?"#16a34a":"#d97706",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,textTransform:"capitalize"}}>{o.payment_status}</span></td>
                </tr>
              ))}
              {orders.length===0 && <tr><td colSpan={7} style={{textAlign:"center",padding:32,color:"#94a3b8"}}>No purchase orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      {(modal==="add"||modal==="edit") && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="card fade-in" style={{padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:800,color:"#1e293b",marginBottom:18}}>{modal==="add"?"➕ Add Supplier":"✏️ Edit Supplier"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
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
                  <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>{l}</label>
                  <input className="input" type={t} placeholder={p} required={req} value={form[k]} onChange={set(k)} />
                </div>
              ))}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Address</label>
                <textarea className="input" rows={2} placeholder="Full address..." value={form.address} onChange={set("address")} style={{resize:"none"}} />
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button className="btn-primary" style={{flex:1}} onClick={saveSupplier} disabled={saving}>{saving?"Saving...":"Save Supplier"}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* New Purchase Order Modal */}
      {modal==="po" && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="card fade-in" style={{padding:28,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:800,color:"#1e293b",marginBottom:18}}>📋 New Purchase Order</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Supplier *</label>
                <select className="input" value={poForm.supplierId} onChange={e=>setPoForm(f=>({...f,supplierId:e.target.value}))}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Supplier Invoice No.</label>
                <input className="input" placeholder="INV-2024-001" value={poForm.invoiceNumber} onChange={e=>setPoForm(f=>({...f,invoiceNumber:e.target.value}))} />
              </div>
            </div>
            {/* PO Items */}
            <div style={{fontSize:13,fontWeight:700,color:"#1e293b",marginBottom:10}}>Items</div>
            {poItems.map((item,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 70px 80px 80px 80px 80px 36px",gap:6,marginBottom:8,alignItems:"end"}}>
                {i===0 && ["Medicine","Qty","Buy ₹","Sell ₹","Batch No.","Expiry",""].map((h,j)=>(
                  <div key={j} style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginBottom:2}}>{h}</div>
                ))}
                <select className="input" value={item.medicineId} onChange={e=>{
                  const med=medicines.find(m=>m.id===e.target.value);
                  setPoItems(items=>items.map((it,idx)=>idx===i?{...it,medicineId:e.target.value,name:med?.name||""}:it));
                }} style={{fontSize:12}}>
                  <option value="">Select...</option>
                  {medicines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {["quantity","purchasePrice","sellingPrice","batchNumber"].map(k=>(
                  <input key={k} className="input" type={k==="batchNumber"?"text":"number"} placeholder={k==="batchNumber"?"BN001":"0"} value={item[k]}
                    onChange={e=>setPoItems(items=>items.map((it,idx)=>idx===i?{...it,[k]:e.target.value}:it))}
                    style={{fontSize:12}} />
                ))}
                <input className="input" type="date" value={item.expiryDate}
                  onChange={e=>setPoItems(items=>items.map((it,idx)=>idx===i?{...it,expiryDate:e.target.value}:it))}
                  style={{fontSize:11}} />
                {poItems.length>1 && (
                  <button onClick={()=>setPoItems(items=>items.filter((_,idx)=>idx!==i))}
                    style={{width:32,height:38,background:"#fef2f2",border:"none",borderRadius:8,cursor:"pointer",color:"#ef4444",fontSize:16}}>×</button>
                )}
              </div>
            ))}
            <button className="btn-secondary" style={{fontSize:12,marginBottom:14}} onClick={()=>setPoItems(i=>[...i,{medicineId:"",name:"",quantity:"",purchasePrice:"",sellingPrice:"",gstPercent:12,batchNumber:"",expiryDate:""}])}>
              + Add Item
            </button>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-primary" style={{flex:1}} onClick={createPO} disabled={saving}>{saving?"Creating...":"Create PO + Update Stock"}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
