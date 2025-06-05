import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const navStyle = "block py-2 px-4 hover:bg-gray-200 dark:hover:bg-gray-700";
  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-4">
      <nav className="space-y-2">
        <NavLink to="/dashboard" className={navStyle}>🏠 Dashboard</NavLink>
        <NavLink to="/tracker" className={navStyle}>⏱ Time Tracker</NavLink>
        <NavLink to="/projects" className={navStyle}>📁 Projects</NavLink>
        <NavLink to="/reports" className={navStyle}>📊 Reports</NavLink>
      </nav>
    </aside>
  );
}