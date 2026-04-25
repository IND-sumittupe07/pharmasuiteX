import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const PLANS = [
  {
    id:"trial", name:"Free Trial", price:0, label:"Free",
    duration:"15 days · No credit card", icon:"🆓", color:"#64748b", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.15)",
    desc:"Explore all features with no commitment",
    features:["25 customers","2 campaigns","GST billing","Basic dashboard","Manual reminders"],
    cta:"Start Free Trial", ctaBg:"#475569",
  },
  {
    id:"basic", name:"Basic Plan", price:299, label:"₹299/month",
    duration:"30 days · Renews monthly", icon:"⭐", color:"#2563eb", bg:"#eff6ff", border:"#93c5fd",
    desc:"Perfect for growing medical stores",
    features:["500 customers","10 campaigns","200 SMS/month","Auto reminders","GST Billing + PDF","CSV Export"],
    cta:"Start Basic — ₹299/mo", ctaBg:"#2563eb", popular:true,
  },
  {
    id:"premium", name:"Premium Plan", price:999, label:"₹999/month",
    duration:"30 days · Renews monthly", icon:"🚀", color:"#7c3aed", bg:"linear-gradient(135deg,#1e1b4b,#2e1065)", dark:true, border:"#7c3aed",
    desc:"Everything for serious pharmacies",
    features:["Unlimited customers","Unlimited campaigns","1000 SMS + 500 WhatsApp","Advanced analytics","Multi-staff login","Priority support"],
    cta:"Start Premium — ₹999/mo", ctaBg:"linear-gradient(135deg,#7c3aed,#2563eb)",
  },
];

export default function PlanSelectPage() {
  const { user, clearNewUser } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("basic");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const proceed = async (planId) => {
    setLoading(true); setError("");

    if (planId === "trial") {
      try {
        await api.post("/plans/upgrade", { planId: "trial" });
      } catch {}
      clearNewUser();
      navigate("/");
      return;
    }

    // Paid plan — Razorpay
    try {
      const orderRes = await api.post("/plans/create-order", { planId });
      const { orderId, amount, currency, keyId } = orderRes.data;

      await new Promise((res, rej) => {
        if (window.Razorpay) return res();
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = res; s.onerror = rej;
        document.body.appendChild(s);
      });

      const plan = PLANS.find(p => p.id === planId);
      new window.Razorpay({
        key: keyId, amount, currency,
        name: "MedTrack",
        description: `${plan.name} — 30 Days`,
        order_id: orderId,
        theme: { color: "#2563eb" },
        prefill: { name: user?.name || "", contact: user?.mobile || "" },
        handler: async (response) => {
          try {
            await api.post("/plans/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
            });
            clearNewUser();
            navigate("/");
          } catch { setError("Payment verified but activation failed. Contact support."); clearNewUser(); navigate("/"); }
        },
        modal: { ondismiss: () => setLoading(false) },
      }).open();
    } catch (err) {
setError(err.response?.data?.error || "Payment setup failed. Ask admin to configure Razorpay keys in .env (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET).");
      setLoading(false);
    }
  };

  const plan = PLANS.find(p => p.id === selected);

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>💊</div>
        <div style={{ fontSize:30, fontWeight:900, color:"white", marginBottom:8 }}>
          Welcome, {user?.name?.split(" ")[0] || "there"}! 🎉
        </div>
        <div style={{ fontSize:15, color:"#93c5fd", maxWidth:500 }}>
          Choose a plan to get started. Free trial lets you explore everything — no credit card needed.
        </div>
      </div>

      {error && (
        <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:12, padding:"12px 20px", marginBottom:20, color:"#dc2626", fontWeight:600, fontSize:13 }}>
          ❌ {error}
        </div>
      )}

      {/* Plan Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, maxWidth:920, width:"100%" }}>
        {PLANS.map(p => (
          <div key={p.id} onClick={() => setSelected(p.id)}
            style={{
              background: selected===p.id ? (p.dark ? p.bg : "white") : "rgba(255,255,255,0.04)",
              border:`2px solid ${selected===p.id ? p.color : "rgba(255,255,255,0.1)"}`,
              borderRadius:20, padding:"28px 24px", cursor:"pointer", transition:"all 0.25s", position:"relative",
              transform: selected===p.id ? "translateY(-6px)" : "none",
              boxShadow: selected===p.id ? `0 16px 48px ${p.color}44` : "none",
            }}>

            {p.popular && (
              <div style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", fontSize:10, fontWeight:800, padding:"4px 16px", borderRadius:20, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(37,99,235,0.5)" }}>
                ⭐ MOST POPULAR
              </div>
            )}

            <div style={{ fontSize:34, marginBottom:10 }}>{p.icon}</div>
            <div style={{ fontSize:17, fontWeight:800, color: selected===p.id ? (p.dark?"white":p.color) : "white", marginBottom:4 }}>{p.name}</div>
            <div style={{ fontSize:26, fontWeight:900, color: selected===p.id ? (p.dark?"white":p.color) : "white", marginBottom:2 }}>{p.label}</div>
            <div style={{ fontSize:11, color: selected===p.id ? (p.dark?"#94a3b8":"#64748b") : "#475569", marginBottom:12 }}>{p.duration}</div>
            <div style={{ fontSize:12, color: selected===p.id ? (p.dark?"#cbd5e1":"#475569") : "#64748b", marginBottom:16, lineHeight:1.6 }}>{p.desc}</div>

            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {p.features.map((f,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                  <span style={{ color: selected===p.id ? (p.dark?"#86efac":p.color) : "#374151", fontWeight:700, flexShrink:0 }}>✓</span>
                  <span style={{ color: selected===p.id ? (p.dark?"#e2e8f0":"#374151") : "#64748b" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ marginTop:32, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <button onClick={() => proceed(selected)} disabled={loading}
          style={{
            padding:"16px 56px", border:"none", borderRadius:14, cursor:"pointer",
            fontFamily:"inherit", fontWeight:800, fontSize:16,
            background: plan?.ctaBg || "#2563eb", color:"white",
            boxShadow:"0 8px 28px rgba(37,99,235,0.45)",
            opacity: loading ? 0.7 : 1, transition:"all 0.2s", minWidth:300,
          }}>
          {loading ? "Setting up your account..." : plan?.cta}
        </button>
        <div style={{ fontSize:12, color:"#475569" }}>🔒 Secure payment via Razorpay · Cancel anytime</div>
        {selected !== "trial" && (
          <button onClick={() => proceed("trial")}
            style={{ background:"none", border:"none", color:"#64748b", fontSize:12, cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" }}>
            Start with free trial instead
          </button>
        )}
      </div>

    </div>
  );
}
