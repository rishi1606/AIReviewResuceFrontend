import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard, MessageSquare, Settings,
    LogOut, ChevronLeft, ChevronRight, ShieldCheck, X, Loader2,
    Building2, Globe, ChevronDown, Rocket, Plus, Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { Tooltip } from "./ui/Tooltip";

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [switching, setSwitching] = useState(false);
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

    const handleLogout = useCallback(() => {
        logout();
        navigate("/login");
    }, [logout, navigate]);

    const isStaff = currentUser?.role === "staff";

    // Derive unique platforms & properties
    const platforms = ["ALL", ...new Set((state.reviews || []).map(r => r.platform).filter(Boolean))];
    const properties = [
        "ALL",
        ...new Set((state?.hotelConfig?.properties || [])
            .filter(p => p.is_active !== false)
            .map(property => property.name).filter(Boolean)),
        ...new Set((state.managedProperties || [])
            .filter(p => p.is_active !== false && p.business_is_active !== false)
            .map(p => p.name).filter(Boolean)),
        ...new Set((state.reviews || []).map(r => r.hotel_name).filter(Boolean))
    ];
    const uniqueProperties = [...new Set(properties)];
    const propertyCount = uniqueProperties.length - 1; // exclude "ALL"

    const selectedPlatform = state.activeFilters?.platform || "ALL";
    const selectedProperty = state.activeFilters?.property || "ALL";

    const handleFilterChange = useCallback((type, value) => {
        setSwitching(true);
        dispatch({ type: "SET_APP_LOADING", payload: true });
        dispatch({ type: "SET_ACTIVE_FILTERS", payload: { [type]: value } });
        setTimeout(() => {
            dispatch({ type: "SET_APP_LOADING", payload: false });
            setSwitching(false);
        }, 800);
    }, [dispatch]);

    // Get user initials
    const userInitials = currentUser?.avatar_initials || (currentUser?.name ? currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U");
    const userRole = currentUser?.role?.replace("_", " ") || "User";

    const isSuperadmin = currentUser?.role === "superadmin";
    const isOwner = currentUser?.role === "owner";
    const isPropertyManager = currentUser?.role === "property_manager";

    const navItems = [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "Reviews", path: "/reviews", icon: MessageSquare },
        { name: "Settings", path: "/settings", icon: Settings },
        ...(isSuperadmin ? [{ name: "Admin Panel", path: "/admin", icon: ShieldCheck }] : []),
    ];

    const isCollapsedDesktop = !mobileOpen && collapsed;

    return (
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 h-screen bg-zinc-50 border-r border-zinc-200 transition-transform duration-300 ease-in-out flex flex-col ${mobileOpen ? "translate-x-0 w-64 shadow-2xl lg:shadow-none" : "-translate-x-full lg:translate-x-0 " + (collapsed ? "lg:w-20" : "lg:w-64")}`}>

            {/* ─── Logo ─── */}
            <div className="px-5 py-5 lg:py-6 flex items-center justify-between lg:justify-start gap-3">
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

            {/* ─── Filters ─── */}
            {(!collapsed || mobileOpen) && (
                <div className="px-4 mb-4">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Building2 size={13} className="text-zinc-400" />
                        <span className="text-[11px] font-semibold text-zinc-400 tracking-wide">Filters</span>
                    </div>
                    <div className="space-y-2">
                        {/* Property dropdown */}
                        <div className="relative">
                            <select
                                value={selectedProperty}
                                onChange={(e) => handleFilterChange("property", e.target.value)}
                                className={`w-full h-10 pl-3 pr-8 text-[12px] rounded-xl border-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all font-medium ${selectedProperty !== "ALL"
                                    ? "border-orange-300 bg-orange-50 text-orange-700 font-bold"
                                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                                    }`}
                            >
                                {uniqueProperties.map(p => (
                                    <option key={p} value={p}>{p === "ALL" ? `All Properties (${propertyCount})` : p}</option>
                                ))}
                            </select>
                            {switching ? (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500 pointer-events-none animate-spin" />
                            ) : (
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            )}
                        </div>

                        {/* Platform dropdown */}
                        <div className="relative">
                            <select
                                value={selectedPlatform}
                                onChange={(e) => handleFilterChange("platform", e.target.value)}
                                className={`w-full h-10 pl-3 pr-8 text-[12px] rounded-xl border-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all font-medium ${selectedPlatform !== "ALL"
                                    ? "border-orange-300 bg-orange-50 text-orange-700 font-bold"
                                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                                    }`}
                            >
                                {platforms.map(p => (
                                    <option key={p} value={p}>{p === "ALL" ? "All Platforms" : p}</option>
                                ))}
                            </select>
                            {switching ? (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500 pointer-events-none animate-spin" />
                            ) : (
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Divider ─── */}
            <div className="mx-4 border-t border-zinc-200 mb-2" />

            {/* ─── Navigation ─── */}
            <nav className="flex-1 px-3 space-y-1 mt-1 overflow-y-auto">
                {navItems.map((item) => {
                    const link = (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? "sidebar-link-active" : ""} ${isCollapsedDesktop ? "lg:justify-center lg:px-0" : ""}`
                            }
                        >
                            <item.icon size={20} className="shrink-0" />
                            {(!collapsed || mobileOpen) && <span className="truncate">{item.name}</span>}
                        </NavLink>
                    );

                    // Wrap collapsed nav items with Tooltip
                    if (isCollapsedDesktop) {
                        return (
                            <Tooltip key={item.path} content={item.name} position="right">
                                {link}
                            </Tooltip>
                        );
                    }
                    return <React.Fragment key={item.path}>{link}</React.Fragment>;
                })}

                {/* Divider before Coming Soon */}
                {(!collapsed || mobileOpen) && (
                    <div className="mt-3 mb-1 mx-1 border-t border-zinc-200" />
                )}
                {(!collapsed || mobileOpen) && (
                    <div className="px-1 pt-1">
                        <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase px-3">Coming Soon</span>
                    </div>
                )}
                {(() => {
                    const comingSoonLink = (
                        <NavLink
                            to="/coming-soon"
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? "sidebar-link-active" : ""} ${isCollapsedDesktop ? "lg:justify-center lg:px-0" : ""}`
                            }
                        >
                            <div className="relative">
                                <Rocket size={20} className="shrink-0" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full" style={{ animation: "pulse 2s infinite" }} />
                            </div>
                            {(!collapsed || mobileOpen) && <span className="truncate">What's Next</span>}
                        </NavLink>
                    );
                    if (isCollapsedDesktop) {
                        return <Tooltip content="What's Next" position="right">{comingSoonLink}</Tooltip>;
                    }
                    return comingSoonLink;
                })()}
            </nav>

            {/* ─── User Profile + Logout ─── */}
            <div className="p-4">
                {(!collapsed || mobileOpen) && (
                    <>
                        <div
                            className="px-3 py-3 bg-white rounded-xl flex items-center gap-3 border border-zinc-200 cursor-pointer hover:border-zinc-300 transition-colors mb-3"
                            onClick={() => navigate("/settings")}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && navigate("/settings")}
                        >
                            <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold text-sm border border-orange-200 shrink-0 shadow-sm">
                                {userInitials}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[13px] font-bold text-zinc-900 truncate">{currentUser?.name}</p>
                                <p className="text-[10px] text-zinc-400 font-semibold truncate capitalize">{userRole}</p>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="border-t border-zinc-200 mb-2 mx-1" />
                    </>
                )}

                {/* Logout button — opens modal */}
                <button
                    onClick={() => setConfirmLogout(true)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-zinc-400 font-semibold hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer ${isCollapsedDesktop ? "lg:justify-center lg:px-0" : ""}`}
                >
                    <LogOut size={18} className="shrink-0" />
                    {(!collapsed || mobileOpen) && <span className="text-[13px]">Logout</span>}
                </button>
            </div>

            {/* Collapse toggle */}
            <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"} position="right">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex absolute -right-3 top-20 bg-white border border-zinc-200 rounded-full p-1 text-zinc-400 shadow-sm hover:text-orange-500 hover:border-orange-200 transition-colors z-50 focus:outline-none cursor-pointer"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </Tooltip>

            {/* Logout Confirmation Modal — portaled to body so it centers over full viewport */}
            {confirmLogout && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setConfirmLogout(false)} />
                    <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ animation: "shScaleUp 200ms ease forwards" }}>
                        <div className="px-6 py-5 text-center">
                            <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <LogOut size={20} className="text-red-500" />
                            </div>
                            <h3 className="text-base font-bold text-zinc-900 mb-0.5">Logout</h3>
                            <p className="text-[13px] text-zinc-500 mb-5">Are you sure you want to logout?</p>
                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => setConfirmLogout(false)}
                                    className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-md shadow-red-500/20 cursor-pointer"
                                >
                                    Yes, logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </aside>
    );
};


export default Sidebar;
