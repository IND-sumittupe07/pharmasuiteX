import { useState, useEffect } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function PricingPage() {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans]     = useState([]);
  const [usage, setUsage]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying]   = useState(null);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),5000); };

  useEffect(() => {
    Promise.all([api.get("/plans"), api.get("/plans/usage"), api.get("/plans/status")])
      .then(([p, u, s]) => { setPlans(p.data); setUsage({ ...u.data, ...s.data }); })
      .finally(() => setLoading(false));
  }, []);

  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handleUpgrade = async (plan) => {
    if (plan.id === "enterprise") { window.open("mailto:support@medtrack.in?subject=Enterprise Plan", "_blank"); return; }
    if (plan.id === "trial") return;
    if (!plan.price) return;
    setPaying(plan.id);
    try {
      const orderRes = await api.post("/plans/create-order", { planId: plan.id });
      const { orderId, amount, currency, keyId } = orderRes.data;
      const loaded = await loadRazorpay();
      if (!loaded) { showToast("Payment gateway failed to load","error"); setPaying(null); return; }

      const rzp = new window.Razorpay({
        key: keyId, amount, currency,
        name: "MedTrack Pharmacy Suite",
        description: `${plan.name} Plan — 30 Days`,
        order_id: orderId,
        theme: { color: "#2563eb" },
        prefill: { name: user?.name || "", contact: user?.mobile || "" },
        handler: async (response) => {
          try {
            const v = await api.post("/plans/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id,
            });
            showToast(v.data.message);
            await refreshUser();
            const s = await api.get("/plans/status");
            setUsage(u => ({ ...u, ...s.data }));
          } catch { showToast("Payment verified but activation failed. Contact support.","error"); }
          setPaying(null);
        },
        modal: { ondismiss: () => setPaying(null) },
      });
      rzp.on("payment.failed", () => { showToast("Payment failed","error"); setPaying(null); });
      rzp.open();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to initiate payment";
      showToast(msg,"error");
      setPaying(null);
    }
  };

  const currentPlan = usage?.plan || user?.plan || "trial";
  const daysLeft    = usage?.daysLeft ?? 0;
  const isExpired   = usage?.isExpired ?? false;
  const expiresAt   = usage?.expiresAt;

  const planColors = {
    trial:      { border:"#e2e8f0", btn:"#64748b" },
    basic:      { border:"#bfdbfe", btn:"#2563eb" },
    premium:    { border:"#7c3aed", btn:"#7c3aed" },
    enterprise: { border:"#bbf7d0", btn:"#059669" },
  };

  if (loading) return <div style={{textAlign:"center",padding:60,color:"#94a3b8"}}>Loading plans...</div>;

  return (
    <div className="fade-in" style={{display:"flex",flexDirection:"column",gap:20,maxWidth:960,margin:"0 auto"}}>
      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:100,padding:"14px 20px",borderRadius:12,maxWidth:420,
          background:toast.type==="error"?"#fef2f2":"#f0fdf4",
          border:`1px solid ${toast.type==="error"?"#fca5a5":"#bbf7d0"}`,
          color:toast.type==="error"?"#dc2626":"#16a34a",
          fontWeight:600,fontSize:14,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* Current plan status banner */}
      <div className="card" style={{
        padding:"20px 24px",
        background: isExpired ? "linear-gradient(135deg,#fef2f2,#fee2e2)" : daysLeft <= 5 ? "linear-gradient(135deg,#fffbeb,#fef3c7)" : "linear-gradient(135deg,#f0fdf4,#dcfce7)",
        border: `1px solid ${isExpired?"#fca5a5":daysLeft<=5?"#fde68a":"#bbf7d0"}`,
        display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12
      }}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:"#1e293b",marginBottom:4}}>
            {isExpired ? "⛔ Your plan has expired" : `✅ Currently on ${currentPlan === "trial" ? "Free Trial" : currentPlan.charAt(0).toUpperCase()+currentPlan.slice(1)} Plan`}
          </div>
          <div style={{fontSize:13,color:"#64748b"}}>
            {isExpired
              ? "Renew now to continue using MedTrack"
              : expiresAt
              ? `Expires on ${new Date(expiresAt).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})} · ${daysLeft} days left`
              : ""}
          </div>
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13,color:"#64748b"}}>
          {[
            ["Customers",usage?.customers?.used,usage?.customers?.limit],
            ["Campaigns",usage?.campaigns?.used,usage?.campaigns?.limit],
          ].map(([l,u,lim],i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontWeight:700,color:"#1e293b"}}>{u||0} / {lim===-1?"∞":lim||0}</div>
              <div style={{fontSize:11}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:"#1e293b"}}>Choose Your Plan</div>
        <div style={{fontSize:13,color:"#64748b",marginTop:4}}>All paid plans include a 30-day billing cycle. Auto-renew with Razorpay.</div>
      </div>

      {/* Plan Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
        {plans.map(plan => {
          const colors = planColors[plan.id] || planColors.trial;
          const isCurrent = plan.id === currentPlan;
          const isPremium = plan.id === "premium";
          return (
            <div key={plan.id} style={{
              borderRadius:20, padding:"24px 20px", display:"flex", flexDirection:"column", gap:14,
              background: isPremium ? "linear-gradient(135deg,#1e293b,#1e1b4b)" : "white",
              border: isCurrent ? "2px solid #2563eb" : `1.5px solid ${colors.border}`,
              boxShadow: isCurrent ? "0 0 0 3px rgba(37,99,235,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
              position:"relative",
            }}>
              {plan.badge && (
                <div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",
                  background: isPremium?"#7c3aed":"#2563eb",
                  color:"white",fontSize:10,fontWeight:800,padding:"3px 12px",borderRadius:20,whiteSpace:"nowrap"}}>
                  {plan.badge}
                </div>
              )}
              {isCurrent && !isExpired && (
                <div style={{position:"absolute",top:-11,right:12,background:"#10b981",color:"white",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:20}}>
                  ACTIVE
                </div>
              )}
              <div style={{fontSize:15,fontWeight:800,color:isPremium?"white":"#1e293b"}}>{plan.name}</div>
              <div>
                <span style={{fontSize:26,fontWeight:900,color:isPremium?"white":colors.btn}}>{plan.priceLabel}</span>
                {plan.price > 0 && <span style={{fontSize:11,color:isPremium?"#93c5fd":"#94a3b8",marginLeft:4}}>/30 days</span>}
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
                {plan.features.map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:7,fontSize:11}}>
                    <span style={{color:f.included?(isPremium?"#86efac":"#10b981"):"#cbd5e1",flexShrink:0}}>
                      {f.included?"✓":"✗"}
                    </span>
                    <span style={{color:f.included?(isPremium?"#e2e8f0":"#374151"):"#94a3b8"}}>{f.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>handleUpgrade(plan)} disabled={paying===plan.id}
                style={{
                  padding:"11px 8px",border:"none",borderRadius:11,fontWeight:700,fontSize:12,
                  fontFamily:"inherit",cursor: plan.id==="trial" ? "default" : "pointer",transition:"all 0.2s",
                  background: plan.id==="trial" ? "#f1f5f9"
                    : isCurrent && !isExpired ? "#f0fdf4"
                    : isPremium ? "linear-gradient(135deg,#7c3aed,#2563eb)"
                    : `linear-gradient(135deg,${colors.btn},${colors.btn}cc)`,
                  color: plan.id==="trial" ? "#94a3b8"
                    : isCurrent && !isExpired ? "#16a34a"
                    : "white",
                  boxShadow: isCurrent && !isExpired ? "none" : plan.id==="trial" ? "none" : `0 4px 12px ${colors.btn}44`,
                  opacity: paying && paying!==plan.id ? 0.5 : 1,
                }}>
                {paying===plan.id ? "Opening..." :
                 plan.id==="trial" ? "Free Trial" :
                 plan.id==="enterprise" ? "Contact Us" :
                 isCurrent && !isExpired ? `✓ Active · ${daysLeft}d left` :
                 isCurrent && isExpired ? `Renew ${plan.priceLabel}` :
                 `Upgrade ${plan.priceLabel}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
