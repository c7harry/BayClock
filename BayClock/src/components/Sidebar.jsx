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
import { SettingsDrawerContent, useThemeMode, } from "./Settings";
import { handleLogout } from "./Settings";
import { SidebarSettingsWrapper } from "./Settings";
import { StyledSidebar, StyledWrapper } from "./Settings";

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

// --- Main Sidebar ---
export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(getInitialLinks);

  // Settings Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Theme state for switch
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