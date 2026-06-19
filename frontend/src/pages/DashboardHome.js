import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

// ════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════

const safeNum = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const safeParseItems = (items) => {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try { return JSON.parse(items) || []; } catch { return []; }
  }
  return [];
};

const monthKey = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const formatINR = (val, decimals = 0) => {
  const n = safeNum(val);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toFixed(decimals)}`;
};

const fmtTime = (d) => d
  ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  : "—";

// ════════════════════════════════════════════════════════════════════════
// REUSABLE UI COMPONENTS
// ════════════════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, sub, color, trend, trendLabel, onClick, loading }) {
  const isUp   = trend !== undefined && trend !== null && trend > 0;
  const isDown = trend !== undefined && trend !== null && trend < 0;
  const hasTrend = trend !== undefined && trend !== null && Number.isFinite(trend);

  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: 20,
        cursor: onClick ? "pointer" : "default",
        borderTop: `3px solid ${color}`,
        transition: "transform 0.2s, box-shadow 0.2s",
        display: "flex", flexDirection: "column", gap: 10,
        minHeight: 110,
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>{icon}</div>

        {hasTrend && (
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            fontSize: 11, fontWeight: 700,
            color: isUp ? "#10b981" : isDown ? "#ef4444" : "var(--txt4)",
            background: isUp ? "rgba(16,185,129,0.1)" : isDown ? "rgba(239,68,68,0.1)" : "var(--bg3)",
            padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap",
          }}>
            {isUp ? "↑" : isDown ? "↓" : "→"} {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <div style={{ height: 26, width: 60, background: "var(--bg3)", borderRadius: 6, animation: "pulse 1.5s infinite" }} />
        ) : (
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--txt1)", lineHeight: 1.1, wordBreak: "break-word" }}>{value}</div>
        )}
        <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 6, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--txt4)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, action, onAction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--txt4)", marginTop: 2 }}>{sub}</div>}
      </div>
      {action && (
        <button onClick={onAction} style={{
          fontSize: 12, color: "var(--primary)", fontWeight: 600,
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
          whiteSpace: "nowrap", flexShrink: 0,
        }}>{action} →</button>
      )}
    </div>
  );
}

function EmptyState({ icon = "📭", text }) {
  return (
    <div style={{ textAlign: "center", padding: 32, color: "var(--txt4)", fontSize: 13 }}>
      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>{icon}</div>
      {text}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════════════

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [apiErrors, setApiErrors]     = useState([]);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const now       = new Date();
  const expiresAt = user?.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const daysLeft  = expiresAt && !isNaN(expiresAt.getTime())
    ? Math.ceil((expiresAt - now) / 86400000)
    : 99;

  // ── FETCH & COMPUTE ───────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!mountedRef.current) return;
    if (silent) setRefreshing(true); else setLoading(true);

    const errors = [];

    const [analyticsRes, customersRes, invoicesRes, medicinesRes] = await Promise.allSettled([
      api.get("/analytics/dashboard"),
      api.get("/customers"),
      api.get("/invoice"),
      api.get("/medicines"),
    ]);

    if (analyticsRes.status === "rejected") errors.push("analytics");
    if (customersRes.status === "rejected") errors.push("customers");
    if (invoicesRes.status  === "rejected") errors.push("invoices");
    if (medicinesRes.status === "rejected") errors.push("medicines");

    const analytics = analyticsRes.status === "fulfilled" ? (analyticsRes.value.data || {}) : {};
    const customers  = customersRes.status === "fulfilled" ? (Array.isArray(customersRes.value.data) ? customersRes.value.data : []) : [];
    const invoices   = invoicesRes.status  === "fulfilled" ? (Array.isArray(invoicesRes.value.data)  ? invoicesRes.value.data  : []) : [];
    const medicines  = medicinesRes.status === "fulfilled" ? (Array.isArray(medicinesRes.value.data) ? medicinesRes.value.data : []) : [];

    try {
      // ── Revenue & monthly aggregation ──────────────────────────────
      const totalRevenue = invoices.reduce((s, inv) => s + safeNum(inv.total_amount), 0);

      const monthlyRevMap   = {};
      const monthlyCustMap  = {};

      invoices.forEach(inv => {
        const key = monthKey(inv.purchase_date || inv.created_at);
        if (!key) return;
        monthlyRevMap[key] = (monthlyRevMap[key] || 0) + safeNum(inv.total_amount);
      });

      customers.forEach(c => {
        const key = monthKey(c.created_at);
        if (!key) return;
        monthlyCustMap[key] = (monthlyCustMap[key] || 0) + 1;
      });

      // Build a guaranteed 6-month timeline (oldest → newest)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1); // avoid month-length skew
        d.setMonth(d.getMonth() - i);
        const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("default", { month: "short" });
        months.push({
          key, label,
          revenue:   monthlyRevMap[key]  || 0,
          customers: monthlyCustMap[key] || 0,
        });
      }

      const thisMonth = months[months.length - 1];
      const lastMonth = months[months.length - 2] || { revenue: 0, customers: 0 };

      const revTrend = lastMonth.revenue > 0
        ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
        : (thisMonth.revenue > 0 ? 100 : 0);

      const custTrend = lastMonth.customers > 0
        ? Math.round(((thisMonth.customers - lastMonth.customers) / lastMonth.customers) * 100)
        : (thisMonth.customers > 0 ? 100 : 0);

      // ── Medicine stock & expiry ────────────────────────────────────
      const lowStock = medicines.filter(m => {
        const stock = safeNum(m.stock_qty, 0);
        const alert = safeNum(m.alert_qty, 10);
        return stock <= alert;
      }).length;

      const expiringSoon = medicines.filter(m => {
        if (!m.expiry_date) return false;
        const d = new Date(m.expiry_date);
        if (isNaN(d.getTime())) return false;
        const diffDays = (d - now) / 86400000;
        return diffDays >= 0 && diffDays <= 30;
      }).length;

      const expiredCount = medicines.filter(m => {
        if (!m.expiry_date) return false;
        const d = new Date(m.expiry_date);
        return !isNaN(d.getTime()) && d < now;
      }).length;

      // ── Top selling medicines (by revenue, from invoice line items) ─
      const medSales = {};
      invoices.forEach(inv => {
        const items = safeParseItems(inv.items);
        items.forEach(item => {
          const name = (item.name || item.medicineName || "Unknown").trim();
          if (!medSales[name]) medSales[name] = { name, qty: 0, revenue: 0 };
          medSales[name].qty     += safeNum(item.quantity);
          medSales[name].revenue += safeNum(item.itemTotal ?? (safeNum(item.quantity) * safeNum(item.unitPrice)));
        });
      });
      const topSelling = Object.values(medSales)
        .filter(m => m.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // ── Recent invoices ─────────────────────────────────────────────
      const recentInvoices = [...invoices]
        .filter(inv => inv.purchase_date)
        .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
        .slice(0, 5);

      // ── Active customers (purchased in last 30 days) ────────────────
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const activeCustomerIds = new Set(
        invoices
          .filter(inv => inv.purchase_date && new Date(inv.purchase_date) >= thirtyDaysAgo)
          .map(inv => inv.customer_id)
          .filter(Boolean)
      );

      // ── Payment mode breakdown ────────────────────────────────────
      const paymentBreakdown = {};
      invoices.forEach(inv => {
        const mode = (inv.payment_mode || "cash").toLowerCase();
        paymentBreakdown[mode] = (paymentBreakdown[mode] || 0) + safeNum(inv.total_amount);
      });

      // ── Condition mix (prefer backend, fallback to customers) ───────
      let conditionMix = Array.isArray(analytics.conditionMix) ? analytics.conditionMix : [];
      if (conditionMix.length === 0 && customers.length > 0) {
        const condMap = {};
        customers.forEach(c => {
          const cond = (c.medical_condition || "").trim();
          if (!cond) return;
          condMap[cond] = (condMap[cond] || 0) + 1;
        });
        conditionMix = Object.entries(condMap)
          .map(([medical_condition, count]) => ({ medical_condition, count }))
          .sort((a, b) => b.count - a.count);
      }

      const avgOrderValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;

      if (!mountedRef.current) return;

      setData({
        totalCustomers:     customers.length,
        activeCustomers:    activeCustomerIds.size,
        totalRevenue,
        thisMonthRevenue:   thisMonth.revenue,
        thisMonthCustomers: thisMonth.customers,
        revTrend,
        custTrend,
        totalInvoices:      invoices.length,
        totalMedicines:     medicines.length,
        lowStock,
        expiringSoon,
        expiredCount,
        months,
        topSelling,
        recentInvoices,
        paymentBreakdown,
        conditionMix,
        refillsDue:         safeNum(analytics.refillsDue, 0),
        avgOrderValue,
      });
      setLastUpdated(new Date());
      setApiErrors(errors);
    } catch (err) {
      console.error("Dashboard computation error:", err);
      if (mountedRef.current) setApiErrors([...errors, "computation"]);
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── LOADING STATE ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80, color: "var(--txt4)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--txt1)" }}>Loading Dashboard...</div>
        <div style={{ fontSize: 13, color: "var(--txt4)", marginTop: 4 }}>Fetching real-time data</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--txt1)", marginBottom: 16 }}>
          Couldn't load dashboard data
        </div>
        <button onClick={() => fetchData()} className="btn-primary">🔄 Retry</button>
      </div>
    );
  }

  const maxRev  = Math.max(...data.months.map(m => m.revenue), 1);
  const maxCust = Math.max(...data.months.map(m => m.customers), 1);
  const hasAnyRevenue    = data.months.some(m => m.revenue > 0);
  const hasAnyCustomers  = data.months.some(m => m.customers > 0);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Plan Expiry Alert ───────────────────────────────────────── */}
      {daysLeft <= 7 && daysLeft > 0 && (
        <div style={{
          padding: "14px 20px",
          background: daysLeft <= 3 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
          border: `1px solid ${daysLeft <= 3 ? "#fca5a5" : "#fde68a"}`,
          borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: daysLeft <= 3 ? "#dc2626" : "#92400e" }}>
              {daysLeft <= 3 ? "🚨" : "⚠️"} Plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}!
            </div>
            <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 2 }}>
              Upgrade to keep your pharmacy running smoothly.
            </div>
          </div>
          <button onClick={() => navigate("/pricing")} className="btn-primary" style={{ whiteSpace: "nowrap", fontSize: 13 }}>
            Upgrade Now →
          </button>
        </div>
      )}

      {/* ── API Error Banner (non-blocking) ────────────────────────── */}
      {apiErrors.length > 0 && (
        <div style={{
          padding: "10px 16px", borderRadius: 10,
          background: "rgba(245,158,11,0.08)", border: "1px solid #fde68a",
          fontSize: 12, color: "#92400e", fontWeight: 600,
        }}>
          ⚠️ Some data couldn't load ({apiErrors.join(", ")}) — showing partial results.
        </div>
      )}

      {/* ── Status Bar ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--txt4)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: refreshing ? "#f59e0b" : "#10b981",
            display: "inline-block",
            animation: refreshing ? "pulse 1s infinite" : "none",
          }} />
          {refreshing ? "Refreshing..." : "Live"} · Updated {fmtTime(lastUpdated)}
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing}
          style={{
            fontSize: 12, color: "var(--primary)", background: "none", border: "none",
            cursor: refreshing ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600,
            opacity: refreshing ? 0.5 : 1,
          }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Row 1: Primary Stats ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard
          icon="💰" label="Total Revenue" color="#10b981"
          value={formatINR(data.totalRevenue, 2)}
          sub={`This month: ${formatINR(data.thisMonthRevenue, 1)}`}
          trend={data.revTrend} onClick={() => navigate("/billing")}
        />
        <StatCard
          icon="👥" label="Total Customers" color="#2563eb"
          value={data.totalCustomers}
          sub={`${data.activeCustomers} active (30d)`}
          trend={data.custTrend} onClick={() => navigate("/customers")}
        />
        <StatCard
          icon="🧾" label="Total Invoices" color="#8b5cf6"
          value={data.totalInvoices}
          sub={`Avg: ${formatINR(data.avgOrderValue, 0)}/order`}
          onClick={() => navigate("/billing")}
        />
        <StatCard
          icon="🔔" label="Refills Due" color="#ef4444"
          value={data.refillsDue}
          sub={`${data.expiringSoon} expiring · ${data.expiredCount} expired`}
          onClick={() => navigate("/expiry")}
        />
      </div>

      {/* ── Row 2: Secondary Stats ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard
          icon="📅" label="This Month Revenue" color="#f59e0b"
          value={formatINR(data.thisMonthRevenue, 1)}
          sub="Current month earnings"
        />
        <StatCard
          icon="🆕" label="New Customers" color="#06b6d4"
          value={data.thisMonthCustomers}
          sub="Added this month"
        />
        <StatCard
          icon="💊" label="Total Medicines" color="#10b981"
          value={data.totalMedicines}
          sub={`${data.lowStock} low stock`}
          onClick={() => navigate("/medicines")}
        />
        <StatCard
          icon="✅" label="Active Customers" color="#2563eb"
          value={data.activeCustomers}
          sub="Purchased in last 30 days"
          onClick={() => navigate("/customers")}
        />
      </div>

      {/* ── Row 3: Charts ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 16 }}>

        <div className="card" style={{ padding: 24, minWidth: 0 }}>
          <SectionHeader title="📈 Monthly Revenue & Growth" sub="Last 6 months" action="View Billing" onAction={() => navigate("/billing")} />

          {!hasAnyRevenue && !hasAnyCustomers ? (
            <EmptyState icon="📊" text="No transactions yet — start billing to see trends here." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--txt4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Revenue (₹)
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                  {data.months.map((m, i) => (
                    <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: "var(--txt4)", fontWeight: 600 }}>
                        {m.revenue > 0 ? formatINR(m.revenue, 1) : "—"}
                      </div>
                      <div title={`${m.label}: ₹${m.revenue.toFixed(2)}`} style={{
                        width: "100%",
                        height: `${Math.max((m.revenue / maxRev) * 90, m.revenue > 0 ? 4 : 0)}px`,
                        background: i === data.months.length - 1
                          ? "linear-gradient(180deg,#10b981,#059669)"
                          : i === data.months.length - 2
                          ? "linear-gradient(180deg,#34d399,#6ee7b7)"
                          : "var(--border)",
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.8s ease",
                      }} />
                      <div style={{ fontSize: 10, color: "var(--txt4)", fontWeight: 600 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--txt4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  New Customers
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
                  {data.months.map((m, i) => (
                    <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: "var(--txt4)" }}>{m.customers > 0 ? m.customers : "—"}</div>
                      <div title={`${m.label}: ${m.customers} customers`} style={{
                        width: "100%",
                        height: `${Math.max((m.customers / maxCust) * 50, m.customers > 0 ? 4 : 0)}px`,
                        background: i === data.months.length - 1
                          ? "linear-gradient(180deg,#3b82f6,#1d4ed8)"
                          : "var(--border)",
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.8s ease",
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24, minWidth: 0 }}>
          <SectionHeader title="💳 Payment Modes" sub="Revenue by type" />
          {Object.keys(data.paymentBreakdown).length === 0 ? (
            <EmptyState text="No payment data yet" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.entries(data.paymentBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([mode, amount]) => {
                  const total  = Object.values(data.paymentBreakdown).reduce((a, b) => a + b, 0);
                  const pct    = total > 0 ? Math.round((amount / total) * 100) : 0;
                  const colors = { cash: "#10b981", upi: "#3b82f6", card: "#8b5cf6", credit: "#f59e0b", cheque: "#ef4444" };
                  const icons  = { cash: "💵", upi: "📱", card: "💳", credit: "🏦", cheque: "📝" };
                  const color  = colors[mode] || "#64748b";
                  return (
                    <div key={mode}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 16 }}>{icons[mode] || "💰"}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--txt1)", textTransform: "capitalize" }}>{mode}</span>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color }}>{formatINR(amount, 0)}</div>
                          <div style={{ fontSize: 10, color: "var(--txt4)" }}>{pct}%</div>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Top Medicines + Recent Invoices ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>

        <div className="card" style={{ padding: 24, minWidth: 0 }}>
          <SectionHeader title="💊 Top Selling Medicines" sub="By total revenue" action="View All" onAction={() => navigate("/medicines")} />
          {data.topSelling.length === 0 ? (
            <EmptyState icon="💊" text="No sales data yet. Create invoices to see top medicines!" />
          ) : (
            data.topSelling.map((m, i) => {
              const top  = data.topSelling[0]?.revenue || 1;
              const pct  = Math.round((m.revenue / top) * 100);
              const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];
              return (
                <div key={m.name + i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: `${colors[i]}20`, color: colors[i], fontSize: 12, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{i + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--txt1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "var(--txt4)" }}>{m.qty} units sold</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors[i], flexShrink: 0 }}>{formatINR(m.revenue, 0)}</div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="card" style={{ padding: 24, minWidth: 0 }}>
          <SectionHeader title="🧾 Recent Invoices" sub="Latest transactions" action="View All" onAction={() => navigate("/billing")} />
          {data.recentInvoices.length === 0 ? (
            <EmptyState icon="🧾" text="No invoices yet. Create your first invoice!" />
          ) : (
            data.recentInvoices.map((inv, i) => (
              <div key={inv.id || i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                padding: "10px 0",
                borderBottom: i < data.recentInvoices.length - 1 ? "1px solid var(--border2)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "rgba(37,99,235,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>🧾</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: 11, color: "var(--txt4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {inv.full_name || "Unknown"} · {new Date(inv.purchase_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--txt1)" }}>
                    {formatINR(inv.total_amount, 0)}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    color: "#10b981", background: "rgba(16,185,129,0.1)",
                    padding: "2px 6px", borderRadius: 6, display: "inline-block", marginTop: 2,
                  }}>
                    {inv.payment_mode || "cash"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Row 5: Condition Mix + Quick Actions ───────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>

        <div className="card" style={{ padding: 24, minWidth: 0 }}>
          <SectionHeader title="🏥 Patient Condition Mix" sub="Distribution across customers" />
          {data.conditionMix.length === 0 ? (
            <EmptyState icon="🏥" text="No condition data recorded yet" />
          ) : (
            data.conditionMix.slice(0, 6).map((c, i) => {
              const total = data.conditionMix.reduce((a, x) => a + safeNum(x.count), 0);
              const pct   = total > 0 ? Math.round((safeNum(c.count) / total) * 100) : 0;
              const colors = ["#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];
              return (
                <div key={(c.medical_condition || "unk") + i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--txt2)", fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.medical_condition || "Not specified"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: "var(--txt4)" }}>{c.count}</span>
                      <span style={{ fontSize: 12, color: colors[i % colors.length], fontWeight: 700 }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="card" style={{ padding: 24, minWidth: 0 }}>
          <SectionHeader title="⚡ Quick Actions" sub="Common tasks" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "👤", label: "Add Customer",  color: "#2563eb", path: "/customers" },
              { icon: "💊", label: "Add Medicine",  color: "#10b981", path: "/medicines" },
              { icon: "🧾", label: "New Invoice",   color: "#8b5cf6", path: "/billing"   },
              { icon: "📦", label: "Check Expiry",  color: "#ef4444", path: "/expiry"    },
              { icon: "📣", label: "Send Campaign", color: "#f59e0b", path: "/campaigns" },
              { icon: "📊", label: "Export Data",   color: "#06b6d4", path: "/export"    },
            ].map((a) => (
              <button key={a.path} onClick={() => navigate(a.path)}
                style={{
                  padding: "12px 14px", background: `${a.color}10`, border: `1px solid ${a.color}30`,
                  borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  fontFamily: "inherit", transition: "all 0.2s", minWidth: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${a.color}20`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${a.color}10`; }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: a.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</span>
              </button>
            ))}
          </div>

          {(data.lowStock > 0 || data.expiringSoon > 0 || data.expiredCount > 0) && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.lowStock > 0 && (
                <AlertRow color="#d97706" bg="rgba(245,158,11,0.1)" border="#fde68a"
                  text={`⚠️ ${data.lowStock} medicine${data.lowStock > 1 ? "s" : ""} low on stock`}
                  onClick={() => navigate("/medicines")} />
              )}
              {data.expiringSoon > 0 && (
                <AlertRow color="#dc2626" bg="rgba(239,68,68,0.1)" border="#fecaca"
                  text={`🚨 ${data.expiringSoon} expiring within 30 days`}
                  onClick={() => navigate("/expiry")} />
              )}
              {data.expiredCount > 0 && (
                <AlertRow color="#991b1b" bg="rgba(220,38,38,0.12)" border="#fca5a5"
                  text={`❌ ${data.expiredCount} medicine${data.expiredCount > 1 ? "s" : ""} already expired`}
                  onClick={() => navigate("/expiry")} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertRow({ color, bg, border, text, onClick }) {
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, background: bg, border: `1px solid ${border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{text}</span>
      <button onClick={onClick} style={{ fontSize: 11, color, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
        View →
      </button>
    </div>
  );
}
