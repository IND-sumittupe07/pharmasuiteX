import { useTheme } from "../context/ThemeContext";

export default function DarkModeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="dark-mode-toggle"
      title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDarkMode ? "Light mode" : "Dark mode"}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        background: "var(--color-primary)",
        color: "white",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
        transition: "all 0.3s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
      }}
    >
      {isDarkMode ? "☀️" : "🌙"}
    </button>
  );
}
