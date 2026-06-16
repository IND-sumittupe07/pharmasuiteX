import { useTheme } from "../context/ThemeContext";

export default function DarkModeToggle() {
  const { isDarkmode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="dark-toggle"
      title={isDarkmode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDarkmode ? "Light mode" : "Dark mode"}
    >
      {isDarkmode ? "☀️" : "🌙"}
    </button>
  );
}
