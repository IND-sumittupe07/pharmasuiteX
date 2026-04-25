export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: "white", borderRadius: 20, padding: "40px 48px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔐</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>Privacy Policy</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>MedTrack Pharmacy Suite · Last updated: March 2026</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", background: "#eff6ff", borderRadius: 12, marginBottom: 28, fontSize: 13, color: "#1e40af", fontWeight: 500 }}>
          🔒 MedTrack is committed to protecting your privacy and the privacy of your customers. This policy explains what data we collect, how we use it, and your rights.
        </div>

        {[
          { title: "1. What Data We Collect", content: "We collect: (a) Account data — your name, mobile number, email, pharmacy name and location. (b) Business data — customer profiles, medicine records, purchase history that you enter. (c) Usage data — how you use the app, login times, feature usage (for improving the product). (d) Payment data — transaction IDs from Razorpay (we never store card numbers)." },
          { title: "2. How We Use Your Data", content: "We use your data to: provide and improve the MedTrack service, send refill reminders to your customers (only when you trigger them), process payments, send important service updates, and analyze usage patterns to improve features. We do NOT use your data for advertising or sell it to third parties." },
          { title: "3. Your Customers' Data", content: "When you store customer information in MedTrack, you become the data controller for that information. You are responsible for: obtaining customer consent, informing customers their data is stored digitally, handling customer data requests (access, deletion), and complying with applicable privacy laws." },
          { title: "4. Data Storage & Security", content: "Your data is stored on secure cloud servers in India. We use: encrypted connections (HTTPS/TLS), encrypted passwords (bcrypt), JWT tokens for authentication, regular security audits, and role-based access control. Despite these measures, no system is 100% secure. We will notify you promptly of any security breach." },
          { title: "5. Data Retention", content: "We retain your data as long as your account is active. After account deletion, we retain data for 30 days (for recovery) then permanently delete it. You can export all your data at any time from the Export page. Backups are retained for 90 days." },
          { title: "6. Third-Party Services", content: "We use these third-party services: Razorpay (payment processing — their privacy policy applies to payment data), Fast2SMS (SMS delivery — message content is shared), Interakt (WhatsApp delivery — message content is shared), Render.com (hosting). We share only the minimum data required for each service." },
          { title: "7. Your Rights", content: "You have the right to: access all data we hold about you, correct inaccurate data, export your data in CSV format, delete your account and all associated data, opt out of non-essential communications. Contact us at privacy@medtrack.in to exercise these rights." },
          { title: "8. Cookies", content: "MedTrack uses only essential cookies for authentication (keeping you logged in). We do not use advertising or tracking cookies. You can clear cookies in your browser settings, but this will log you out." },
          { title: "9. Children's Privacy", content: "MedTrack is designed for business use by adults. We do not knowingly collect personal information from children under 18. If you believe a minor has provided information, contact us immediately." },
          { title: "10. Changes to This Policy", content: "We will notify you of significant changes to this policy via email or in-app notification at least 7 days before they take effect. Continued use of MedTrack after changes indicates acceptance." },
          { title: "11. Contact & Grievances", content: "For privacy concerns or to exercise your rights, contact our Data Protection Officer: Email: privacy@medtrack.in | Phone: +91 98765 43210 | Address: MedTrack, [Your City], India. We will respond within 7 business days." },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{section.title}</div>
            <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8 }}>{section.content}</div>
          </div>
        ))}

        <div style={{ marginTop: 32, padding: 20, background: "#f0fdf4", borderRadius: 12, fontSize: 13, color: "#166534" }}>
          🔐 Your privacy matters to us. We handle all data with care and transparency.
        </div>
      </div>
    </div>
  );
}
