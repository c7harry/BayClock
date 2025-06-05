import { NavLink } from "react-router-dom";
import { FaHome, FaRegClock, FaFolderOpen, FaChartBar } from "react-icons/fa";

export default function Sidebar() {
  return (
    <div className="card w-72 bg-white p-5 shadow-md shadow-orange-200/50 rounded-md min-h-screen flex flex-col">
      <div className="w-full flex flex-col gap-2 flex-1">
        <div className="flex-center cursor-pointer w-full whitespace-nowrap">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-4 p-4 group font-semibold rounded-full bg-cover transition-all ease-linear
              hover:bg-orange-100 hover:shadow-inner focus:bg-gradient-to-r from-orange-400 to-orange-600 focus:text-white
              ${isActive ? "bg-orange-100 text-[#ff6910]" : "text-gray-700"}`
            }
          >
            <FaHome size={24} className="group-focus:text-white group-hover:text-[#ff6910] transition-colors" />
            Dashboard
          </NavLink>
        </div>
        <div className="flex-center cursor-pointer w-full whitespace-nowrap">
          <NavLink
            to="/tracker"
            className={({ isActive }) =>
              `flex items-center gap-4 p-4 group font-semibold rounded-full bg-cover transition-all ease-linear
              hover:bg-orange-100 hover:shadow-inner focus:bg-gradient-to-r from-orange-400 to-orange-600 focus:text-white
              ${isActive ? "bg-orange-100 text-[#ff6910]" : "text-gray-700"}`
            }
          >
            <FaRegClock size={24} className="group-focus:text-white group-hover:text-[#ff6910] transition-colors" />
            Time Tracker
          </NavLink>
        </div>
        <div className="flex-center cursor-pointer w-full whitespace-nowrap">
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `flex items-center gap-4 p-4 group font-semibold rounded-full bg-cover transition-all ease-linear
              hover:bg-orange-100 hover:shadow-inner focus:bg-gradient-to-r from-orange-400 to-orange-600 focus:text-white
              ${isActive ? "bg-orange-100 text-[#ff6910]" : "text-gray-700"}`
            }
          >
            <FaFolderOpen size={24} className="group-focus:text-white group-hover:text-[#ff6910] transition-colors" />
            Projects
          </NavLink>
        </div>
        <div className="flex-center cursor-pointer w-full whitespace-nowrap">
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex items-center gap-4 p-4 group font-semibold rounded-full bg-cover transition-all ease-linear
              hover:bg-orange-100 hover:shadow-inner focus:bg-gradient-to-r from-orange-400 to-orange-600 focus:text-white
              ${isActive ? "bg-orange-100 text-[#ff6910]" : "text-gray-700"}`
            }
          >
            <FaChartBar size={24} className="group-focus:text-white group-hover:text-[#ff6910] transition-colors" />
            Reports
          </NavLink>
        </div>
      </div>
    </div>
  );
}