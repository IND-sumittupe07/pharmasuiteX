import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Inline Upgrade Banner (shows inside a page when near/at limit) ─────────────
export function UpgradeBanner({ resource, current, limit, planName }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const pct = Math.round((current / limit) * 100);
  const isAtLimit = current >= limit;
  const isNearLimit = pct >= 80;

  if (!isNearLimit && !isAtLimit) return null;

  return (
    <div style={{
      padding: "14px 20px", borderRadius: 14, marginBottom: 16,
      background: isAtLimit ? "linear-gradient(135deg,#fef2f2,#fee2e2)" : "linear-gradient(135deg,#fffbeb,#fef3c7)",
      border: `1.5px solid ${isAtLimit ? "#fca5a5" : "#fde68a"}`,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{isAtLimit ? "🚫" : "⚠️"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: isAtLimit ? "#b91c1c" : "#92400e" }}>
          {isAtLimit
            ? `${resource} limit reached on ${planName} plan`
            : `Approaching ${resource} limit — ${current}/${limit} used`}
        </div>
        <div style={{ fontSize: 12, color: isAtLimit ? "#ef4444" : "#f59e0b", marginTop: 2 }}>
          {isAtLimit
            ? `Upgrade your plan to add more ${resource.toLowerCase()}`
            : `${limit - current} remaining — upgrade now to avoid interruption`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => navigate("/pricing")}
          style={{ padding: "8px 16px", background: isAtLimit ? "#ef4444" : "#f59e0b", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Upgrade Now →
        </button>
        <button onClick={() => setDismissed(true)}
          style={{ padding: "8px 10px", background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16 }}>×</button>
      </div>
    </div>
  );
}

// ── Full-screen Upgrade Wall (blocks action when at limit) ────────────────────
export function UpgradeWall({ resource, current, limit, planName, onClose }) {
  const navigate = useNavigate();

  const plans = [
    { id: "basic", name: "Basic", price: "₹299/mo", color: "#2563eb", highlight: resource === "customers" && limit === 50,
      perks: ["500 customers", "200 SMS/month", "10 campaigns", "Auto reminders", "CSV Export"] },
    { id: "premium", name: "Premium", price: "₹999/mo", color: "#7c3aed", highlight: true,
      perks: ["Unlimited customers", "1000 SMS/month", "WhatsApp messages", "Advanced analytics", "Multi-staff"] },
  ];

  return (
    <div className="modal-backdrop">
      <div className="card fade-in" style={{ width: "100%", maxWidth: 560, padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1e293b,#1d4ed8)", padding: "28px 28px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>
            You've reached your {resource} limit
          </div>
          <div style={{ fontSize: 13, color: "#93c5fd", marginTop: 4 }}>
            {current}/{limit} {resource.toLowerCase()} used on <strong>{planName}</strong> plan — upgrade to continue growing
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              padding: 20, borderRadius: 16,
              border: `2px solid ${plan.highlight ? plan.color : "#e2e8f0"}`,
              background: plan.highlight ? `${plan.color}08` : "white",
              position: "relative"
            }}>
              {plan.highlight && (
                <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "white", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  RECOMMENDED
                </div>
              )}
              <div style={{ fontSize: 16, fontWeight: 700, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>{plan.price}</div>
              {plan.perks.map((perk, i) => (
                <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 5 }}>✅ {perk}</div>
              ))}
              <button onClick={() => { navigate("/pricing"); onClose?.(); }}
                style={{ width: "100%", marginTop: 14, padding: "10px", border: "none", borderRadius: 10,
                  background: plan.highlight ? `linear-gradient(135deg,${plan.color},${plan.color}dd)` : "#f1f5f9",
                  color: plan.highlight ? "white" : "#374151",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  boxShadow: plan.highlight ? `0 4px 12px ${plan.color}44` : "none" }}>
                Choose {plan.name} →
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: "0 24px 20px", textAlign: "center" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Feature Lock (for locked features like Analytics on free plan) ─────────────
export function FeatureLock({ feature, requiredPlan = "Premium", children }) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowModal(true)}>
        <div style={{ filter: "blur(4px)", pointerEvents: "none", userSelect: "none" }}>{children}</div>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.85)",
          borderRadius: 12, backdropFilter: "blur(2px)"
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{feature} is locked</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 12 }}>Available on {requiredPlan} plan</div>
          <button onClick={() => navigate("/pricing")}
            style={{ padding: "8px 20px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Unlock with {requiredPlan} →
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="card fade-in" style={{ padding: 32, maxWidth: 380, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{feature} requires {requiredPlan}</div>
            <div style={{ fontSize: 13, color: "#64748b", margin: "10px 0 20px", lineHeight: 1.6 }}>
              Upgrade to {requiredPlan} to unlock {feature} and many more powerful features for your pharmacy.
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={() => { navigate("/pricing"); setShowModal(false); }}>
              View Plans & Upgrade →
            </button>
            <button onClick={() => setShowModal(false)} style={{ marginTop: 10, background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", display: "block", width: "100%" }}>
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
