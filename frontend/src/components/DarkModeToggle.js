import { useTheme } from "../context/ThemeContext";

export default function DarkModeToggle() {
  const { isDarkmode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="dark-toggle"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
