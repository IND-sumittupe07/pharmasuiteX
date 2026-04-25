import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const GST_RATES = [0, 5, 12, 18];
const PAYMENT_MODES = ["cash","upi","card","credit","cheque"];
const emptyItem = { name:"", medicineId:"", quantity:1, unitPrice:"", gstPercent:12, hsnCode:"3004" };

export default function InvoicePage() {
  const [tab, setTab]             = useState("create"); // create | list
  const [invoices, setInvoices]   = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);

  // Form state
  const [customerId, setCustomerId]   = useState("");
  const [items, setItems]             = useState([{ ...emptyItem }]);
  const [discount, setDiscount]       = useState(0);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [isGst, setIsGst]             = useState(true);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState("");

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const loadData = useCallback(() => {
    Promise.all([
      api.get("/medicines"),
      api.get("/customers"),
      api.get("/invoice"),
    ]).then(([m, c, inv]) => {
      setMedicines(m.data);
      setCustomers(c.data);
      setInvoices(inv.data);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const setItem = (i, k, v) => {
    setItems(items => items.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [k]: v };
      if (k === "medicineId" && v) {
        const med = medicines.find(m => m.id === v);
        if (med) { updated.name = med.name; updated.unitPrice = med.price_per_unit || ""; updated.hsnCode = med.hsn_code || "3004"; updated.gstPercent = med.gst_percent || 12; }
      }
      return updated;
    }));
  };

  const addItem = () => setItems(i => [...i, { ...emptyItem }]);
  const removeItem = (i) => setItems(items => items.filter((_, idx) => idx !== i));

  // Calculate totals
  const calcTotals = () => {
    let subtotal = 0, gstTotal = 0;
    items.forEach(item => {
      const total = (parseFloat(item.quantity)||0) * (parseFloat(item.unitPrice)||0);
      const gst = (total * (item.gstPercent||0)) / (100 + (item.gstPercent||0));
      subtotal += total - gst;
      gstTotal += gst;
    });
    const disc = parseFloat(discount) || 0;
    return {
      subtotal: subtotal.toFixed(2),
      cgst: (gstTotal/2).toFixed(2),
      sgst: (gstTotal/2).toFixed(2),
      gstTotal: gstTotal.toFixed(2),
      discount: disc.toFixed(2),
      total: (subtotal + gstTotal - disc).toFixed(2),
    };
  };

  const totals = calcTotals();

  const createInvoice = async () => {
    if (!customerId) { showToast("Select a customer", "error"); return; }
    if (items.some(i => !i.name || !i.unitPrice)) { showToast("Fill all item details", "error"); return; }
    setSaving(true);
    try {
      const res = await api.post("/invoice/create", {
        customerId, items, discountAmount: parseFloat(discount)||0,
        paymentMode, prescriptionNumber: prescriptionNo, isGstInvoice: isGst,
      });
      showToast(`✅ Invoice ${res.data.invoiceNumber} created!`);
      setCustomerId(""); setItems([{...emptyItem}]); setDiscount(0); setPrescriptionNo("");
      loadData(); setTab("list");
    } catch(e) { showToast(e.response?.data?.error || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const downloadPDF = (id, invoiceNumber) => {
    const token = localStorage.getItem("medtrack_token");
    const url = `${process.env.REACT_APP_API_URL||"/api"}/invoice/${id}/pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `Invoice-${invoiceNumber}.pdf`;
        a.click();
      });
  };

  const filtered = invoices.filter(inv =>
    !search || inv.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Tabs */}
      <div style={{display:"flex",gap:8}}>
        {[["create","➕ New Invoice"],["list","🧾 Invoice History"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:"10px 20px",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,
              background:tab===id?"linear-gradient(135deg,#2563eb,#1d4ed8)":"#f1f5f9",
              color:tab===id?"white":"#64748b"}}>
            {label}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16,alignItems:"start"}}>
          {/* Left — form */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Customer + Invoice type */}
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1e293b",marginBottom:14}}>🧾 Invoice Details</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Customer *</label>
                  <select className="input" value={customerId} onChange={e=>setCustomerId(e.target.value)}>
                    <option value="">Select customer...</option>
                    {customers.map(c=><option key={c.id} value={c.id}>{c.full_name} — {c.mobile}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Payment Mode</label>
                  <select className="input" value={paymentMode} onChange={e=>setPaymentMode(e.target.value)}>
                    {PAYMENT_MODES.map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Prescription No. (optional)</label>
                  <input className="input" placeholder="Rx-12345" value={prescriptionNo} onChange={e=>setPrescriptionNo(e.target.value)} />
                </div>
                <div style={{display:"flex",alignItems:"flex-end",gap:10,paddingBottom:2}}>
                  <button onClick={()=>setIsGst(!isGst)}
                    style={{padding:"10px 16px",border:`1.5px solid ${isGst?"#2563eb":"#e2e8f0"}`,borderRadius:10,
                      background:isGst?"#eff6ff":"white",color:isGst?"#2563eb":"#64748b",
                      fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                    {isGst?"✅ GST Invoice":"📄 Cash Memo"}
                  </button>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1e293b",marginBottom:14}}>💊 Items</div>
              {items.map((item,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 100px 100px 80px 80px 40px",gap:8,marginBottom:10,alignItems:"end"}}>
                  <div>
                    {i===0 && <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",display:"block",marginBottom:4}}>MEDICINE</label>}
                    <select className="input" value={item.medicineId} onChange={e=>setItem(i,"medicineId",e.target.value)} style={{fontSize:13}}>
                      <option value="">Select medicine...</option>
                      {medicines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    {i===0 && <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",display:"block",marginBottom:4}}>QTY</label>}
                    <input className="input" type="number" min="1" value={item.quantity} onChange={e=>setItem(i,"quantity",e.target.value)} style={{fontSize:13}} />
                  </div>
                  <div>
                    {i===0 && <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",display:"block",marginBottom:4}}>PRICE ₹</label>}
                    <input className="input" type="number" placeholder="0.00" value={item.unitPrice} onChange={e=>setItem(i,"unitPrice",e.target.value)} style={{fontSize:13}} />
                  </div>
                  <div>
                    {i===0 && <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",display:"block",marginBottom:4}}>GST%</label>}
                    <select className="input" value={item.gstPercent} onChange={e=>setItem(i,"gstPercent",parseInt(e.target.value))} style={{fontSize:13}}>
                      {GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div>
                    {i===0 && <label style={{fontSize:11,fontWeight:700,color:"#94a3b8",display:"block",marginBottom:4}}>TOTAL</label>}
                    <div style={{padding:"10px 12px",background:"#f8fafc",borderRadius:10,fontSize:13,fontWeight:700,color:"#1e293b"}}>
                      ₹{((parseFloat(item.quantity)||0)*(parseFloat(item.unitPrice)||0)).toFixed(0)}
                    </div>
                  </div>
                  <div style={{paddingTop:i===0?20:0}}>
                    {items.length>1 && (
                      <button onClick={()=>removeItem(i)}
                        style={{width:36,height:38,background:"#fef2f2",border:"none",borderRadius:8,cursor:"pointer",color:"#ef4444",fontSize:16}}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="btn-secondary" style={{fontSize:13,marginTop:4}}>+ Add Item</button>
            </div>
          </div>

          {/* Right — summary */}
          <div style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:16}}>
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1e293b",marginBottom:16}}>💰 Summary</div>
              {[
                ["Subtotal",`₹${totals.subtotal}`],
                isGst && ["CGST",`₹${totals.cgst}`],
                isGst && ["SGST",`₹${totals.sgst}`],
              ].filter(Boolean).map(([l,v],i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:13}}>
                  <span style={{color:"#64748b"}}>{l}</span>
                  <span style={{fontWeight:600,color:"#1e293b"}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:10}}>
                <label style={{fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:5}}>Discount (₹)</label>
                <input className="input" type="number" min="0" value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="0" />
              </div>
              <div style={{marginTop:14,padding:"12px 14px",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"white",fontWeight:700,fontSize:14}}>TOTAL</span>
                <span style={{color:"white",fontWeight:800,fontSize:20}}>₹{totals.total}</span>
              </div>
              <button className="btn-primary" style={{width:"100%",marginTop:14,padding:13,fontSize:15}} onClick={createInvoice} disabled={saving}>
                {saving?"Creating...":"🖨️ Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "list" && (
        <div className="card" style={{overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{invoices.length} Invoices</div>
            <input className="input" placeholder="Search by name or invoice number..." value={search}
              onChange={e=>setSearch(e.target.value)} style={{width:300}} />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th><th>Customer</th><th>Date</th>
                <th>Amount</th><th>GST</th><th>Payment</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv=>(
                <tr key={inv.id}>
                  <td><span style={{fontWeight:700,color:"#2563eb"}}>{inv.invoice_number}</span></td>
                  <td><div style={{fontWeight:600}}>{inv.full_name}</div><div style={{fontSize:11,color:"#94a3b8"}}>{inv.mobile}</div></td>
                  <td style={{color:"#64748b"}}>{new Date(inv.purchase_date).toLocaleDateString("en-IN")}</td>
                  <td><span style={{fontWeight:700,fontSize:15}}>₹{parseFloat(inv.total_amount).toFixed(2)}</span></td>
                  <td><span style={{fontSize:12,color:"#64748b"}}>₹{parseFloat(inv.gst_amount||0).toFixed(2)}</span></td>
                  <td><span style={{background:"#f0fdf4",color:"#16a34a",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{inv.payment_mode}</span></td>
                  <td>
                    <button onClick={()=>downloadPDF(inv.id, inv.invoice_number)}
                      style={{padding:"6px 12px",background:"#eff6ff",border:"none",borderRadius:8,cursor:"pointer",color:"#2563eb",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>
                      📄 PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0 && <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>No invoices found</div>}
        </div>
      )}
    </div>
  );
}
