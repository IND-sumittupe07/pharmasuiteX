import { useState, useEffect } from "react";
import api from "../api/client";

export default function SuppliersPage() {
  const [tab, setTab] = useState("suppliers");
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);

  const loadData = async () => {
    try {
      const [sRes, oRes] = await Promise.all([
        api.get("/api/suppliers"),
        api.get("/api/suppliers/purchase-orders")
      ]);
      setSuppliers(sRes.data || []);
      setOrders(oRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggle = async (id, current) => {
    const next = current === "completed" ? "pending" : "completed";
    try {
      await api.put(`/api/suppliers/purchase-orders/${id}/status`, { status: next });
      loadData(); // Refresh list to show new color/text
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <button onClick={() => setTab("suppliers")} style={{ padding: "10px 20px", cursor: "pointer", background: tab === "suppliers" ? "#e0e7ff" : "#f3f4f6", border: "none", borderRadius: "6px" }}>Suppliers</button>
          <button onClick={() => setTab("orders")} style={{ padding: "10px 20px", marginLeft: "10px", cursor: "pointer", background: tab === "orders" ? "#e0e7ff" : "#f3f4f6", border: "none", borderRadius: "6px" }}>Orders</button>
        </div>
        <button onClick={() => alert("Open New PO Modal")} style={{ padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>+ New PO</button>
      </div>

      {/* Main Table Area */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "left" }}>
              {tab === "suppliers" ? 
                <th style={{ padding: "15px" }}>Supplier Name</th> : 
                <><th style={{ padding: "15px" }}>PO Number</th><th style={{ padding: "15px" }}>Status</th></>
              }
            </tr>
          </thead>
          <tbody>
            {tab === "suppliers" ? (
              suppliers.map(s => <tr key={s.id} style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "15px" }}>{s.name}</td></tr>)
            ) : (
              orders.map(o => (
                <tr key={o.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "15px" }}>{o.po_number}</td>
                  <td style={{ padding: "15px" }}>
                    <button 
                      onClick={() => toggle(o.id, o.payment_status)}
                      style={{
                        padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "12px",
                        background: o.payment_status === "completed" ? "#dcfce7" : "#fef3c7",
                        color: o.payment_status === "completed" ? "#166534" : "#92400e"
                      }}>
                      {o.payment_status === "completed" ? "✅ Completed" : "⏳ Pending"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
