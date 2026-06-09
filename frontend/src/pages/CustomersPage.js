import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function CustomersPage() {
  return (
    <Routes>
      <Route path="/" element={<CustomerList />} />
      <Route path="/new" element={<CustomerForm />} />
      <Route path="/:id" element={<CustomerProfile />} />
    </Routes>
  );
}

function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/customers", { params: { search } })
      .then(res => setCustomers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const conditionColor = { Diabetes: "#3b82f6", Hypertension: "#ef4444", Thyroid: "#8b5cf6", Asthma: "#06b6d4", Anemia: "#ec4899" };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <input className="input" placeholder="🔍  Search name, mobile, condition..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <button className="btn-primary" onClick={() => navigate("/customers/new")}>+ Add Customer</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading customers...</div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#94a3b8" }}>
            {customers.length} customers
          </div>
          <table className="data-table">
            <thead>
              <tr>
                {["Customer","Mobile","Age","Condition","Doctor","Last Visit","Spend","Refill"].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const daysLeft = c.earliest_refill
                  ? Math.round((new Date(c.earliest_refill) - new Date()) / 86400000)
                  : null;
                return (
                  <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/customers/${c.id}`)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="ring" style={{ width: 32, height: 32, background: `hsl(${c.full_name.charCodeAt(0) * 5},60%,50%)`, color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {c.full_name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{c.full_name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.customer_code}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "#64748b", fontSize: 13 }}>{c.mobile}</td>
                    <td style={{ color: "#64748b", fontSize: 13 }}>{c.age}y</td>
                    <td>
                      <span className="tag" style={{ background: `${conditionColor[c.medical_condition] || "#64748b"}18`, color: conditionColor[c.medical_condition] || "#64748b" }}>
                        {c.medical_condition || "—"}
                      </span>
                    </td>
                    <td style={{ color: "#64748b", fontSize: 13 }}>{c.doctor_name || "—"}</td>
                    <td style={{ color: "#64748b", fontSize: 13 }}>{c.last_visit ? new Date(c.last_visit).toLocaleDateString("en-IN") : "—"}</td>
                    <td style={{ fontWeight: 700, color: "#2563eb", fontSize: 13 }}>₹{parseFloat(c.total_spend || 0).toLocaleString()}</td>
                    <td>
                      {daysLeft !== null ? (
                        <span className="tag" style={{ background: daysLeft <= 2 ? "#fef2f2" : "#fffbeb", color: daysLeft <= 2 ? "#ef4444" : "#f59e0b" }}>
                          {daysLeft <= 0 ? "Today!" : `${daysLeft}d`}
                        </span>
                      ) : <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              No customers found. <button className="btn-primary" style={{ marginLeft: 8 }} onClick={() => navigate("/customers/new")}>Add First Customer</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", mobile: "", age: "", gender: "Male", city: "", medicalCondition: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api.post("/customers", form);
      navigate(`/customers/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save customer");
    } finally { setLoading(false); }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      <button onClick={() => navigate("/customers")} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
        ← Back to Customers
      </button>
      <div className="card" style={{ padding: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 24 }}>Add New Customer</div>
        {error && <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[["fullName","Full Name","text","e.g. Rahul Sharma",true],["mobile","Mobile Number","tel","10-digit",true],["age","Age","number","e.g. 45",false],["city","City","text","e.g. Pune",false]].map(([k,l,t,p,req]) => (
            <div key={k}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>{l}</label>
              <input className="input" type={t} placeholder={p} value={form[k]} onChange={set(k)} required={req} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Gender</label>
            <select className="input" value={form.gender} onChange={set("gender")}>
              {["Male","Female","Other"].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Medical Condition</label>
            <input className="input" placeholder="e.g. Diabetes" value={form.medicalCondition} onChange={set("medicalCondition")} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Notes</label>
            <textarea className="input" rows={2} placeholder="Any additional notes..." value={form.notes} onChange={set("notes")} style={{ resize: "none" }}></textarea>
          </div>
          <div style={{ gridColumn: "1/-1", display: "flex", gap: 10 }}>
            <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? "Saving..." : "Save Customer"}</button>
            <button className="btn-secondary" type="button" onClick={() => navigate("/customers")} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerProfile() {
  const navigate = useNavigate();
  const id = window.location.pathname.split("/").pop();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addMed, setAddMed] = useState(false);
  const [medForm, setMedForm] = useState({ medicineName: "", category: "", dose: "", durationDays: 30, startDate: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    api.get(`/customers/${id}`).then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const saveMedicine = async () => {
    try {
      await api.post(`/customers/${id}/medicines`, medForm);
      const res = await api.get(`/customers/${id}`);
      setData(res.data); setAddMed(false);
    } catch (err) { alert(err.response?.data?.error || "Failed to add medicine"); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading...</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 60, color: "#ef4444" }}>Customer not found</div>;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => navigate("/customers")} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 600, fontSize: 14, textAlign: "left" }}>
        ← Back to Customers
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        {/* Profile card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="ring" style={{ width: 60, height: 60, background: `hsl(${data.full_name.charCodeAt(0) * 5},60%,50%)`, color: "white", fontSize: 24, fontWeight: 700, margin: "0 auto 12px" }}>
              {data.full_name[0]}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{data.full_name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{data.customer_code}</div>
          </div>
          {[["📱","Mobile",data.mobile],["🎂","Age",`${data.age} yrs`],["⚧","Gender",data.gender],["📍","City",data.city],["🩺","Doctor",data.doctor_name],["🏥","Condition",data.medical_condition],["💰","Total Spent",`₹${parseFloat(data.total_spend).toLocaleString()}`]].map(([icon,label,val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{icon} {label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{val || "—"}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => api.post(`/reminders/send`, { customerId: id, channel: "whatsapp" })}>📲 WhatsApp</button>
            <button className="btn-secondary" style={{ flex: 1, fontSize: 12 }} onClick={() => api.post(`/reminders/send`, { customerId: id, channel: "sms" })}>📱 SMS</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Medicines */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>💊 Current Medicines</div>
              <button className="btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setAddMed(true)}>+ Add Medicine</button>
            </div>
            {(data.medicines || []).map((m, i) => {
              const daysLeft = parseInt(m.days_left) || 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "#f8fafc", borderRadius: 12, marginBottom: 8, border: "1px solid #e2e8f0" }}>
                  <div className="ring" style={{ width: 40, height: 40, background: "#eff6ff", fontSize: 20, flexShrink: 0 }}>💊</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{m.medicine_name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Dose: {m.dose || "—"} · {m.duration_days} days · Started {new Date(m.start_date).toLocaleDateString("en-IN")}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: daysLeft <= 3 ? "#ef4444" : daysLeft <= 7 ? "#f59e0b" : "#10b981" }}>
                      {daysLeft <= 0 ? "Refill Now!" : `${daysLeft}d left`}
                    </div>
                  </div>
                </div>
              );
            })}
            {!data.medicines?.length && <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>No medicines added yet</div>}
          </div>

          {/* Purchase history */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>📋 Purchase History</div>
            {(data.purchases || []).map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{new Date(p.purchase_date).toLocaleDateString("en-IN")}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{p.invoice_number || "—"} · {(p.items || []).length} items</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2563eb" }}>₹{parseFloat(p.total_amount).toLocaleString()}</div>
              </div>
            ))}
            {!data.purchases?.length && <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>No purchases recorded</div>}
          </div>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {addMed && (
        <div className="modal-backdrop" onClick={() => setAddMed(false)}>
          <div className="card fade-in" style={{ padding: 32, width: "100%", maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Add Medicine</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["medicineName","Medicine Name","text","e.g. Metformin 500mg"],["category","Category","text","e.g. Diabetes"],["dose","Dose","text","e.g. 1-0-1"]].map(([k,l,t,p]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{l}</label>
                  <input className="input" type={t} placeholder={p} value={medForm[k]} onChange={e => setMedForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Duration (days)</label>
                  <input className="input" type="number" value={medForm.durationDays} onChange={e => setMedForm(f => ({ ...f, durationDays: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Start Date</label>
                  <input className="input" type="date" value={medForm.startDate} onChange={e => setMedForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveMedicine}>Save Medicine</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setAddMed(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
