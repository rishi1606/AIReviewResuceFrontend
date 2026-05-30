import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard, MessageSquare, Ticket, Upload, BarChart3, Settings,
    LogOut, ChevronLeft, ChevronRight, ShieldCheck, FileText, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const [collapsed, setCollapsed] = useState(false);
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { state, dispatch } = useAppContext();

    // Close mobile sidebar on route change
    useEffect(() => {
        if (mobileOpen) {
            setMobileOpen(false);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const isStaff = currentUser?.role === "staff";

    // Derive unique platforms & properties
    const platforms = ["ALL", ...new Set((state.reviews || []).map(r => r.platform).filter(Boolean))];
    const properties = [
        "ALL",
        ...new Set((state?.hotelConfig?.properties || []).map(property => property.name).filter(Boolean)),
        ...new Set((state.reviews || []).map(r => r.hotel_name).filter(Boolean))
    ];
    const uniqueProperties = [...new Set(properties)];

    const selectedPlatform = state.activeFilters?.platform || "ALL";
    const selectedProperty = state.activeFilters?.property || "ALL";

    const handleFilterChange = (type, value) => {
        dispatch({ type: "SET_APP_LOADING", payload: true });
        dispatch({ type: "SET_ACTIVE_FILTERS", payload: { [type]: value } });
        setTimeout(() => dispatch({ type: "SET_APP_LOADING", payload: false }), 600);
    };

    const navItems = [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "Reviews", path: "/reviews", icon: MessageSquare },
        { name: "Settings", path: "/settings", icon: Settings },
    ];

    return (
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 h-screen bg-white border-r border-zinc-200 transition-transform duration-300 ease-in-out flex flex-col ${mobileOpen ? "translate-x-0 w-64 shadow-2xl lg:shadow-none" : "-translate-x-full lg:translate-x-0 " + (collapsed ? "lg:w-20" : "lg:w-64")}`}>

            <div className="p-5 lg:p-6 flex items-center justify-between lg:justify-start gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
                        <ShieldCheck size={24} />
                    </div>
                    {(!collapsed || mobileOpen) && (
                        <span className="font-bold text-lg lg:text-xl tracking-tight bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent truncate">
                            ReviewRescue
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden p-2 text-zinc-400 hover:text-zinc-900 rounded-lg focus:outline-none"
                >
                    <X size={20} />
                </button>
            </div>

            {(!collapsed || mobileOpen) && (
                <div className="px-4 lg:px-2 space-y-4 mb-2">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Select Property</h4>
                    <div className="space-y-3">
                        <div className="relative">
                            <select
                                value={selectedProperty}
                                onChange={(e) => handleFilterChange("property", e.target.value)}
                                className={`w-full h-9 pl-3 pr-7 text-xs rounded-xl border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${selectedProperty !== "ALL"
                                    ? "border-orange-300 bg-orange-50 text-orange-700 font-bold"
                                    : "border-zinc-200 bg-white text-zinc-600"
                                    }`}
                            >
                                {uniqueProperties.map(p => (
                                    <option key={p} value={p}>{p === "ALL" ? "All Properties" : p}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none rotate-90" />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedPlatform}
                                onChange={(e) => handleFilterChange("platform", e.target.value)}
                                className={`w-full h-9 pl-3 pr-7 text-xs rounded-xl border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${selectedPlatform !== "ALL"
                                    ? "border-orange-300 bg-orange-50 text-orange-700 font-bold"
                                    : "border-zinc-200 bg-white text-zinc-600"
                                    }`}
                            >
                                {platforms.map(p => (
                                    <option key={p} value={p}>{p === "ALL" ? "All Platforms" : p}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none rotate-90" />
                        </div>
                    </div>
                </div>
            )}

            <nav className="flex-1 px-3 space-y-1 mt-4 lg:mt-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? "sidebar-link-active" : ""} ${!mobileOpen && collapsed ? "lg:justify-center lg:px-0" : ""}`
                        }
                    >
                        <item.icon size={20} className="shrink-0" />
                        {(!collapsed || mobileOpen) && <span className="truncate">{item.name}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-zinc-200">
                {(!collapsed || mobileOpen) && (
                    <div className="mb-4 px-3 py-3 bg-zinc-50 rounded-xl flex items-center gap-3 border border-zinc-100">
                        <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold shrink-0">
                            {currentUser?.avatar_initials || "U"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-zinc-900 truncate">{currentUser?.name}</p>
                            <p className="text-[10px] text-zinc-500 font-semibold truncate capitalize">{currentUser?.role?.replace("_", " ")}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 font-semibold hover:text-red-600 hover:bg-red-50 rounded-xl transition-all ${!mobileOpen && collapsed ? "lg:justify-center lg:px-0" : ""}`}
                >
                    <LogOut size={20} className="shrink-0" />
                    {(!collapsed || mobileOpen) && <span>Logout</span>}
                </button>
            </div>

            <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex absolute -right-3 top-20 bg-white border border-zinc-200 rounded-full p-1 text-zinc-400 shadow-sm hover:text-orange-500 hover:border-orange-200 transition-colors z-50 focus:outline-none"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
    );
};

export default Sidebar;
