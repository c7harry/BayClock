import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaRegClock, FaFolderOpen, FaChartBar, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styled from "styled-components";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`relative card bg-gradient-to-b from-orange-50 via-white to-orange-100 p-5 shadow-lg border-r-2 border-orange-200 rounded-md min-h-screen flex flex-col items-center transition-all duration-300 ${
        open ? "w-72" : "w-20"
      }`}
    >
      {/* Custom Drawer Toggle Button */}
      <StyledWrapper>
        <button
          className="cta absolute left-full top-1/2 -translate-y-1/2 z-10"
          style={{ width: "20px", height: "20px", padding: 0, marginLeft: "-10px" }} 
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          <span className="span" style={{ fontSize: 0, padding: 0 }}>
            {/* Hide text, only show arrow */}
          </span>
          <span className="second">
            {open ? (
              <FaChevronLeft size={18} color="#fff" />
            ) : (
              <FaChevronRight size={18} color="#fff" />
            )}
          </span>
        </button>
      </StyledWrapper>
      <div className="w-full flex flex-col items-center flex-1 justify-center gap-8">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center justify-center ${open ? "gap-4" : ""} px-3 py-2 my-2 group font-semibold rounded-full bg-cover transition-all ease-linear
            hover:bg-orange-100 hover:shadow-inner focus:bg-gradient-to-r from-orange-400 to-orange-600 focus:text-white
            ${isActive ? "bg-orange-100 text-[#ff6910] shadow" : "text-gray-700"}`
          }
        >
          <span className="pr-4 flex items-center justify-center">
            <FaHome size={40} className="group-focus:text-white group-hover:text-[#ff6910] transition-colors" />
          </span>
          {open && <span className="text-lg">Dashboard</span>}
        </NavLink>
        <NavLink
          to="/tracker"
          className={({ isActive }) =>
            `flex items-center justify-center ${open ? "gap-4" : ""} px-3 py-2 my-2 group font-semibold rounded-full bg-cover transition-all ease-linear
            hover:bg-orange-100 hover:shadow-inner focus:bg-gradient-to-r from-orange-400 to-orange-600 focus:text-white
            ${isActive ? "bg-orange-100 text-[#ff6910] shadow" : "text-gray-700"}`
          }
        >
          <span className="pr-4 flex items-center justify-center">
            <FaRegClock size={40} className="group-focus:text-white group-hover:text-[#ff6910] transition-colors" />
          </span>
          {open && <span className="text-lg">Time Tracker</span>}
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `flex items-center justify-center ${open ? "gap-4" : ""} px-3 py-2 my-2 group font-semibold rounded-full bg-cover transition-all ease-linear
            hover:bg-orange-100 hover:shadow-inner focus:bg-gradient-to-r from-orange-400 to-orange-600 focus:text-white
            ${isActive ? "bg-orange-100 text-[#ff6910] shadow" : "text-gray-700"}`
          }
        >
          <span className="pr-4 flex items-center justify-center">
            <FaFolderOpen size={40} className="group-focus:text-white group-hover:text-[#ff6910] transition-colors" />
          </span>
          {open && <span className="text-lg">Projects</span>}
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex items-center justify-center ${open ? "gap-4" : ""} px-3 py-2 my-2 group font-semibold rounded-full bg-cover transition-all ease-linear
            hover:bg-orange-100 hover:shadow-inner focus:bg-gradient-to-r from-orange-400 to-orange-600 focus:text-white
            ${isActive ? "bg-orange-100 text-[#ff6910] shadow" : "text-gray-700"}`
          }
        >
          <span className="pr-4 flex items-center justify-center">
            <FaChartBar size={40} className="group-focus:text-white group-hover:text-[#ff6910] transition-colors" />
          </span>
          {open && <span className="text-lg">Reports</span>}
        </NavLink>
      </div>
    </div>
  );
}

const StyledWrapper = styled.div`
  .cta {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background:rgb(252, 125, 51);
    transition: 1s;
    box-shadow: 4px 4px 0 black;
    transform: skewX(-15deg);
    border: none;
    cursor: pointer;
    border-radius: 50%;
    width: 32px;
    height: 32px;
  }

  .cta:focus {
    outline: none;
  }

  .cta:hover {
    transition: 0.5s;
    box-shadow: 7px 7px 0 #fbc638;
    background:rgb(255, 94, 0);
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