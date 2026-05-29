import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isStaff = currentUser?.role === "staff";

  // Derive unique platforms & properties
  const platforms = ["ALL", ...new Set((state.reviews || []).map(r => r.platform).filter(Boolean))];
  const properties = [
    "ALL",
    ...new Set(
      (
        state?.hotelConfig?.properties || []
      )
        .map(property => property.name)
        .filter(Boolean)
    ),
    ...new Set(
      (state.reviews || []).map(r => r.hotel_name).filter(Boolean)
    )
  ];

  // Create a unique array of properties
  const uniqueProperties = [...new Set(properties)];

  const selectedPlatform = state.activeFilters?.platform || "ALL";
  const selectedProperty = state.activeFilters?.property || "ALL";

  const handleFilterChange = (type, value) => {
    dispatch({ type: "SET_APP_LOADING", payload: true });
    dispatch({
      type: "SET_ACTIVE_FILTERS",
      payload: { [type]: value }
    });
    setTimeout(() => {
      dispatch({ type: "SET_APP_LOADING", payload: false });
    }, 600);
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Reviews", path: "/reviews", icon: MessageSquare },
    // { name: "Tickets", path: "/tickets", icon: Ticket },
    // ...(!isStaff ? [
    //   { name: "Import", path: "/import", icon: Upload },
    // ] : []),
    // { name: "Reports", path: "/reports", icon: FileText },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside className={`relative h-screen bg-white border-r border-zinc-200 transition-all duration-300 ${collapsed ? "w-20" : "w-64"} flex flex-col z-50`}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <ShieldCheck size={24} />
        </div>
        {!collapsed && <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">ReviewRescue</span>}
      </div>


      {!collapsed && (
        <div className=" px-2 space-y-4">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2">Select Property</h4>
          <div className="space-y-3">
            <div className="relative">
              <select
                value={selectedProperty}
                onChange={(e) => handleFilterChange("property", e.target.value)}
                className={`w-full h-9 pl-3 pr-7 text-xs rounded-xl border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${selectedProperty !== "ALL"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                  : "border-zinc-200 bg-white text-zinc-500"
                  }`}
              >
                {uniqueProperties.map(p => (
                  <option key={p} value={p}>{p === "ALL" ? "All Properties" : p}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => handleFilterChange("platform", e.target.value)}
                className={`w-full h-9 pl-3 pr-7 text-xs rounded-xl border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${selectedPlatform !== "ALL"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                  : "border-zinc-200 bg-white text-zinc-500"
                  }`}
              >
                {platforms.map(p => (
                  <option key={p} value={p}>{p === "ALL" ? "All Platforms" : p}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      )}
      <br />

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""} ${collapsed ? "justify-center px-0" : ""}`
            }
          >
            <item.icon size={22} />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}

      </nav>

      <div className="p-4 border-t border-zinc-200">
        {!collapsed && (
          <div className="mb-4 px-2 py-3 bg-zinc-50 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
              {currentUser?.avatar_initials || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{currentUser?.role?.replace("_", " ")}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all ${collapsed ? "justify-center px-0" : ""}`}
        >
          <LogOut size={22} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-white border border-zinc-200 rounded-full p-1 text-zinc-500 shadow-md hover:text-indigo-600 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
};

export default Sidebar;
