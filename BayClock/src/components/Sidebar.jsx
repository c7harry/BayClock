import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaRegClock, FaFolderOpen, FaChartBar, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styled from "styled-components";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

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
          <span className="logo-square">Logo</span>
          {open && <span className="logo-text">Name</span>}
        </div>
        <div className="username-underline-container">
          {open && <div className="username-underline" />}
        </div>
        <nav className="nav-links">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""} ${open ? "open" : ""}`
            }
          >
            <FaHome size={open ? 24 : 32} />
            {open && <span>Dashboard</span>}
          </NavLink>
          <NavLink
            to="/tracker"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""} ${open ? "open" : ""}`
            }
          >
            <FaRegClock size={open ? 24 : 32} />
            {open && <span>Time Tracker</span>}
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""} ${open ? "open" : ""}`
            }
          >
            <FaFolderOpen size={open ? 24 : 32} />
            {open && <span>Projects</span>}
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""} ${open ? "open" : ""}`
            }
          >
            <FaChartBar size={open ? 24 : 32} />
            {open && <span>Reports</span>}
          </NavLink>
        </nav>
      </div>
    </StyledSidebar>
  );
}

const StyledSidebar = styled.div`
  position: relative;
  background: linear-gradient(to bottom, #fff 0%, #f7f7f7 100%);
  border-right: 1.5px solid #ececec;
  min-height: 100vh;
  width: ${({ open }) => (open ? "220px" : "64px")};
  transition: width 0.25s cubic-bezier(.4,0,.2,1);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-shadow: 2px 0 8px 0 rgba(0,0,0,0.04);
  z-index: 20;

  /* Dark mode styles */
  html.dark & {
    background: linear-gradient(to bottom, #23232a 0%, #18181b 100%);
    border-right: 1.5px solid #23232a;
    box-shadow: 2px 0 8px 0 rgba(0,0,0,0.18);
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
    justify-content: space-between;
    padding: 18px 0 12px 0;
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px 0 20px;
    min-height: 40px; 
    position: relative;
    overflow: hidden;
    transition: min-height 0.25s cubic-bezier(.4,0,.2,1), justify-content 0.25s;
    justify-content: ${({ open }) => (open ? "flex-start" : "center")};
  }

  .logo-square {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 35px;
    background: #ff6910;
    color: #fff;
    font-weight: bold;
    border-radius: 8px;
    font-size: 1.1rem;
    transition: background 0.3s;
  }
  html.dark & .logo-square {
    background: #ff9c4a;
    color: #23232a;
  }

  .logo-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.2s, margin 0.2s;
    opacity: ${({ open }) => (open ? 1 : 0)};
    margin-left: ${({ open }) => (open ? "8px" : "0")};
    max-width: ${({ open }) => (open ? "120px" : "0")};
    display: inline-block;
    color: #444;
  }
  html.dark & .logo-text {
    color: #f3f4f6;
  }

  .username-underline-container {
    height: 0;
    display: flex;
    align-items: flex-end;
    padding: 0 15px;
  }

  .username-underline {
    width: 100%;
    height: 4px;
    background: #ff6910;
    border-radius: 1px;
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 24px;
    flex: 1;
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 10px 18px;
    border-radius: 8px;
    color: #444;
    font-size: 1rem;
    font-weight: 500;
    transition: background 0.18s, color 0.18s, gap 0.18s;
    cursor: pointer;
    margin: 0 8px;
    background: transparent;
    svg {
      margin-right: ${({ open }) => (open ? "16px" : "0")};
      color: #bdbdbd;
      transition: color 0.18s;
    }
  }
  html.dark & .nav-link {
    color: #e5e7eb;
    background: transparent;
    svg {
      color: #888;
    }
  }
  .nav-link.open {
    gap: 16px;
  }
  .nav-link.active,
  .nav-link:hover {
    background: #ffe6d3;
    color: #ff6910;
    svg {
      color: #ff6910;
    }
  }
  html.dark & .nav-link.active,
  html.dark & .nav-link:hover {
    background: #2a2320;
    color: #ff9c4a;
    svg {
      color: #ff9c4a;
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