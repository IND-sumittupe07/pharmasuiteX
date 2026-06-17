import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUsage } from "../context/UsageContext";
import CustomersPage from "./CustomersPage";
import AnalyticsPage from "./AnalyticsPage";
import RemindersPage from "./RemindersPage";
import CampaignsPage from "./CampaignsPage";
import ExportPage from "./ExportPage";
import DashboardHome from "./DashboardHome";
import SettingsPage from "./SettingsPage";
import PricingPage from "./PricingPage";
import MedicinesPage from "./MedicinesPage";
import InvoicePage from "./InvoicePage";
import ExpiryPage from "./ExpiryPage";
import SuppliersPage from "./SuppliersPage";
import PWAInstallBanner from "../components/PWAInstallBanner";

const navItems = [
  { id: "",          icon: "⊞",  label: "Dashboard", path: "/" },
  { id: "customers", icon: "👥", label: "Customers",  path: "/customers" },
  { id: "medicines", icon: "💊", label: "Medicines",  path: "/medicines" },
  { id: "invoice",   icon: "🧾", label: "Billing",    path: "/invoice" },
  { id: "expiry",    icon: "⏰", label: "Expiry",     path: "/expiry" },
  { id: "suppliers", icon: "🏭", label: "Suppliers",  path: "/suppliers" },
  { id: "reminders", icon: "🔔", label: "Reminders",  path: "/reminders" },
  { id: "campaigns", icon: "📣", label: "Campaigns",  path: "/campaigns" },
  { id: "analytics", icon: "📊", label: "Analytics",  path: "/analytics" },
  { id: "export",    icon: "⬇️", label: "Export",     path: "/export" },
  { id: "pricing",   icon: "💎", label: "Plans",      path: "/pricing", highlight: true },
  { id: "settings",  icon: "⚙️", label: "Settings",   path: "/settings" },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { usage, isAtLimit, isNearLimit } = useUsage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentNav = navItems.find(n =>
    n.path === "/" ? location.pathname === "/" : location.pathname.startsWith(n.path)
  );

  const planColors = { free: "#64748b", basic: "#2563eb", premium: "#7c3aed", enterprise: "#059669" };
  const planColor = planColors[usage?.planId?.toLowerCase()] || "#64748b";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'Outfit',sans-serif", backgroundColor: "var(--bg1)", color: "var(--txt1)" }}>

      {/* Sidebar Navigation Frame Container */}
      <div style={{ width: sidebarOpen ? 240 : 64, minWidth: sidebarOpen ? 240 : 64, height: "100vh", background: "var(--bg2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "all 0.2s ease", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 16px", borderBottom: "1px solid var(--border)", height: 76, boxSizing: "border-box" }}>
          <div className="ring" style={{ width: 36, height: 36, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", flexShrink: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>💊</div>
          {sidebarOpen && <div style={{ minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>PharmaSuiteX</div><div style={{ fontSize: 11, color: "var(--txt4)" }}>Pharmacy Suite</div></div>}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--txt4)", fontSize: 14, padding: 4 }}>{sidebarOpen ? "◀" : "▶"}</button>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {navItems.map(item => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
            const hasWarning = item.id === "customers" && (isAtLimit("customers") || isNearLimit("customers"));
            return (
              <button key={item.id} onClick={() => navigate(item.path)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  color: isActive ? "white" : item.highlight ? "#7c3aed" : "var(--txt2)",
                  background: isActive ? (item.highlight ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "linear-gradient(135deg,#2563eb,#1d4ed8)") : item.highlight ? "var(--nav-hover)" : "transparent",
                }}>
                <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: "center" }}>{item.icon}</span>
                {sidebarOpen && <span style={{ fontSize: 14, fontWeight: item.highlight ? 700 : 500, flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>}
                {sidebarOpen && hasWarning && <span style={{ fontSize: 10, background: isAtLimit("customers") ? "#ef4444" : "#f59e0b", color: "white", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>{isAtLimit("customers") ? "FULL" : "!"}</span>}
                {sidebarOpen && item.highlight && !isActive && <span style={{ fontSize: 9, background: "#7c3aed", color: "white", padding: "2px 6px", borderRadius: 20, fontWeight: 700 }}>UPGRADE</span>}
              </button>
            );
          })}
        </nav>

        {/* Dynamic Plan-Aware Usage Panel */}
        {sidebarOpen && usage?.usage && (
          <div style={{ margin: "0 8px 8px", padding: "12px 14px", background: "var(--bg3)", borderRadius: 12, border: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--txt4)", marginBottom: 8, textTransform: "uppercase" }}>Usage</div>
            {Object.entries(usage.usage || {}).slice(0, 2).map(([key, val]) => {
              const planTier = usage?.planId?.toLowerCase() || "free";
              
              // Map explicit max caps matching your subscription matrices documentation
              let activeLimit = val.limit;
              if (key === "customers") {
                activeLimit = planTier === "premium" ? "∞" : planTier === "basic" ? 500 : 25;
              } else if (key === "campaigns") {
                activeLimit = planTier === "premium" ? "∞" : planTier === "basic" ? 10 : 2;
              }

              const isInf = activeLimit === "∞" || activeLimit === -1;
              const usedCount = parseInt(val.current) || 0;
              const p = isInf ? 0 : Math.min(100, Math.round((usedCount / activeLimit) * 100));

              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "var(--txt2)" }}>{val.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p >= 85 ? "#ef4444" : "var(--txt2)" }}>
                      {usedCount}/{activeLimit}
                    </span>
                  </div>
                  {!isInf && (
                    <div style={{ height: 4, background: "var(--bg4)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${p}%`, background: p >= 85 ? "#ef4444" : "var(--primary, #2563eb)", borderRadius: 2 }}></div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => navigate("/pricing")} style={{ width: "100%", marginTop: 4, padding: "6px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              💎 Manage Plan
            </button>
          </div>
        )}

        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
            <div className="ring" style={{ width: 32, height: 32, background: "linear-gradient(135deg,#10b981,#059669)", flexShrink: 0, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>🏪</div>
            {sidebarOpen && <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--txt1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.pharmacyName || user?.pharmacy_name}</div>
              <div style={{ fontSize: 11, color: planColor, fontWeight: 600, textTransform: "uppercase" }}>● {usage?.planName || user?.plan || "free"}</div>
            </div>}
          </div>
          {sidebarOpen && <button onClick={logout} style={{ width: "100%", marginTop: 6, padding: "8px", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>}
        </div>
      </div>

      {/* Main Container Viewport Section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "100vh" }}>
        <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, height: 76, boxSizing: "border-box" }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: "var(--txt1)", margin: 0 }}>{currentNav?.label || "Dashboard"}</h1>
            <p style={{ fontSize: 12, color: "var(--txt3)", margin: "2px 0 0 0" }}>Welcome back, {user?.name}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {usage && (
              <div onClick={() => navigate("/pricing")} style={{ padding: "5px 12px", borderRadius: 20, background: `${planColor}15`, color: planColor, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${planColor}33` }}>
                💎 {usage.planName}
              </div>
            )}
            {usage && ["free", "basic"].includes(usage.planId?.toLowerCase()) && (
              <button onClick={() => navigate("/pricing")} style={{ padding: "9px 16px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                ⚡ Upgrade
              </button>
            )}
            <button className="btn-primary" style={{ fontSize: 13, padding: "9px 16px" }} onClick={() => navigate("/customers")}>+ View Customers</button>
          </div>
        </div>

        {/* View content window area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", background: "var(--bg1)" }}>
          <PWAInstallBanner />
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/customers/*" element={<CustomersPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/medicines" element={<MedicinesPage />} />
            <Route path="/invoice" element={<InvoicePage />} />
            <Route path="/expiry" element={<ExpiryPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
