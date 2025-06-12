import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaRegClock, FaFolderOpen, FaChartBar, FaChevronLeft, FaChevronRight, FaCalendar } from "react-icons/fa";
import styled from "styled-components";
import {DndContext,closestCenter,PointerSensor,useSensor,useSensors,} from "@dnd-kit/core";
import {arrayMove,SortableContext,useSortable,verticalListSortingStrategy,} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import logo from "../assets/Logo.png";

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

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(getInitialLinks);

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