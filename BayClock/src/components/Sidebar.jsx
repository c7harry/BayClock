import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaRegClock, FaFolderOpen, FaChevronLeft, FaChevronRight, FaCalendar, FaCog } from "react-icons/fa";
import styled, { css } from "styled-components";
import {DndContext,closestCenter,PointerSensor,useSensor,useSensors,} from "@dnd-kit/core";
import {arrayMove,SortableContext,useSortable,verticalListSortingStrategy,} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import logo from "../assets/Logo.png";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

const SIDEBAR_ORDER_KEY = "sidebarOrder";

const defaultLinks = [
  { to: "/dashboard", icon: FaHome, label: "Dashboard" },
  { to: "/tracker", icon: FaRegClock, label: "Time Tracker" },
  { to: "/projects", icon: FaFolderOpen, label: "Projects" },
  { to: "/calendar", icon: FaCalendar, label: "Calendar" },
];

// Helper to get links in saved order
function getInitialLinks() {
  const saved = localStorage.getItem(SIDEBAR_ORDER_KEY);
  if (!saved) return defaultLinks;
  try {
    const order = JSON.parse(saved);
    // Map saved order to link objects
    return order
      .map((to) => defaultLinks.find((l) => l.to === to))
      .filter(Boolean)
      // Add any new links not in saved order
      .concat(defaultLinks.filter(l => !order.includes(l.to)));
  } catch {
    return defaultLinks;
  }
}

// Sortable item for sidebar links
function SortableSidebarLink({ link, open, index }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.to });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
      }}
      {...attributes}
      {...listeners}
    >
      <NavLink
        to={link.to}
        className={({ isActive }) =>
          `nav-link ${isActive ? "active" : ""} ${open ? "open" : ""}`
        }
      >
        <link.icon size={open ? 24 : 34} />
        {open && <span>{link.label}</span>}
      </NavLink>
    </div>
  );
}

