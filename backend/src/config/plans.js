const PLANS = {
  trial: {
    id: "trial", name: "Free Trial", price: 0, priceLabel: "Free",
    duration: "15 days", color: "#64748b",
    badge: "TRIAL",
    limits: {
      customers: 25, campaigns: 2, smsPerMonth: 0, whatsappPerMonth: 0,
      exports: false, analytics: false, autoReminders: false, multiStaff: false, doctors: 3,
    },
    features: [
      { label: "Up to 25 customers", included: true },
      { label: "Basic dashboard", included: true },
      { label: "Manual reminders", included: true },
      { label: "2 campaigns", included: true },
      { label: "GST Billing", included: true },
      { label: "SMS reminders", included: false },
      { label: "WhatsApp messages", included: false },
      { label: "CSV Export", included: false },
      { label: "Advanced analytics", included: false },
    ],
  },
  basic: {
    id: "basic", name: "Basic", price: 299, priceLabel: "₹299",
    duration: "per month", color: "#2563eb",
    badge: "POPULAR",
    limits: {
      customers: 500, campaigns: 10, smsPerMonth: 200, whatsappPerMonth: 0,
      exports: true, analytics: false, autoReminders: true, multiStaff: false, doctors: 10,
    },
    features: [
      { label: "Up to 500 customers", included: true },
      { label: "Full dashboard", included: true },
      { label: "Auto refill reminders", included: true },
      { label: "200 SMS / month", included: true },
      { label: "10 campaigns", included: true },
      { label: "GST Billing + PDF", included: true },
      { label: "CSV Export", included: true },
      { label: "WhatsApp messages", included: false },
      { label: "Advanced analytics", included: false },
    ],
  },
  premium: {
    id: "premium", name: "Premium", price: 999, priceLabel: "₹999",
    duration: "per month", color: "#7c3aed",
    badge: "BEST VALUE",
    limits: {
      customers: Infinity, campaigns: Infinity, smsPerMonth: 1000, whatsappPerMonth: 500,
      exports: true, analytics: true, autoReminders: true, multiStaff: true, doctors: Infinity,
    },
    features: [
      { label: "Unlimited customers", included: true },
      { label: "Full dashboard + analytics", included: true },
      { label: "Auto refill reminders", included: true },
      { label: "1000 SMS + 500 WhatsApp/month", included: true },
      { label: "Unlimited campaigns", included: true },
      { label: "GST Billing + PDF", included: true },
      { label: "CSV Export", included: true },
      { label: "Advanced analytics", included: true },
      { label: "Multi-staff login", included: true },
    ],
  },
  enterprise: {
    id: "enterprise", name: "Enterprise", price: null, priceLabel: "Custom",
    duration: "contact us", color: "#059669",
    badge: "CUSTOM",
    limits: {
      customers: Infinity, campaigns: Infinity, smsPerMonth: Infinity, whatsappPerMonth: Infinity,
      exports: true, analytics: true, autoReminders: true, multiStaff: true, doctors: Infinity,
    },
    features: [
      { label: "Unlimited everything", included: true },
      { label: "Multi-branch support", included: true },
      { label: "Custom integrations", included: true },
      { label: "Dedicated support", included: true },
      { label: "Custom branding", included: true },
      { label: "SLA guarantee", included: true },
      { label: "On-premise option", included: true },
      { label: "Training & onboarding", included: true },
      { label: "API access", included: true },
    ],
  },
};

module.exports = PLANS;
