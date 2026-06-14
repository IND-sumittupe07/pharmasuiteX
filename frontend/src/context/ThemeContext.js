import { createContext, useContext, useEffect, useState } from "react";

// Create Theme Context
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    // Check for saved preference
    const saved = localStorage.getItem("theme-preference");
    
    // Check system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const shouldBeDark = saved ? saved === "dark" : prefersDark;
    
    setIsDarkMode(shouldBeDark);
    applyTheme(shouldBeDark);
    setIsLoaded(true);
  }, []);

  // Apply theme to document
  const applyTheme = (isDark) => {
    const html = document.documentElement;
    
    // Prevent transition flash on load
    html.classList.add("no-transition");
    
    if (isDark) {
      html.classList.add("dark-mode");
      localStorage.setItem("theme-preference", "dark");
    } else {
      html.classList.remove("dark-mode");
      localStorage.setItem("theme-preference", "light");
    }
    
    // Remove no-transition class after a brief delay
    setTimeout(() => {
      html.classList.remove("no-transition");
    }, 50);
  };

  // Toggle theme
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    applyTheme(newMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
