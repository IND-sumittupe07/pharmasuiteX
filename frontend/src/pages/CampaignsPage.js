import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const AUDIENCE_OPTIONS = [
  { value: "all",        label: "All Customers",        icon: "👥", desc: "Everyone in your database" },
  { value: "diabetes",   label: "Diabetes Patients",    icon: "🩸", desc: "Customers with diabetes condition" },
  { value: "hypertension", label: "BP / Hypertension",  icon: "❤️", desc: "Blood pressure patients" },
  { value: "thyroid",    label: "Thyroid Patients",     icon: "🦋", desc: "Thyroid condition customers" },
  { value: "asthma",     label: "Asthma / Respiratory", icon: "🫁", desc: "Respiratory condition customers" },
  { value: "senior",     label: "Senior Citizens (60+)", icon: "👴", desc: "Customers aged 60 and above" },
  { value: "new",        label: "New Customers",        icon: "✨", desc: "Joined in last 30 days" },
  { value: "highspend",  label: "High-Value Customers", icon: "💎", desc: "Total spend above ₹2000" },
];

const CHANNEL_OPTIONS = [
  { value: "sms",       label: "SMS Only",         icon: "📱", desc: "Standard text message to mobile" },
  { value: "whatsapp",  label: "WhatsApp Only",    icon: "📲", desc: "WhatsApp message (needs Twilio)" },
  { value: "both",      label: "SMS + WhatsApp",   icon: "📡", desc: "Both channels for maximum reach" },
];

