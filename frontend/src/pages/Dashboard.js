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
  const planColor = planColors[usage?.planId] || "#64748b";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Outfit',sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 240 : 64, minHeight: "100vh", background: "white", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", transition: "width 0.3s", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div className="ring" style={{ width: 36, height: 36, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", flexShrink: 0, fontSize: 18 }}>💊</div>
          {sidebarOpen && <div><div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>MedTrack</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Pharmacy Suite</div></div>}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>{sidebarOpen ? "◀" : "▶"}</button>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
            const hasWarning = item.id === "customers" && (isAtLimit("customers") || isNearLimit("customers"));
            return (
              <button key={item.id} onClick={() => navigate(item.path)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  color: isActive ? "white" : item.highlight ? "#7c3aed" : "#64748b",
                  background: isActive ? (item.highlight ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "linear-gradient(135deg,#2563eb,#1d4ed8)") : item.highlight ? "#f5f3ff" : "transparent",
                }}>
                <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: "center" }}>{item.icon}</span>
                {sidebarOpen && <span style={{ fontSize: 14, fontWeight: item.highlight ? 700 : 500, flex: 1 }}>{item.label}</span>}
                {sidebarOpen && hasWarning && <span style={{ fontSize: 10, background: isAtLimit("customers") ? "#ef4444" : "#f59e0b", color: "white", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>{isAtLimit("customers") ? "FULL" : "!"}</span>}
                {sidebarOpen && item.highlight && !isActive && <span style={{ fontSize: 9, background: "#7c3aed", color: "white", padding: "2px 6px", borderRadius: 20, fontWeight: 700 }}>UPGRADE</span>}
              </button>
            );
          })}
        </nav>

        {/* Usage meter */}
        {sidebarOpen && usage?.usage && (
          <div style={{ margin: "0 8px 8px", padding: "12px 14px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" }}>Usage</div>
            {Object.entries(usage.usage || {}).slice(0, 2).map(([key, val]) => {
              const isInf = val.limit === Infinity || val.limit === -1 || val.limit === null;
              const p = isInf ? 0 : Math.min(100, Math.round((val.current / val.limit) * 100));
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{val.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p >= 80 ? "#ef4444" : "#64748b" }}>{val.current}/{isInf ? "∞" : val.limit}</span>
                  </div>
                  {!isInf && <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${p}%`, background: p >= 80 ? "#ef4444" : "#2563eb", borderRadius: 2 }}></div></div>}
                </div>
              );
            })}
            <button onClick={() => navigate("/pricing")} style={{ width: "100%", marginTop: 4, padding: "6px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              💎 Manage Plan
            </button>
          </div>
        )}

        <div style={{ padding: "12px 8px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
            <div className="ring" style={{ width: 32, height: 32, background: "linear-gradient(135deg,#10b981,#059669)", flexShrink: 0, fontSize: 14 }}>🏪</div>
            {sidebarOpen && <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.pharmacyName}</div>
              <div style={{ fontSize: 11, color: planColor, fontWeight: 600, textTransform: "uppercase" }}>● {usage?.planName || user?.plan || "free"}</div>
            </div>}
          </div>
          {sidebarOpen && <button onClick={logout} style={{ width: "100%", marginTop: 4, padding: "8px", background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: "white", borderBottom: "1px solid #f1f5f9", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: "#1e293b" }}>{currentNav?.label || "Dashboard"}</h1>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Welcome back, {user?.name}</p>
          </div>
          {usage && (
            <div onClick={() => navigate("/pricing")} style={{ marginLeft: 12, padding: "5px 12px", borderRadius: 20, background: `${planColor}15`, color: planColor, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${planColor}33` }}>
              💎 {usage.planName}
            </div>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            {usage && ["free", "basic"].includes(usage.planId) && (
              <button onClick={() => navigate("/pricing")} style={{ padding: "9px 16px", background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                ⚡ Upgrade Plan
              </button>
            )}
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => navigate("/customers/new")}>+ Add Customer</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
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
