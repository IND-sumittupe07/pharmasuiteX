export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: "white", borderRadius: 20, padding: "40px 48px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💊</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>Terms & Conditions</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>MedTrack Pharmacy Suite · Last updated: March 2026</div>
          </div>
        </div>

        {[
          { title: "1. Acceptance of Terms", content: "By registering and using MedTrack, you agree to these Terms and Conditions. If you do not agree, please do not use our service. These terms apply to all users including pharmacy owners and staff members." },
          { title: "2. Description of Service", content: "MedTrack is a pharmacy management software that helps medical store owners manage customer records, medicine inventory, refill reminders, and marketing campaigns. We provide this service on a subscription basis." },
          { title: "3. User Accounts", content: "You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate and complete information during registration. You are responsible for all activities that occur under your account. Notify us immediately if you suspect unauthorized access." },
          { title: "4. Subscription & Payments", content: "Paid plans are billed monthly in advance. Payments are processed securely via Razorpay. All prices are in Indian Rupees (INR) and include applicable taxes. Subscriptions auto-renew unless cancelled before the renewal date. Refunds are not provided for partial months." },
          { title: "5. Data Ownership", content: "You retain full ownership of all customer and business data you enter into MedTrack. We do not sell, share, or use your data for any purpose other than providing the service. You can export or delete your data at any time." },
          { title: "6. Customer Data & Privacy", content: "You are responsible for obtaining consent from your customers before storing their personal health information in MedTrack. You must comply with all applicable Indian laws regarding patient data privacy. Do not store sensitive financial or Aadhaar information in the system." },
          { title: "7. Prohibited Uses", content: "You may not use MedTrack for illegal purposes, to send spam or unsolicited messages, to store or distribute harmful content, to attempt to hack or compromise the system, or to resell the service without written permission." },
          { title: "8. Service Availability", content: "We aim for 99% uptime but do not guarantee uninterrupted service. We may perform maintenance that temporarily affects availability. We are not liable for losses due to service downtime." },
          { title: "9. Limitation of Liability", content: "MedTrack is a management tool and does not provide medical advice. We are not responsible for any medical decisions made based on data in the system. Our liability is limited to the amount paid for the service in the last month." },
          { title: "10. Termination", content: "We reserve the right to suspend or terminate accounts that violate these terms. You may cancel your subscription at any time from the Settings page. Upon termination, you can export your data within 30 days." },
          { title: "11. Changes to Terms", content: "We may update these terms from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the service after changes constitutes acceptance." },
          { title: "12. Contact", content: "For questions about these terms, contact us at legal@medtrack.in or call +91 98765 43210 (Mon–Sat, 9AM–6PM IST)." },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{section.title}</div>
            <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8 }}>{section.content}</div>
          </div>
        ))}

        <div style={{ marginTop: 32, padding: 20, background: "#f0fdf4", borderRadius: 12, fontSize: 13, color: "#166534" }}>
          ✅ By using MedTrack, you confirm that you have read, understood, and agree to these Terms & Conditions.
        </div>
      </div>
    </div>
  );
}