const STATUS_STYLE = {
  draft:     { bg: "#f8fafc", color: "#64748b", label: "Draft" },
  scheduled: { bg: "#eff6ff", color: "#2563eb", label: "Scheduled" },
  active:    { bg: "#fffbeb", color: "#f59e0b", label: "Running" },
  completed: { bg: "#f0fdf4", color: "#10b981", label: "Sent ✓" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns]   = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState("list");      // list | create | detail
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [launching, setLaunching]   = useState({});
  const [toast, setToast]           = useState(null);

  // Create wizard state
  const [step, setStep]       = useState(1); // 1=template 2=audience 3=message 4=review
  const [form, setForm]       = useState({ name: "", message: "", targetFilter: "all", channel: "sms", templateId: "" });
  const [preview, setPreview] = useState({ count: 0, sampleNames: [] });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get("/campaigns"), api.get("/campaigns/templates")])
      .then(([c, t]) => { setCampaigns(c.data); setTemplates(t.data); })
      .catch(() => showToast("Failed to load campaigns", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fetch audience preview whenever filter changes
  useEffect(() => {
    if (view !== "create") return;
    setPreviewLoading(true);
    api.get(`/campaigns/audience-preview?filter=${form.targetFilter}`)
      .then(r => setPreview(r.data))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, [form.targetFilter, view]);

  const selectTemplate = (tpl) => {
    setForm(f => ({ ...f, templateId: tpl.id, message: tpl.message, name: f.name || tpl.label }));
    setStep(2);
  };

  const saveCampaign = async (launch = false) => {
    if (!form.name.trim() || !form.message.trim()) {
      showToast("Please fill campaign name and message", "error"); return;
    }
    setSaving(true);
    try {
      const res = await api.post("/campaigns", form);
      if (launch) {
        setLaunching(l => ({ ...l, [res.data.id]: true }));
        const lr = await api.post(`/campaigns/${res.data.id}/launch`);
        showToast(`🚀 Campaign launched! Sent to ${lr.data.sent} customers`);
        setLaunching(l => ({ ...l, [res.data.id]: false }));
      } else {
        showToast("✅ Campaign saved as draft");
      }
      load();
      setView("list");
      setForm({ name: "", message: "", targetFilter: "all", channel: "sms", templateId: "" });
      setStep(1);
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to save campaign", "error");
    } finally {
      setSaving(false);
    }
  };

  const launch = async (id) => {
    setLaunching(l => ({ ...l, [id]: true }));
    try {
      const res = await api.post(`/campaigns/${id}/launch`);
      showToast(`🚀 Sent to ${res.data.sent} customers! (${res.data.failed} failed)`);
      load();
    } catch { showToast("Launch failed", "error"); }
    finally { setLaunching(l => ({ ...l, [id]: false })); }
  };

  const duplicate = async (id) => {
    try { await api.post(`/campaigns/${id}/duplicate`); showToast("Campaign duplicated!"); load(); }
    catch { showToast("Failed to duplicate", "error"); }
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm("Delete this campaign?")) return;
    try { await api.delete(`/campaigns/${id}`); showToast("Deleted"); load(); }
    catch { showToast("Failed to delete", "error"); }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const totalSent    = campaigns.reduce((a, c) => a + (c.total_sent || 0), 0);
  const draftCount   = campaigns.filter(c => c.status === "draft").length;
  const sentCount    = campaigns.filter(c => c.status === "completed").length;

  // ─── Render: List View ──────────────────────────────────────────────────────
  if (view === "list") return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 100, padding: "14px 20px", borderRadius: 12,
          background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#bbf7d0"}`,
          color: toast.type === "error" ? "#dc2626" : "#16a34a",
          fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxWidth: 380 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            {campaigns.length} campaigns · {totalSent.toLocaleString()} messages sent
          </div>
        </div>
        <button className="btn-primary" style={{ padding: "11px 22px" }} onClick={() => { setView("create"); setStep(1); }}>
          + Create Campaign
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: "📣", color: "#2563eb", bg: "#eff6ff" },
          { label: "Drafts",          value: draftCount,       icon: "📝", color: "#64748b", bg: "#f8fafc" },
          { label: "Completed",       value: sentCount,        icon: "✅", color: "#10b981", bg: "#f0fdf4" },
          { label: "Messages Sent",   value: totalSent.toLocaleString(), icon: "📲", color: "#7c3aed", bg: "#f5f3ff" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 20, background: s.bg }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📣</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>No campaigns yet</div>
          <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>Create your first campaign to send offers, reminders, or greetings to your customers</div>
          <button className="btn-primary" onClick={() => { setView("create"); setStep(1); }}>+ Create First Campaign</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {campaigns.map(c => {
            const st = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
            const audience = AUDIENCE_OPTIONS.find(a => a.value === c.target_filter) || AUDIENCE_OPTIONS[0];
            const channel  = CHANNEL_OPTIONS.find(ch => ch.value === c.channel) || CHANNEL_OPTIONS[0];
            return (
              <div key={c.id} className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, transition: "all 0.2s" }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{new Date(c.created_at).toLocaleDateString("en-IN")}</div>
                  </div>
                  <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>
                    {st.label}
                  </span>
                </div>

                {/* Message preview */}
                <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, fontSize: 12, color: "#475569", lineHeight: 1.6, borderLeft: "3px solid #e2e8f0", fontStyle: "italic" }}>
                  "{c.message.substring(0, 90)}{c.message.length > 90 ? "..." : ""}"
                </div>

                {/* Meta chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                    {audience.icon} {audience.label}
                  </span>
                  <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                    {channel.icon} {channel.label}
                  </span>
                  {c.total_sent > 0 && (
                    <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>
                      ✓ {c.total_sent} sent
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  {(c.status === "draft" || c.status === "scheduled") ? (
                    <button className="btn-primary" style={{ flex: 1, fontSize: 12 }}
                      disabled={launching[c.id]} onClick={() => launch(c.id)}>
                      {launching[c.id] ? "Launching..." : "🚀 Launch Now"}
                    </button>
                  ) : (
                    <div style={{ flex: 1, padding: "10px", background: "#f0fdf4", borderRadius: 10, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                      ✅ {c.total_sent} messages sent
                    </div>
                  )}
                  <button onClick={() => duplicate(c.id)}
                    style={{ padding: "10px 12px", background: "#f1f5f9", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13 }} title="Duplicate">
                    📋
                  </button>
                  <button onClick={() => deleteCampaign(c.id)}
                    style={{ padding: "10px 12px", background: "#fef2f2", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13 }} title="Delete">
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Render: Create Wizard ─────────────────────────────────────────────────
  if (view === "create") {
    const charCount = form.message.length;
    const smsCount  = Math.ceil(charCount / 160) || 1;
    const selectedAudience = AUDIENCE_OPTIONS.find(a => a.value === form.targetFilter) || AUDIENCE_OPTIONS[0];
    const selectedChannel  = CHANNEL_OPTIONS.find(c => c.value === form.channel) || CHANNEL_OPTIONS[0];

    const steps = ["Template", "Audience", "Message", "Review & Send"];

    return (
      <div className="fade-in" style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", top: 20, right: 24, zIndex: 100, padding: "14px 20px", borderRadius: 12,
            background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#bbf7d0"}`,
            color: toast.type === "error" ? "#dc2626" : "#16a34a",
            fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
            {toast.msg}
          </div>
        )}

        {/* Wizard Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <button onClick={() => { setView("list"); setStep(1); setForm({ name: "", message: "", targetFilter: "all", channel: "sms", templateId: "" }); }}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#64748b", fontFamily: "inherit" }}>
            ← Back
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Create Campaign</div>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 0, marginBottom: 32, background: "#f1f5f9", borderRadius: 14, padding: 4 }}>
          {steps.map((s, i) => (
            <button key={i} onClick={() => i < step && setStep(i + 1)}
              style={{ flex: 1, padding: "10px 8px", border: "none", borderRadius: 10, cursor: i < step ? "pointer" : "default",
                fontFamily: "inherit", fontSize: 12, fontWeight: 700, transition: "all 0.2s",
                background: step === i + 1 ? "white" : "transparent",
                color: step === i + 1 ? "#2563eb" : step > i + 1 ? "#10b981" : "#94a3b8",
                boxShadow: step === i + 1 ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              <span style={{ marginRight: 4 }}>{step > i + 1 ? "✓" : i + 1}</span>{s}
            </button>
          ))}
        </div>

        {/* ── Step 1: Choose Template ── */}
        {step === 1 && (
          <div className="fade-in">
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Choose a message template</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Pick a template to start with — you can edit the message later</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => selectTemplate(t)}
                  style={{ padding: "18px 20px", border: `1.5px solid ${form.templateId === t.id ? "#2563eb" : "#e2e8f0"}`,
                    borderRadius: 14, background: form.templateId === t.id ? "#eff6ff" : "white",
                    cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: "inherit" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{t.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                    {t.message ? t.message.substring(0, 60) + "..." : "Write your own custom message"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Choose Audience ── */}
        {step === 2 && (
          <div className="fade-in">
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Who should receive this?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Select the target audience for your campaign</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {AUDIENCE_OPTIONS.map(a => (
                <button key={a.value} onClick={() => setForm(f => ({ ...f, targetFilter: a.value }))}
                  style={{ padding: "14px 16px", border: `1.5px solid ${form.targetFilter === a.value ? "#2563eb" : "#e2e8f0"}`,
                    borderRadius: 12, background: form.targetFilter === a.value ? "#eff6ff" : "white",
                    cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, fontFamily: "inherit", transition: "all 0.2s" }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.targetFilter === a.value ? "#2563eb" : "#1e293b" }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{a.desc}</div>
                  </div>
                  {form.targetFilter === a.value && <span style={{ marginLeft: "auto", color: "#2563eb", flexShrink: 0, fontSize: 16 }}>✓</span>}
                </button>
              ))}
            </div>

            {/* Live preview */}
            <div style={{ padding: 18, background: previewLoading ? "#f8fafc" : "#f0fdf4",
              border: `1px solid ${previewLoading ? "#e2e8f0" : "#bbf7d0"}`, borderRadius: 14 }}>
              {previewLoading ? (
                <div style={{ color: "#94a3b8", fontSize: 13 }}>Counting audience...</div>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a", marginBottom: 4 }}>
                    👥 {preview.count} customers will receive this
                  </div>
                  {preview.sampleNames.length > 0 && (
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Including: {preview.sampleNames.slice(0, 4).join(", ")}{preview.count > 4 ? ` and ${preview.count - 4} more` : ""}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1 }}>← Back</button>
              <button onClick={() => setStep(3)} className="btn-primary" style={{ flex: 2 }} disabled={preview.count === 0}>
                Continue with {preview.count} customers →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Compose Message ── */}
        {step === 3 && (
          <div className="fade-in">
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Compose your message</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Use <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{"{name}"}</code> and <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{"{store}"}</code> for personalization</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Campaign Name *</label>
                <input className="input" placeholder="e.g. Diabetes Week Offer - March 2026"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Message *</label>
                <textarea className="input" rows={5} placeholder="Write your message here..."
                  value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  style={{ resize: "vertical", lineHeight: 1.6 }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    Tip: Use {"{name}"} for customer name, {"{store}"} for your store name
                  </div>
                  <div style={{ fontSize: 11, color: charCount > 320 ? "#ef4444" : "#94a3b8", fontWeight: 600 }}>
                    {charCount} chars · {smsCount} SMS
                  </div>
                </div>
              </div>

              {/* Message preview */}
              {form.message && (
                <div style={{ padding: 16, background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>📱 PREVIEW (how it looks to customer)</div>
                  <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7 }}>
                    {form.message.replace(/{name}/gi, "Rahul ji").replace(/{store}/gi, "Sharma Medical")}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 8 }}>Channel</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {CHANNEL_OPTIONS.map(ch => (
                    <button key={ch.value} onClick={() => setForm(f => ({ ...f, channel: ch.value }))}
                      style={{ padding: "12px", border: `1.5px solid ${form.channel === ch.value ? "#2563eb" : "#e2e8f0"}`,
                        borderRadius: 10, background: form.channel === ch.value ? "#eff6ff" : "white",
                        cursor: "pointer", fontFamily: "inherit", textAlign: "center", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{ch.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: form.channel === ch.value ? "#2563eb" : "#374151" }}>{ch.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(2)} className="btn-secondary" style={{ flex: 1 }}>← Back</button>
              <button onClick={() => setStep(4)} className="btn-primary" style={{ flex: 2 }}
                disabled={!form.name.trim() || !form.message.trim()}>
                Review Campaign →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Send ── */}
        {step === 4 && (
          <div className="fade-in">
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Review and send</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Double-check everything before sending</div>

            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  ["📋 Campaign Name", form.name],
                  ["🎯 Target Audience", `${selectedAudience.icon} ${selectedAudience.label}`],
                  ["📡 Channel", `${selectedChannel.icon} ${selectedChannel.label}`],
                  ["👥 Will Reach", previewLoading ? "Loading..." : `${preview.count} customers`],
                ].map(([l, v], i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, padding: "14px 16px", background: "#f8fafc", borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>MESSAGE PREVIEW</div>
                <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.7, fontStyle: "italic" }}>
                  "{form.message.replace(/{name}/gi, "Rahul ji").replace(/{store}/gi, "Sharma Medical")}"
                </div>
              </div>

              {preview.count > 0 && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
                  ⚠️ This will send {preview.count} {form.channel === "both" ? `${preview.count * 2} messages (SMS + WhatsApp)` : "messages"}. You cannot undo this action.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} className="btn-secondary" style={{ flex: 1 }}>← Edit</button>
              <button onClick={() => saveCampaign(false)} className="btn-secondary" style={{ flex: 1 }} disabled={saving}>
                💾 Save as Draft
              </button>
              <button onClick={() => saveCampaign(true)}
                style={{ flex: 2, padding: "12px 20px", border: "none", borderRadius: 10, cursor: "pointer",
                  background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white",
                  fontWeight: 700, fontSize: 14, fontFamily: "inherit",
                  boxShadow: "0 4px 14px rgba(37,99,235,0.4)", opacity: saving ? 0.7 : 1 }}
                disabled={saving}>
                {saving ? "Sending..." : `🚀 Launch Now (${preview.count} customers)`}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
