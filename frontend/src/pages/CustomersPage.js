import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCustomers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);

    api.get(`/customers?${params}`)
      .then((res) => setCustomers(res.data))
      .catch(() => showToast("Failed to load customers", "error"))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", height: "100%", boxSizing: "border-box" }}>
      
      {/* Toast Alert Notification */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 100, padding: "14px 20px", borderRadius: 12,
          background: toast.type === "error" ? "rgba(239, 68, 68, 0.15)" : "var(--bg2)",
          border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#bbf7d0"}`,
          color: toast.type === "error" ? "#dc2626" : "#16a34a",
          fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {toast.msg}
        </div>
      )}

      {/* Action Toolbar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", width: "100%" }}>
        <input 
          className="input" 
          placeholder="🔍 Search customers by name or phone..." 
          value={search}
          onChange={e => setSearch(e.target.value)} 
          style={{ flex: 1, minWidth: 260, height: 42, boxSizing: "border-box" }} 
        />
        <button className="btn-primary" style={{ whiteSpace: "nowrap", height: 42, padding: "0 20px" }}>
          + New Customer
        </button>
      </div>

      {/* Main Table Container Card */}
      <div className="card" style={{ width: "100%", overflowX: "auto", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt1)" }}>
            {customers.length} {customers.length === 1 ? "Customer" : "Customers"} Registered
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--txt4)", fontSize: 14 }}>Loading customer directory...</div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--txt1)", marginBottom: 6 }}>No profiles found</div>
            <div style={{ fontSize: 13, color: "var(--txt4)" }}>Try adjusting your search criteria or register a new customer profile.</div>
          </div>
        ) : (
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--table-head)" }}>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 160 }}>Profile Info</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 130 }}>Contact Details</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 120 }}>Join Date</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 100 }}>Status</th>
                <th style={{ color: "var(--txt4)", padding: "14px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 140, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 700, color: "var(--txt1)", fontSize: 14 }}>{c.name}</div>
                    {c.age && <div style={{ fontSize: 11, color: "var(--txt4)", marginTop: 2 }}>Age: {c.age} · {c.gender || "N/A"}</div>}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ color: "var(--txt2)", fontSize: 13, fontWeight: 500 }}>{c.phone || "—"}</div>
                    {c.email && <div style={{ fontSize: 11, color: "var(--txt4)", marginTop: 2 }}>{c.email}</div>}
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--txt3)", fontSize: 13, fontWeight: 500 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      Active
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button style={{ padding: "6px 12px", background: "rgba(37, 99, 235, 0.12)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#2563eb", fontFamily: "inherit" }}>
                        ✏️ Edit
                      </button>
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
