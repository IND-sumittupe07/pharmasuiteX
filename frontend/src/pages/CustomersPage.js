import { useState, useEffect } from "react";
import api from "../api/client";
import AddMedicineModal from "../components/AddMedicineModal";
import EditCustomerModal from "../components/EditCustomerModal";

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
  const [showEditModal, setShowEditModal] = useState(false);
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
      <div className="fade-in" style={{ maxWidth: 1400, margin: "0 auto", padding: "20px" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
          {/* Profile Card */}
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
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>{selectedCustomer.full_name}</div>
              <div style={{ fontSize: 12, color: "var(--txt4)" }}>{selectedCustomer.customer_code}</div>
            </div>
            
            <div style={{ display: "grid", gap: 14, fontSize: 13 }}>
              <Row label="📱 Mobile" value={selectedCustomer.mobile} />
              <Row label="🎂 Age" value={selectedCustomer.age ? `${selectedCustomer.age} years` : "—"} />
              <Row label="🏙️ City" value={selectedCustomer.city || "—"} />
              <Row label="🏥 Condition" value={selectedCustomer.medical_condition || "—"} />
            </div>

            <button 
              onClick={() => setShowEditModal(true)}
              style={{ width: "100%", marginTop: 24, padding: "12px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              ✏️ Edit Customer
            </button>
          </div>

          {/* Medicines Section */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>💊 Active Medicines</div>
              <button className="btn-primary" onClick={() => { setEditingMed(null); setShowMedModal(true); }}>+ Add Medicine</button>
            </div>
            {(selectedCustomer.medicines || []).map(med => (
              <div key={med.id} style={{ display: "flex", justifyContent: "space-between", padding: 12, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{med.medicine_name}</div>
                  <div style={{ fontSize: 12, color: "var(--txt4)" }}>{med.dose}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setEditingMed(med); setShowMedModal(true); }}>✏️</button>
                  <button onClick={() => removeMedicine(med.id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modals */}
        {showMedModal && (
          <AddMedicineModal 
            customerId={selectedCustomer.id} 
            editData={editingMed} 
            onSaved={() => fetchCustomerDetail(selectedCustomer.id)} 
            onClose={() => { setShowMedModal(false); setEditingMed(null); }} 
          />
        )}
        {showEditModal && (
          <EditCustomerModal 
            customer={selectedCustomer} 
            onSaved={() => { setShowEditModal(false); fetchCustomerDetail(selectedCustomer.id); }} 
            onClose={() => setShowEditModal(false)} 
          />
        )}
      </div>
    );
  }

  // ── LIST VIEW (Fixed Alignment) ─────────────────────────────────────
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: 24 }}><h2>Customers</h2></div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--txt4)", fontSize: 12 }}>
              <th style={{ width: "20%", padding: 16, textAlign: "left" }}>Customer</th>
              <th style={{ width: "15%", padding: 16, textAlign: "left" }}>Mobile</th>
              <th style={{ width: "8%", padding: 16, textAlign: "left" }}>Age</th>
              <th style={{ width: "12%", padding: 16, textAlign: "left" }}>Condition</th>
              <th style={{ width: "10%", padding: 16, textAlign: "left" }}>City</th>
              <th style={{ width: "8%", padding: 16, textAlign: "left" }}>Meds</th>
              <th style={{ width: "12%", padding: 16, textAlign: "left" }}>Refill</th>
              <th style={{ width: "10%", padding: 16, textAlign: "left" }}>Spend</th>
              <th style={{ width: "5%", padding: 16, textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const daysLeft = c.earliest_refill ? Math.ceil((new Date(c.earliest_refill) - new Date()) / 86400000) : null;
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border2)", fontSize: 13 }}>
                  <td style={{ padding: 16, fontWeight: 600 }}>{c.full_name}</td>
                  <td style={{ padding: 16 }}>{c.mobile}</td>
                  <td style={{ padding: 16 }}>{c.age || "—"}</td>
                  <td style={{ padding: 16 }}>{c.medical_condition || "—"}</td>
                  <td style={{ padding: 16 }}>{c.city || "—"}</td>
                  <td style={{ padding: 16 }}>{c.medicine_count || 0}</td>
                  <td style={{ padding: 16 }}>{daysLeft !== null ? `${daysLeft}d` : "—"}</td>
                  <td style={{ padding: 16 }}>₹{parseFloat(c.total_spend || 0).toLocaleString()}</td>
                  <td style={{ padding: 16 }}>
                    <button onClick={() => fetchCustomerDetail(c.id)} style={{ color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>View</button>
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
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
