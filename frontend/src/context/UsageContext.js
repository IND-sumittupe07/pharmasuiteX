import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/client";

const UsageContext = createContext(null);

export const UsageProvider = ({ children }) => {
  const [usage, setUsage] = useState(null);

  const refresh = useCallback(() => {
    api.get("/plans/usage").then(r => setUsage(r.data)).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isAtLimit    = (r) => { if (!usage) return false; const u = usage[r]; if (!u) return false; if (u.limit === -1 || u.limit === Infinity) return false; return u.used >= u.limit; };
  const isNearLimit  = (r) => { if (!usage) return false; const u = usage[r]; if (!u) return false; if (u.limit === -1 || u.limit === Infinity) return false; return (u.used / u.limit) >= 0.8; };
  const hasFeature   = (f) => { if (!usage) return true; return usage.features?.[f] !== false; };
  const isPlanExpired = () => { if (!usage) return false; return usage.isExpired === true; };
  const getDaysLeft   = () => { if (!usage) return null; return usage.daysLeft; };

  return (
    <UsageContext.Provider value={{ usage, refresh, isAtLimit, isNearLimit, hasFeature, isPlanExpired, getDaysLeft }}>
      {children}
    </UsageContext.Provider>
  );
};

export const useUsage = () => useContext(UsageContext);
