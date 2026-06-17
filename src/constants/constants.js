export const TABLE_PAGE_SIZE = 8;

export const PLATFORM_COLORS = ["#f97316", "#a855f7", "#0ea5e9", "#10b981", "#f59e0b"];

export const ICON_THEMES = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-zinc-100 text-zinc-600 border-zinc-200",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
};

export const TREND_CONFIG = {
    up: "bg-emerald-50 text-emerald-700",
    down: "bg-red-50 text-red-700",
    warn: "bg-amber-50 text-amber-700",
    neutral: "bg-zinc-100 text-zinc-600",
};

export const SENTIMENT_STYLES = {
    Positive: { wrapper: "text-emerald-600", dot: "bg-emerald-500" },
    Negative: { wrapper: "text-red-600", dot: "bg-red-500" },
    Mixed: { wrapper: "text-purple-600", dot: "bg-purple-500" },
    Neutral: { wrapper: "text-amber-600", dot: "bg-amber-500" },
};

export const STATUS_STYLES = {
    RESPONDED: "text-emerald-600",
    Approved: "text-emerald-600",
    ESCALATED: "text-red-600",
    Suspicious: "text-amber-600",
    CLASSIFIED: "text-blue-600",
};

export const CHART_TOOLTIP_STYLE = {
    borderRadius: 12,
    border: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontSize: 11,
};

export const AREA_CHART_MARGIN = { top: 8, right: 8, left: -22, bottom: 0 };


// GlobalSearch

export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS = 5;

export const SENTIMENT_GLOBAL = {
    Positive: "bg-green-50 text-green-700 border border-green-200",
    Negative: "bg-red-50 text-red-700 border border-red-200",
    Mixed: "bg-amber-50 text-amber-700 border border-amber-200",
    Neutral: "bg-slate-100 text-slate-600 border border-slate-200",
};

export const URGENCY_STYLES = {
    High: "bg-red-50 text-red-700 border border-red-200",
    Medium: "bg-amber-50 text-amber-700 border border-amber-200",
    Low: "bg-green-50 text-green-700 border border-green-200",
};

export const URGENCY_DOT = {
    High: "bg-red-500",
    Medium: "bg-amber-400",
    Low: "bg-green-400",
};

export const PLATFORM_LABELS = {
    "Google": "Google",
    "Airbnb": "Airbnb",
    "Booking.com": "Booking.com",
    "Agoda": "Agoda",
};

export const DEFAULT_BADGE = "bg-slate-100 text-slate-500 border border-slate-200";
export const DEFAULT_DOT = "bg-slate-300";