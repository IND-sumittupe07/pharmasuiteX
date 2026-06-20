import { useState, useEffect } from "react";
import api from "../api/client";
import AddMedicineModal from "../components/AddMedicineModal";

const conditionColor = {
  diabetes: "#3b82f6", hypertension: "#ef4444",
  asthma: "#f59e0b", arthritis: "#8b5cf6",
};

const emptyForm = {
  fullName: "", age: "", gender: "Male", mobile: "",
  address: "", city: "", medicalCondition: "", notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("list"); // list | detail | add | edit
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMed, setEditingMed]     = useState(null);

  // form state (shared by Add + Edit)
  const [form, setForm]     = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/customers");
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetail = async (id) => {
    try {
      const res = await api.get(`/customers/${id}`);
      setSelectedCustomer(res.data);
      setView("detail");
    } catch (err) {
      console.error("Error fetching customer detail:", err);
    }
  };

  const removeMedicine = async (medId) => {
    if (!window.confirm("Stop tracking this medicine?")) return;
    try {
      await api.delete(`/customers/${selectedCustomer.id}/medicines/${medId}`);
      fetchCustomerDetail(selectedCustomer.id);
    } catch {
      alert("Failed to remove medicine");
    }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Open Add form ──────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setView("add");
  };

  // ✅ Open Edit form — pre-filled from selectedCustomer (now functional!)
  const openEdit = () => {
    setForm({
      fullName:         selectedCustomer.full_name || "",
      age:              selectedCustomer.age || "",
      gender:           selectedCustomer.gender || "Male",
      mobile:           selectedCustomer.mobile || "",
      address:          selectedCustomer.address || "",
      city:             selectedCustomer.city || "",
      medicalCondition: selectedCustomer.medical_condition || "",
      notes:            selectedCustomer.notes || "",
    });
    setFormError("");
    setView("edit");
  };

  // ── Save (handles both Add + Edit) ─────────────────────────────
  const saveCustomer = async () => {
    if (!form.fullName.trim()) { setFormError("Full name is required"); return; }
    if (!form.mobile.trim())   { setFormError("Mobile number is required"); return; }

    setSaving(true);
    setFormError("");
    try {
      if (view === "edit") {
        const res = await api.put(`/customers/${selectedCustomer.id}`, form);
        setSelectedCustomer(prev => ({ ...prev, ...res.data }));
        setView("detail");
      } else {
        const res = await api.post("/customers", form);
        await fetchCustomers();
        setView("list");
      }
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--txt4)" }}>Loading customers...</div>;
  }

  // ════════════════════════════════════════════════════════════════
  // ADD / EDIT FORM VIEW — same layout used for both
  // ════════════════════════════════════════════════════════════════
  if (view === "add" || view === "edit") {
    const isEdit = view === "edit";
    return (
      <div className="fade-in" style={{ maxWidth: 640, margin: "0 auto" }}>
        <button
          onClick={() => setView(isEdit ? "detail" : "list")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 600, marginBottom: 16, fontSize: 14 }}
        >
          ← Back
        </button>

        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--txt1)", marginBottom: 4 }}>
            {isEdit ? "✏️ Edit Customer" : "➕ Add New Customer"}
          </div>
          <div style={{ fontSize: 12, color: "var(--txt4)", marginBottom: 24 }}>
            {isEdit ? "Update this customer's details below." : "Fill in the customer's details to add them to your registry."}
          </div>

          {formError && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 18, fontSize: 13,
              background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid #fca5a5",
            }}>
              {formError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            <div style={{ gridColumn: "1/-1" }}>
              <Label text="Full Name *" />
              <input className="input" placeholder="e.g. Rajesh Tope" value={form.fullName} onChange={set("fullName")} />
            </div>

            <div>
              <Label text="Mobile Number *" />
              <input className="input" type="tel" placeholder="10-digit number" value={form.mobile} onChange={set("mobile")} />
            </div>

            <div>
              <Label text="Age" />
              <input className="input" type="number" placeholder="e.g. 45" value={form.age} onChange={set("age")} />
            </div>

            <div>
              <Label text="Gender" />
              <select className="input" value={form.gender} onChange={set("gender")} style={{ background: "var(--input-bg, var(--bg2))", color: "var(--txt1)" }}>
                {["Male", "Female", "Other"].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <Label text="City" />
              <input className="input" placeholder="e.g. Pune" value={form.city} onChange={set("city")} />
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <Label text="Address" />
              <input className="input" placeholder="Full address (optional)" value={form.address} onChange={set("address")} />
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <Label text="Medical Condition" />
              <input className="input" placeholder="e.g. Diabetes, Hypertension" value={form.medicalCondition} onChange={set("medicalCondition")} />
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <Label text="Notes (optional)" />
              <textarea className="input" rows={2} placeholder="Any additional notes..." value={form.notes} onChange={set("notes")} style={{ resize: "none" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={saveCustomer} disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Customer"}
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setView(isEdit ? "detail" : "list")}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // DETAIL VIEW — fixed alignment: equal-height cards, consistent grid
  // ════════════════════════════════════════════════════════════════
  if (view === "detail" && selectedCustomer) {
    return (
      <div className="fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
        <button
          onClick={() => { setView("list"); setSelectedCustomer(null); fetchCustomers(); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 600, marginBottom: 16, fontSize: 14 }}
        >
          ← Back to Customers
        </button>

        {/* ✅ items-start so both columns align to the same top edge,
               and the right column is a flex stack so its two cards
               line up consistently regardless of content length */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>

          {/* LEFT: Profile — fixed width column so it never stretches oddly */}
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72, margin: "0 auto", borderRadius: "50%",
                background: `hsl(${(selectedCustomer.full_name?.charCodeAt(0) || 0) * 5},60%,50%)`,
                color: "white", fontSize: 28, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selectedCustomer.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--txt1)", marginTop: 14 }}>{selectedCustomer.full_name}</div>
              <div style={{ fontSize: 12, color: "var(--txt4)" }}>{selectedCustomer.customer_code}</div>
            </div>

            <div style={{ display: "grid", gap: 13, fontSize: 13, flex: 1 }}>
              <Row label="📱 Mobile"    value={selectedCustomer.mobile} />
              <Row label="🎂 Age"       value={selectedCustomer.age ? `${selectedCustomer.age} years` : "—"} />
              <Row label="👤 Gender"    value={selectedCustomer.gender || "—"} />
              <Row label="🏙️ City"     value={selectedCustomer.city || "—"} />
              <Row label="🏥 Condition" value={selectedCustomer.medical_condition || "—"} />
              {selectedCustomer.address && <Row label="📍 Address" value={selectedCustomer.address} />}
            </div>

            {/* ✅ Edit button is now functional — opens pre-filled form */}
            <button
              onClick={openEdit}
              style={{
                width: "100%", marginTop: 24, padding: "12px 16px",
                background: "var(--primary)", color: "white", border: "none",
                borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              ✏️ Edit Customer
            </button>
          </div>

          {/* RIGHT: Medicines + Purchases — consistent gap, same padding rhythm */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)" }}>💊 Active Medicines</div>
                <button className="btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}
                  onClick={() => { setEditingMed(null); setShowMedModal(true); }}>
                  + Add Medicine
                </button>
              </div>

              {(selectedCustomer.medicines || []).length === 0 ? (
                <EmptyRow text="No medicines tracked yet. Add one to enable refill reminders!" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedCustomer.medicines.map(med => {
                    const daysLeft = med.days_left;
                    const urgent   = daysLeft !== null && daysLeft <= 5 && daysLeft >= 0;
                    const overdue  = daysLeft !== null && daysLeft < 0;
                    return (
                      <div key={med.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px 14px", borderRadius: 10,
                        background: overdue ? "rgba(220,38,38,0.1)" : urgent ? "rgba(245,158,11,0.1)" : "var(--bg3)",
                        border: `1px solid ${overdue ? "#fca5a5" : urgent ? "#fde68a" : "var(--border)"}`,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt1)" }}>{med.medicine_name}</div>
                          <div style={{ fontSize: 11, color: "var(--txt4)" }}>
                            {med.dose || "—"} · Started {new Date(med.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </div>
                          <div style={{
                            fontSize: 11, fontWeight: 700, marginTop: 4,
                            color: overdue ? "#dc2626" : urgent ? "#d97706" : "var(--txt3)",
                          }}>
                            {overdue
                              ? `⚠️ Refill overdue by ${Math.abs(daysLeft)} days`
                              : urgent
                              ? `🔔 Refill due in ${daysLeft} days`
                              : `Refill: ${new Date(med.refill_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => { setEditingMed(med); setShowMedModal(true); }}
                            style={{ padding: "6px 10px", background: "rgba(37,99,235,0.15)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--primary)" }}>
                            ✏️
                          </button>
                          <button onClick={() => removeMedicine(med.id)}
                            style={{ padding: "6px 10px", background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#ef4444" }}>
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)", marginBottom: 18 }}>🧾 Purchase History</div>
              {(selectedCustomer.purchases || []).length === 0 ? (
                <EmptyRow text="No purchases yet" />
              ) : (
                <div>
                  {selectedCustomer.purchases.map((p, i) => (
                    <div key={p.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 0",
                      borderBottom: i < selectedCustomer.purchases.length - 1 ? "1px solid var(--border2)" : "none",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{p.invoice_number}</div>
                        <div style={{ fontSize: 11, color: "var(--txt4)" }}>{new Date(p.purchase_date).toLocaleDateString("en-IN")}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "var(--txt1)" }}>₹{parseFloat(p.total_amount).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showMedModal && (
          <AddMedicineModal
            customerId={selectedCustomer.id}
            editData={editingMed}
            onSaved={() => fetchCustomerDetail(selectedCustomer.id)}
            onClose={() => { setShowMedModal(false); setEditingMed(null); }}
          />
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--txt1)" }}>Customers</div>
        <button className="btn-primary" onClick={openAdd}>+ Add Customer</button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--txt4)" }}>
          {customers.length} customers
        </div>
        <table className="data-table">
          <thead>
            <tr>
              {["Customer", "Mobile", "Age", "Condition", "City", "Medicines", "Refill", "Spend", "Actions"].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const earliestRefill = c.earliest_refill ? new Date(c.earliest_refill) : null;
              const daysLeft = earliestRefill ? Math.ceil((earliestRefill - new Date()) / 86400000) : null;
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => fetchCustomerDetail(c.id)}>
                      <div className="ring" style={{ width: 32, height: 32, background: `hsl(${(c.full_name?.charCodeAt(0)||0)*5},60%,50%)`, color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {c.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--txt1)" }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: "var(--txt4)" }}>{c.customer_code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--txt3)", fontSize: 13 }}>{c.mobile}</td>
                  <td style={{ color: "var(--txt3)", fontSize: 13 }}>{c.age ? `${c.age}y` : "—"}</td>
                  <td>
                    <span className="tag" style={{ background: `${conditionColor[c.medical_condition?.toLowerCase()] || "#64748b"}18`, color: conditionColor[c.medical_condition?.toLowerCase()] || "#64748b" }}>
                      {c.medical_condition || "—"}
                    </span>
                  </td>
                  <td style={{ color: "var(--txt3)", fontSize: 13 }}>{c.city || "—"}</td>
                  <td><span style={{ color: "var(--primary)", fontWeight: 700 }}>{c.medicine_count || 0}</span></td>
                  <td>
                    {daysLeft !== null ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft < 0 ? "#dc2626" : daysLeft <= 5 ? "#d97706" : "var(--txt4)" }}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--primary)", fontSize: 13 }}>₹{parseFloat(c.total_spend || 0).toLocaleString()}</td>
                  <td>
                    <button onClick={() => fetchCustomerDetail(c.id)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 14, color: "var(--txt4)", marginBottom: 16 }}>No customers yet</div>
            <button className="btn-primary" onClick={openAdd}>+ Add First Customer</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--txt3)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--txt1)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Label({ text }) {
  return <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>{text}</label>;
}

function EmptyRow({ text }) {
  return <div style={{ textAlign: "center", padding: 24, color: "var(--txt4)", fontSize: 13 }}>{text}</div>;
}
