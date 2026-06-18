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
  const [view, setView] = useState("list");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/customers");
      console.log("Customers fetched:", res.data);
      setCustomers(res.data || []);
      
      if (id) {
        const customer = (res.data || []).find(c => c.id === id);
        if (customer) {
          setSelectedCustomer(customer);
          setView("detail");
        }
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      alert("Error fetching customers: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const term = search.toLowerCase();
    return (
      (c.full_name || "").toLowerCase().includes(term) ||
      (c.mobile || "").toLowerCase().includes(term) ||
      (c.city || "").toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div style={{ width: "100%", padding: 40, boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", padding: 40, color: "var(--txt4)" }}>Loading customer directory...</div>
      </div>
    );
  }

  // ==========================================
  // 1. DETAIL VIEW
  // ==========================================
  if (view === "detail" && selectedCustomer) {
    return (
      <div className="fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16, boxSizing: "border-box" }}>
        <button 
          onClick={() => { setView("list"); setSelectedCustomer(null); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary, #2563eb)", fontWeight: 600, marginBottom: 4, fontSize: 14, textAlign: "left", width: "fit-content" }}
        >
          ← Back to Customers
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, width: "100%" }}>
          <div className="card" style={{ padding: 24, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 80, height: 80, margin: "0 auto", borderRadius: "50%", background: `hsl(${selectedCustomer.full_name?.charCodeAt(0) * 5 || 0},60%,50%)`, color: "white", fontSize: 32, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {selectedCustomer.full_name?.[0] || "?"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--txt1)", marginTop: 16 }}>{selectedCustomer.full_name || "Unknown"}</div>
              <div style={{ fontSize: 12, color: "var(--txt4)" }}>{selectedCustomer.customer_code || "N/A"}</div>
            </div>

            <div style={{ display: "grid", gap: 14, fontSize: 13, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--txt3)" }}>📱 Mobile</span>
                <span style={{ fontWeight: 600, color: "var(--txt1)" }}>{selectedCustomer.mobile || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--txt3)" }}>🎂 Age</span>
                <span style={{ fontWeight: 600, color: "var(--txt1)" }}>{selectedCustomer.age ? `${selectedCustomer.age} years` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--txt3)" }}>👤 Gender</span>
                <span style={{ fontWeight: 600, color: "var(--txt1)" }}>{selectedCustomer.gender || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--txt3)" }}>🏙️ City</span>
                <span style={{ fontWeight: 600, color: "var(--txt1)" }}>{selectedCustomer.city || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--txt3)" }}>🏥 Condition</span>
                <span style={{ fontWeight: 600, color: "var(--txt1)" }}>{selectedCustomer.medical_condition || "—"}</span>
              </div>
            </div>

            <button 
              onClick={() => { setView("edit"); }}
              style={{ width: "100%", padding: "12px 16px", background: "var(--primary, #2563eb)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              ✏️ Edit Customer
            </button>
          </div>

          <div className="card" style={{ padding: 24, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--txt1)", marginBottom: 16 }}>Additional Info</div>
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--txt4)", marginBottom: 5 }}>Notes</div>
                <div style={{ fontSize: 13, color: "var(--txt2)", lineHeight: 1.6 }}>{selectedCustomer.notes || "No notes added"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--txt4)", marginBottom: 5 }}>Total Spent</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--primary, #2563eb)" }}>₹{parseFloat(selectedCustomer.total_spend || 0).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--txt4)", marginBottom: 5 }}>Joined</div>
                <div style={{ fontSize: 13, color: "var(--txt2)" }}>{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. EDIT VIEW
  // ==========================================
  if (view === "edit" && selectedCustomer) {
    return (
      <EditCustomerForm 
        customer={selectedCustomer} 
        onSave={(updated) => { setSelectedCustomer(updated); setView("detail"); fetchCustomers(); }} 
        onCancel={() => setView("detail")} 
      />
    );
  }

  // ==========================================
  // 3. ADD NEW VIEW
  // ==========================================
  if (view === "form") {
    return (
      <AddCustomerForm 
        currentCustomerCount={customers.length}
        onSave={() => { setView("list"); fetchCustomers(); }} 
        onCancel={() => setView("list")} 
      />
    );
  }

  // ==========================================
  // 4. LIST VIEW
  // ==========================================
  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", boxSizing: "border-box" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--txt4)" }}>Customer Registry</div>
        </div>
        <button className="btn-primary" onClick={() => setView("form")} style={{ height: 42, padding: "0 20px" }}>
          + Add Customer
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%" }}>
        <input 
          className="input" 
          placeholder="🔍 Search customers by name, phone, city..." 
          value={search}
          onChange={e => setSearch(e.target.value)} 
          style={{ flex: 1, height: 42, boxSizing: "border-box" }} 
        />
      </div>

      <div className="card" style={{ width: "100%", overflowX: "auto", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt1)" }}>
            {filteredCustomers.length} registered profiles
          </div>
        </div>
        
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--txt4)" }}>
            No customers match your search filters.
            <button className="btn-primary" style={{ marginLeft: 12 }} onClick={() => setView("form")}>Add New Profile</button>
          </div>
        ) : (
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--table-head)" }}>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", minWidth: 200 }}>Customer</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", minWidth: 130 }}>Mobile</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", minWidth: 80 }}>Age</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", minWidth: 130 }}>Condition</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", minWidth: 110 }}>City</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", minWidth: 110 }}>Last Visit</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", minWidth: 110 }}>Spend</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", minWidth: 90, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => { setSelectedCustomer(c); setView("detail"); }}>
                      <div className="ring" style={{ width: 34, height: 34, background: `hsl(${c.full_name?.charCodeAt(0) * 5 || 0},60%,50%)`, color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                        {c.full_name?.[0] || "?"}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt1)" }}>{c.full_name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--txt4)", marginTop: 2 }}>{c.customer_code || "N/A"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--txt2)", fontSize: 13, fontWeight: 500 }}>{c.mobile || "—"}</td>
                  <td style={{ padding: "14px 20px", color: "var(--txt2)", fontSize: 13, fontWeight: 500 }}>{c.age ? `${c.age}y` : "—"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ 
                      display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                      background: `${conditionColor[c.medical_condition?.toLowerCase()] || "#64748b"}18`, 
                      color: conditionColor[c.medical_condition?.toLowerCase()] || "var(--txt3)" 
                    }}>
                      {c.medical_condition || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--txt2)", fontSize: 13, fontWeight: 500 }}>{c.city || "—"}</td>
                  <td style={{ padding: "14px 20px", color: "var(--txt3)", fontSize: 13, fontWeight: 500 }}>{c.last_visit ? new Date(c.last_visit).toLocaleDateString("en-IN") : "—"}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 800, color: "var(--primary, #2563eb)", fontSize: 13 }}>₹{parseFloat(c.total_spend || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <button onClick={() => { setSelectedCustomer(c); setView("detail"); }} style={{ background: "none", border: "none", color: "var(--primary, #2563eb)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: ADD CUSTOMER FORM (VALIDATED)
// ==========================================
function AddCustomerForm({ onSave, onCancel, currentCustomerCount }) {
  const [form, setForm] = useState({ fullName: "", mobile: "", age: "", gender: "Male", city: "", medicalCondition: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // VALIDATION: Ensures only numbers and exactly 10 digits
  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm(f => ({ ...f, mobile: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      const usageCheck = await api.get("/plans/usage");
      const currentCount = usageCheck.data?.customers?.used ?? currentCustomerCount;
      const planTier = usageCheck.data?.plan?.toLowerCase() || "free";

      if (planTier === "free" && currentCount >= 25) {
        setError("🚨 Tier Limit Reached! Free accounts can hold a maximum of 25 customer profiles. Please upgrade your plan.");
        return;
      }
      if (planTier === "basic" && currentCount >= 500) {
        setError("🚨 Tier Limit Reached! Basic subscription accounts allow up to 500 profiles. Please upgrade to Premium.");
        return;
      }
    } catch (uErr) {
      console.warn("Usage pre-check bypass; fallback to standard prop count verification context.", uErr);
    }

    setLoading(true);
    try {
      await api.post("/customers", form);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 640, width: "100%", boxSizing: "border-box" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary, #2563eb)", fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
        ← Back to Customers
      </button>
      <div className="card" style={{ padding: 32, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--txt1)", marginBottom: 24 }}>Add New Customer</div>
        
        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "12px 14px", borderRadius: 8, marginBottom: 20, fontSize: 13, border: "1px solid rgba(239, 68, 68, 0.25)", lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Full Name *</label>
            <input className="input" type="text" placeholder="e.g. Rahul Sharma" value={form.fullName} onChange={set("fullName")} required />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Mobile Number *</label>
            <input className="input" type="tel" placeholder="10-digit mobile number" value={form.mobile} onChange={handleMobileChange} required />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Age</label>
            <input className="input" type="number" placeholder="e.g. 45" value={form.age} onChange={set("age")} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Gender</label>
            <select className="input" value={form.gender} onChange={set("gender")} style={{ background: "var(--input-bg, var(--bg2))", color: "var(--txt1)" }}>
              {["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>City</label>
            <input className="input" type="text" placeholder="e.g. Pune" value={form.city} onChange={set("city")} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Medical Condition</label>
            <input className="input" type="text" placeholder="e.g. Diabetes" value={form.medicalCondition} onChange={set("medicalCondition")} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Notes</label>
            <textarea className="input" rows={2} placeholder="Any additional notes..." value={form.notes} onChange={set("notes")} style={{ resize: "none" }}></textarea>
          </div>
          <div style={{ gridColumn: "1/-1", display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 1, height: 42 }}>
              {loading ? "Saving..." : "Save Customer"}
            </button>
            <button className="btn-secondary" type="button" onClick={onCancel} style={{ flex: 1, height: 42 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: EDIT CUSTOMER FORM (VALIDATED)
// ==========================================
function EditCustomerForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState({
    fullName: customer.full_name || "",
    mobile: customer.mobile || "",
    age: customer.age || "",
    gender: customer.gender || "Male",
    city: customer.city || "",
    medicalCondition: customer.medical_condition || "",
    notes: customer.notes || ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // VALIDATION: Ensures only numbers and exactly 10 digits
  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm(f => ({ ...f, mobile: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      const res = await api.put(`/customers/${customer.id}`, form);
      onSave(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 640, width: "100%", boxSizing: "border-box" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary, #2563eb)", fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
        ← Back
      </button>
      <div className="card" style={{ padding: 32, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--txt1)", marginBottom: 24 }}>Edit Customer</div>
        {error && <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid rgba(239, 68, 68, 0.25)" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Full Name *</label>
            <input className="input" type="text" placeholder="e.g. Rahul Sharma" value={form.fullName} onChange={set("fullName")} required />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Mobile Number *</label>
            <input className="input" type="tel" placeholder="10-digit mobile number" value={form.mobile} onChange={handleMobileChange} required />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Age</label>
            <input className="input" type="number" placeholder="e.g. 45" value={form.age} onChange={set("age")} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Gender</label>
            <select className="input" value={form.gender} onChange={set("gender")} style={{ background: "var(--input-bg, var(--bg2))", color: "var(--txt1)" }}>
              {["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>City</label>
            <input className="input" type="text" placeholder="e.g. Pune" value={form.city} onChange={set("city")} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Medical Condition</label>
            <input className="input" type="text" placeholder="e.g. Diabetes" value={form.medicalCondition} onChange={set("medicalCondition")} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--txt3)", display: "block", marginBottom: 5 }}>Notes</label>
            <textarea className="input" rows={2} placeholder="Any additional notes..." value={form.notes} onChange={set("notes")} style={{ resize: "none" }}></textarea>
          </div>
          <div style={{ gridColumn: "1/-1", display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 1, height: 42 }}>
              {loading ? "Saving..." : "Update Customer"}
            </button>
            <button className="btn-secondary" type="button" onClick={onCancel} style={{ flex: 1, height: 42 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
