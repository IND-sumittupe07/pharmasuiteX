import { useState, useEffect } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const PLANS = [
  { id:"basic",   name:"Basic",   price:"₹299", color:"#2563eb", bg:"#eff6ff", features:["500 customers","Unlimited invoices","200 SMS/month","CSV Export","Auto reminders"] },
  { id:"premium", name:"Premium", price:"₹999", color:"#7c3aed", bg:"linear-gradient(135deg,#1e293b,#1e1b4b)", dark:true, features:["Unlimited customers","1000 SMS + 500 WhatsApp","Advanced analytics","Multi-staff login","Priority support"] },
];

export default function PlanExpiredPage({ plan, daysLeft, onRenewed }) {
  const { logout } = useAuth();
  const [paying, setPaying]   = useState(null);
  const [toast, setToast]     = useState(null);
  const isExpired = daysLeft <= 0;

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),5000); };

  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handleUpgrade = async (planId) => {
    setPaying(planId);
    try {
      const orderRes = await api.post("/plans/create-order", { planId });
      const loaded = await loadRazorpay();
      if (!loaded) { showToast("Payment gateway failed to load","error"); return; }

      const options = {
        key: orderRes.data.keyId,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "MedTrack",
        description: `${orderRes.data.planName} Plan - 30 Days`,
        order_id: orderRes.data.orderId,
        theme: { color: "#2563eb" },
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/plans/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
            });
            showToast(verifyRes.data.message);
            setTimeout(() => { if (onRenewed) onRenewed(); else window.location.reload(); }, 2000);
          } catch(e) { showToast("Payment verification failed","error"); }
        },
        modal: { ondismiss: () => setPaying(null) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => { showToast("Payment failed","error"); setPaying(null); });
      rzp.open();
    } catch(e) {
      const msg = e.response?.data?.error || "Failed";
      if (msg.includes("not configured")) {
        showToast("Razorpay not configured yet. Contact support.","error");
      } else { showToast(msg,"error"); }
      setPaying(null);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e1b4b)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      {toast && (
        <div style={{ position:"fixed", top:20, right:24, zIndex:100, padding:"14px 20px", borderRadius:12,
          background:toast.type==="error"?"#fef2f2":"#f0fdf4",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a", fontWeight:600, fontSize:14,
          boxShadow:"0 8px 24px rgba(0,0,0,0.3)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ width:"100%", maxWidth:760, textAlign:"center" }}>
        {/* Icon */}
        <div style={{ fontSize:64, marginBottom:16 }}>{isExpired ? "⏰" : "⚠️"}</div>

        {/* Title */}
        <div style={{ fontSize:32, fontWeight:900, color:"white", marginBottom:8 }}>
          {isExpired ? "Your Plan Has Expired" : `Plan Expiring in ${daysLeft} Days`}
        </div>
        <div style={{ fontSize:15, color:"#94a3b8", marginBottom:32, lineHeight:1.7 }}>
          {isExpired
            ? `Your ${plan === "free" ? "Free Trial" : plan} plan has ended. Renew now to continue managing your pharmacy.`
            : `Your ${plan === "free" ? "Free Trial" : plan} plan expires soon. Upgrade to keep all your data and features.`}
        </div>

        {/* Plan cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{
              padding:28, borderRadius:20,
              background: p.dark ? p.bg : "rgba(255,255,255,0.05)",
              border:`1.5px solid ${p.dark ? "transparent" : "rgba(255,255,255,0.1)"}`,
              textAlign:"left",
            }}>
              <div style={{ fontSize:18, fontWeight:800, color:"white", marginBottom:4 }}>{p.name}</div>
              <div style={{ marginBottom:16 }}>
                <span style={{ fontSize:30, fontWeight:900, color:p.dark?"white":p.color }}>{p.price}</span>
                <span style={{ fontSize:12, color:"#94a3b8", marginLeft:6 }}>/month · 30 days</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                {p.features.map((f,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                    <span style={{ color:p.dark?"#86efac":p.color }}>✓</span>
                    <span style={{ color:p.dark?"#e2e8f0":"#cbd5e1" }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>handleUpgrade(p.id)} disabled={paying===p.id}
                style={{ width:"100%", padding:"13px", border:"none", borderRadius:12,
                  background:p.dark?"linear-gradient(135deg,#7c3aed,#2563eb)":p.color,
                  color:"white", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit",
                  boxShadow:`0 4px 14px ${p.color}66`, opacity:paying===p.id?0.7:1 }}>
                {paying===p.id ? "Opening payment..." : `Activate ${p.name} — ${p.price}/month`}
              </button>
            </div>
          ))}
        </div>

        {/* Free trial option if not expired */}
        {!isExpired && plan === "free" && (
          <div style={{ padding:"14px 20px", background:"rgba(255,255,255,0.05)", borderRadius:12, marginBottom:16, fontSize:13, color:"#94a3b8" }}>
            💡 You are on a free trial. Upgrade before it expires to keep your data.
          </div>
        )}

        <button onClick={logout}
          style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)", color:"#94a3b8",
            padding:"10px 24px", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
