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
    Positive: { wrapper: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    Negative: { wrapper: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
    Mixed: { wrapper: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
    Neutral: { wrapper: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
};

export const STATUS_STYLES = {
    RESPONDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ESCALATED: "bg-red-50 text-red-700 border-red-200",
    Suspicious: "bg-amber-50 text-amber-700 border-amber-200",
    CLASSIFIED: "bg-blue-50 text-blue-700 border-blue-200",
};

export const CHART_TOOLTIP_STYLE = {
    borderRadius: 12,
    border: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontSize: 11,
};

export const AREA_CHART_MARGIN = { top: 8, right: 8, left: -22, bottom: 0 };