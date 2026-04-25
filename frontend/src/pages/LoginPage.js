import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ mobile: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.mobile, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%)" }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: 420, padding: "40px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="ring" style={{ width: 56, height: 56, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", margin: "0 auto 16px", fontSize: 26 }}>💊</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>MedTrack</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Pharmacy Management Suite</p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#ef4444", fontSize: 13 }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Mobile Number</label>
            <input className="input" type="tel" placeholder="10-digit mobile number" value={form.mobile}
              onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} required />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Password</label>
            <input className="input" type="password" placeholder="Your password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, padding: "13px" }}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#64748b" }}>
          New pharmacy? <Link to="/register" style={{ color: "#2563eb", fontWeight: 600 }}>Register here</Link>
        </div>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#94a3b8" }}>
          <Link to="/terms" style={{ color: "#94a3b8" }}>Terms & Conditions</Link>
          {" · "}
          <Link to="/privacy" style={{ color: "#94a3b8" }}>Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
