import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pharma-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved ? saved === "dark" : prefersDark;
    setIsDark(shouldBeDark);
    applyTheme(shouldBeDark);
  }, []);

  const applyTheme = (dark) => {
    const html = document.documentElement;
    html.classList.add("no-transition");
    if (dark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("pharma-theme", dark ? "dark" : "light");
    setTimeout(() => html.classList.remove("no-transition"), 50);
  };

  const toggleTheme = () => {
    const newVal = !isDark;
    setIsDark(newVal);
    applyTheme(newVal);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
