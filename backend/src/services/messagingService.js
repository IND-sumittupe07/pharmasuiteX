// ─── MedTrack Messaging Service ───────────────────────────────────────────────
// Supports: Fast2SMS (SMS) + Interakt (WhatsApp)
// Falls back gracefully if not configured

const axios = require("axios");

// ── Fast2SMS ──────────────────────────────────────────────────────────────────
const sendSMS = async (mobile, message, apiKey) => {
  const key = apiKey || process.env.FAST2SMS_API_KEY;
  if (!key) {
    console.warn("⚠️  Fast2SMS not configured — SMS skipped");
    return { status: "skipped", reason: "Fast2SMS API key not set" };
  }
  // Clean mobile number
  const num = String(mobile).replace(/\D/g, "").replace(/^91/, "").slice(-10);
  try {
    const res = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",          // transactional route
        message,
        language: "english",
        flash: 0,
        numbers: num,
      },
      {
        headers: {
          authorization: key,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    if (res.data.return === true) {
      return { status: "sent", requestId: res.data.request_id };
    } else {
      return { status: "failed", error: res.data.message };
    }
  } catch (err) {
    console.error("Fast2SMS error:", err.response?.data || err.message);
    return { status: "failed", error: err.message };
  }
};

// ── Interakt WhatsApp ─────────────────────────────────────────────────────────
const sendWhatsApp = async (mobile, message, apiKey) => {
  const key = apiKey || process.env.INTERAKT_API_KEY;
  if (!key) {
    console.warn("⚠️  Interakt not configured — WhatsApp skipped");
    return { status: "skipped", reason: "Interakt API key not set" };
  }
  const num = String(mobile).replace(/\D/g, "");
  const fullNum = num.startsWith("91") ? num : `91${num.slice(-10)}`;
  try {
    const res = await axios.post(
      "https://api.interakt.ai/v1/public/message/",
      {
        countryCode: "+91",
        phoneNumber: num.slice(-10),
        callbackData: "medtrack_campaign",
        type: "Text",
        data: { message },
      },
      {
        headers: {
          Authorization: `Basic ${key}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    return { status: "sent", result: res.data };
  } catch (err) {
    console.error("Interakt error:", err.response?.data || err.message);
    return { status: "failed", error: err.message };
  }
};

// ── Bulk SMS sender ───────────────────────────────────────────────────────────
const sendBulkSMS = async (numbers, message, apiKey) => {
  const key = apiKey || process.env.FAST2SMS_API_KEY;
  if (!key) return { status: "skipped", reason: "Fast2SMS not configured" };
  const cleaned = numbers.map(n => String(n).replace(/\D/g, "").replace(/^91/, "").slice(-10));
  try {
    const res = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",
        message,
        language: "english",
        flash: 0,
        numbers: cleaned.join(","),
      },
      {
        headers: { authorization: key, "Content-Type": "application/json" },
        timeout: 30000,
      }
    );
    return res.data.return === true
      ? { status: "sent", count: cleaned.length, requestId: res.data.request_id }
      : { status: "failed", error: res.data.message };
  } catch (err) {
    return { status: "failed", error: err.message };
  }
};

module.exports = { sendSMS, sendWhatsApp, sendBulkSMS };
