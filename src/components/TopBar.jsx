import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import GlobalSearch from "./GlobalSearch";
import { Menu, User, Settings, LogOut, Loader2, RefreshCw } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";

// ─── Constants (outside component — stable across renders) ───────────────────

const ROUTE_MAP = [
  {
    match: (p) => p.startsWith("/dashboard"),
    title: "Hotel Performance",
    subtitle: (hotelName) => `Here's what's happening at ${hotelName} today.`,
  },
  {
    match: (p) => p.startsWith("/reviews"),
    title: "Guest Reviews",
    subtitle: () => "Monitor, analyze, and respond to your guests.",
  },
  {
    match: (p) => p.startsWith("/settings"),
    title: "Settings",
    subtitle: () => "Configure properties, team notifications, and automations.",
  },
  {
    match: (p) => p.startsWith("/tickets"),
    title: "Operations Tickets",
    subtitle: () => "Track automated escalations and guest request resolution.",
  },
  {
    match: (p) => p.startsWith("/reports") || p.startsWith("/analytics"),
    title: "Reports & Analytics",
    subtitle: () => "Visual trends and department breakdown insights.",
  },
];

const DEFAULT_ROUTE = {
  title: "ReviewRescue",
  subtitle: () => "Rescue reviews and protect hotel reputation.",
};

// ─── Pure helpers (outside component) ────────────────────────────────────────

const getInitials = (user) => {
  if (user?.avatar_initials) return user.avatar_initials;
  if (user?.name) {
    const parts = user.name.trim().split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return "U";
};

const formatRole = (role) =>
  role ? role.replace(/_/g, " ") : "";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const MobileMenuButton = React.memo(({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="lg:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg transition-colors"
    aria-label="Open navigation menu"
    aria-haspopup="true"
  >
    <Menu size={24} aria-hidden="true" />
  </button>
));
MobileMenuButton.displayName = "MobileMenuButton";

const PageHeading = React.memo(({ title, subtitle, greeting, syncing, onSync }) => (
  <div className="flex flex-col">
    <h1 className="text-lg md:text-xl font-bold text-zinc-900 font-display leading-tight">
      {title}
    </h1>
    {greeting && (
      <p className="hidden md:block text-[13px] text-zinc-500 font-normal mt-0.5">
        {greeting}
      </p>
    )}
    {subtitle && (
      <p className="hidden md:block text-[11px] md:text-xs text-zinc-400 font-normal mt-0.5">
        {subtitle}
      </p>
    )}

  </div>
));
PageHeading.displayName = "PageHeading";

// ─── Avatar Dropdown ─────────────────────────────────────────────────────────

const UserAvatarDropdown = React.memo(({ user, navigate, logout }) => {
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef(null);

  const initials = useMemo(() => getInitials(user), [user]);
  const role = useMemo(() => formatRole(user?.role), [user?.role]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = useCallback(() => {
    setShowLogoutModal(false);
    setOpen(false);
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const avatarButton = (
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      className="flex items-center gap-2.5 cursor-pointer focus:outline-none"
      aria-label={`Account options for ${user?.name ?? "User"}`}
      aria-haspopup="true"
      aria-expanded={open}
    >
      <div
        className="w-8 h-8 md:w-9 md:h-9 bg-orange-50 border border-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm shadow-sm select-none shrink-0"
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="hidden md:flex flex-col text-left">
        <span className="text-xs font-semibold text-zinc-800 leading-none">
          {user?.name ?? "—"}
        </span>
        {role && (
          <span className="text-[10px] text-zinc-400 capitalize mt-0.5">
            {role}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {open ? (
          avatarButton
        ) : (
          <Tooltip content="Account options" position="bottom">
            {avatarButton}
          </Tooltip>
        )}

        {open && (
          <div
            className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-50"
            style={{ minWidth: 160 }}
          >
            <button
              type="button"
              onClick={() => { setOpen(false); navigate("/settings"); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <User size={14} className="text-zinc-400" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); navigate("/settings"); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Settings size={14} className="text-zinc-400" />
              Settings
            </button>
            <div className="border-t border-zinc-100" />
            <button
              type="button"
              onClick={() => { setOpen(false); setShowLogoutModal(true); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} className="text-red-400" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal — portaled to body */}
      {showLogoutModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowLogoutModal(false)} />
          <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ animation: "shScaleUp 200ms ease forwards" }}>
            <div className="px-6 py-5 text-center">
              <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <LogOut size={20} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-0.5">Logout</h3>
              <p className="text-[13px] text-zinc-500 mb-5">Are you sure you want to logout?</p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowLogoutModal(false)}
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
    </>
  );
});
UserAvatarDropdown.displayName = "UserAvatarDropdown";

// ─── Main Component ───────────────────────────────────────────────────────────

const TopBar = ({ setMobileMenuOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { state } = useAppContext();
  const [syncing, setSyncing] = useState(false);

  const selectedProperty = state.activeFilters?.property ?? "ALL";
  const hotelName = selectedProperty === "ALL"
    ? "your properties"
    : selectedProperty;

  const { title, subtitle } = useMemo(() => {
    const path = location.pathname;
    const route = ROUTE_MAP.find((r) => r.match(path)) ?? DEFAULT_ROUTE;
    return {
      title: route.title,
      subtitle: route.subtitle(hotelName),
    };
  }, [location.pathname, hotelName]);

  const greeting = useMemo(() => {
    const displayName = currentUser?.name ?? currentUser?.displayName ?? "there";
    return `${getGreeting()}, ${displayName}`;
  }, [currentUser]);

  const handleMenuOpen = useCallback(() => {
    setMobileMenuOpen(true);
  }, [setMobileMenuOpen]);

  const handleSync = useCallback(() => {
    if (syncing) return;
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1500);
  }, [syncing]);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 lg:px-8 py-3 md:py-4 bg-white/95 backdrop-blur-sm border-b border-zinc-200/80 transition-all duration-300"
      role="banner"
    >
      <div className="flex items-center gap-3">
        <MobileMenuButton onClick={handleMenuOpen} />
        <PageHeading
          title={title}
          subtitle={subtitle}
          greeting={greeting}
          syncing={syncing}
          onSync={handleSync}
        />
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>

        <div className="h-8 w-px bg-zinc-200 hidden sm:block" aria-hidden="true" />

        <UserAvatarDropdown user={currentUser} navigate={navigate} logout={logout} />
      </div>
    </header>
  );
};

export default TopBar;