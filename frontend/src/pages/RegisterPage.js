import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ pharmacyName:"", ownerName:"", mobile:"", email:"", password:"", city:"", state:"Maharashtra" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError(""); setLoading(true);
    try {
      await register(form);
      // AuthContext sets isNewUser=true → index.js redirects to /select-plan automatically
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0f172a,#1e1b4b)", padding:20 }}>
      <div className="card fade-in" style={{ width:"100%", maxWidth:480, padding:"40px" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div className="ring" style={{ width:52, height:52, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", margin:"0 auto 12px", fontSize:24 }}>💊</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#1e293b" }}>Register Your Pharmacy</h1>
          <p style={{ fontSize:13, color:"#94a3b8" }}>Free 15-day trial · No credit card required</p>
        </div>

        {error && (
          <div style={{ background:"#fef2f2", borderRadius:10, padding:"12px 16px", marginBottom:20, color:"#ef4444", fontSize:13 }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            ["pharmacyName","Pharmacy / Store Name","text","e.g. Sharma Medical Store"],
            ["ownerName","Owner Full Name","text","e.g. Ramesh Sharma"],
            ["mobile","Mobile Number","tel","10-digit number"],
            ["email","Email (optional)","email","owner@store.com"],
            ["city","City","text","e.g. Pune"],
            ["state","State","text","e.g. Maharashtra"],
            ["password","Password","password","Min 8 characters"],
          ].map(([key, label, type, placeholder]) => (
            <div key={key}>
              <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:5 }}>{label}</label>
              <input className="input" type={type} placeholder={placeholder} value={form[key]}
                onChange={set(key)} required={key !== "email"} />
            </div>
          ))}
          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop:8, padding:"13px" }}>
            {loading ? "Creating account..." : "Create Account & Choose Plan →"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#64748b" }}>
          Already registered? <Link to="/login" style={{ color:"#2563eb", fontWeight:600 }}>Sign in</Link>
        </div>
        <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#94a3b8" }}>
          <Link to="/terms" style={{ color:"#94a3b8" }}>Terms</Link> · <Link to="/privacy" style={{ color:"#94a3b8" }}>Privacy</Link>
        </div>
      </div>
    </div>
  );
}
