import React, { useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import GlobalSearch from "./GlobalSearch";
import { Menu } from "lucide-react";

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

const PageHeading = React.memo(({ title, subtitle }) => (
  <div className="flex flex-col">
    <h1 className="text-lg md:text-xl font-bold text-zinc-900 font-display leading-tight">
      {title}
    </h1>
    {subtitle && (
      <p className="hidden md:block text-[11px] md:text-xs text-zinc-400 font-normal mt-0.5">
        {subtitle}
      </p>
    )}
  </div>
));
PageHeading.displayName = "PageHeading";

const UserAvatar = React.memo(({ user }) => {
  const initials = useMemo(() => getInitials(user), [user]);
  const role = useMemo(() => formatRole(user?.role), [user?.role]);

  return (
    <div className="flex items-center gap-2.5" aria-label={`Logged in as ${user?.name ?? "User"}`}>
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
    </div>
  );
});
UserAvatar.displayName = "UserAvatar";

// ─── Main Component ───────────────────────────────────────────────────────────

const TopBar = ({ setMobileMenuOpen }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { state } = useAppContext();

  const hotelName = state.hotelConfig?.hotel_name ?? "your hotel";

  const { title, subtitle } = useMemo(() => {
    const path = location.pathname;
    const route = ROUTE_MAP.find((r) => r.match(path)) ?? DEFAULT_ROUTE;
    return {
      title: route.title,
      subtitle: route.subtitle(hotelName),
    };
  }, [location.pathname, hotelName]);

  const handleMenuOpen = useCallback(() => {
    setMobileMenuOpen(true);
  }, [setMobileMenuOpen]);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 lg:px-8 py-3 md:py-4 bg-white/95 backdrop-blur-sm border-b border-zinc-200/80 transition-all duration-300"
      role="banner"
    >
      <div className="flex items-center gap-3">
        <MobileMenuButton onClick={handleMenuOpen} />
        <PageHeading title={title} subtitle={subtitle} />
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>

        <div className="h-8 w-px bg-zinc-200 hidden sm:block" aria-hidden="true" />

        <UserAvatar user={currentUser} />
      </div>
    </header>
  );
};

export default TopBar;