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

  // NEW: Function to toggle status
  const togglePOStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "pending" ? "completed" : "pending";
    try {
      await api.put(`/suppliers/purchase-orders/${id}/status`, { status: newStatus });
      showToast(`✅ PO status updated to ${newStatus}`);
      load();
    } catch(e) { showToast("Failed to update status", "error"); }
  };

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
      showToast(`✅ PO ${res.data.poNumber} created!`);
      setModal(null); load();
    } catch(e) { showToast(e.response?.data?.error||"Failed","error"); }
    finally { setSaving(false); }
  };

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  return (
    <div className="fade-in" style={{display:"flex", flexDirection:"column", gap:20, width:"100%", boxSizing:"border-box"}}>
      
      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,
          background:toast.type==="error"?"rgba(239, 68, 68, 0.15)":"var(--bg2)",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a",fontWeight:600,fontSize:14,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, width:"100%"}}>
        <div style={{display:"flex", gap:4, background:"var(--border)", borderRadius:12, padding:4}}>
          {[["suppliers","🏭 Suppliers"],["orders","📋 Purchase Orders"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)}
              style={{padding:"9px 16px", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:13,
                background:tab===v?"var(--bg1)":"transparent", color:tab===v?"var(--primary, #2563eb)":"var(--txt3)"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn-secondary" style={{height:40}} onClick={()=>{setModal("po");}}>📋 New PO</button>
          <button className="btn-primary" style={{height:40}} onClick={()=>{setForm(emptyForm);setModal("add");}}>+ Add Supplier</button>
        </div>
      </div>

      {tab==="suppliers" && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:16, width:"100%"}}>
          {suppliers.map(s=>(
            <div key={s.id} className="card" style={{padding:20, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
              <div style={{fontSize:15, fontWeight:700, color:"var(--txt1)"}}>{s.name}</div>
              <div style={{fontSize:12, color:"var(--txt4)", marginTop:4}}>{s.mobile}</div>
              <button onClick={()=>deleteSupplier(s.id)} style={{marginTop:10, color:"#ef4444", background:"none", border:"none", cursor:"pointer"}}>🗑 Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab==="orders" && (
        <div className="card" style={{width:"100%", overflowX:"auto", background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
          <table className="data-table" style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"var(--table-head)"}}>
                <th style={{padding:15, color:"var(--txt4)"}}>PO Number</th>
                <th style={{padding:15, color:"var(--txt4)"}}>Supplier</th>
                <th style={{padding:15, color:"var(--txt4)"}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:15}}>{o.po_number}</td>
                  <td style={{padding:15}}>{o.supplier_name}</td>
                  <td style={{padding:15}}>
                    {/* NEW: Clickable Status Button */}
                    <button 
                      onClick={() => togglePOStatus(o.id, o.payment_status)} 
                      style={{
                        background: o.payment_status==="completed" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: o.payment_status==="completed" ? "#10b981" : "#d97706",
                        padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:700,
                        border:"none", cursor:"pointer", textTransform:"uppercase"
                      }}>
                      {o.payment_status==="completed" ? "✅ Completed" : "⏳ Pending (Click to complete)"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* ... (Keep your existing Modals below) ... */}
    </div>
  );
}