// --- Theme Switch Styled ---
const SwitchWrapper = styled.div`
  margin-right: 0;
  display: flex;
  align-items: center;
  /* Make the switch bigger */
  .theme-switch {
    --toggle-size: 20px;
    --container-width: 4.2em;
    --container-height: 2em;
    --container-radius: 2.2em;
    --container-light-bg: #3D7EAE;
    --container-night-bg: #1D1F2C;
    --circle-container-diameter: 2.1em;
    --sun-moon-diameter: 1.3em;
    --sun-bg: #ECCA2F;
    --moon-bg: #C4C9D1;
    --spot-color: #959DB1;
    --circle-container-offset: calc((var(--circle-container-diameter) - var(--container-height)) / 2 * -1);
    --stars-color: #fff;
    --clouds-color: #F3FDFF;
    --back-clouds-color: #AACADF;
    --transition: .3s cubic-bezier(0, -0.02, 0.4, 1.25);
    --circle-transition: .18s cubic-bezier(0, -0.02, 0.35, 1.17);
  }
  .theme-switch, .theme-switch *, .theme-switch *::before, .theme-switch *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-size: var(--toggle-size);
  }
  .theme-switch__container {
    width: var(--container-width);
    height: var(--container-height);
    background-color: var(--container-light-bg);
    border-radius: var(--container-radius);
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0em -0.062em 0.062em rgba(0, 0, 0, 0.15), 0em 0.062em 0.125em rgba(255, 255, 255, 0.7);
    transition: var(--transition);
    position: relative;
    box-shadow: 0 2px 14px 0 rgba(255, 104, 16, 0.6);
  }
  .theme-switch__container::before {
    content: "";
    position: absolute;
    z-index: 1;
    inset: 0;
    box-shadow: 0em 0.05em 0.187em rgba(0, 0, 0, 0.12) inset, 0em 0.05em 0.187em rgba(0, 0, 0, 0.12) inset;
    border-radius: var(--container-radius)
  }
  .theme-switch__checkbox {
    display: none;
  }
  .theme-switch__circle-container {
    width: var(--circle-container-diameter);
    height: var(--circle-container-diameter);
    background-color: rgba(255, 255, 255, 0.1);
    position: absolute;
    left: var(--circle-container-offset);
    top: var(--circle-container-offset);
    border-radius: var(--container-radius);
    box-shadow: inset 0 0 0 2em rgba(255, 255, 255, 0.1), 0 0 0 0.4em rgba(255,255,255,0.08);
    display: flex;
    transition: var(--circle-transition);
    pointer-events: none;
  }
  .theme-switch__sun-moon-container {
    pointer-events: auto;
    position: relative;
    z-index: 2;
    width: var(--sun-moon-diameter);
    height: var(--sun-moon-diameter);
    margin: auto;
    border-radius: var(--container-radius);
    background-color: var(--sun-bg);
    box-shadow: 0.062em 0.062em 0.062em 0em rgba(254, 255, 239, 0.61) inset, 0em -0.062em 0.062em 0em #a1872a inset;
    filter: drop-shadow(0.062em 0.125em 0.125em rgba(0, 0, 0, 0.18)) drop-shadow(0em 0.062em 0.125em rgba(0, 0, 0, 0.18));
    overflow: hidden;
    transition: var(--transition);
  }
  .theme-switch__moon {
    transform: translateX(100%);
    width: 100%;
    height: 100%;
    background-color: var(--moon-bg);
    border-radius: inherit;
    box-shadow: 0.062em 0.062em 0.062em 0em rgba(254, 255, 239, 0.41) inset, 0em -0.062em 0.062em 0em #969696 inset;
    transition: var(--transition);
    position: relative;
  }
  .theme-switch__spot {
    position: absolute;
    top: 0.3em;
    left: 0.11em;
    width: 0.22em;
    height: 0.22em;
    border-radius: var(--container-radius);
    background-color: var(--spot-color);
    box-shadow: 0em 0.0312em 0.062em rgba(0, 0, 0, 0.15) inset;
  }
  .theme-switch__spot:nth-of-type(2) {
    width: 0.13em;
    height: 0.13em;
    top: 0.42em;
    left: 0.41em;
  }
  .theme-switch__spot:nth-last-of-type(3) {
    width: 0.08em;
    height: 0.08em;
    top: 0.12em;
    left: 0.26em;
  }
  .theme-switch__clouds {
    width: 0.4em;
    height: 0.4em;
    background-color: var(--clouds-color);
    border-radius: var(--container-radius);
    position: absolute;
    bottom: -0.2em;
    left: 0.11em;
    box-shadow: 0.32em 0.11em var(--clouds-color), -0.11em -0.11em var(--back-clouds-color), 0.5em 0.13em var(--clouds-color), 0.18em -0.04em var(--back-clouds-color), 0.76em 0 var(--clouds-color), 0.41em -0.02em var(--back-clouds-color), 1.02em 0.11em var(--clouds-color), 0.7em -0.11em var(--back-clouds-color), 1.25em -0.02em var(--clouds-color), 0.9em 0em var(--back-clouds-color), 1.53em -0.11em var(--clouds-color), 1.14em -0.15em var(--back-clouds-color), 1.56em -0.6em 0 0.15em var(--clouds-color), 1.34em -0.21em var(--back-clouds-color), 1.37em -0.73em 0 0.15em var(--back-clouds-color);
    transition: 0.3s cubic-bezier(0, -0.02, 0.4, 1.25);
  }
  .theme-switch__stars-container {
    position: absolute;
    color: var(--stars-color);
    top: -100%;
    left: 0.11em;
    width: 0.9em;
    height: auto;
    transition: var(--transition);
  }
  .theme-switch__checkbox:checked + .theme-switch__container {
    background-color: var(--container-night-bg);
  }
  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container {
    left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter));
  }
  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container:hover {
    left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter) - 0.06em)
  }
  .theme-switch__circle-container:hover {
    left: calc(var(--circle-container-offset) + 0.06em);
  }
  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__moon {
    transform: translate(0);
  }
  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__clouds {
    bottom: -1.2em;
  }
  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__stars-container {
    top: 50%;
    transform: translateY(-50%);
  }
`;

// --- Theme Switch Button for Drawer ---
function ThemeSwitchInDrawer({ dark, setDark }) {
  return (
    <SwitchWrapper>
      <label className="theme-switch" title="Toggle light/dark mode">
        <input
          type="checkbox"
          className="theme-switch__checkbox"
          checked={dark}
          onChange={() => setDark((v) => !v)}
          aria-label="Toggle dark mode"
        />
        <div className="theme-switch__container">
          <div className="theme-switch__clouds" />
          <div className="theme-switch__stars-container">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z" fill="currentColor" />
            </svg>
          </div>
          <div className="theme-switch__circle-container">
            <div className="theme-switch__sun-moon-container">
              <div className="theme-switch__moon">
                <div className="theme-switch__spot" />
                <div className="theme-switch__spot" />
                <div className="theme-switch__spot" />
              </div>
            </div>
          </div>
        </div>
      </label>
    </SwitchWrapper>
  );
}

