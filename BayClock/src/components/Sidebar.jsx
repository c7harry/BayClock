import { useState } from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", icon: "🏠", label: "Dashboard" },
  { to: "/tracker", icon: "⏱", label: "Time Tracker" },
  { to: "/projects", icon: "📁", label: "Projects" },
  { to: "/reports", icon: "📊", label: "Reports" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className={`h-full bg-gray-100 dark:bg-gray-800 p-4 transition-all duration-300 flex flex-col ${
        open ? "w-72" : "w-20 items-center"
      }`}
    >
      <div className="flex-shrink-0" style={{ height: "15rem" }} />
      {/* Toggle Button */}
      <button
        className="mb-10 p-3 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        <span className="text-2xl">{open ? "⬅️" : "➡️"}</span>
      </button>
      {/* Navigation */}
      <nav className="space-y-8 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-4 py-4 px-2 rounded transition hover:bg-gray-200 dark:hover:bg-gray-700 ${
                isActive ? "bg-orange-100 dark:bg-orange-900 font-bold" : ""
              }`
            }
            title={!open ? item.label : undefined}
          >
            <span className="text-4xl">{item.icon}</span>
            {open && <span className="whitespace-nowrap text-lg">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}