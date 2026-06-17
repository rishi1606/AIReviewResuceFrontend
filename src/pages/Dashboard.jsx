import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, AlertTriangle, CheckCircle2, Star,
  ArrowRight, ThumbsUp, Activity, TrendingUp, TrendingDown, Expand, BarChart3,
  Building2, Plus, Clock, Percent, ShieldCheck, Zap, Shield
} from "lucide-react";
import { Tooltip } from "../components/ui/Tooltip";
import { useDerivedStats } from "../hooks/useDerivedStats";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";
import {
  SkeletonKPI, SkeletonChart, SkeletonBlock, SkeletonReview
} from "../components/Skeleton";
import { AREA_CHART_MARGIN, CHART_TOOLTIP_STYLE, ICON_THEMES, PLATFORM_COLORS, SENTIMENT_STYLES, STATUS_STYLES, TABLE_PAGE_SIZE, TREND_CONFIG } from "../constants/constants";
import { dateFormat, parseReviewDate } from "../common/dateUtils";

// ─── Constants (outside component — never recreated on render) ───────────────



// ─── Sub-components (stable — no anonymous inline definitions) ───────────────

const SentimentPill = React.memo(({ value }) => {
  const st = SENTIMENT_STYLES[value] ?? SENTIMENT_STYLES.Neutral;
  return (
    <span className={`text-[10px] font-bold inline-flex items-center gap-1.5 ${st.wrapper}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {value ?? "N/A"}
    </span>
  );
});
SentimentPill.displayName = "SentimentPill";

// Status badge with meaningful color coding
const STATUS_COLOR_MAP = {
  RESPONDED: "text-emerald-600",
  Approved: "text-emerald-600",
  ESCALATED: "text-red-600",
  Suspicious: "text-amber-600",
  CLASSIFIED: "text-blue-600",
  Pending: "text-zinc-400",
};

const StatusBadge = React.memo(({ value }) => {
  const colorClass = STATUS_COLOR_MAP[value] ?? "text-zinc-400";
  return (
    <span className={`text-[10px] font-bold capitalize ${colorClass}`}>
      {value ?? "Open"}
    </span>
  );
});
StatusBadge.displayName = "StatusBadge";

const KPICardNew = React.memo(({ title, value, subtitle, icon: Icon, color = "slate", trend, trendIcon: TrendIcon, trendType = "neutral", pulseClass, cardTooltip, tooltipText, onClick }) => {
  const resolvedTooltip = cardTooltip || tooltipText;
  const themeClass = ICON_THEMES[color] ?? ICON_THEMES.slate;
  const tcClass = TREND_CONFIG[trendType] ?? TREND_CONFIG.neutral;

  const trendBadge = trend ? (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${tcClass} ${pulseClass ?? ""}`}>
      {TrendIcon && <TrendIcon size={10} />}
      {trend}
    </span>
  ) : null;

  const card = (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="bg-white border border-zinc-200 rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-zinc-300 active:translate-y-0 active:shadow-md select-none"
    >
      {/* Row 1: icon + trend badge */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${themeClass} group-hover:scale-110 transition-transform duration-200`}>
          <Icon size={20} aria-hidden="true" />
        </div>
        {trendBadge}
      </div>

      {/* Divider line */}
      <div className="border-t border-zinc-100 mb-3" />

      {/* Row 2: label + value + subtitle */}
      <p className="text-[11px] font-semibold text-zinc-400 tracking-wide mb-1">{title}</p>
      <p className="text-[28px] font-bold text-zinc-900 leading-none tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">{subtitle}</p>
      )}
    </div>
  );

  if (resolvedTooltip) {
    return (
      <Tooltip content={resolvedTooltip} position="bottom" maxWidth={340} delay={400}>
        {card}
      </Tooltip>
    );
  }

  return card;
});
KPICardNew.displayName = "KPICardNew";

// Single sentiment/status progress row with percentage + min-width bar
const ProgressRow = React.memo(({ label, count, total, barColor, textColor, hoverColor, onClick }) => {
  const rawPct = total > 0 ? (count / total) * 100 : 0;
  const pct = rawPct > 0 && rawPct < 1 ? "<1" : Math.round(rawPct);
  const barWidth = total > 0 ? Math.max(3, (count / total) * 100) : 0; // min 3% width so bars are visible

  return (
    <div
      className="cursor-pointer group hover:bg-zinc-50 p-2.5 -mx-2.5 rounded-xl transition-all"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      aria-label={`View ${label} reviews`}
      title={`${count} ${label.toLowerCase()} reviews out of ${total} total (${pct}%)`}
    >
      <div className="flex justify-between items-baseline text-xs mb-2">
        <span className={`font-semibold text-zinc-700 ${hoverColor} transition-colors`}>{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className={`${textColor} font-bold text-[13px]`}>{count}</span>
          <span className="text-zinc-300 text-[10px] font-medium">{pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full bg-zinc-200/60 rounded-full overflow-hidden" role="progressbar" aria-valuenow={count} aria-valuemax={total}>
        <div
          className={`h-full ${barColor} rounded-full`}
          style={{ width: `${barWidth}%`, transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </div>
    </div>
  );
});
ProgressRow.displayName = "ProgressRow";

// Star rating display
const StarRating = React.memo(({ rating, platform }) => {
  const is10 = platform === "Booking.com" || platform === "Agoda";
  const starCount = is10 ? 10 : 5;
  const rawVal = is10 ? (rating * 2) : rating;
  const filled = Math.round(rawVal || 0);
  return (
    <div className="flex gap-0.5" aria-label={`${rawVal} out of ${starCount} stars`}>
      {Array.from({ length: starCount }, (_, i) => (
        <Star
          key={i}
          size={is10 ? 9 : 12}
          aria-hidden="true"
          className={i < filled ? "fill-orange-400 text-orange-400" : "fill-zinc-100 text-zinc-200"}
        />
      ))}
    </div>
  );
});
StarRating.displayName = "StarRating";

// ─── Derived stats helper (pure function — outside component) ─────────────────

const deriveFilteredStats = (reviews) => ({
  totalReviews: reviews.length,
  avgRating: reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0",
  positiveCount: reviews.filter(r => r.sentiment?.toLowerCase() === "positive").length,
  negativeCount: reviews.filter(r => r.sentiment?.toLowerCase() === "negative").length,
  mixedCount: reviews.filter(r => r.sentiment?.toLowerCase() === "mixed").length,
  neutralCount: reviews.filter(r => r.sentiment?.toLowerCase() === "neutral").length,
  approvedCount: reviews.filter(r => r.status === "Approved" || r.status === "RESPONDED").length,
  escalatedCount: reviews.filter(r => r.escalation || r.status === "ESCALATED").length,
  suspiciousCount: reviews.filter(r => r.is_suspicious || r.status === "Suspicious").length,
});

// ─── Main Dashboard Component ─────────────────────────────────────────────────

const Dashboard = () => {
  const stats = useDerivedStats();
  const { state } = useAppContext();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tablePage, setTablePage] = useState(1);
  const [hiddenSeries, setHiddenSeries] = useState([]);
  const [comparisonRange, setComparisonRange] = useState(30);

  const selectedPlatform = state.activeFilters?.platform ?? "ALL";
  const selectedProperty = state.activeFilters?.property ?? "ALL";

  // ── Filtered reviews ────────────────────────────────────────────────────────
  const filteredReviews = useMemo(() => (
    (state.reviews ?? []).filter(r => {
      const platformMatch = selectedPlatform === "ALL" || r.platform === selectedPlatform;
      const propertyMatch = selectedProperty === "ALL" || r.hotel_name === selectedProperty;
      return platformMatch && propertyMatch;
    })
  ), [state.reviews, selectedPlatform, selectedProperty]);

  // Reset to page 1 when filters change
  const prevFiltersRef = React.useRef({ selectedPlatform, selectedProperty });
  if (
    prevFiltersRef.current.selectedPlatform !== selectedPlatform ||
    prevFiltersRef.current.selectedProperty !== selectedProperty
  ) {
    prevFiltersRef.current = { selectedPlatform, selectedProperty };
    if (tablePage !== 1) setTablePage(1);
  }

  const totalPages = Math.ceil(filteredReviews.length / TABLE_PAGE_SIZE);
  const paginatedReviews = useMemo(() => (
    filteredReviews.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
  ), [filteredReviews, tablePage]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const filteredStats = useMemo(() => deriveFilteredStats(filteredReviews), [filteredReviews]);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const dateMap = {};

    // Define month order for sorting (Jan–Dec)
    const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    filteredReviews.forEach(r => {
      const dateVal = r.review_date ?? r.createdAt;
      const parsed = parseReviewDate(dateVal);
      if (!parsed) return;

      // Group by "Mon YYYY" e.g. "May 2025", "Jun 2025"
      const key = parsed.toLocaleDateString(undefined, { month: "short", year: "numeric" });

      if (!dateMap[key]) {
        dateMap[key] = {
          date: key,
          _sortKey: parsed.getFullYear() * 100 + parsed.getMonth(), // for sorting
          Positive: 0,
          Negative: 0,
          Neutral: 0,
          Mixed: 0,
        };
      }

      const sent = r.sentiment ?? "Neutral";
      if (sent in dateMap[key]) dateMap[key][sent]++;
    });

    // Sort chronologically and strip internal sort key
    return Object.values(dateMap)
      .sort((a, b) => a._sortKey - b._sortKey)
      .map(({ _sortKey, ...rest }) => rest);

  }, [filteredReviews]);

  const platformData = useMemo(() => {
    const map = {};
    filteredReviews.forEach(r => {
      const p = r.platform ?? "Direct";
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredReviews]);

  // ── Page title ──
  useEffect(() => { document.title = "ReviewRescue — Dashboard"; }, []);

  // ── Stable navigation callbacks ───────────────────────────────────────────────
  const goToReviews = useCallback(() => navigate("/reviews"), [navigate]);
  const goToSettings = useCallback(() => navigate("/settings?tab=properties"), [navigate]);
  const goToEscalated = useCallback(() => navigate("/reviews?tab=Escalated"), [navigate]);
  const goToPositive = useCallback(() => navigate("/reviews?tab=Positive"), [navigate]);
  const goToNegative = useCallback(() => navigate("/reviews?tab=Negative"), [navigate]);
  const goToMixed = useCallback(() => navigate("/reviews?tab=Mixed"), [navigate]);
  const goToNeutral = useCallback(() => navigate("/reviews?tab=Neutral"), [navigate]);
  const goToApproved = useCallback(() => navigate("/reviews?tab=Approved"), [navigate]);
  const goToSuspicious = useCallback(() => navigate("/reviews?tab=Suspicious"), [navigate]);

  const goToPrevPage = useCallback(() => setTablePage(p => Math.max(1, p - 1)), []);
  const goToNextPage = useCallback(() => setTablePage(p => Math.min(totalPages, p + 1)), [totalPages]);

  const avgRatingNum = parseFloat(filteredStats.avgRating);


  return (
    <div className="flex flex-col xl:flex-row gap-6">

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {state.isAppLoading ? (
            [1, 2, 3, 4].map(i => <SkeletonKPI key={i} />)
          ) : (
            <>
              <KPICardNew
                title="Total Reviews"
                value={filteredStats.totalReviews}
                subtitle="Across all connected platforms"
                icon={MessageSquare}
                color="orange"
                trend={filteredStats.totalReviews > 0 ? `+${filteredStats.totalReviews}` : "—"}
                trendIcon={filteredStats.totalReviews > 0 ? TrendingUp : null}
                trendType={filteredStats.totalReviews > 0 ? "up" : "neutral"}
                tooltipText="Total number of guest reviews collected from all connected platforms (Google, Booking.com, Agoda, etc.). Each review is imported automatically via your scraper schedule and processed by AI for sentiment, department, and urgency classification."
                onClick={goToReviews}
              />
              <KPICardNew
                title="Avg Rating"
                value={filteredStats.avgRating}
                subtitle={`Based on ${filteredStats.totalReviews} reviews`}
                icon={Star}
                color="purple"
                trend={avgRatingNum >= 4 ? `↑ +${(avgRatingNum - 3.5).toFixed(1)}` : avgRatingNum >= 3 ? `→ ${avgRatingNum.toFixed(1)}` : `↓ ${(3.5 - avgRatingNum).toFixed(1)}`}
                trendIcon={avgRatingNum >= 4 ? TrendingUp : TrendingDown}
                trendType={avgRatingNum >= 4 ? "up" : avgRatingNum >= 3 ? "warn" : "down"}
                tooltipText={`Your average guest rating is ${filteredStats.avgRating} out of 5 stars, calculated across ${filteredStats.totalReviews} reviews from all connected platforms. Ratings from different scales (e.g. Booking.com's /10, Agoda's /10) are normalised to a /5 scale before averaging, so you get a consistent score regardless of platform. This value updates in real-time as new reviews are imported.`}

              />
              <KPICardNew
                title="Escalated"
                value={filteredStats.escalatedCount}
                subtitle={filteredStats.escalatedCount > 0 ? "Requires immediate attention" : "No pending escalations"}
                icon={AlertTriangle}
                color={filteredStats.escalatedCount > 0 ? "red" : "green"}
                trend={filteredStats.escalatedCount > 0 ? "Needs action" : "All clear"}
                trendIcon={filteredStats.escalatedCount > 0 ? TrendingDown : CheckCircle2}
                trendType={filteredStats.escalatedCount > 0 ? "down" : "up"}
                pulseClass={filteredStats.escalatedCount > 0 ? "sh-badge-pulse" : ""}
                tooltipText={filteredStats.escalatedCount > 0 ? `${filteredStats.escalatedCount} reviews have been escalated for immediate attention. A review is escalated when the guest rating falls at or below your configured threshold (default: ≤ 2/5 stars, or ≤ 4/10 on Booking.com / Agoda), or when it's flagged as high-urgency by the AI. Click this card to view all escalated reviews and take action.` : "No reviews currently need escalation. Reviews are auto-escalated when the rating falls below your configured threshold or the AI detects high urgency. You can adjust the escalation threshold in Settings → Rules."}
                onClick={goToEscalated}
              />
              <KPICardNew
                title="Positive Reviews"
                value={filteredStats.positiveCount}
                subtitle={filteredStats.totalReviews > 0 ? `${Math.round((filteredStats.positiveCount / filteredStats.totalReviews) * 100)}% of total reviews` : "No reviews yet"}
                icon={ThumbsUp}
                color="green"
                trend={filteredStats.positiveCount > 0 ? `${Math.round((filteredStats.positiveCount / (filteredStats.totalReviews || 1)) * 100)}%` : "—"}
                trendIcon={filteredStats.positiveCount > 0 ? TrendingUp : null}
                trendType={filteredStats.positiveCount > (filteredStats.totalReviews * 0.5) ? "up" : "warn"}
                tooltipText={`${filteredStats.positiveCount} out of ${filteredStats.totalReviews} reviews are classified as positive by the AI. A review is marked positive when the overall sentiment is favourable (e.g. compliments about service, room quality, or staff). This percentage helps you gauge overall guest satisfaction at a glance.`}
                onClick={goToPositive}
              />
              {/* <KPICardNew
                title="Suspicious"
                value={filteredStats.suspiciousCount}
                subtitle={filteredStats.suspiciousCount > 0 ? "Flagged for review" : "No suspicious reviews"}
                icon={Shield}
                color={filteredStats.suspiciousCount > 0 ? "red" : "green"}
                trend={filteredStats.suspiciousCount > 0 ? "Needs review" : "All clear"}
                trendIcon={filteredStats.suspiciousCount > 0 ? AlertTriangle : CheckCircle2}
                trendType={filteredStats.suspiciousCount > 0 ? "down" : "up"}
                pulseClass={filteredStats.suspiciousCount > 0 ? "sh-badge-pulse" : ""}
                tooltipText={filteredStats.suspiciousCount > 0 ? `${filteredStats.suspiciousCount} reviews flagged as suspicious or by keyword alerts` : "No suspicious reviews detected"}
                onClick={goToSuspicious}
              /> */}
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {state.isAppLoading ? (
            <>
              <div className="bg-white border border-zinc-200 rounded-2xl lg:col-span-2 p-5 flex flex-col h-[380px]">
                <div className="mb-4 pb-3 border-b border-zinc-100 flex justify-between">
                  <div>
                    <div className="h-4 bg-zinc-200 rounded w-36 mb-2 animate-pulse" />
                    <div className="h-3 bg-zinc-100 rounded w-52 animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-7 w-12 bg-zinc-100 rounded-lg animate-pulse" />)}
                  </div>
                </div>
                <div className="flex-1 flex items-end justify-around gap-2 pb-4">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-zinc-100 rounded-t animate-pulse" style={{ height: `${40 + (i * 7) % 60}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col h-[380px]">
                <div className="mb-4 pb-3 border-b border-zinc-100">
                  <div className="h-4 bg-zinc-200 rounded w-32 mb-2 animate-pulse" />
                  <div className="h-3 bg-zinc-100 rounded w-44 animate-pulse" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <div className="absolute w-44 h-44 rounded-full border-[14px] border-zinc-100 animate-pulse" />
                    <div className="absolute w-28 h-28 rounded-full bg-white" />
                    <div className="h-4 w-8 bg-zinc-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ═══ Sentiment Trends ═══ */}
              <div className="bg-white border border-zinc-200 rounded-2xl lg:col-span-2 p-5 flex flex-col h-[380px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-zinc-100">
                  <div>
                    <h3 className="text-[15px] font-bold text-zinc-900">Sentiment Trends</h3>
                    <p className="text-[12px] text-zinc-400 mt-0.5">All sentiments over time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Clickable legend toggles */}
                    {[
                      { key: "Positive", color: "#10b981" },
                      { key: "Negative", color: "#ef4444" },
                      { key: "Mixed", color: "#a855f7" },
                      { key: "Neutral", color: "#a1a1aa" },
                    ].map(({ key, color }) => (
                      <button
                        key={key}
                        onClick={() => setHiddenSeries(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
                        className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${hiddenSeries.includes(key)
                          ? "border-zinc-200 bg-zinc-50 text-zinc-300 line-through"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                          }`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hiddenSeries.includes(key) ? "#d4d4d8" : color }} />
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradPositive" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradNegative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradMixed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradNeutral" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a1a1aa" stopOpacity={0.08} />
                            <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} label={{ value: "Reviews", angle: -90, position: "insideLeft", offset: 15, style: { fontSize: 10, fill: "#a1a1aa" } }} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12, padding: "10px 14px" }}
                          labelStyle={{ fontWeight: 700, color: "#18181b", marginBottom: 6 }}
                          itemStyle={{ padding: "2px 0" }}
                          cursor={{ stroke: "#d4d4d8", strokeDasharray: "4 4" }}
                        />
                        {!hiddenSeries.includes("Positive") && <Area type="monotone" dataKey="Positive" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradPositive)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />}
                        {!hiddenSeries.includes("Negative") && <Area type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#gradNegative)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />}
                        {!hiddenSeries.includes("Mixed") && <Area type="monotone" dataKey="Mixed" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#gradMixed)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />}
                        {!hiddenSeries.includes("Neutral") && <Area type="monotone" dataKey="Neutral" stroke="#a1a1aa" strokeWidth={2.5} fillOpacity={1} fill="url(#gradNeutral)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                      <BarChart3 size={32} className="mb-2 text-zinc-300" />
                      <p className="text-xs font-medium">No sentiment data yet</p>
                      <p className="text-[11px] text-zinc-300 mt-0.5">Import reviews to see trends</p>
                    </div>
                  )}
                </div>
                {/* Footer link */}

              </div>

              {/* ═══ Platform Share Donut ═══ */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col h-[380px]">
                <div className="mb-4 pb-3 border-b border-zinc-100">
                  <h3 className="text-[15px] font-bold text-zinc-900">Platform Share</h3>
                  <p className="text-[12px] text-zinc-400 mt-0.5">Reviews by platform</p>
                </div>
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                  {platformData.length > 0 ? (
                    <>
                      <div className="relative w-full" style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={platformData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="transparent"
                            >
                              {platformData.map((_, index) => (
                                <Cell key={index} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12 }}
                              formatter={(value, name) => [`${value} reviews (${Math.round((value / filteredStats.totalReviews) * 100)}%)`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center total */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold text-zinc-900 leading-none">{filteredStats.totalReviews}</span>
                          <span className="text-[10px] text-zinc-400 font-medium mt-0.5">total</span>
                        </div>
                      </div>
                      {/* Custom legend with counts + percentages */}
                      <div className="w-full mt-3 space-y-1.5 px-1">
                        {platformData.map((item, index) => {
                          const pct = filteredStats.totalReviews > 0 ? Math.round((item.value / filteredStats.totalReviews) * 100) : 0;
                          return (
                            <div key={item.name} className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PLATFORM_COLORS[index % PLATFORM_COLORS.length] }} />
                                <span className="font-medium text-zinc-600">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-800">{item.value}</span>
                                <span className="text-zinc-400 font-medium w-10 text-right">{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <Activity size={32} className="mb-2 text-zinc-300" />
                      <p className="text-xs font-medium">No platform data</p>
                      <p className="text-[11px] text-zinc-300 mt-0.5">Connect platforms in settings</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ══ Insights & Analytics Section ══ */}
        {!state.isAppLoading && filteredReviews.length > 0 && (() => {
          // ── Accurate calculations ──
          const respondedReviews = filteredReviews.filter(r => r.status === "RESPONDED" || r.status === "Approved");
          const approvalRate = filteredReviews.length > 0 ? Math.round((respondedReviews.length / filteredReviews.length) * 100) : 0;

          // Avg time to approve (imported_at → approved_at)
          const reviewsWithApproval = filteredReviews.filter(r => r.approved_at && r.imported_at && r.approved_at > r.imported_at);
          let avgApprovalTime = null;
          if (reviewsWithApproval.length > 0) {
            const totalMs = reviewsWithApproval.reduce((sum, r) => sum + (r.approved_at - r.imported_at), 0);
            const avgMs = totalMs / reviewsWithApproval.length;
            const avgHrs = avgMs / (1000 * 60 * 60);
            avgApprovalTime = avgHrs < 1 ? `${Math.round(avgMs / (1000 * 60))}m` : avgHrs < 24 ? `${avgHrs.toFixed(1)}h` : `${(avgHrs / 24).toFixed(1)}d`;
          }

          // Escalation rate
          const escalationRate = filteredReviews.length > 0 ? Math.round((filteredStats.escalatedCount / filteredReviews.length) * 100) : 0;

          // Avg AI Confidence
          const reviewsWithConf = filteredReviews.filter(r => r.confidence != null);
          const avgConf = reviewsWithConf.length > 0 ? Math.round(reviewsWithConf.reduce((s, r) => s + r.confidence, 0) / reviewsWithConf.length) : 0;

          // Department distribution
          const deptMap = {};
          filteredReviews.forEach(r => {
            const dept = r.primary_department || "Unassigned";
            if (!deptMap[dept]) deptMap[dept] = { name: dept, Positive: 0, Negative: 0, Mixed: 0, Neutral: 0, total: 0 };
            deptMap[dept].total++;
            const sent = r.sentiment || "Neutral";
            if (deptMap[dept][sent] !== undefined) deptMap[dept][sent]++;
          });
          const deptData = Object.values(deptMap).sort((a, b) => b.total - a.total);

          // Period comparison (dynamic range)
          const RANGE_OPTIONS = [
            { label: '7d', days: 7, tip: 'Compare last 7 days vs the 7 days before' },
            { label: '30d', days: 30, tip: 'Compare last 30 days vs the 30 days before' },
            { label: '60d', days: 60, tip: 'Compare last 60 days vs the 60 days before' },
            { label: '90d', days: 90, tip: 'Compare last 90 days vs the 90 days before' },
            { label: 'All', days: 0, tip: 'Show all reviews by sentiment (no comparison)' },
          ];
          const rangeDays = comparisonRange;
          const now = new Date();
          now.setHours(23, 59, 59, 999);

          const fmtShort = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

          let currentPeriod, previousPeriod, currentLabel, previousLabel, currentDateRange, previousDateRange;

          if (rangeDays === 0) {
            currentPeriod = filteredReviews;
            previousPeriod = [];
            currentLabel = 'All Time';
            previousLabel = '—';
            currentDateRange = 'All reviews';
            previousDateRange = '';
          } else {
            const currentStart = new Date(now);
            currentStart.setDate(currentStart.getDate() - rangeDays);
            currentStart.setHours(0, 0, 0, 0);
            const prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - rangeDays);

            currentPeriod = filteredReviews.filter(r => {
              const parsed = parseReviewDate(r.review_date ?? r.createdAt);
              return parsed && parsed.getTime() >= currentStart.getTime();
            });
            previousPeriod = filteredReviews.filter(r => {
              const parsed = parseReviewDate(r.review_date ?? r.createdAt);
              return parsed && parsed.getTime() >= prevStart.getTime() && parsed.getTime() < currentStart.getTime();
            });

            currentDateRange = `${fmtShort(currentStart)} – ${fmtShort(now)}`;
            previousDateRange = `${fmtShort(prevStart)} – ${fmtShort(currentStart)}`;
            currentLabel = currentDateRange;
            previousLabel = previousDateRange;
          }

          const comparisonData = rangeDays === 0 ? [
            { label: 'All Time', Positive: currentPeriod.filter(r => r.sentiment === 'Positive').length, Negative: currentPeriod.filter(r => r.sentiment === 'Negative').length, Mixed: currentPeriod.filter(r => r.sentiment === 'Mixed').length, Neutral: currentPeriod.filter(r => r.sentiment === 'Neutral').length, Total: currentPeriod.length },
          ] : [
            { label: previousLabel, Positive: previousPeriod.filter(r => r.sentiment === 'Positive').length, Negative: previousPeriod.filter(r => r.sentiment === 'Negative').length, Mixed: previousPeriod.filter(r => r.sentiment === 'Mixed').length, Neutral: previousPeriod.filter(r => r.sentiment === 'Neutral').length, Total: previousPeriod.length },
            { label: currentLabel, Positive: currentPeriod.filter(r => r.sentiment === 'Positive').length, Negative: currentPeriod.filter(r => r.sentiment === 'Negative').length, Mixed: currentPeriod.filter(r => r.sentiment === 'Mixed').length, Neutral: currentPeriod.filter(r => r.sentiment === 'Neutral').length, Total: currentPeriod.length },
          ];
          const periodChange = previousPeriod.length > 0 ? Math.round(((currentPeriod.length - previousPeriod.length) / previousPeriod.length) * 100) : currentPeriod.length > 0 ? 100 : 0;

          return (
            <div className="space-y-6">

              {/* ── Charts Row ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Distribution */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col" style={{ minHeight: 340 }}>
                  <div className="mb-4 pb-3 border-b border-zinc-100">
                    <h3 className="text-[15px] font-bold text-zinc-900">Department Distribution</h3>
                    <p className="text-[12px] text-zinc-400 mt-0.5">Reviews routed per department</p>
                  </div>
                  <div className="flex-1 min-h-0">
                    {deptData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                          <XAxis type="number" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} width={100} />
                          <RechartsTooltip contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12 }} />
                          <Bar dataKey="Positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Negative" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Mixed" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Neutral" stackId="a" fill="#d4d4d8" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-400 text-xs">No department data</div>
                    )}
                  </div>
                </div>

                {/* Period Comparison */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col" style={{ minHeight: 340 }}>
                  <div className="mb-4 pb-3 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-[15px] font-bold text-zinc-900">Period Comparison</h3>
                      <p className="text-[12px] text-zinc-400 mt-0.5">{rangeDays === 0 ? 'All reviews by sentiment' : `${currentLabel} vs ${previousLabel}`}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Time range toggles */}
                      <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
                        {RANGE_OPTIONS.map(opt => (
                          <button
                            key={opt.days}
                            onClick={() => setComparisonRange(opt.days)}
                            title={opt.tip}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              comparisonRange === opt.days
                                ? 'bg-white text-zinc-900 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                        <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12 }} />
                        <Bar dataKey="Positive" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                        <Bar dataKey="Negative" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
                        <Bar dataKey="Mixed" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={32} />
                        <Bar dataKey="Neutral" fill="#a1a1aa" radius={[4, 4, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Stats footer — matches chart bar order: previous (left) → current (right) */}
                  <div className={`pt-3 border-t border-zinc-100 grid gap-4 ${rangeDays === 0 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {rangeDays !== 0 && (
                      <div title={`Previous period: ${previousDateRange}`}>
                        <p className="text-[10px] text-zinc-400 font-semibold">PREVIOUS PERIOD</p>
                        <p className="text-[11px] text-zinc-500 font-medium">{previousDateRange}</p>
                        <p className="text-sm font-bold text-zinc-800">{previousPeriod.length} <span className="text-[10px] text-zinc-400 font-normal">reviews</span></p>
                      </div>
                    )}
                    <div title={`Current period: ${currentDateRange}`}>
                      <p className="text-[10px] text-zinc-400 font-semibold">CURRENT PERIOD</p>
                      <p className="text-[11px] text-zinc-500 font-medium">{currentDateRange}</p>
                      <p className="text-sm font-bold text-zinc-800">{currentPeriod.length} <span className="text-[10px] text-zinc-400 font-normal">reviews</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Recent Reviews Table */}
        <div className="bg-white border border-zinc-200 rounded-2xl flex flex-col mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex justify-between items-center">
            <div>
              <h3 className="text-[15px] font-bold text-zinc-900">Recent Reviews</h3>
              <p className="text-[12px] text-zinc-400 mt-0.5">{filteredReviews.length} reviews total · Page {tablePage} of {totalPages}</p>
            </div>
            <button
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition-colors"
              onClick={goToReviews}
              aria-label="View all reviews"
            >
              VIEW ALL <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>

          {state.isAppLoading ? (
            <div className="divide-y divide-zinc-100">
              {[1, 2, 3, 4].map(i => <SkeletonReview key={i} />)}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" aria-label="Recent reviews">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th scope="col" className="pl-5 pr-3 py-3 text-[11px] font-semibold text-zinc-400 tracking-wide" style={{ width: "40%" }}>Guest & Review</th>
                      <th scope="col" className="px-3 py-3 text-[11px] font-semibold text-zinc-400 tracking-wide" style={{ width: "12%" }}>Platform</th>
                      <th scope="col" className="px-3 py-3 text-[11px] font-semibold text-zinc-400 tracking-wide" style={{ width: "14%" }}>Rating</th>
                      <th scope="col" className="px-3 py-3 text-[11px] font-semibold text-zinc-400 tracking-wide" style={{ width: "12%" }}>Sentiment</th>
                      <th scope="col" className="px-3 py-3 text-[11px] font-semibold text-zinc-400 tracking-wide" style={{ width: "12%" }}>Status</th>
                      <th scope="col" className="px-5 py-3 text-[11px] font-semibold text-zinc-400 tracking-wide text-right" style={{ width: "10%" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReviews.map((r, idx) => (
                      <ReviewRow key={r.review_id} review={r} navigate={navigate} isEven={idx % 2 === 0} />
                    ))}
                    {paginatedReviews.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <MessageSquare size={32} className="text-zinc-200 mb-2" />
                            <p className="text-sm font-semibold text-zinc-500">No reviews found</p>
                            <p className="text-[12px] text-zinc-400 mt-0.5">Try adjusting your filters or import new reviews</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-5 py-3.5 border-t border-zinc-200 flex items-center justify-between bg-zinc-50/50">
                  <span className="text-[12px] text-zinc-500 font-medium">
                    Showing <span className="font-bold text-zinc-700">{((tablePage - 1) * TABLE_PAGE_SIZE) + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filteredReviews.length)}</span> of {filteredReviews.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={tablePage === 1}
                      onClick={goToPrevPage}
                      className="px-3 py-1.5 text-[11px] font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer transition-all"
                    >
                      Previous
                    </button>
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (tablePage <= 3) {
                        pageNum = i + 1;
                      } else if (tablePage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = tablePage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setTablePage(pageNum)}
                          className={`w-8 h-8 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${tablePage === pageNum
                            ? "bg-orange-500 text-white shadow-sm"
                            : "text-zinc-600 hover:bg-zinc-100"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      disabled={tablePage === totalPages}
                      onClick={goToNextPage}
                      className="px-3 py-1.5 text-[11px] font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right Sidebar ─────────────────────────────────────────────────────── */}
      <div className="w-full xl:w-80 flex flex-col gap-5 shrink-0">
        {state.isAppLoading ? (
          <>
            <SkeletonBlock />
            <SkeletonBlock />
            <SkeletonBlock />
          </>
        ) : (
          <>
            {/* ─ Add Property CTA ─ */}
            <div
              className="border-2 border-dashed border-zinc-200 rounded-2xl p-5 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all group"
              onClick={goToSettings}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && goToSettings()}
              aria-label="Go to settings to add a new property"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                  <Plus size={18} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-zinc-900">Add New Property</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Connect hotels & platforms</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 group-hover:text-orange-700 group-hover:translate-x-1 transition-all">
                Go to Settings <ArrowRight size={12} aria-hidden="true" />
              </span>
            </div>

            {/* ─ Sentiment Breakdown ─ */}
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Activity size={14} className="text-purple-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-[14px] font-bold text-zinc-900">Sentiment</h3>
                </div>
                <span className="text-[10px] font-medium text-zinc-400">{filteredStats.totalReviews} total</span>
              </div>
              <div className="px-5 py-4 space-y-1">
                <ProgressRow label="Positive" count={filteredStats.positiveCount} total={filteredStats.totalReviews} barColor="bg-emerald-500" textColor="text-emerald-600" hoverColor="group-hover:text-emerald-600" onClick={goToPositive} />
                <ProgressRow label="Negative" count={filteredStats.negativeCount} total={filteredStats.totalReviews} barColor="bg-red-500" textColor="text-red-600" hoverColor="group-hover:text-red-600" onClick={goToNegative} />
                <ProgressRow label="Mixed" count={filteredStats.mixedCount} total={filteredStats.totalReviews} barColor="bg-purple-500" textColor="text-purple-600" hoverColor="group-hover:text-purple-600" onClick={goToMixed} />
                <ProgressRow label="Neutral" count={filteredStats.neutralCount} total={filteredStats.totalReviews} barColor="bg-zinc-400" textColor="text-zinc-600" hoverColor="group-hover:text-zinc-800" onClick={goToNeutral} />
              </div>
              <div className="px-5 py-3 border-t border-zinc-100 flex justify-end">
                <button onClick={goToReviews} className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer transition-all">
                  View all <ArrowRight size={11} />
                </button>
              </div>
            </div>

            {/* ─ Review Status ─ */}
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-emerald-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-[14px] font-bold text-zinc-900">Review Status</h3>
                </div>
                <span className="text-[10px] font-medium text-zinc-400">{filteredStats.totalReviews} total</span>
              </div>
              <div className="px-5 py-4 space-y-1">
                <ProgressRow label="Approved" count={filteredStats.approvedCount} total={filteredStats.totalReviews} barColor="bg-emerald-500" textColor="text-emerald-600" hoverColor="group-hover:text-emerald-600" onClick={goToApproved} />
                <ProgressRow label="Escalated" count={filteredStats.escalatedCount} total={filteredStats.totalReviews} barColor="bg-orange-500" textColor="text-orange-600" hoverColor="group-hover:text-orange-600" onClick={goToEscalated} />
                <ProgressRow label="Suspicious" count={filteredStats.suspiciousCount} total={filteredStats.totalReviews} barColor="bg-red-500" textColor="text-red-600" hoverColor="group-hover:text-red-600" onClick={goToSuspicious} />
              </div>
              <div className="px-5 py-3 border-t border-zinc-100 flex justify-end">
                <button onClick={goToReviews} className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer transition-all">
                  View all <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Platform colors for dot indicators ───────────────────────────────────────
const PLATFORM_DOT_COLORS = {
  Google: "#ea4335",
  "Booking.com": "#003580",
  Airbnb: "#ff5a5f",
  Agoda: "#5fc4ee",
  TripAdvisor: "#00af87",
  Expedia: "#1a1a2e",
};

// ─── Sentiment → left border color mapping ────────────────────────────────────
const SENTIMENT_BORDER = {
  Positive: "border-l-emerald-400",
  Negative: "border-l-red-400",
  Mixed: "border-l-purple-400",
  Neutral: "border-l-amber-400",
};

// ─── Get initials from name ───────────────────────────────────────────────────
const getReviewerInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0]?.toUpperCase() ?? "?";
};

// ─── Format full date for tooltip ─────────────────────────────────────────────
const getFullDate = (review) => {
  const parsed = parseReviewDate(review?.review_date);
  if (!parsed) return "";
  return parsed.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Extracted table row — prevents full table re-render when only one row changes
const ReviewRow = React.memo(({ review: r, navigate, isEven }) => {
  const handleClick = useCallback(() => {
    navigate(`/reviews/${r.review_id}`);
  }, [navigate, r.review_id]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") handleClick();
  }, [handleClick]);

  const sentiment = r.sentiment ?? "Neutral";
  const sentimentStyle = SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.Neutral;
  const borderColor = SENTIMENT_BORDER[sentiment] ?? "border-l-zinc-200";
  const initials = getReviewerInitials(r.reviewer_name);
  const platformColor = PLATFORM_DOT_COLORS[r.platform] ?? "#a1a1aa";
  const fullDate = getFullDate(r);

  return (
    <tr
      className={`border-l-[3px] ${borderColor} border-b border-zinc-100 cursor-pointer group transition-colors ${isEven ? "bg-white hover:bg-orange-50/40" : "bg-zinc-50/30 hover:bg-orange-50/40"
        }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-label={`Review by ${r.reviewer_name}`}
    >
      {/* Guest & Review */}
      <td className="pl-4 pr-3 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-orange-600">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-zinc-900 truncate group-hover:text-orange-600 transition-colors">{r.reviewer_name}</p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5 max-w-[280px]" title={r.review_text}>{r.review_text}</p>
          </div>
        </div>
      </td>
      {/* Platform */}
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm" style={{ background: platformColor }} />
          <span className="text-[12px] font-semibold text-zinc-700">{r.platform}</span>
        </div>
      </td>
      {/* Rating */}
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-1.5">
          <StarRating rating={r.rating} platform={r.platform} />
          <span className="text-[11px] font-bold text-zinc-500 leading-none mt-px">
            {(r.platform === "Booking.com" || r.platform === "Agoda") ? `${r.raw_rating || (r.rating * 2).toFixed(1)}/10` : `${r.rating ?? 0}/5`}
          </span>
        </div>
      </td>
      {/* Sentiment */}
      <td className="px-3 py-3.5">
        <SentimentPill value={sentiment} />
      </td>
      {/* Status */}
      <td className="px-3 py-3.5">
        <StatusBadge value={r.status} />
      </td>
      {/* Date */}
      <td className="px-5 py-3.5 text-right">
        <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap" title={fullDate}>{dateFormat(r)}</span>
      </td>
    </tr>
  );
});
ReviewRow.displayName = "ReviewRow";

export default Dashboard;