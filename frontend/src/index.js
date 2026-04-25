import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UsageProvider } from "./context/UsageContext";
import LoginPage       from "./pages/LoginPage";
import RegisterPage    from "./pages/RegisterPage";
import PlanSelectPage  from "./pages/PlanSelectPage";
import Dashboard       from "./pages/Dashboard";
import TermsPage       from "./pages/TermsPage";
import PrivacyPage     from "./pages/PrivacyPage";
import NotFoundPage    from "./pages/NotFoundPage";
import PlanExpiredPage from "./pages/PlanExpiredPage";
import "./index.css";

const PrivateRoute = ({ children }) => {
  const { user, loading, refreshUser } = useAuth();

  if (loading) {
    return (
      <div className="loader-screen" style={{ flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:40 }}>💊</div>
        <div>Loading MedTrack...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // New user just registered — send to plan selection
  if (user.isNewUser) return <Navigate to="/select-plan" replace />;

  // Check plan expiry
  const now = new Date();
  const expiresAt = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const isExpired = expiresAt ? expiresAt < now : false;
  const daysLeft  = expiresAt ? Math.ceil((expiresAt - now) / (1000*60*60*24)) : 99;

  if (isExpired) {
    return (
      <PlanExpiredPage
        plan={user.plan}
        daysLeft={daysLeft}
        onRenewed={() => refreshUser().then(() => window.location.reload())}
      />
    );
  }

  return (
    <UsageProvider>
      {daysLeft <= 5 && daysLeft > 0 && (
        <div style={{
          background: daysLeft <= 2 ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "linear-gradient(135deg,#d97706,#b45309)",
          color:"white", padding:"10px 20px", textAlign:"center",
          fontSize:13, fontWeight:700, position:"fixed", top:0, left:0, right:0, zIndex:999,
        }}>
          ⚠️ Your {user.plan === "trial" ? "Free Trial" : `${user.plan} plan`} expires in {daysLeft} day{daysLeft!==1?"s":""}!{" "}
          <a href="/pricing" style={{ color:"white", textDecoration:"underline", fontWeight:900 }}>Renew Now →</a>
        </div>
      )}
      <div style={{ paddingTop: daysLeft <= 5 && daysLeft > 0 ? 38 : 0 }}>
        {children}
      </div>
    </UsageProvider>
  );
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"       element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"    element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/terms"       element={<TermsPage />} />
          <Route path="/privacy"     element={<PrivacyPage />} />
          <Route path="/select-plan" element={<PlanSelectPage />} />
          <Route path="/*"           element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="*"            element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
