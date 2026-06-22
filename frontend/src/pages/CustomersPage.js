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
  const [view, setView]           = useState("list"); // list | detail
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMed, setEditingMed]     = useState(null);

  // customer add/edit modal state
  const [showCustModal, setShowCustModal] = useState(false);
  const [custForm, setCustForm]           = useState(emptyForm);
  const [custSaving, setCustSaving]       = useState(false);
  const [custError, setCustError]         = useState("");
  const [isEditingCust, setIsEditingCust] = useState(false);

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

  // ── Open "Add Customer" modal (from list view) ──────────────────────
  const openAddCustomer = () => {
    setCustForm(emptyForm);
    setIsEditingCust(false);
    setCustError("");
    setShowCustModal(true);
  };

  // "Edit Customer" — opens same form, prefilled
  const openEditCustomer = () => {
    setCustForm({
      fullName:         selectedCustomer.full_name || "",
      age:              selectedCustomer.age || "",
      gender:           selectedCustomer.gender || "Male",
      mobile:           selectedCustomer.mobile || "",
      address:          selectedCustomer.address || "",
      city:             selectedCustomer.city || "",
      medicalCondition: selectedCustomer.medical_condition || "",
      notes:            selectedCustomer.notes || "",
    });
    setIsEditingCust(true);
    setCustError("");
    setShowCustModal(true);
  };

  const setField = k => e => setCustForm(f => ({ ...f, [k]: e.target.value }));

  const saveCustomer = async () => {
    if (!custForm.fullName.trim()) { setCustError("Full name is required"); return; }
    if (!custForm.mobile.trim())   { setCustError("Mobile number is required"); return; }

    setCustSaving(true);
    setCustError("");
    try {
      if (isEditingCust) {
        await api.put(`/customers/${selectedCustomer.id}`, custForm);
        await fetchCustomerDetail(selectedCustomer.id);
      } else {
        await api.post("/customers", custForm);
        await fetchCustomers();
      }
      setShowCustModal(false);
    } catch (err) {
      setCustError(err.response?.data?.error || "Failed to save customer");
    } finally {
      setCustSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--txt4)" }}>Loading customers...</div>;
  }

  // ════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════════════════════════════
  if (view === "detail" && selectedCustomer) {
    const medicines = selectedCustomer.medicines || [];
    const purchases = selectedCustomer.purchases || [];

    return (
      <div className="fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
        <button
          onClick={() => { setView("list"); setSelectedCustomer(null); fetchCustomers(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--primary)", fontWeight: 600, marginBottom: 16, fontSize: 14,
            display: "flex", alignItems: "center", gap: 6, padding: 0,
          }}
        >
          ← Back to Customers
        </button>

        {/* Aligned 2-column grid: fixed-width profile card + flexible right column */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>

          {/* ───── LEFT: Profile card ───── */}
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 80, height: 80, margin: "0 auto", borderRadius: "50%",
                background: `hsl(${(selectedCustomer.full_name?.charCodeAt(0) || 0) * 5},60%,50%)`,
                color: "white", fontSize: 32, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selectedCustomer.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--txt1)", marginTop: 16 }}>
                {selectedCustomer.full_name}
              </div>
              <div style={{ fontSize: 12, color: "var(--txt4)" }}>{selectedCustomer.customer_code}</div>
            </div>

            <div style={{ display: "grid", gap: 14, fontSize: 13, flex: 1 }}>
              <Row label="📱 Mobile"    value={selectedCustomer.mobile} />
              <Row label="🎂 Age"       value={selectedCustomer.age ? `${selectedCustomer.age} years` : "—"} />
              <Row label="👤 Gender"    value={selectedCustomer.gender || "—"} />
              <Row label="🏙️ City"      value={selectedCustomer.city || "—"} />
              <Row label="🏥 Condition" value={selectedCustomer.medical_condition || "—"} />
              <Row label="🩺 Doctor"    value={selectedCustomer.doctor_name || "—"} />
              <Row label="📍 Address"   value={selectedCustomer.address || "—"} />
              {selectedCustomer.notes && (
                <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--txt3)", fontSize: 11, marginBottom: 4 }}>📝 Notes</div>
                  <div style={{ color: "var(--txt1)", fontSize: 12.5, lineHeight: 1.5 }}>{selectedCustomer.notes}</div>
                </div>
              )}
            </div>

            <button
              onClick={openEditCustomer}
              style={{
                width: "100%", marginTop: 24, padding: "12px 16px",
                background: "var(--primary)", color: "white", border: "none",
                borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              ✏️ Edit Customer
            </button>
          </div>

          {/* ───── RIGHT: Medicines + Purchases ───── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

            {/* Active Medicines */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)" }}>💊 Active Medicines</div>
                <button
                  className="btn-primary"
                  style={{ fontSize: 12, padding: "8px 14px" }}
                  onClick={() => { setEditingMed(null); setShowMedModal(true); }}
                >
                  + Add Medicine
                </button>
              </div>

              {medicines.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--txt4)", fontSize: 13 }}>
                  No medicines tracked yet. Add one to enable refill reminders!
                </div>
              ) : (
                /* Equal-height responsive grid instead of stacked blocks of uneven height */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                  {medicines.map(med => {
                    const daysLeft = med.days_left;
                    const urgent   = daysLeft !== null && daysLeft <= 5 && daysLeft >= 0;
                    const overdue  = daysLeft !== null && daysLeft < 0;
                    return (
                      <div
                        key={med.id}
                        style={{
                          display: "flex", flexDirection: "column", justifyContent: "space-between",
                          padding: "14px", borderRadius: 10, minHeight: 96,
                          background: overdue ? "rgba(220,38,38,0.10)" : urgent ? "rgba(245,158,11,0.10)" : "var(--bg3)",
                          border: `1px solid ${overdue ? "#fca5a5" : urgent ? "#fde68a" : "var(--border)"}`,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt1)", lineHeight: 1.3 }}>
                              {med.medicine_name}
                            </div>
                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                              <IconBtn onClick={() => { setEditingMed(med); setShowMedModal(true); }} color="var(--primary)" bg="rgba(37,99,235,0.15)">✏️</IconBtn>
                              <IconBtn onClick={() => removeMedicine(med.id)} color="#ef4444" bg="rgba(239,68,68,0.15)">🗑</IconBtn>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--txt4)", marginTop: 4 }}>
                            {med.dose || "No dose set"} · Started {new Date(med.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, marginTop: 8,
                          color: overdue ? "#dc2626" : urgent ? "#d97706" : "var(--txt3)",
                        }}>
                          {overdue
                            ? `⚠️ Refill overdue by ${Math.abs(daysLeft)}d`
                            : urgent
                            ? `🔔 Refill due in ${daysLeft}d`
                            : daysLeft === 0
                            ? `🔔 Refill due today`
                            : `Refill: ${new Date(med.refill_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Purchase History */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)", marginBottom: 16 }}>🧾 Purchase History</div>
              {purchases.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--txt4)", fontSize: 13 }}>No purchases yet</div>
              ) : (
                purchases.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border2)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{p.invoice_number}</div>
                      <div style={{ fontSize: 11, color: "var(--txt4)" }}>{new Date(p.purchase_date).toLocaleDateString("en-IN")}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--txt1)" }}>₹{parseFloat(p.total_amount).toFixed(2)}</div>
                  </div>
                ))
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

        {showCustModal && (
          <CustomerFormModal
            form={custForm}
            setField={setField}
            isEditing={isEditingCust}
            saving={custSaving}
            error={custError}
            onSave={saveCustomer}
            onClose={() => setShowCustModal(false)}
          />
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--txt1)" }}>Customers</div>
        <button className="btn-primary" onClick={openAddCustomer}>+ Add Customer</button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--txt4)" }}>
          {customers.length} customers
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: 220 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 80 }} />
            </colgroup>
            <thead>
              <tr>
                {["Customer", "Mobile", "Age", "Condition", "City", "Medicines", "Refill", "Spend", "Actions"].map(h => (
                  <th key={h} style={cellStyle({ header: true })}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const earliestRefill = c.earliest_refill ? new Date(c.earliest_refill) : null;
                const daysLeft = earliestRefill ? Math.ceil((earliestRefill - new Date()) / 86400000) : null;
                return (
                  <tr key={c.id}>
                    <td style={cellStyle()}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => fetchCustomerDetail(c.id)}>
                        <div className="ring" style={{
                          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                          background: `hsl(${(c.full_name?.charCodeAt(0) || 0) * 5},60%,50%)`,
                          color: "white", fontWeight: 700, fontSize: 13,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {c.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--txt1)", whiteSpace: "nowrap" }}>{c.full_name}</div>
                          <div style={{ fontSize: 11, color: "var(--txt4)" }}>{c.customer_code}</div>
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle({ color: "var(--txt3)" })}>{c.mobile}</td>
                    <td style={cellStyle({ color: "var(--txt3)" })}>{c.age ? `${c.age}y` : "—"}</td>
                    <td style={cellStyle()}>
                      <span className="tag" style={{
                        display: "inline-block",
                        background: `${conditionColor[c.medical_condition?.toLowerCase()] || "#64748b"}18`,
                        color: conditionColor[c.medical_condition?.toLowerCase()] || "#64748b",
                      }}>
                        {c.medical_condition || "—"}
                      </span>
                    </td>
                    <td style={cellStyle({ color: "var(--txt3)" })}>{c.city || "—"}</td>
                    <td style={cellStyle()}><span style={{ color: "var(--primary)", fontWeight: 700 }}>{c.medicine_count || 0}</span></td>
                    <td style={cellStyle()}>
                      {daysLeft !== null ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft < 0 ? "#dc2626" : daysLeft <= 5 ? "#d97706" : "var(--txt4)" }}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={cellStyle({ fontWeight: 700, color: "var(--primary)" })}>₹{parseFloat(c.total_spend || 0).toLocaleString()}</td>
                    <td style={cellStyle()}>
                      <button onClick={() => fetchCustomerDetail(c.id)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 }}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Consistent padding/alignment for every table header + cell ─────────
function cellStyle({ header = false, color, fontWeight } = {}) {
  return {
    padding: "12px 16px",
    textAlign: "left",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontSize: header ? 12 : 13,
    fontWeight: header ? 700 : (fontWeight || 400),
    color: header ? "var(--txt4)" : (color || "var(--txt2)"),
    textTransform: header ? "uppercase" : "none",
    letterSpacing: header ? 0.3 : 0,
  };
}

// ── Small aligned label/value row ──────────────────────────────────────
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--txt3)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--txt1)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ── Small square icon button (used in medicine cards) ──────────────────
function IconBtn({ children, onClick, color, bg }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
        background: bg, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, color,
      }}
    >
      {children}
    </button>
  );
}

// ── Reusable form field — keeps label/input spacing identical everywhere ─
function Field({ label, required, full, children }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>
