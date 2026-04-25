import { useState, useEffect } from "react";
import api from "../api/client";

const CURRENT_VERSION = "1.0.0";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("pharmacy");
  const [pharmacy, setPharmacy]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState("");
  const [pwForm, setPwForm]       = useState({ current:"", newPw:"", confirm:"" });
  const [pwMsg, setPwMsg]         = useState("");

  useEffect(() => {
    api.get("/auth/me").then(res => {
      setPharmacy({
        name: res.data.pharmacy_name || "",
        city: res.data.city || "",
        state: res.data.state || "",
        address: res.data.address || "",
        ownerName: res.data.name || "",
        mobile: res.data.mobile || "",
        email: res.data.email || "",
        licenseNumber: res.data.license_number || "",
        gstNumber: res.data.gst_number || "",
        plan: res.data.plan || "trial",
        planExpiresAt: res.data.plan_expires_at || null,
        fast2smsKey: "",
        interaktKey: "",
      });
    });
  }, []);

  const savePharmacy = async () => {
    setSaving(true);
    try {
      await api.put("/auth/pharmacy", pharmacy);
      setSaved("pharmacy");
      setTimeout(() => setSaved(""), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pwForm.current || !pwForm.newPw) { setPwMsg("❌ Fill all fields"); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg("❌ Passwords don't match"); return; }
    if (pwForm.newPw.length < 8) { setPwMsg("❌ Min 8 characters"); return; }
    setPwMsg("Saving...");
    try {
      await api.post("/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwMsg("✅ Password changed!");
      setPwForm({ current:"", newPw:"", confirm:"" });
    } catch (err) {
      setPwMsg("❌ " + (err.response?.data?.error || "Failed"));
    }
    setTimeout(() => setPwMsg(""), 4000);
  };

  const tabs = [
    { id:"pharmacy", icon:"🏪", label:"Pharmacy Profile" },
    { id:"account",  icon:"👤", label:"Account & Password" },
    { id:"messages", icon:"📲", label:"Messaging" },
    { id:"plan",     icon:"💎", label:"Plan & Billing" },
    { id:"about",    icon:"ℹ️",  label:"About" },
  ];

  if (!pharmacy) return <div style={{ textAlign:"center", padding:60, color:"#94a3b8" }}>Loading settings...</div>;

  const planDaysLeft = pharmacy.planExpiresAt
    ? Math.ceil((new Date(pharmacy.planExpiresAt) - new Date()) / (1000*60*60*24))
    : null;

  return (
    <div className="fade-in" style={{ display:"flex", gap:20, maxWidth:900 }}>
      <div className="card" style={{ padding:12, width:200, flexShrink:0, alignSelf:"flex-start" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
              borderRadius:10, border:"none", cursor:"pointer", textAlign:"left", marginBottom:2,
              background: activeTab===t.id ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "transparent",
              color: activeTab===t.id ? "white" : "#64748b",
              fontWeight: activeTab===t.id ? 600 : 400, fontSize:13, fontFamily:"inherit" }}>
            <span style={{ fontSize:16 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1 }}>

        {activeTab === "pharmacy" && (
          <div className="card fade-in" style={{ padding:28 }}>
            <div style={{ fontSize:17, fontWeight:700, color:"#1e293b", marginBottom:4 }}>🏪 Pharmacy Profile</div>
            <div style={{ fontSize:13, color:"#94a3b8", marginBottom:24 }}>Update your pharmacy information</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {[
                ["Pharmacy Name","name","text","e.g. Sharma Medical Store"],
                ["Owner Name","ownerName","text","e.g. Ramesh Sharma"],
                ["Mobile","mobile","tel","10-digit number"],
                ["Email","email","email","owner@store.com"],
                ["City","city","text","e.g. Pune"],
                ["State","state","text","e.g. Maharashtra"],
                ["GST Number","gstNumber","text","e.g. 27AABCS1234B1Z5"],
                ["License Number","licenseNumber","text","e.g. MH-PH-2024-001"],
              ].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:5 }}>{label}</label>
                  <input className="input" type={type} placeholder={ph} value={pharmacy[key]||""}
                    onChange={e => setPharmacy(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:5 }}>Address</label>
                <textarea className="input" rows={2} placeholder="Full store address..."
                  value={pharmacy.address||""} onChange={e => setPharmacy(p => ({ ...p, address: e.target.value }))}
                  style={{ resize:"none" }} />
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop:20 }} onClick={savePharmacy} disabled={saving}>
              {saving ? "Saving..." : saved==="pharmacy" ? "✅ Saved!" : "Save Changes"}
            </button>
          </div>
        )}

        {activeTab === "account" && (
          <div className="card fade-in" style={{ padding:28 }}>
            <div style={{ fontSize:17, fontWeight:700, color:"#1e293b", marginBottom:4 }}>👤 Change Password</div>
            <div style={{ fontSize:13, color:"#94a3b8", marginBottom:24 }}>Update your login password</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14, maxWidth:400 }}>
              {[["Current Password","current"],["New Password","newPw"],["Confirm New Password","confirm"]].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:5 }}>{label}</label>
                  <input className="input" type="password" placeholder="••••••••" value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              {pwMsg && (
                <div style={{ padding:"10px 14px", borderRadius:8,
                  background: pwMsg.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
                  color: pwMsg.startsWith("✅") ? "#16a34a" : "#ef4444", fontSize:13 }}>
                  {pwMsg}
                </div>
              )}
              <button className="btn-primary" onClick={changePassword}>Change Password</button>
            </div>
          </div>
        )}

        {activeTab === "messages" && (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#1e293b" }}>📱 Fast2SMS — SMS Campaigns</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>Bulk SMS · ₹0.15/message · Best for India</div>
                </div>
                <a href="https://fast2sms.com" target="_blank" rel="noreferrer"
                  style={{ fontSize:12, color:"#2563eb", fontWeight:600, textDecoration:"none" }}>Get Free Key →</a>
              </div>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:5 }}>API Key</label>
              <input className="input" type="password" placeholder="Paste Fast2SMS API key..."
                value={pharmacy?.fast2smsKey||""}
                onChange={e => setPharmacy(p => ({ ...p, fast2smsKey: e.target.value }))} />
            </div>

            <div className="card" style={{ padding:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#1e293b" }}>💬 Interakt — WhatsApp</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>WhatsApp messages · ₹0.25/message</div>
                </div>
                <a href="https://app.interakt.ai" target="_blank" rel="noreferrer"
                  style={{ fontSize:12, color:"#25D366", fontWeight:600, textDecoration:"none" }}>Get Key →</a>
              </div>
              <label style={{ fontSize:12, fontWeight:700, color:"#64748b", display:"block", marginBottom:5 }}>API Key</label>
              <input className="input" type="password" placeholder="Paste Interakt API key..."
                value={pharmacy?.interaktKey||""}
                onChange={e => setPharmacy(p => ({ ...p, interaktKey: e.target.value }))} />
            </div>

            <button className="btn-primary" style={{ padding:"13px" }} onClick={savePharmacy} disabled={saving}>
              {saving ? "Saving..." : saved==="pharmacy" ? "✅ Keys Saved!" : "Save API Keys"}
            </button>
          </div>
        )}

        {activeTab === "plan" && (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="card" style={{ padding:24, background:"linear-gradient(135deg,#1e293b,#1d4ed8)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:13, color:"#93c5fd", fontWeight:600, marginBottom:4 }}>CURRENT PLAN</div>
                  <div style={{ fontSize:26, fontWeight:900, color:"white", textTransform:"capitalize" }}>
                    {pharmacy.plan === "trial" ? "Free Trial" : pharmacy.plan}
                  </div>
                  {planDaysLeft !== null && (
                    <div style={{ fontSize:13, color: planDaysLeft<=5?"#fca5a5":"#93c5fd", marginTop:6, fontWeight:600 }}>
                      {planDaysLeft > 0 ? `⏰ ${planDaysLeft} days remaining` : "⚠️ Plan expired"}
                    </div>
                  )}
                </div>
                <a href="/pricing" style={{ padding:"10px 20px", background:"white", color:"#1d4ed8",
                  borderRadius:10, fontWeight:700, fontSize:13, textDecoration:"none" }}>
                  {pharmacy.plan==="trial" ? "Upgrade Plan →" : "Manage Plan →"}
                </a>
              </div>
            </div>

            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#1e293b", marginBottom:16 }}>Available Plans</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {[
                  { id:"trial",   name:"Free Trial", price:"Free",    color:"#64748b", features:["25 customers","2 campaigns","GST billing","Manual reminders"] },
                  { id:"basic",   name:"Basic",      price:"₹299/mo", color:"#2563eb", features:["500 customers","200 SMS/month","10 campaigns","CSV Export"] },
                  { id:"premium", name:"Premium",    price:"₹999/mo", color:"#7c3aed", features:["Unlimited customers","1000 SMS + 500 WA","Analytics","Multi-staff"] },
                ].map(p => (
                  <div key={p.id} style={{ padding:16, borderRadius:12, position:"relative",
                    border:`2px solid ${pharmacy.plan===p.id ? p.color : "#e2e8f0"}`,
                    background: pharmacy.plan===p.id ? "#f8fafc" : "white" }}>
                    {pharmacy.plan===p.id && (
                      <div style={{ position:"absolute", top:-10, right:10, background:p.color, color:"white",
                        fontSize:10, fontWeight:800, padding:"2px 10px", borderRadius:20 }}>CURRENT</div>
                    )}
                    <div style={{ fontSize:14, fontWeight:700, color:p.color }}>{p.name}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#1e293b", margin:"4px 0 8px" }}>{p.price}</div>
                    {p.features.map(f=><div key={f} style={{ fontSize:11, color:"#64748b", marginBottom:3 }}>✓ {f}</div>)}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16, textAlign:"center" }}>
                <a href="/pricing" style={{ display:"inline-block", padding:"11px 28px",
                  background:"linear-gradient(135deg,#2563eb,#7c3aed)", color:"white",
                  borderRadius:10, fontWeight:700, fontSize:13, textDecoration:"none" }}>
                  View All Plans & Upgrade →
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="card" style={{ padding:32, background:"linear-gradient(135deg,#1e293b,#1d4ed8)", textAlign:"center" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.15)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, margin:"0 auto 16px" }}>💊</div>
              <div style={{ fontSize:26, fontWeight:800, color:"white" }}>MedTrack</div>
              <div style={{ fontSize:14, color:"#93c5fd", marginTop:6, lineHeight:1.6 }}>
                India's smartest pharmacy management platform.<br/>Built for medical store owners.
              </div>
              <div style={{ display:"inline-block", background:"rgba(255,255,255,0.15)", color:"white",
                fontSize:12, fontWeight:700, padding:"4px 14px", borderRadius:20, marginTop:12 }}>
                Version {CURRENT_VERSION}
              </div>
            </div>

            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#1e293b", marginBottom:16 }}>⭐ Key Features</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                {[
                  {icon:"👥",title:"Customers",desc:"Complete patient profiles"},
                  {icon:"💊",title:"Medicines",desc:"Stock & expiry tracking"},
                  {icon:"🧾",title:"GST Billing",desc:"Professional invoices"},
                  {icon:"🔔",title:"Reminders",desc:"Auto refill alerts"},
                  {icon:"📣",title:"Campaigns",desc:"Bulk SMS & WhatsApp"},
                  {icon:"📊",title:"Analytics",desc:"Business insights"},
                ].map((f,i) => (
                  <div key={i} style={{ padding:14, background:"#f8fafc", borderRadius:12, textAlign:"center" }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>{f.icon}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#1e293b", marginBottom:4 }}>{f.title}</div>
                    <div style={{ fontSize:11, color:"#94a3b8" }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding:24, background:"#f0fdf4", border:"1px solid #bbf7d0" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#1e293b", marginBottom:12 }}>🤝 Support</div>
              <div style={{ fontSize:13, color:"#374151", lineHeight:1.8 }}>
                📧 <strong>support@medtrack.in</strong><br/>
                📱 WhatsApp: <strong>+91 9529052510</strong><br/>
                🕐 Mon–Sat, 9AM–6PM IST
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}