import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

// ── Mini Sparkline Bar Chart ──────────────────────────────────────────────────
function SparkBar({ data = [], color = "#2563eb", height = 48 }) {
  const max = Math.max(...data.map(d => d.value || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{
            width: "100%",
            height: `${Math.max((d.value / max) * height, 3)}px`,
            background: i === data.length - 1
              ? color
              : `${color}55`,
            borderRadius: "3px 3px 0 0",
            transition: "height 0.6s ease"
          }} />
          {d.label && (
            <div style={{ fontSize: 9, color: "var(--txt4)", whiteSpace: "nowrap" }}>{d.label}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, trend, trendLabel, onClick, sparkData }) {
  const isUp = trend > 0;
  const isDown = trend < 0;
  return (
    <div className="card" onClick={onClick}
      style={{
        padding: 20, cursor: onClick ? "pointer" : "default",
        borderTop: `3px solid ${color}`,
        transition: "transform 0.2s, box-shadow 0.2s",
        display: "flex", flexDirection: "column", gap: 10
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20
        }}>{icon}</div>
        {trend !== undefined && (
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            fontSize: 11, fontWeight: 700,
            color: isUp ? "#10b981" : isDown ? "#ef4444" : "var(--txt4)",
            background: isUp ? "rgba(16,185,129,0.1)" : isDown ? "rgba(239,68,68,0.1)" : "var(--bg3)",
            padding: "3px 8px", borderRadius: 20
          }}>
            {isUp ? "↑" : isDown ? "↓" : "→"} {Math.abs(trend)}%
            {trendLabel && <span style={{ fontWeight: 400, opacity: 0.8 }}> {trendLabel}</span>}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--txt1)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 4, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--txt4)", marginTop: 2 }}>{sub}</div>}
      </div>
      {sparkData && sparkData.length > 0 && (
        <SparkBar data={sparkData} color={color} height={36} />
      )}
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, sub, action, onAction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt1)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--txt4)", marginTop: 2 }}>{sub}</div>}
      </div>
      {action && (
        <button onClick={onAction} style={{
          fontSize: 12, color: "var(--primary)", fontWeight: 600,
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit"
        }}>{action} →</button>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const now       = new Date();
  const expiresAt = user?.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const daysLeft  = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 99;

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [analyticsRes, customersRes, invoicesRes, medicinesRes] = await Promise.allSettled([
        api.get("/analytics/dashboard"),
        api.get("/customers"),
        api.get("/invoice"),
        api.get("/medicines"),
      ]);

      const analytics  = analyticsRes.status  === "fulfilled" ? analyticsRes.value.data  : {};
      const customers  = customersRes.status  === "fulfilled" ? customersRes.value.data  : [];
      const invoices   = invoicesRes.status   === "fulfilled" ? invoicesRes.value.data   : [];
      const medicines  = medicinesRes.status  === "fulfilled" ? medicinesRes.value.data  : [];

      // ── Revenue calculations ─────────────────────────────────────
      const totalRevenue = invoices.reduce((s, inv) => s + parseFloat(inv.total_amount || 0), 0);

      // Monthly revenue (last 6 months)
      const monthlyRevMap = {};
      const monthlyCustomerMap = {};
      invoices.forEach(inv => {
        const d  = new Date(inv.purchase_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyRevMap[key] = (monthlyRevMap[key] || 0) + parseFloat(inv.total_amount || 0);
      });
      customers.forEach(c => {
        const d  = new Date(c.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyCustomerMap[key] = (monthlyCustomerMap[key] || 0) + 1;
      });

      // Build last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("default", { month: "short" });
        months.push({
          key, label,
          revenue:   monthlyRevMap[key]      || 0,
          customers: monthlyCustomerMap[key] || 0,
        });
      }

      // This month vs last month
      const thisMonth = months[5];
      const lastMonth = months[4];
      const revTrend  = lastMonth.revenue > 0
        ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
        : 0;
      const custTrend = lastMonth.customers > 0
        ? Math.round(((thisMonth.customers - lastMonth.customers) / lastMonth.customers) * 100)
        : 0;

      // Low stock medicines
      const lowStock = medicines.filter(m => (m.stock_qty || 0) <= (m.alert_qty || 10)).length;

      // Expiring soon (next 30 days)
      const expiringSoon = medicines.filter(m => {
        if (!m.expiry_date) return false;
        const diff = (new Date(m.expiry_date) - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
      }).length;

      // Top selling medicines from invoices
      const medSales = {};
      invoices.forEach(inv => {
        const items = typeof inv.items === "string" ? JSON.parse(inv.items || "[]") : (inv.items || []);
        items.forEach(item => {
          const name = item.name || item.medicineName || "Unknown";
          if (!medSales[name]) medSales[name] = { name, qty: 0, revenue: 0 };
          medSales[name].qty     += parseFloat(item.quantity || 0);
          medSales[name].revenue += parseFloat(item.itemTotal || 0);
        });
      });
      const topSelling = Object.values(medSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Recent invoices (last 5)
      const recentInvoices = [...invoices]
        .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
        .slice(0, 5);

      // Active customers (purchased in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeCustomerIds = new Set(
        invoices
          .filter(inv => new Date(inv.purchase_date) >= thirtyDaysAgo)
          .map(inv => inv.customer_id)
      );

      // Payment mode breakdown
      const paymentBreakdown = {};
      invoices.forEach(inv => {
        const mode = inv.payment_mode || "cash";
        paymentBreakdown[mode] = (paymentBreakdown[mode] || 0) + parseFloat(inv.total_amount || 0);
      });

      setData({
        totalCustomers:   customers.length,
        activeCustomers:  activeCustomerIds.size,
        totalRevenue,
        thisMonthRevenue: thisMonth.revenue,
        thisMonthCustomers: thisMonth.customers,
        revTrend,
        custTrend,
        totalInvoices:    invoices.length,
        totalMedicines:   medicines.length,
        lowStock,
        expiringSoon,
        months,
        topSelling,
        recentInvoices,
        paymentBreakdown,
        conditionMix:     analytics.conditionMix    || [],
        refillsDue:       analytics.refillsDue       || 0,
        avgOrderValue:    invoices.length > 0 ? (totalRevenue / invoices.length) : 0,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: 80, color: "var(--txt4)" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--txt1)" }}>Loading Dashboard...</div>
      <div style={{ fontSize: 13, color: "var(--txt4)", marginTop: 4 }}>Fetching real-time data</div>
    </div>
  );

  if (!data) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <button onClick={() => fetchData()} className="btn-primary">🔄 Retry</button>
    </div>
  );

  const maxRev  = Math.max(...data.months.map(m => m.revenue), 1);
  const maxCust = Math.max(...data.months.map(m => m.customers), 1);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Plan Expiry Alert ─────────────────────────────────── */}
      {daysLeft <= 7 && daysLeft > 0 && (
        <div style={{
          padding: "14px 20px",
          background: daysLeft <= 3 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
          border: `1px solid ${daysLeft <= 3 ? "#fca5a5" : "#fde68a"}`,
          borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: daysLeft <= 3 ? "#dc2626" : "#92400e" }}>
              {daysLeft <= 3 ? "🚨" : "⚠️"} Plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}!
            </div>
            <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 2 }}>
              Upgrade to keep your pharmacy running smoothly.
            </div>
          </div>
          <button onClick={() => navigate("/pricing")} className="btn-primary"
            style={{ whiteSpace: "nowrap", fontSize: 13 }}>
            Upgrade Now →
          </button>
        </div>
      )}

      {/* ── Last Updated ──────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: "var(--txt4)" }}>
          🟢 Live data · Updated {lastUpdated ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
        </div>
        <button onClick={() => fetchData(true)}
          style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none",
            cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Row 1: Key Stats ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard
          icon="💰" label="Total Revenue" color="#10b981"
          value={`₹${(data.totalRevenue / 1000).toFixed(1)}k`}
          sub={`This month: ₹${(data.thisMonthRevenue / 1000).toFixed(1)}k`}
          trend={data.revTrend} trendLabel="vs last month"
          onClick={() => navigate("/billing")}
          sparkData={data.months.map(m => ({ value: m.revenue, label: m.label }))}
        />
        <StatCard
          icon="👥" label="Total Customers" color="#2563eb"
          value={data.totalCustomers}
          sub={`${data.activeCustomers} active this month`}
          trend={data.custTrend} trendLabel="vs last month"
          onClick={() => navigate("/customers")}
          sparkData={data.months.map(m => ({ value: m.customers, label: m.label }))}
        />
        <StatCard
          icon="🧾" label="Total Invoices" color="#8b5cf6"
          value={data.totalInvoices}
          sub={`Avg order: ₹${data.avgOrderValue.toFixed(0)}`}
          onClick={() => navigate("/billing")}
        />
        <StatCard
          icon="🔔" label="Refills Due" color="#ef4444"
          value={data.refillsDue}
          sub={`${data.expiringSoon} medicines expiring soon`}
          onClick={() => navigate("/expiry")}
        />
      </div>

      {/* ── Row 2: Secondary Stats ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard
          icon="📅" label="This Month Revenue" color="#f59e0b"
          value={`₹${(data.thisMonthRevenue / 1000).toFixed(1)}k`}
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
          sub={`${data.lowStock} low stock alerts`}
          onClick={() => navigate("/medicines")}
        />
        <StatCard
          icon="✅" label="Active Customers" color="#2563eb"
          value={data.activeCustomers}
          sub="Purchased in last 30 days"
          onClick={() => navigate("/customers")}
        />
      </div>

      {/* ── Row 3: Revenue Chart + Payment Breakdown ──────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>

        {/* Monthly Revenue + Customers Chart */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader
            title="📈 Monthly Revenue & Growth"
            sub="Last 6 months comparison"
            action="View Billing" onAction={() => navigate("/billing")}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Revenue bars */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--txt4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Revenue (₹)</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                {data.months.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, color: "var(--txt4)", fontWeight: 600 }}>
                      {m.revenue > 0 ? `₹${(m.revenue / 1000).toFixed(1)}k` : "—"}
                    </div>
                    <div style={{
                      width: "100%",
                      height: `${Math.max((m.revenue / maxRev) * 90, m.revenue > 0 ? 4 : 0)}px`,
                      background: i === 5
                        ? "linear-gradient(180deg,#10b981,#059669)"
                        : i === 4
                        ? "linear-gradient(180deg,#34d399,#6ee7b7)"
                        : "var(--border)",
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.8s ease"
                    }} />
                    <div style={{ fontSize: 10, color: "var(--txt4)", fontWeight: 600 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer bars */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--txt4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>New Customers</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
                {data.months.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, color: "var(--txt4)" }}>
                      {m.customers > 0 ? m.customers : "—"}
                    </div>
                    <div style={{
                      width: "100%",
                      height: `${Math.max((m.customers / maxCust) * 50, m.customers > 0 ? 4 : 0)}px`,
                      background: i === 5
                        ? "linear-gradient(180deg,#3b82f6,#1d4ed8)"
                        : "var(--border)",
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.8s ease"
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="💳 Payment Modes" sub="Revenue by payment type" />
          {Object.keys(data.paymentBreakdown).length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--txt4)", fontSize: 13 }}>
              No payment data yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.entries(data.paymentBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([mode, amount], i) => {
                  const total   = Object.values(data.paymentBreakdown).reduce((a, b) => a + b, 0);
                  const pct     = total > 0 ? Math.round((amount / total) * 100) : 0;
                  const colors  = { cash: "#10b981", upi: "#3b82f6", card: "#8b5cf6", credit: "#f59e0b", cheque: "#ef4444" };
                  const color   = colors[mode] || "#64748b";
                  const icons   = { cash: "💵", upi: "📱", card: "💳", credit: "🏦", cheque: "📝" };
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{icons[mode] || "💰"}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--txt1)", textTransform: "capitalize" }}>{mode}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color }}>₹{amount.toFixed(0)}</div>
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

      {/* ── Row 4: Top Medicines + Recent Invoices ────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Top Selling Medicines */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader
            title="💊 Top Selling Medicines"
            sub="By total revenue generated"
            action="View All" onAction={() => navigate("/medicines")}
          />
          {data.topSelling.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--txt4)", fontSize: 13 }}>
              No sales data yet. Create invoices to see top medicines!
            </div>
          ) : (
            data.topSelling.map((m, i) => {
              const maxRev = data.topSelling[0]?.revenue || 1;
              const pct    = Math.round((m.revenue / maxRev) * 100);
              const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: `${colors[i]}20`,
                        color: colors[i], fontSize: 12, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>{i + 1}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--txt1)" }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "var(--txt4)" }}>{m.qty} units sold</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors[i] }}>
                      ₹{m.revenue.toFixed(0)}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Recent Invoices */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader
            title="🧾 Recent Invoices"
            sub="Latest transactions"
            action="View All" onAction={() => navigate("/billing")}
          />
          {data.recentInvoices.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--txt4)", fontSize: 13 }}>
              No invoices yet. Create your first invoice!
            </div>
          ) : (
            data.recentInvoices.map((inv, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < data.recentInvoices.length - 1 ? "1px solid var(--border2)" : "none"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(37,99,235,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16
                  }}>🧾</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                      {inv.invoice_number}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--txt4)" }}>
                      {inv.full_name} · {new Date(inv.purchase_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--txt1)" }}>
                    ₹{parseFloat(inv.total_amount).toFixed(0)}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    color: "#10b981", background: "rgba(16,185,129,0.1)",
                    padding: "2px 6px", borderRadius: 6, display: "inline-block", marginTop: 2
                  }}>
                    {inv.payment_mode}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Row 5: Condition Mix + Low Stock Alerts ───────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Condition Mix */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="🏥 Patient Condition Mix" sub="Distribution across your customers" />
          {data.conditionMix.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--txt4)", fontSize: 13 }}>
              No condition data recorded yet
            </div>
          ) : (
            data.conditionMix.slice(0, 6).map((c, i) => {
              const total = data.conditionMix.reduce((a, x) => a + parseInt(x.count || 0), 0);
              const pct   = total > 0 ? Math.round((parseInt(c.count) / total) * 100) : 0;
              const colors = ["#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--txt2)", fontWeight: 600, textTransform: "capitalize" }}>
                      {c.medical_condition || "Not specified"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--txt4)" }}>{c.count} patients</span>
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

        {/* Quick Actions */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="⚡ Quick Actions" sub="Common tasks at a glance" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "👤", label: "Add Customer",   color: "#2563eb", path: "/customers"  },
              { icon: "💊", label: "Add Medicine",   color: "#10b981", path: "/medicines"  },
              { icon: "🧾", label: "New Invoice",    color: "#8b5cf6", path: "/billing"    },
              { icon: "📦", label: "Check Expiry",   color: "#ef4444", path: "/expiry"     },
              { icon: "📣", label: "Send Campaign",  color: "#f59e0b", path: "/campaigns"  },
              { icon: "📊", label: "Export Data",    color: "#06b6d4", path: "/export"     },
            ].map((a, i) => (
              <button key={i} onClick={() => navigate(a.path)}
                style={{
                  padding: "12px 14px",
                  background: `${a.color}10`,
                  border: `1px solid ${a.color}30`,
                  borderRadius: 10, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  fontFamily: "inherit", transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${a.color}20`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${a.color}10`; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Alerts Summary */}
          {(data.lowStock > 0 || data.expiringSoon > 0) && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.lowStock > 0 && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "rgba(245,158,11,0.1)", border: "1px solid #fde68a",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>
                    ⚠️ {data.lowStock} medicine{data.lowStock > 1 ? "s" : ""} low on stock
                  </span>
                  <button onClick={() => navigate("/medicines")}
                    style={{ fontSize: 11, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    View →
                  </button>
                </div>
              )}
              {data.expiringSoon > 0 && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "rgba(239,68,68,0.1)", border: "1px solid #fecaca",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                    🚨 {data.expiringSoon} medicine{data.expiringSoon > 1 ? "s" : ""} expiring in 30 days
                  </span>
                  <button onClick={() => navigate("/expiry")}
                    style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    View →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
