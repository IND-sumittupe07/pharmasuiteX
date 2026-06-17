import { useState, useEffect } from "react";
import api from "../api/client";

export default function SuppliersPage() {
  const [orders, setOrders] = useState([]);

  const load = async () => {
    try {
      const res = await api.get("/suppliers/purchase-orders");
      setOrders(res.data || []);
    } catch (err) { console.error("Error loading POs"); }
  };

  useEffect(() => { load(); }, []);

  const togglePOStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await api.put(`/suppliers/purchase-orders/${id}/status`, { status: newStatus });
      load(); // Refresh data immediately
    } catch(e) { alert("Failed to update status"); }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px" }}>Purchase Orders</h2>
      
      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ padding: "15px" }}>PO Number</th>
              <th style={{ padding: "15px" }}>Supplier</th>
              <th style={{ padding: "15px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "15px" }}>{o.po_number}</td>
                <td style={{ padding: "15px" }}>{o.supplier_name || "N/A"}</td>
                <td style={{ padding: "15px" }}>
                  <button 
                    onClick={() => togglePOStatus(o.id, o.payment_status)}
                    style={{
                      cursor: "pointer",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: "none",
                      fontWeight: "600",
                      background: o.payment_status === "completed" ? "#dcfce7" : "#fef3c7",
                      color: o.payment_status === "completed" ? "#166534" : "#92400e"
                    }}>
                    {o.payment_status === "completed" ? "✅ Completed" : "⏳ Pending"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