// --- Settings Drawer Content ---
function SettingsDrawerContent({ onClose, dark, setDark, onLogout }) {
  return (
    <Paper
      elevation={8}
      sx={{
        width: 280,
        minHeight: "100vh",
        bgcolor: dark ? "#18181b" : "#fff7ed",
        background: dark
          ? "linear-gradient(135deg, #18181b 60%, #23232a 100%)"
          : "linear-gradient(135deg, #fff7ed 60%, #ffe6d3 100%)",
        borderTopLeftRadius: 22,
        borderBottomLeftRadius: 22,
        boxShadow: dark
          ? "0 8px 32px 0 #0008, 0 1.5px 8px 0 #fff2"
          : "0 8px 32px 0 #ff691055, 0 1.5px 8px 0 #fff2",
        p: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 1,
          borderBottom: "1.5px solid",
          borderColor: dark ? "#23232a" : "#ffe6d3",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <FaCog size={22} color={dark ? "#fb923c" : "#fb923c"} />
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            color: dark ? "#fff" : "#18181b",
            letterSpacing: 0.5,
            fontSize: 22,
          }}
        >
          Settings
        </Typography>
      </Box>
      <Divider sx={{ borderColor: dark ? "#23232a" : "#ffe6d3" }} />
      <Box sx={{ px: 3, py: 2, flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center", // Center the switch
            mb: 2,
          }}
        >
          {/* Removed the "Dark Mode" text */}
          <ThemeSwitchInDrawer dark={dark} setDark={setDark} />
        </Box>
        <Divider sx={{ borderColor: dark ? "#23232a" : "#ffe6d3", mb: 2 }} />
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <LogoutButton onLogout={onLogout} />
        </Box>
      </Box>
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: "1.5px solid",
          borderColor: dark ? "#23232a" : "#ffe6d3",
          textAlign: "center",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: dark ? "#bbb" : "#b45309",
            fontWeight: 500,
            letterSpacing: 0.2,
          }}
        >
          BayClock &copy; {new Date().getFullYear()}
        </Typography>
      </Box>
    </Paper>
  );
}

// --- Logout Button for Drawer ---
function LogoutButton({ onLogout }) {
  return (
    <button
      style={{
        background: "linear-gradient(90deg, #0F2D52 0%, #fb923c 100%)",
        color: "#fff",
        padding: "8px 24px",
        borderRadius: "10px",
        fontWeight: 600,
        fontSize: "1.05em",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 2px 8px 0 rgba(15,45,82,0.08)",
        transition: "background 0.2s, color 0.2s",
      }}
      onClick={onLogout}
    >
      Logout
    </button>
  );
}

