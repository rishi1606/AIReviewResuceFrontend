import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import GlobalSearch from "./GlobalSearch";
import { Menu, User, Settings, LogOut, Loader2, RefreshCw, BrainCircuit, CheckCircle2, X, Bell, Star, AlertTriangle, ShieldAlert, MessageSquare, Sparkles, Clock, RotateCw, ChevronRight, Search } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";
import HelpModal from "./HelpModal";
import { getPendingStatus } from "../api/apiClient";

// ─── Constants (outside component — stable across renders) ───────────────────

const ROUTE_MAP = [
  {
    match: (p) => p.startsWith("/dashboard"),
    title: "Hotel Performance",
    subtitle: (hotelName) => `Here's what's happening at ${hotelName} today.`,
    helpPage: "dashboard",
  },
  {
    match: (p) => /^\/reviews\/[a-zA-Z0-9]+/.test(p),
    title: "Review Detail",
    subtitle: () => "Full review analysis, response drafting, and approval workflow.",
    helpPage: "reviewDetail",
  },
  {
    match: (p) => p.startsWith("/reviews"),
    title: "Guest Reviews",
    subtitle: () => "Monitor, analyze, and respond to your guests.",
    helpPage: "reviews",
  },
  {
    match: (p) => p.startsWith("/settings"),
    title: "Settings",
    subtitle: () => "Configure properties, team notifications, and automations.",
    helpPage: "settings",
  },
  {
    match: (p) => p.startsWith("/tickets"),
    title: "Operations Tickets",
    subtitle: () => "Track automated escalations and guest request resolution.",
    helpPage: null,
  },
  {
    match: (p) => p.startsWith("/reports") || p.startsWith("/analytics"),
    title: "Reports & Analytics",
    subtitle: () => "Visual trends and department breakdown insights.",
    helpPage: null,
  },
  {
    match: (p) => p.startsWith("/coming-soon"),
    title: "What's Next",
    subtitle: () => "Upcoming features and improvements on our roadmap.",
    helpPage: null,
  },
  {
    match: (p) => p.startsWith("/notifications"),
    title: "Notifications",
    subtitle: () => "All activity and alerts from your team.",
    helpPage: null,
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
  <div className="flex flex-col min-w-0">
    <h1 className="text-lg md:text-xl font-bold text-zinc-900 font-display leading-tight truncate">
      {title}
    </h1>
    {greeting && (
      <p className="hidden xl:block text-[13px] text-zinc-500 font-normal mt-0.5 truncate">
        {greeting}
      </p>
    )}
    {subtitle && (
      <p className="hidden xl:block text-[11px] md:text-xs text-zinc-400 font-normal mt-0.5 truncate">
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
            {/* <button
              type="button"
              onClick={() => { setOpen(false); navigate("/settings"); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <User size={14} className="text-zinc-400" />
              Profile
            </button> */}
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

// ─── Notification Bell ─────────────────────────────────────────────────────────

const NOTIF_ICONS = {
  import: { icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50' },
  classified: { icon: BrainCircuit, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  escalated: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  suspicious: { icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-50' },
  response: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50' },
  success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  info: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50' },
  default: { icon: Bell, color: 'text-zinc-500', bg: 'bg-zinc-50' }
};

const timeAgo = (ts) => {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationBell = React.memo(({ notifications, onMarkRead, onMarkAllRead, navigate }) => {
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (notif, idx) => {
    onMarkRead(idx);
    if (notif.link_to) {
      navigate(notif.link_to);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 flex flex-col"
          style={{ width: 360, maxHeight: 440, animation: 'shSlideDown 200ms ease forwards' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-zinc-500" />
              <span className="text-[13px] font-bold text-zinc-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto rounded-b-2xl">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-[12px] font-medium">No notifications yet</p>
                <p className="text-[11px] mt-0.5">Activity will appear here</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif, i) => {
                const cfg = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
                const Icon = cfg.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleClick(notif, i)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 cursor-pointer border-b border-zinc-50 last:border-0 group/notif ${!notif.read ? 'bg-orange-50/40' : ''
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={15} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] leading-snug ${!notif.read ? 'font-bold text-zinc-900' : 'font-medium text-zinc-600'}`}>
                        {notif.title || notif.message || 'Notification'}
                      </p>
                      {notif.title && notif.message && (
                        <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{notif.message}</p>
                      )}
                      <p className="text-[10px] text-zinc-300 mt-1">{timeAgo(notif.timestamp || notif.created_at)}</p>
                    </div>
                    {notif.link_to ? (
                      <ChevronRight size={14} className="text-zinc-300 shrink-0 mt-1.5 group-hover/notif:text-orange-500 transition-colors" />
                    ) : !notif.read ? (
                      <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {/* View All */}
          {notifications.length > 0 && (
            <div className="border-t border-zinc-100 px-4 py-2.5">
              <button
                onClick={() => { navigate('/notifications'); setOpen(false); }}
                className="w-full text-center text-[11px] font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
NotificationBell.displayName = 'NotificationBell';

// ─── Mobile Search Toggle ─────────────────────────────────────────────────────

const MobileSearchToggle = React.memo(({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
        aria-label="Search"
      >
        <Search size={18} />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[80] bg-white flex flex-col"
          style={{ animation: 'shSlideDown 200ms ease forwards' }}
        >
          <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-200">
            <div className="flex-1">
              {children}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});
MobileSearchToggle.displayName = 'MobileSearchToggle';

// ─── Main Component ───────────────────────────────────────────────────────────

const TopBar = ({ setMobileMenuOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { state, dispatch, refreshData, sendNotification, handleMarkNotificationRead, handleMarkAllRead } = useAppContext();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [pollInterval, setPollIntervalState] = useState(() => {
    const saved = localStorage.getItem('rr_poll_interval');
    return saved ? parseInt(saved) : 30;
  });
  const setPollInterval = (val) => { setPollIntervalState(val); localStorage.setItem('rr_poll_interval', val); };
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState('Just now');
  const prevPendingRef = useRef(null);
  const prevTotalRef = useRef(null);

  const selectedProperty = state.activeFilters?.property ?? "ALL";
  const hotelName = selectedProperty === "ALL"
    ? "your properties"
    : selectedProperty;

  const { title, subtitle, helpPage } = useMemo(() => {
    const path = location.pathname;
    const route = ROUTE_MAP.find((r) => r.match(path)) ?? DEFAULT_ROUTE;
    return {
      title: route.title,
      subtitle: route.subtitle(hotelName),
      helpPage: route.helpPage || null,
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

  // ── Auto-poll for pending reviews ──────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await getPendingStatus();
        if (!mounted) return;
        const { pendingCount: newPending, totalCount: newTotal } = res.data;

        setLastUpdated(Date.now());

        // Detect newly classified reviews
        if (prevPendingRef.current !== null && prevPendingRef.current > 0 && newPending < prevPendingRef.current) {
          const justClassified = prevPendingRef.current - newPending;
          setToast({ message: `${justClassified} review${justClassified > 1 ? 's' : ''} just classified!`, type: 'success' });
          refreshData();
        }

        // Detect new imports — notification only, no toast
        if (prevTotalRef.current !== null && newTotal > prevTotalRef.current) {
          const newImported = newTotal - prevTotalRef.current;
          sendNotification({
            type: 'import',
            title: `${newImported} new review${newImported > 1 ? 's' : ''} imported`,
            message: 'Reviews scraped and queued for classification.',
            timestamp: Date.now(),
            read: false,
            link_to: '/reviews'
          });
          refreshData();
        }

        prevPendingRef.current = newPending;
        prevTotalRef.current = newTotal;
        setPendingCount(newPending);
      } catch (e) { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, pollInterval * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, [refreshData, pollInterval]);

  // ── Update "Updated X ago" label every second ─────────────────────────────
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - lastUpdated) / 1000);
      if (diff < 5) setLastUpdatedLabel('Just now');
      else if (diff < 60) setLastUpdatedLabel(`${diff}s ago`);
      else setLastUpdatedLabel(`${Math.floor(diff / 60)}m ago`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const handleManualRefresh = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await getPendingStatus();
      const { pendingCount: newPending, totalCount: newTotal } = res.data;
      prevPendingRef.current = newPending;
      prevTotalRef.current = newTotal;
      setPendingCount(newPending);
      setLastUpdated(Date.now());
      refreshData();
    } catch (e) { /* silent */ }
    setSyncing(false);
  }, [syncing, refreshData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 md:py-3 bg-white/95 backdrop-blur-sm border-b border-zinc-200/80 transition-all duration-300"
        role="banner"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <MobileMenuButton onClick={handleMenuOpen} />
          <div className="flex items-center gap-1 min-w-0">
            <PageHeading
              title={title}
              subtitle={subtitle}
              greeting={greeting}
              syncing={syncing}
              onSync={handleSync}
            />
            {helpPage && <HelpModal page={helpPage} />}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Search — full on md+, icon toggle on smaller */}
          <div className="hidden md:block">
            <GlobalSearch />
          </div>
          <MobileSearchToggle>
            <GlobalSearch />
          </MobileSearchToggle>

          {/* Polling status + Refresh — only on xl+ (enough room with sidebar) */}
          <div className="hidden xl:flex items-center gap-1 bg-zinc-50/80 border border-zinc-200/80 rounded-full px-1.5 py-1 text-[11px]">
            <span className="flex items-center gap-1 px-2 text-zinc-400 font-medium select-none whitespace-nowrap">
              <CheckCircle2 size={11} className="text-emerald-400" />
              Updated {lastUpdatedLabel}
            </span>
            <div className="flex items-center bg-white border border-zinc-200 rounded-full overflow-hidden">
              {[
                { label: '30s', value: 30 },
                { label: '1m', value: 60 },
                { label: '5m', value: 300 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPollInterval(opt.value)}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold transition-all duration-200 cursor-pointer rounded-full ${pollInterval === opt.value
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  title={`Poll every ${opt.label}`}
                >
                  <Clock size={10} />
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={syncing}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-700 hover:bg-white rounded-full transition-all duration-200 cursor-pointer"
              title="Refresh now"
            >
              <RotateCw size={11} className={syncing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Mobile/tablet refresh icon */}
          <Tooltip content={`Updated ${lastUpdatedLabel}`} position="bottom">
            <button
              onClick={handleManualRefresh}
              disabled={syncing}
              className="xl:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
              aria-label={`Refresh — Updated ${lastUpdatedLabel}`}
            >
              <RotateCw size={18} className={syncing ? 'animate-spin' : ''} />
            </button>
          </Tooltip>

          {/* Notification Bell */}
          <NotificationBell notifications={state.notifications} onMarkRead={handleMarkNotificationRead} onMarkAllRead={handleMarkAllRead} navigate={navigate} />

          <div className="h-8 w-px bg-zinc-200 hidden md:block" aria-hidden="true" />

          <UserAvatarDropdown user={currentUser} navigate={navigate} logout={logout} />
        </div>
      </header>

      {/* Toast Notification */}
      {toast && createPortal(
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm ${toast.type === 'success'
            ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
            : 'bg-amber-50/95 border-amber-200 text-amber-800'
          }`}
          style={{ animation: 'shSlideDown 300ms ease forwards', minWidth: 280 }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          ) : (
            <BrainCircuit size={18} className="text-amber-500 shrink-0" />
          )}
          <span className="text-[13px] font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto text-zinc-400 hover:text-zinc-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

export default TopBar;