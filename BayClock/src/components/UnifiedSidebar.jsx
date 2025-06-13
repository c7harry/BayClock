import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  FaHome, FaRegClock, FaFolderOpen, FaCalendar,
  FaUserShield, FaListAlt, FaChevronLeft, FaChevronRight, FaCog
} from "react-icons/fa";
import logo from "../assets/Logo.png";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { SettingsDrawerContent, useThemeMode } from "./Settings";
import { handleLogout } from "./Settings";
import { SidebarSettingsWrapper } from "./Settings";
import { StyledSidebar, StyledWrapper } from "./Settings";

// Define links for each role
const userLinks = [
  { to: "/dashboard", icon: FaHome, label: "Dashboard" },
  { to: "/tracker", icon: FaRegClock, label: "Time Tracker" },
  { to: "/projects", icon: FaFolderOpen, label: "Projects" },
  { to: "/calendar", icon: FaCalendar, label: "Calendar" },
];
const adminLinks = [
  { to: "/admin", icon: FaUserShield, label: "Admin Panel" },
  { to: "/projects", icon: FaFolderOpen, label: "Projects" },
  { to: "/all-entries", icon: FaListAlt, label: "All Entries" },
];

export default function UnifiedSidebar({ role = "user" }) {
  const links = role === "admin" ? adminLinks : userLinks;
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dark, setDark] = useThemeMode();

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <StyledSidebar open={open}>
      {/* Drawer Toggle Button */}
      <StyledWrapper>
        <button
          className="cta"
          style={{
            left: open ? "calc(100% - 16px)" : "calc(100% - 16px)",
            top: "50%",
            transform: "translateY(-50%)",
          }}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          <span className="second">
            {open ? (
              <FaChevronLeft size={18} color="#fff" />
            ) : (
              <FaChevronRight size={18} color="#fff" />
            )}
          </span>
        </button>
      </StyledWrapper>
      <div className="sidebar-content">
        <div className="logo-area">
          <img src={logo} alt="BayClock Logo" className="sidebar-logo" />
        </div>
        <nav className="nav-links">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""} ${open ? "open" : ""}`
              }
            >
              <link.icon size={open ? 24 : 34} />
              {open && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>
        {/* Settings Button at the bottom */}
        <SidebarSettingsWrapper open={open}>
          <IconButton
            aria-label="Settings"
            size="large"
            onClick={() => setDrawerOpen(true)}
            sx={{
              bgcolor: role === "admin" ? "#3D7EAE" : "#fb923c",
              color: "#fff",
              "&:hover": { bgcolor: "#265b7a" },
              boxShadow: "0 2px 8px 0 rgba(61,126,174,0.18)",
              mb: 1,
              transition: "background 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "center" : "center",
              width: open ? "90%" : "48px",
              borderRadius: "8px",
              pl: open ? 2 : 0,
              pr: open ? 2 : 0,
            }}
          >
            <FaCog size={open ? 22 : 26} style={{ marginRight: open ? 16 : 0, transition: "margin 0.18s" }} />
            {open && (
              <span
                style={{
                  color: "#fff",
                  fontWeight: 500,
                  fontSize: "1rem",
                  letterSpacing: 0.2,
                  whiteSpace: "nowrap",
                  transition: "opacity 0.18s",
                }}
              >
                Settings
              </span>
            )}
          </IconButton>
        </SidebarSettingsWrapper>
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 18,
              borderBottomLeftRadius: 18,
              background: "none",
              backgroundColor: "transparent",
              boxShadow: 6,
              minHeight: "100vh",
            },
          }}
        >
          <SettingsDrawerContent
            onClose={() => setDrawerOpen(false)}
            dark={dark}
            setDark={setDark}
            onLogout={handleLogout}
          />
        </Drawer>
      </div>
    </StyledSidebar>
  );
}