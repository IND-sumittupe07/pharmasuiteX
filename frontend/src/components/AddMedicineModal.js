import { useState, useEffect } from "react";
import api from "../api/client";

// ════════════════════════════════════════════════════════════════════════
// Add/Edit Medicine Modal — for a specific customer (powers Refills Due)
// Usage: <AddMedicineModal customerId={customer.id} onSaved={() => reload()} onClose={() => setOpen(false)} editData={null} />
// ════════════════════════════════════════════════════════════════════════

export default function AddMedicineModal({ customerId, onSaved, onClose, editData = null }) {
  const [medicines, setMedicines] = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const [form, setForm] = useState({
    medicineName: editData?.medicine_name || "",
    category:     editData?.category || "",
    dose:         editData?.dose || "",
    quantity:     editData?.quantity || 1,
    durationDays: editData?.duration_days || 30,
    startDate:    editData?.start_date ? editData.start_date.split("T")[0] : new Date().toISOString().split("T")[0],
    doctorId:     editData?.doctor_id || "",
  });

  useEffect(() => {
    api.get("/medicines").then(r => setMedicines(r.data || [])).catch(() => {});
    api.get("/medicines/doctors").then(r => setDoctors(r.data || [])).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Auto-fill category when medicine selected from dropdown
  const handleMedicineSelect = (name) => {
    setForm(f => ({ ...f, medicineName: name }));
    const med = medicines.find(m => m.name === name);
    if (med && med.category) {
      setForm(f => ({ ...f, medicineName: name, category: med.category }));
    }
  };

  const refillPreview = () => {
    if (!form.startDate || !form.durationDays) return null;
    const start = new Date(form.startDate);
    const refill = new Date(start);
    refill.setDate(refill.getDate() + parseInt(form.durationDays));
    return refill.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleSave = async () => {
    if (!form.medicineName.trim()) { setError("Medicine name is required"); return; }
    if (!form.durationDays || form.durationDays <= 0) { setError("Duration must be greater than 0 days"); return; }
    if (!form.startDate) { setError("Start date is required"); return; }

    setSaving(true);
    setError("");
    try {
      if (editData) {
        await api.put(`/customers/${customerId}/medicines/${editData.id}`, form);
      } else {
        await api.post(`/customers/${customerId}/medicines`, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save medicine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card fade-in" style={{
        padding: 32, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
        background: "var(--bg2)", border: "1px solid var(--border)",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--txt1)", marginBottom: 4 }}>
          {editData ? "✏️ Edit Medicine" : "💊 Add Medicine to Customer"}
        </div>
        <div style={{ fontSize: 12, color: "var(--txt4)", marginBottom: 20 }}>
          This creates a refill tracking entry — used for reminders &amp; dashboard analytics.
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid #fca5a5",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>
              Medicine Name *
            </label>
            <input
              className="input"
              list="medicine-suggestions"
              placeholder="e.g. Metformin 500mg"
              value={form.medicineName}
              onChange={e => handleMedicineSelect(e.target.value)}
            />
            <datalist id="medicine-suggestions">
              {medicines.map(m => <option key={m.id} value={m.name} />)}
            </datalist>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>
              Category
            </label>
            <input className="input" placeholder="e.g. Diabetes" value={form.category} onChange={set("category")} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>
              Dose
            </label>
            <input className="input" placeholder="e.g. 1 tab twice daily" value={form.dose} onChange={set("dose")} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>
              Quantity
            </label>
            <input className="input" type="number" min="1" value={form.quantity} onChange={set("quantity")} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>
              Doctor (optional)
            </label>
            <select className="input" value={form.doctorId} onChange={set("doctorId")}
              style={{ background: "var(--input-bg, var(--bg2))", color: "var(--txt1)" }}>
              <option value="">No doctor</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>
              Start Date *
            </label>
            <input className="input" type="date" value={form.startDate} onChange={set("startDate")}
              style={{ background: "var(--input-bg, var(--bg2))", color: "var(--txt1)" }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--txt3)", display: "block", marginBottom: 5 }}>
              Duration (days) *
            </label>
            <input className="input" type="number" min="1" placeholder="30" value={form.durationDays} onChange={set("durationDays")} />
          </div>

          {refillPreview() && (
            <div style={{
              gridColumn: "1/-1", padding: "10px 14px", borderRadius: 8,
              background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)",
              fontSize: 13, color: "var(--txt1)",
            }}>
              🔔 Refill reminder will trigger around: <strong style={{ color: "var(--primary)" }}>{refillPreview()}</strong>
              <span style={{ color: "var(--txt4)" }}> (5 days before completion)</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editData ? "Update Medicine" : "Add Medicine"}
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
