import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";

const conditionColor = {
  diabetes: "#3b82f6",
  hypertension: "#ef4444",
  asthma: "#f59e0b",
  arthritis: "#8b5cf6",
};

export default function CustomersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(id ? "detail" : "list");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
      if (id) {
        const customer = res.data.find(c => c.id === id);
        if (customer) setSelectedCustomer(customer);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setView("edit");
  };

  if (view === "list") {
    return (
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>Customers</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Welcome back, Sumit Type</div>
          </div>
          <button className="btn-primary" onClick={() => { setView("form"); setSelectedCustomer(null); }}>+ Add Customer</button>
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
                  {["Customer", "Mobile", "Age", "Condition", "City", "Last Visit", "Spend", "Actions"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const daysLeft = c.earliest_refill ? Math.round((new Date(c.earliest_refill) - new Date()) / 86400000) : null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => { setSelectedCustomer(c); setView("detail"); }}>
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
                        <span className="tag" style={{ background: `${conditionColor[c.medical_condition?.toLowerCase()] || "#64748b"}18`, color: conditionColor[c.medical_condition?.toLowerCase()] || "#64748b" }}>
                          {c.medical_condition || "—"}
                        </span>
                      </td>
                      <td style={{ color: "#64748b", fontSize: 13 }}>{c.city || "—"}</td>
                      <td style={{ color: "#64748b", fontSize: 13 }}>{c.last_visit ? new Date(c.last_visit).toLocaleDateString("en-IN") : "—"}</td>
                      <td style={{ fontWeight: 700, color: "#2563eb", fontSize: 13 }}>₹{parseFloat(c.total_spend || 0).toLocaleString()}</td>
                      <td>
                        <button onClick={() => { setSelectedCustomer(c); setView("detail"); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (view === "detail" && selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} onEdit={() => setView("edit")} onBack={() => { setView("list"); setSelectedCustomer(null); }} />;
  }

  if (view === "edit" && selectedCustomer) {
    return <CustomerForm customer={selectedCustomer} onSave={(updated) => { setSelectedCustomer(updated); setView("detail"); fetchCustomers(); }} onCancel={() => setView("detail")} />;
  }

  if (view === "form") {
    return <CustomerForm customer={null} onSave={() => { setView("list"); fetchCustomers(); }} onCancel={() => setView("list")} />;
  }
}

// Customer Detail View with EDIT button
function CustomerDetail({ customer, onEdit, onBack }) {
  return (
    <div className="fade-in">
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
        ← Back to Customers
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
        {/* Left: Profile Card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 80, height: 80, margin: "0 auto", borderRadius: "50%", background: `hsl(${customer.full_name.charCodeAt(0) * 5},60%,50%)`, color: "white", fontSize: 32, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {customer.full_name[0]}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginTop: 16 }}>{customer.full_name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{customer.customer_code}</div>
          </div>

          <div style={{ display: "grid", gap: 14, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>📱 Mobile</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>{customer.mobile}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>🎂 Age</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>{customer.age} years</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>👤 Gender</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>{customer.gender || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>🏙️ City</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>{customer.city || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>🏥 Condition</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>{customer.medical_condition || "—"}</span>
            </div>
          </div>

          {/* EDIT BUTTON */}
          <button 
            onClick={onEdit}
            style={{
              width: "100%",
              marginTop: 24,
              padding: "12px 16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer"
            }}
          >
            ✏️ Edit Customer
          </button>
        </div>

        {/* Right: Additional Info */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>Additional Info</div>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 5 }}>Notes</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{customer.notes || "No notes added"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 5 }}>Total Spent</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>₹{parseFloat(customer.total_spend || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit/Add Customer Form
function CustomerForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState(customer ? {
    fullName: customer.full_name || "",
    mobile: customer.mobile || "",
    age: customer.age || "",
    gender: customer.gender || "Male",
    city: customer.city || "",
    medicalCondition: customer.medical_condition || "",
    notes: customer.notes || ""
  } : {
    fullName: "",
    mobile: "",
    age: "",
    gender: "Male",
    city: "",
    medicalCondition: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (customer) {
        // Update existing customer
        await api.put(`/customers/${customer.id}`, form);
      } else {
        // Add new customer
        await api.post("/customers", form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
        ← Back
      </button>
      <div className="card" style={{ padding: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 24 }}>
          {customer ? "Edit Customer" : "Add New Customer"}
        </div>
        {error && <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            ["fullName", "Full Name", "text", "e.g. Rahul Sharma", true],
            ["mobile", "Mobile Number", "tel", "10-digit", true],
            ["age", "Age", "number", "e.g. 45", false],
            ["city", "City", "text", "e.g. Pune", false]
          ].map(([k, l, t, p, req]) => (
            <div key={k}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>{l}</label>
              <input className="input" type={t} placeholder={p} value={form[k]} onChange={set(k)} required={req} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Gender</label>
            <select className="input" value={form.gender} onChange={set("gender")}>
              {["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}
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
            <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Saving..." : customer ? "Update Customer" : "Save Customer"}
            </button>
            <button className="btn-secondary" type="button" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
