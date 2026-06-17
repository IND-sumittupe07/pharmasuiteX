import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const GST_RATES = [0, 5, 12, 18];
const PAYMENT_MODES = ["cash","upi","card","credit","cheque"];
const emptyItem = { name:"", medicineId:"", quantity:1, unitPrice:"", gstPercent:12, hsnCode:"3004" };

export default function InvoicePage() {
  const [tab, setTab]             = useState("create");
  const [invoices, setInvoices]   = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);

  const [customerId, setCustomerId]         = useState("");
  const [items, setItems]                   = useState([{ ...emptyItem }]);
  const [discount, setDiscount]             = useState(0);
  const [paymentMode, setPaymentMode]       = useState("cash");
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [isGst, setIsGst]                   = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [search, setSearch]                 = useState("");

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),4000);
  };

  const loadData = useCallback(() => {
    Promise.all([
      api.get("/medicines"),
      api.get("/customers"),
      api.get("/invoice"),
    ]).then(([m, c, inv]) => {
      setMedicines(m.data || []);
      setCustomers(c.data || []);
      setInvoices(inv.data || []);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const setItem = (i, k, v) => {
    setItems(items => items.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [k]: v };
      if (k === "medicineId" && v) {
        const med = medicines.find(m => m.id === v);
        if (med) {
          updated.name = med.name;
          updated.unitPrice = med.price_per_unit || "";
          updated.hsnCode = med.hsn_code || "3004";
          updated.gstPercent = isGst ? (med.gst_percent || 12) : 0;
        }
      }
      return updated;
    }));
  };

  const addItem = () => setItems(i => [...i, { ...emptyItem, gstPercent: isGst ? 12 : 0 }]);
  const removeItem = (i) => setItems(items => items.filter((_, idx) => idx !== i));

  const calcTotals = () => {
    let subtotal = 0, gstTotal = 0;
    items.forEach(item => {
      const qty   = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const lineTotal = qty * price;

      if (isGst && item.gstPercent > 0) {
        const gst = (lineTotal * item.gstPercent) / (100 + item.gstPercent);
        subtotal += lineTotal - gst;
        gstTotal += gst;
      } else {
        subtotal += lineTotal;
      }
    });

    const disc = parseFloat(discount) || 0;
    const total = subtotal + gstTotal - disc;

    return {
      subtotal:  subtotal.toFixed(2),
      cgst:      (gstTotal / 2).toFixed(2),
      sgst:      (gstTotal / 2).toFixed(2),
      gstTotal:  gstTotal.toFixed(2),
      discount:  disc.toFixed(2),
      total:     total.toFixed(2),
    };
  };

  const totals = calcTotals();

  const handleGstToggle = () => {
    const nextGstState = !isGst;
    setIsGst(nextGstState);
    setItems(currentItems => currentItems.map(item => ({
      ...item,
      gstPercent: nextGstState ? (medicines.find(m => m.id === item.medicineId)?.gst_percent || 12) : 0
    })));
  };

  const createInvoice = async () => {
    if (!customerId) { showToast("Select a customer", "error"); return; }
    if (items.some(i => !i.name || !i.unitPrice)) { showToast("Fill all item details", "error"); return; }
    setSaving(true);
    try {
      const res = await api.post("/invoice/create", {
        customerId,
        items: items.map(item => ({
          ...item,
          gstPercent: isGst ? item.gstPercent : 0,
        })),
        discountAmount:    parseFloat(discount) || 0,
        paymentMode,
        prescriptionNumber: prescriptionNo,
        isGstInvoice:      isGst,
      });
      showToast(`✅ Invoice ${res.data.invoiceNumber} created!`);
      setCustomerId("");
      setItems([{...emptyItem}]);
      setDiscount(0);
      setPrescriptionNo("");
      loadData();
      setTab("list");
    } catch(e) {
      showToast(e.response?.data?.error || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = (id, invoiceNumber) => {
    const token = localStorage.getItem("pharmasuitex_token");
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
    !search ||
    inv.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in" style={{display:"flex", flexDirection:"column", gap:20, width:"100%", boxSizing:"border-box"}}>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,
          background: toast.type==="error" ? "rgba(239, 68, 68, 0.15)" : "var(--bg2)",
          border:`1px solid ${toast.type==="error" ? "#fca5a5" : "#bbf7d0"}`,
          color: toast.type==="error" ? "#dc2626" : "#16a34a",
          fontWeight:600,fontSize:14,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"
        }}>
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex", gap:6, background:"var(--border)", borderRadius:12, padding:4, width:"max-content"}}>
        {[["create","➕ New Invoice"],["list","🧾 Invoice History"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{
              padding:"9px 20px", border:"none", borderRadius:8, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600, fontSize:13,
              background: tab===id ? "var(--bg1)" : "transparent",
              color:       tab===id ? "var(--primary)" : "var(--txt3)",
              boxShadow:   tab===id ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div style={{display:"grid", gridTemplateColumns:"1fr 340px", gap:20, alignItems:"start", width:"100%"}}>

          {/* LEFT — Form */}
          <div style={{display:"flex", flexDirection:"column", gap:16}}>

            {/* Invoice Details */}
            <div className="card" style={{padding:20, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
              <div style={{fontSize:14, fontWeight:700, color:"var(--txt1)", marginBottom:16}}>🧾 Invoice Details</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:14}}>
                <div>
                  <label style={{fontSize:12, fontWeight:700, color:"var(--txt3)", display:"block", marginBottom:5}}>Customer *</label>
                  <select className="input" value={customerId} onChange={e=>setCustomerId(e.target.value)} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                    <option value="">Select customer...</option>
                    {customers.map(c=><option key={c.id} value={c.id}>{c.full_name} — {c.mobile}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12, fontWeight:700, color:"var(--txt3)", display:"block", marginBottom:5}}>Payment Mode</label>
                  <select className="input" value={paymentMode} onChange={e=>setPaymentMode(e.target.value)} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                    {PAYMENT_MODES.map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12, fontWeight:700, color:"var(--txt3)", display:"block", marginBottom:5}}>Prescription No. (optional)</label>
                  <input className="input" placeholder="Rx-12345" value={prescriptionNo} onChange={e=>setPrescriptionNo(e.target.value)} style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
                </div>

                <div style={{display:"flex", alignItems:"flex-end", paddingBottom:2}}>
                  <button type="button" onClick={handleGstToggle}
                    style={{
                      padding:"10px 18px",
                      border:`1.5px solid ${isGst ? "var(--primary)" : "var(--border)"}`,
                      borderRadius:10,
                      background: isGst ? "rgba(37, 99, 235, 0.15)" : "transparent",
                      color:       isGst ? "var(--primary)" : "var(--txt3)",
                      fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit",
                      transition:"all 0.2s", width:"100%", height:40
                    }}>
                    {isGst ? "✅ GST Invoice (ON)" : "📄 Cash Memo (GST OFF)"}
                  </button>
                </div>
              </div>

              {/* GST Info Banner */}
              {!isGst ? (
                <div style={{
                  marginTop:14, padding:"10px 14px", borderRadius:8,
                  background:"rgba(245, 158, 11, 0.12)", border:"1px solid #fde68a",
                  color:"#d97706", fontSize:12, fontWeight:600
                }}>
                  ⚠️ GST is OFF — No CGST/SGST will be added to this invoice.
                </div>
              ) : (
                <div style={{
                  marginTop:14, padding:"10px 14px", borderRadius:8,
                  background:"rgba(16, 185, 129, 0.12)", border:"1px solid #bbf7d0",
                  color:"#10b981", fontSize:12, fontWeight:600
                }}>
                  ✅ GST is ON — CGST + SGST will be calculated automatically.
                </div>
              )}
            </div>

            {/* Items Grid Card */}
            <div className="card" style={{padding:20, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
              <div style={{fontSize:14, fontWeight:700, color:"var(--txt1)", marginBottom:16}}>💊 Medicine Items</div>
              
              {items.map((item,i)=>(
                <div key={i} style={{
                  display:"grid",
                  // FIXED: Enforce absolute uniform grid columns regardless of theme toggle state
                  gridTemplateColumns: "2fr 90px 100px 95px 100px 40px",
                  gap:10, marginBottom:12, alignItems:"center"
                }}>
                  <div>
                    {i===0 && <label style={{fontSize:11, fontWeight:700, color:"var(--txt4)", display:"block", marginBottom:6}}>MEDICINE</label>}
                    <select className="input" value={item.medicineId} onChange={e=>setItem(i,"medicineId",e.target.value)} style={{fontSize:13, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}}>
                      <option value="">Select medicine...</option>
                      {medicines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    {i===0 && <label style={{fontSize:11, fontWeight:700, color:"var(--txt4)", display:"block", marginBottom:6}}>QTY</label>}
                    <input className="input" type="number" min="1" value={item.quantity}
                      onChange={e=>setItem(i,"quantity",e.target.value)} style={{fontSize:13, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
                  </div>
                  <div>
                    {i===0 && <label style={{fontSize:11, fontWeight:700, color:"var(--txt4)", display:"block", marginBottom:6}}>PRICE ₹</label>}
                    <input className="input" type="number" placeholder="0.00" value={item.unitPrice}
                      onChange={e=>setItem(i,"unitPrice",e.target.value)} style={{fontSize:13, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
                  </div>

                  {/* FIXED: Keep element inside grid DOM structure but flag it disabled and grayed out if GST is off */}
                  <div>
                    {i===0 && <label style={{fontSize:11, fontWeight:700, color:"var(--txt4)", display:"block", marginBottom:6}}>GST%</label>}
                    <select 
                      className="input" 
                      value={isGst ? item.gstPercent : 0}
                      disabled={!isGst} 
                      onChange={e=>setItem(i,"gstPercent",parseInt(e.target.value))} 
                      style={{fontSize:13, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)", opacity: isGst ? 1 : 0.5}}
                    >
                      {isGst ? (
                        GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)
                      ) : (
                        <option value="0">0%</option>
                      )}
                    </select>
                  </div>

                  <div>
                    {i===0 && <label style={{fontSize:11, fontWeight:700, color:"var(--txt4)", display:"block", marginBottom:6}}>TOTAL</label>}
                    <div style={{
                      padding:"10px 12px", background:"var(--border)",
                      borderRadius:10, fontSize:13, fontWeight:700, color:"var(--txt1)", height:38, display:"flex", alignItems:"center"
                    }}>
                      ₹{((parseFloat(item.quantity)||0)*(parseFloat(item.unitPrice)||0)).toFixed(2)}
                    </div>
                  </div>

                  <div style={{marginTop: i===0 ? 22 : 0}}>
                    {items.length>1 && (
                      <button onClick={()=>removeItem(i)}
                        style={{width:38, height:38, background:"rgba(239, 68, 68, 0.1)", border:"none", borderRadius:10,
                          cursor:"pointer", color:"#ef4444", fontSize:18, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center"}}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="btn-secondary" style={{fontSize:13, marginTop:6, height:36}}>
                + Add Item Row
              </button>
            </div>
          </div>

          {/* RIGHT — Summary Panel */}
          <div style={{display:"flex", flexDirection:"column", gap:14, position:"sticky", top:16}}>
            <div className="card" style={{padding:20, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
              <div style={{fontSize:14, fontWeight:700, color:"var(--txt1)", marginBottom:16}}>💰 Order Summary</div>

              <div style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border)", fontSize:13}}>
                <span style={{color:"var(--txt3)"}}>Subtotal</span>
                <span style={{fontWeight:700, color:"var(--txt1)"}}>₹{totals.subtotal}</span>
              </div>

              {isGst && parseFloat(totals.gstTotal) > 0 && (
                <>
                  <div style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border)", fontSize:13}}>
                    <span style={{color:"var(--txt3)"}}>CGST</span>
                    <span style={{fontWeight:700, color:"var(--txt1)"}}>₹{totals.cgst}</span>
                  </div>
                  <div style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border)", fontSize:13}}>
                    <span style={{color:"var(--txt3)"}}>SGST</span>
                    <span style={{fontWeight:700, color:"var(--txt1)"}}>₹{totals.sgst}</span>
                  </div>
                </>
              )}

              {!isGst && (
                <div style={{padding:"8px 0", borderBottom:"1px solid var(--border)", fontSize:12, color:"#d97706", fontWeight:600}}>
                  📄 Cash Memo — No GST Applied
                </div>
              )}

              <div style={{marginTop:12}}>
                <label style={{fontSize:12, fontWeight:700, color:"var(--txt3)", display:"block", marginBottom:5}}>
                  Discount Value (₹)
                </label>
                <input className="input" type="number" min="0" value={discount}
                  onChange={e=>setDiscount(e.target.value)} placeholder="0" style={{background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
              </div>

              {parseFloat(discount) > 0 && (
                <div style={{display:"flex", justifyContent:"space-between", padding:"8px 0", fontSize:13, marginTop:4}}>
                  <span style={{color:"#ef4444", fontWeight:600}}>Discount</span>
                  <span style={{fontWeight:700, color:"#ef4444"}}>- ₹{totals.discount}</span>
                </div>
              )}

              <div style={{
                marginTop:16, padding:"14px 16px",
                background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
                borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center"
              }}>
                <div>
                  <div style={{color:"white", fontWeight:700, fontSize:13}}>NET PAYABLE</div>
                  {isGst && (
                    <div style={{color:"rgba(255,255,255,0.7)", fontSize:10, marginTop:2}}>
                      incl. GST ₹{totals.gstTotal}
                    </div>
                  )}
                </div>
                <span style={{color:"white", fontWeight:800, fontSize:22}}>₹{totals.total}</span>
              </div>

              <button className="btn-primary" style={{width:"100%", marginTop:14, padding:13, fontSize:15, height:44}}
                onClick={createInvoice} disabled={saving}>
                {saving ? "Creating Bill..." : "🖨️ Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "list" && (
        <div className="card" style={{width:"100%", overflowX:"auto", background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:12}}>
          <div style={{
            padding:"16px 20px", borderBottom:"1px solid var(--border)",
            display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12
          }}>
            <div style={{fontSize:14, fontWeight:700, color:"var(--txt1)"}}>{filtered.length} Invoices Found</div>
            <input className="input" placeholder="Search by name or invoice number..."
              value={search} onChange={e=>setSearch(e.target.value)} style={{width:320, background:"var(--input-bg, var(--bg2))", color:"var(--txt1)"}} />
          </div>
          
          <table className="data-table" style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
            <thead>
              <tr style={{background:"var(--table-head)"}}>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Invoice No.</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Customer</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Date</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Amount</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>GST Tax</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Payment</th>
                <th style={{color:"var(--txt4)", padding:"14px 20px", fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv=>(
                <tr key={inv.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"14px 20px"}}><span style={{fontWeight:700, color:"var(--primary)"}}>{inv.invoice_number}</span></td>
                  <td style={{padding:"14px 20px"}}>
                    <div style={{fontWeight:700, color:"var(--txt1)"}}>{inv.full_name}</div>
                    <div style={{fontSize:11, color:"var(--txt4)", marginTop:2}}>{inv.mobile}</div>
                  </td>
                  <td style={{padding:"14px 20px", color:"var(--txt3)"}}>
                    {new Date(inv.purchase_date).toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"})}
                  </td>
                  <td style={{padding:"14px 20px"}}><span style={{fontWeight:700, fontSize:15, color:"var(--txt1)"}}>₹{parseFloat(inv.total_amount).toFixed(2)}</span></td>
                  <td style={{padding:"14px 20px"}}><span style={{fontSize:13, color:"var(--txt3)"}}>₹{parseFloat(inv.gst_amount||0).toFixed(2)}</span></td>
                  <td style={{padding:"14px 20px"}}>
                    <span style={{
                      background:"rgba(16, 185, 129, 0.15)", color:"#10b981",
                      padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, textTransform:"uppercase"
                    }}>
                      {inv.payment_mode}
                    </span>
                  </td>
                  <td style={{padding:"14px 20px"}}>
                    <button onClick={()=>downloadPDF(inv.id, inv.invoice_number)}
                      style={{
                        padding:"6px 14px", background:"var(--border)", border:"none", borderRadius:8,
                        cursor:"pointer", color:"var(--primary)", fontWeight:700, fontSize:12, fontFamily:"inherit"
                      }}>
                      📄 PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0 && (
            <div style={{textAlign:"center", padding:48, color:"var(--txt4)"}}>
              No invoices found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
