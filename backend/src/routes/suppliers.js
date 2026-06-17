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

  const [poForm, setPoForm]       = useState({ supplierId:"", invoiceNumber:"", invoiceDate:"", notes:"" });
  const [poItems, setPoItems]     = useState([{medicineId:"",name:"",quantity:"",purchasePrice:"",sellingPrice:"",batchNumber:"",expiryDate:""}]);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    Promise.all([
      api.get("/suppliers"),
      api.get("/suppliers/purchase-orders"),
      api.get("/medicines"),
    ]).then(([s, po, m]) => { setSuppliers(s.data || []); setOrders(po.data || []); setMedicines(m.data || []); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePOStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await api.put(`/suppliers/purchase-orders/${id}/status`, { status: newStatus });
      showToast(`✅ Status updated to ${newStatus}`);
      load();
    } catch(e) { showToast("Failed to update status", "error"); }
  };

  const saveSupplier = async () => {
    if (!form.name) { showToast("Supplier name required","error"); return; }
    setSaving(true);
    try {
      if (modal === "edit") await api.put(`/suppliers/${selected.id}`, form);
      else await api.post("/suppliers", form);
      showToast("✅ Supplier saved!");
      setModal(null); load();
    } catch(e) { showToast("Failed","error"); }
    finally { setSaving(false); }
  };

  const createPO = async () => {
    if (!poForm.supplierId || poItems.some(i=>!i.quantity)) {
      showToast("Fill required fields","error"); return;
    }
    setSaving(true);
    try {
      await api.post("/suppliers/purchase-orders", { ...poForm, items: poItems });
      showToast("✅ PO Created!");
      setModal(null); load();
    } catch(e) { showToast("Failed","error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in" style={{display:"flex", flexDirection:"column", gap:20, width:"100%"}}>
      {toast && <div style={{position:"fixed",top:20,right:24,background:toast.type==="error"?"#fecaca":"#dcfce7",padding:15,borderRadius:8}}>{toast.msg}</div>}

      <div style={{display:"flex", gap:10}}>
        <button onClick={()=>setTab("suppliers")}>Suppliers</button>
        <button onClick={()=>setTab("orders")}>Orders</button>
        <button onClick={()=>setModal("po")}>+ New PO</button>
      </div>

      {tab === "orders" && (
        <div className="card" style={{overflowX:"auto"}}>
          <table style={{width:"100%"}}>
            <thead><tr><th>PO Number</th><th>Supplier</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.po_number}</td>
                  <td>{o.supplier_name}</td>
                  <td>
                    <button onClick={() => togglePOStatus(o.id, o.payment_status)}
                      style={{background: o.payment_status==="completed" ? "#dcfce7" : "#fef3c7", border:"none", padding:"5px 10px", borderRadius:15, cursor:"pointer"}}>
                      {o.payment_status==="completed" ? "✅ Completed" : "⏳ Pending"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
