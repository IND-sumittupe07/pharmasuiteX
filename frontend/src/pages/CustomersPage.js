import { useState, useEffect } from "react";
import api from "../api/client";
import AddMedicineModal from "../components/AddMedicineModal";

const conditionColor = {
  diabetes: "#3b82f6",
  hypertension: "#ef4444",
  asthma: "#f59e0b",
  arthritis: "#8b5cf6",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

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

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--txt4)" }}>
        Loading customers...
      </div>
    );
  }

  // ── DETAIL VIEW ──────────────────────────────────────────────────────
  if (view === "detail" && selectedCustomer) {
    return (
      <div className="fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
        <button
          onClick={() => {
            setView("list");
            setSelectedCustomer(null);
            fetchCustomers();
          }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--primary)", fontWeight: 600, marginBottom: 16, fontSize: 14
          }}
        >
          ← Back to Customers
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
          {/* LEFT: Profile */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 80, height: 80, margin: "0 auto", borderRadius: "50%",
                background: `hsl(${(selectedCustomer.full_name?.charCodeAt(0) || 0) * 5},60%,50%)`,
                color: "white", fontSize: 32, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selectedCustomer.full_name?.[0] || "?"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--txt1)", marginTop: 16 }}>
                {selectedCustomer.full_name}
              </div>
              <div style={{ fontSize: 12, color: "var(--txt4)" }}>{selectedCustomer.customer_code}</div>
            </div>

            <div style={{ display: "grid", gap: 14, fontSize: 13 }}>
              <Row label="📱 Mobile" value={selectedCustomer.mobile} />
              <Row label="🎂 Age" value={selectedCustomer.age ? `${selectedCustomer.age} years` : "—"} />
              <Row label="👤 Gender" value={selectedCustomer.gender || "—"} />
              <Row label="🏙️ City" value={selectedCustomer.city || "—"} />
              <Row label="🏥 Condition" value={selectedCustomer.medical_condition || "—"} />
              <Row label="🩺 Doctor" value={selectedCustomer.doctor_name || "—"} />
            </div>

            <button onClick={() => {}}
              style={{
                width: "100%", marginTop: 24, padding: "12px 16px",
                background: "var(--primary)", color: "white", border: "none",
                borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>
              ✏️ Edit Customer
            </button>
          </div>

          {/* RIGHT: Medicines + Purchases */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)" }}>💊 Active Medicines</div>
                <button className="btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}
                  onClick={() => { setEditingMed(null); setShowMedModal(true); }}>
                  + Add Medicine
                </button>
              </div>

              {(selectedCustomer.medicines || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--txt4)", fontSize: 13 }}>
                  No medicines tracked yet.
                </div>
              ) : (
                selectedCustomer.medicines.map(med => {
                  const daysLeft = med.days_left;
                  const urgent = daysLeft !== null && daysLeft <= 5;
                  const overdue = daysLeft !== null && daysLeft < 0;
                  return (
                    <div key={med.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", borderRadius: 10, marginBottom: 8,
                      background: overdue ? "rgba(220,38,38,0.1)" : urgent ? "rgba(245,158,11,0.1)" : "var(--bg3)",
                      border: `1px solid ${overdue ? "#fca5a5" : urgent ? "#fde68a" : "var(--border)"}`,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt1)" }}>{med.medicine_name}</div>
                        <div style={{ fontSize: 11, color: "var(--txt4)" }}>{med.dose || "—"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setEditingMed(med); setShowMedModal(true); }} style={{ padding: "6px 10px", background: "rgba(37,99,235,0.15)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--primary)" }}>✏️</button>
                        <button onClick={() => removeMedicine(med.id)} style={{ padding: "6px 10px", background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#ef4444" }}>🗑</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)", marginBottom: 16 }}>🧾 Purchase History</div>
              {(selectedCustomer.purchases || []).map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border2)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{p.invoice_number}</div>
                    <div style={{ fontSize: 11, color: "var(--txt4)" }}>{new Date(p.purchase_date).toLocaleDateString("en-IN")}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--txt1)" }}>₹{parseFloat(p.total_amount).toFixed(2)}</div>
                </div>
              ))}
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

  // ── LIST VIEW (FIXED ALIGNMENT) ──────────────────────────────────────
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--txt1)" }}>Customers</div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--txt4)", fontSize: 12 }}>
              <th style={{ width: "22%", padding: "16px", textAlign: "left" }}>Customer</th>
              <th style={{ width: "12%", padding: "16px", textAlign: "left" }}>Mobile</th>
              <th style={{ width: "6%", padding: "16px", textAlign: "left" }}>Age</th>
              <th style={{ width: "12%", padding: "16px", textAlign: "left" }}>Condition</th>
              <th style={{ width: "10%", padding: "16px", textAlign: "left" }}>City</th>
              <th style={{ width: "8%", padding: "16px", textAlign: "left" }}>Meds</th>
              <th style={{ width: "12%", padding: "16px", textAlign: "left" }}>Refill</th>
              <th style={{ width: "10%", padding: "16px", textAlign: "left" }}>Spend</th>
              <th style={{ width: "8%", padding: "16px", textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const earliestRefill = c.earliest_refill ? new Date(c.earliest_refill) : null;
              const daysLeft = earliestRefill ? Math.ceil((earliestRefill - new Date()) / 86400000) : null;
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border2)", fontSize: 13 }}>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => fetchCustomerDetail(c.id)}>
                      <div className="ring" style={{ width: 32, height: 32, background: `hsl(${(c.full_name?.charCodeAt(0)||0)*5},60%,50%)`, color: "white", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>
                        {c.full_name?.[0] || "?"}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--txt1)" }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: "var(--txt4)" }}>{c.customer_code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px", color: "var(--txt3)" }}>{c.mobile}</td>
                  <td style={{ padding: "16px", color: "var(--txt3)" }}>{c.age ? `${c.age}y` : "—"}</td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ padding: "4px 8px", borderRadius: "4px", background: `${conditionColor[c.medical_condition?.toLowerCase()] || "#64748b"}18`, color: conditionColor[c.medical_condition?.toLowerCase()] || "#64748b" }}>
                      {c.medical_condition || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "16px", color: "var(--txt3)" }}>{c.city || "—"}</td>
                  <td style={{ padding: "16px", fontWeight: 700, color: "var(--primary)" }}>{c.medicine_count || 0}</td>
                  <td style={{ padding: "16px" }}>
                    {daysLeft !== null ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft < 0 ? "#dc2626" : daysLeft <= 5 ? "#d97706" : "var(--txt4)" }}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "16px", fontWeight: 700, color: "var(--primary)" }}>₹{parseFloat(c.total_spend || 0).toLocaleString()}</td>
                  <td style={{ padding: "16px" }}>
                    <button onClick={() => fetchCustomerDetail(c.id)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
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
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--txt3)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--txt1)" }}>{value}</span>
    </div>
  );
}
