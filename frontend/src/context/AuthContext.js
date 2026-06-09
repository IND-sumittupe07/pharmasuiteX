import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("pharmasuitex_user")) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("pharmasuitex_token");
    if (token) {
      api.get("/auth/me")
        .then(res => {
          const u = res.data;
          // Preserve isNewUser flag if set
          const existing = JSON.parse(localStorage.getItem("pharmasuitex_user") || "{}");
          const merged = { ...u, isNewUser: existing.isNewUser || false };
          setUser(merged);
          localStorage.setItem("pharmasuitex_user", JSON.stringify(merged));
        })
        .catch(() => {
          localStorage.removeItem("pharmasuitex_token");
          localStorage.removeItem("pharmasuitex_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (mobile, password) => {
    const res = await api.post("/auth/login", { mobile, password });
    const u = { ...res.data.user, isNewUser: false };
    localStorage.setItem("pharmasuitex_token", res.data.token);
    localStorage.setItem("pharmasuitex_user", JSON.stringify(u));
    setUser(u);
    return u;
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    // Mark as new user so they get redirected to plan selection
    const u = { ...res.data.user, isNewUser: true };
    localStorage.setItem("pharmasuitex_token", res.data.token);
    localStorage.setItem("pharmasuitex_user", JSON.stringify(u));
    setUser(u);
    return res.data;
  };

  const clearNewUser = () => {
    const u = { ...user, isNewUser: false };
    localStorage.setItem("pharmasuitex_user", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("pharmasuitex_token");
    localStorage.removeItem("pharmasuitex_user");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      const u = { ...res.data, isNewUser: false };
      setUser(u);
      localStorage.setItem("pharmasuitex_user", JSON.stringify(u));
      return u;
    } catch { return null; }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading, refreshUser, clearNewUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
