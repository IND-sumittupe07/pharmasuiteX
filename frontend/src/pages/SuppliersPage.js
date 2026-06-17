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
      loadData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* Header & Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <button onClick={() => setTab("suppliers")} style={{ padding: "10px 20px" }}>Suppliers</button>
          <button onClick={() => setTab("orders")} style={{ padding: "10px 20px", marginLeft: "10px" }}>Orders</button>
        </div>
        <button onClick={() => alert("Open New PO Modal")} style={{ padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "5px" }}>+ New PO</button>
      </div>

      {/* Content */}
      <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
        {tab === "suppliers" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8f9fa" }}><th style={{ padding: "15px", textAlign: "left" }}>Supplier Name</th></tr></thead>
            <tbody>{suppliers.map(s => <tr key={s.id} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: "15px" }}>{s.name}</td></tr>)}</tbody>
          </table>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ padding: "15px", textAlign: "left" }}>PO Number</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "15px" }}>{o.po_number}</td>
                  <td style={{ padding: "15px" }}>
                    <button 
                      onClick={() => toggle(o.id, o.payment_status)}
                      style={{
                        padding: "6px 12px", 
                        borderRadius: "20px", 
                        border: "none", 
                        cursor: "pointer",
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
        )}
      </div>
    </div>
  );
}
