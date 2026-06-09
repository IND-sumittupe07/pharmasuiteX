import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", padding: 20 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>💊</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: "#e2e8f0", lineHeight: 1 }}>404</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginTop: 8, marginBottom: 12 }}>
          Page Not Found
        </div>
        <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 32 }}>
          Oops! The page you're looking for doesn't exist or has been moved.
          Let's get you back to your pharmacy dashboard.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => navigate("/")}
            style={{ padding: "13px 28px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(37,99,235,0.4)" }}>
            🏠 Go to Dashboard
          </button>
          <button onClick={() => navigate(-1)}
            style={{ padding: "13px 28px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
