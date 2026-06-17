import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import {
  Bell, CheckCircle2, AlertTriangle, Info, RotateCcw, Download,
  ChevronLeft, ChevronRight, Search, Check, ShieldOff
} from "lucide-react";

// Only show these user-facing action types
const ALLOWED_TYPES = ["success", "warning", "info", "import"];

const TYPE_CONFIG = {
  success:    { icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-600", dot: "bg-emerald-500", label: "Approved" },
  warning:    { icon: AlertTriangle, bg: "bg-amber-50", color: "text-amber-600", dot: "bg-amber-500", label: "Flagged" },
  info:       { icon: Info,          bg: "bg-blue-50",    color: "text-blue-500",    dot: "bg-blue-500",    label: "Update" },
  import:     { icon: Download,      bg: "bg-sky-50",     color: "text-sky-600",     dot: "bg-sky-500",     label: "New Reviews" },
};

const ITEMS_PER_PAGE = 15;

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const Notifications = () => {
  const navigate = useNavigate();
  const { state, handleMarkNotificationRead, handleMarkAllRead } = useAppContext();
  const allNotifications = state.notifications || [];

  // Filter only allowed types
  const notifications = useMemo(
    () => allNotifications.filter(n => ALLOWED_TYPES.includes(n.type)),
    [allNotifications]
  );

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (filter === "unread" && n.read) return false;
      if (filter === "read" && !n.read) return false;
      if (search) {
        const q = search.toLowerCase();
        const title = (n.title || "").toLowerCase();
        const msg = (n.message || "").toLowerCase();
        if (!title.includes(q) && !msg.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, filter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [filter, search]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Notifications</h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
            {unreadCount > 0 && <span className="ml-1 text-orange-600 font-bold">• {unreadCount} unread</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-[11px] w-48 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-orange-400 focus:bg-white transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
            {[
              { label: "All", value: "ALL" },
              { label: "Unread", value: "unread" },
              { label: "Read", value: "read" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-2 text-[11px] font-semibold transition-all cursor-pointer ${
                  filter === opt.value
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-all cursor-pointer"
            >
              <Check size={12} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_120px_100px_100px_60px] gap-3 px-5 py-3 bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          <span></span>
          <span>Activity</span>
          <span>Type</span>
          <span>Time</span>
          <span>Status</span>
          <span></span>
        </div>

        {/* Rows */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Bell size={32} className="mb-3 opacity-15" />
            <p className="text-[13px] font-medium">No notifications</p>
            <p className="text-[11px] mt-1">{search ? "Try different keywords" : "Activity will show up here"}</p>
          </div>
        ) : (
          paginated.map((notif, i) => {
            const globalIdx = allNotifications.indexOf(notif);
            const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
            const Icon = cfg.icon;

            // Determine action label from title/type
            let actionLabel = cfg.label;
            const t = (notif.title || "").toLowerCase();
            if (t.includes("approved")) actionLabel = "Approved";
            else if (t.includes("flagged")) actionLabel = "Flagged";
            else if (t.includes("reopened")) actionLabel = "Reopened";
            else if (t.includes("flag removed")) actionLabel = "Unflagged";
            else if (notif.type === "import" || t.includes("imported")) actionLabel = "New Reviews";

            const actionIcon = {
              "Approved": CheckCircle2,
              "Flagged": AlertTriangle,
              "Reopened": RotateCcw,
              "Unflagged": ShieldOff,
              "New Reviews": Download,
            };
            const ActionIcon = actionIcon[actionLabel] || Icon;

            return (
              <div
                key={notif._id || `${notif.timestamp}-${i}`}
                onClick={() => {
                  if (globalIdx >= 0) handleMarkNotificationRead(globalIdx);
                  if (notif.link_to) navigate(notif.link_to);
                }}
                className={`grid grid-cols-[40px_1fr_120px_100px_100px_60px] gap-3 px-5 py-3.5 border-b border-zinc-50 last:border-0 cursor-pointer transition-all duration-150 hover:bg-zinc-50/80 group ${
                  !notif.read ? "bg-orange-50/25" : ""
                }`}
              >
                {/* Icon */}
                <div className="flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                </div>

                {/* Activity */}
                <div className="flex flex-col justify-center min-w-0">
                  <p className={`text-[13px] leading-snug truncate ${!notif.read ? "font-bold text-zinc-900" : "font-medium text-zinc-600"}`}>
                    {notif.title || notif.message || "Notification"}
                  </p>
                  {notif.title && notif.message && (
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{notif.message}</p>
                  )}
                </div>

                {/* Type */}
                <div className="flex items-center">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                    <ActionIcon size={10} />
                    {actionLabel}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center">
                  <span className="text-[11px] text-zinc-400">{formatDate(notif.timestamp || notif.created_at)}</span>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  {notif.read ? (
                    <span className="text-[10px] text-zinc-300 font-medium">Read</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      Unread
                    </span>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  {notif.link_to && (
                    <ChevronRight size={14} className="text-zinc-300 group-hover:text-orange-500 transition-colors" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-zinc-500 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft size={13} />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    page === p ? "bg-orange-600 text-white shadow-sm" : "text-zinc-400 hover:bg-zinc-100"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-zinc-500 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Next
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