// --- Main Sidebar ---
export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(getInitialLinks);

  // Settings Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Theme state for switch
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // Save order to localStorage when links change
  useEffect(() => {
    localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(links.map(l => l.to)));
  }, [links]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // dnd-kit drag end handler
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = links.findIndex((l) => l.to === active.id);
      const newIndex = links.findIndex((l) => l.to === over.id);
      setLinks((links) => arrayMove(links, oldIndex, newIndex));
    }
  };

  // Logout handler
  const handleLogout = async () => {
    const { supabase } = await import("../supabaseClient");
    const { useNavigate } = await import("react-router-dom");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

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
        {/* DndContext for draggable nav links */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={links.map((l) => l.to)}
            strategy={verticalListSortingStrategy}
          >
            <nav className="nav-links">
              {links.map((link, idx) => (
                <SortableSidebarLink key={link.to} link={link} open={open} index={idx} />
              ))}
            </nav>
          </SortableContext>
        </DndContext>
        {/* Settings Button at the bottom */}
        <SidebarSettingsWrapper open={open}>
          <IconButton
            aria-label="Settings"
            size="large"
            onClick={() => setDrawerOpen(true)}
            sx={{
              bgcolor: "#fb923c",
              color: "#fff",
              "&:hover": { bgcolor: "#3D7EAE" },
              boxShadow: "0 2px 8px 0 rgba(61,126,174,0.18)",
              mb: 1,
              transition: "background 0.2s",
            }}
          >
            <FaCog size={open ? 22 : 26} />
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

const StyledSidebar = styled.div`
  position: relative;
  background: #0F2D52;
  min-height: 100vh;
  width: ${({ open }) => (open ? "220px" : "64px")};
  transition: width 0.25s cubic-bezier(.4,0,.2,1), background 0.3s;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-shadow: 2px 0 8px 0 rgba(0,0,0,0.04);
  z-index: 20;

  /* Dark mode styles */
  html.dark & {
    background: #0F2D52;
    box-shadow: 2px 0 8px 0 rgba(0,0,0,0.18);
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
    justify-content: flex-start;
    padding: 0 0 12px 0;
  }

  .logo-area {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 0px 0 0px 0;
    min-height: 40px;
    position: relative;
    overflow: hidden;
    transition: min-height 0.25s cubic-bezier(.4,0,.2,1), justify-content 0.25s;
  }

  .sidebar-logo {
    width: 55px;
    height: auto;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }

  @media (max-width: 600px) {
    .logo-area {
      padding: 6px 0 12px 0;
      min-height: 24px;
      justify-content: center;
    }
    .sidebar-logo {
      width: 28px;
    }
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    flex: 1;
  }
  .nav-link {
    display: flex;
    align-items: center;
    justify-content: ${({ open }) => (open ? "flex-start" : "center")};
    gap: 0;
    padding: ${({ open }) => (open ? "10px 18px" : "12px 0")};
    border-radius: 8px;
    color: white;
    font-size: 1rem;
    font-weight: 500;
    transition: background 0.18s, color 0.18s, gap 0.18s;
    cursor: pointer;
    margin: 0 8px;
    background: transparent;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    svg {
      margin-right: ${({ open }) => (open ? "16px" : "0")};
      color: white;
      transition: color 0.18s;
    }
  }
  html.dark & .nav-link {
    color: #d1d5db;
    background: transparent;
    svg {
      color: #d1d5db;
    }
  }
  .nav-link.open {
    gap: 16px;
  }
  .nav-link.active,
  .nav-link:hover {
    background: #ffe6d3;
    color: #fb923c;
    svg {
      color: #fb923c;
    }
  }
  html.dark & .nav-link.active,
  html.dark & .nav-link:hover {
    background: #2a2320;
    color: #fb923c;
    svg {
      color: #fb923c;
    }
  }

  @media (max-width: 600px) {
    width: ${({ open }) => (open ? "110px" : "36px")};
    min-width: ${({ open }) => (open ? "110px" : "36px")};
    .logo-area {
      padding: 6px 6px 6px 6px;
      min-height: 24px;
      min-width: 0;
    }
    .logo-square {
      width: 26px;
      height: 16px;
      font-size: 0.6rem;
    }
    .logo-text {
      font-size: 0.6rem;
      max-width: ${({ open }) => (open ? "32px" : "0")};
    }
    .nav-link {
      font-size: ${({ open }) => (open ? "0.50rem" : "0.85rem")};
      padding: ${({ open }) => (open ? "6px 4px" : "8px 0")};
      span {
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: inline-block;
      }
      svg {
        margin-right: ${({ open }) => (open ? "-8px" : "0")};
        font-size: 15px;
        min-width: 15px;
        min-height: 15px;
        display: inline-block;
      }
    }
    .nav-link .sidebar-icon {
      font-size: 15px;
      min-width: 15px;
      min-height: 15px;
      display: inline-block;
    }
  }
`;

const StyledWrapper = styled.div`
  .cta {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translate(-50%, -50%) skewX(-15deg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: rgb(252, 125, 51);
    transition: 0.25s;
    box-shadow: 2px 2px 0 #e0e0e0;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    z-index: 30;
  }

  .cta:focus {
    outline: none;
  }

  .cta:hover {
    box-shadow: 4px 4px 0 #fbc638;
    background: rgb(255, 94, 0);
  }

  .span {
    display: none;
  }

  .second {
    width: 18px;
    margin-left: 0;
    position: relative;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const SidebarSettingsWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: auto;
  margin-bottom: 10px;
  width: 100%;
  transition: width 0.25s;
  ${({ open }) => open ? "padding-left: 0;" : ""}
`;