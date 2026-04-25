// ─── REMINDERS PAGE ───────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import api from "../api/client";

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState({});
  const [sending, setSending] = useState({});

  useEffect(() => {
    api.get("/reminders?days=7").then(res => setReminders(res.data)).finally(() => setLoading(false));
  }, []);

  const sendReminder = async (r, channel) => {
    const key = `${r.customer_id}-${r.medicine_id}`;
    setSending(s => ({ ...s, [key]: true }));
    try {
      await api.post("/reminders/send", {
        customerId: r.customer_id,
        medicineName: r.medicine_name,
        channel,
      });
      setSent(s => ({ ...s, [key]: channel }));
    } catch { alert("Failed to send reminder"); }
    finally { setSending(s => ({ ...s, [key]: false })); }
  };

  const sendBulk = async () => {
    if (!window.confirm("Send SMS reminders to all due customers?")) return;
    try {
      const res = await api.post("/reminders/send-bulk", { channel: "sms", days: 5 });
      alert(`✅ Sent ${res.data.sent} reminders, ${res.data.failed} failed`);
    } catch { alert("Bulk send failed"); }
  };

  const urgent = reminders.filter(r => parseInt(r.days_left) <= 2);
  const soon = reminders.filter(r => parseInt(r.days_left) > 2 && parseInt(r.days_left) <= 5);
  const upcoming = reminders.filter(r => parseInt(r.days_left) > 5);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading reminders...</div>;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[
          { label: "Urgent (≤2 days)", count: urgent.length, color: "#ef4444", bg: "#fef2f2" },
          { label: "Due Soon (≤5 days)", count: soon.length, color: "#f59e0b", bg: "#fffbeb" },
          { label: "Upcoming (≤7 days)", count: upcoming.length, color: "#2563eb", bg: "#eff6ff" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 20, borderLeft: `4px solid ${s.color}`, display: "flex", alignItems: "center", gap: 16 }}>
            <div className="ring" style={{ width: 48, height: 48, background: s.bg, fontSize: 22 }}>🔔</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Pending Refill Reminders ({reminders.length})</div>
          <button className="btn-primary" style={{ fontSize: 12 }} onClick={sendBulk}>📲 Send Bulk SMS</button>
        </div>

        {reminders.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#10b981", fontWeight: 600 }}>✅ No refills due in next 7 days!</div>
        ) : (
          reminders.map(r => {
            const key = `${r.customer_id}-${r.medicine_id}`;
            const daysLeft = parseInt(r.days_left);
            const urgent = daysLeft <= 2;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div className="ring" style={{ width: 40, height: 40, background: urgent ? "#fef2f2" : "#fffbeb", fontSize: 20, flexShrink: 0 }}>
                  {urgent ? "🚨" : "⏰"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{r.full_name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.medicine_name} · {r.mobile} · {r.medical_condition}</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 70 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: urgent ? "#ef4444" : "#f59e0b" }}>{daysLeft}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>days left</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {sent[key] ? (
                    <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✅ {sent[key]} sent</span>
                  ) : (
                    <>
                      <button className="btn-primary" style={{ fontSize: 11, padding: "6px 12px" }}
                        disabled={sending[key]} onClick={() => sendReminder(r, "whatsapp")}>
                        📲 WA
                      </button>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: "6px 12px" }}
                        disabled={sending[key]} onClick={() => sendReminder(r, "sms")}>
                        📱 SMS
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
