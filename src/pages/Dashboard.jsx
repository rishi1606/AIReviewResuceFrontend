import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, AlertTriangle, CheckCircle2, Star,
  ArrowRight, ThumbsUp, Activity
} from "lucide-react";
import { useDerivedStats } from "../hooks/useDerivedStats";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  SkeletonKPI, SkeletonChart, SkeletonBlock, SkeletonReview
} from "../components/Skeleton";
import { AREA_CHART_MARGIN, CHART_TOOLTIP_STYLE, ICON_THEMES, PLATFORM_COLORS, SENTIMENT_STYLES, STATUS_STYLES, TABLE_PAGE_SIZE, TREND_CONFIG } from "../constants/constants";
import { dateFormat } from "../common/dateUtils";

// ─── Constants (outside component — never recreated on render) ───────────────



// ─── Sub-components (stable — no anonymous inline definitions) ───────────────

const SentimentPill = React.memo(({ value }) => {
  const st = SENTIMENT_STYLES[value] ?? SENTIMENT_STYLES.Neutral;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1 border ${st.wrapper}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {value ?? "N/A"}
    </span>
  );
});
SentimentPill.displayName = "SentimentPill";

const StatusBadge = React.memo(({ value }) => {
  const st = STATUS_STYLES[value] ?? "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${st}`}>
      {value ?? "Open"}
    </span>
  );
});
StatusBadge.displayName = "StatusBadge";

const KPICardNew = React.memo(({ title, value, icon: Icon, color = "slate", trend, trendType = "neutral", onClick }) => {
  const themeClass = ICON_THEMES[color] ?? ICON_THEMES.slate;
  const tcClass = TREND_CONFIG[trendType] ?? TREND_CONFIG.neutral;

  return (
    <div
      onClick={onClick}
      className="glass-card p-4 lg:p-5 flex flex-col gap-3 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${themeClass} group-hover:scale-105 transition-transform`}>
          <Icon size={18} aria-hidden="true" />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${tcClass}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{title}</div>
        <div className="text-2xl lg:text-3xl font-bold text-zinc-900 leading-none mt-1">{value}</div>
      </div>
    </div>
  );
});
KPICardNew.displayName = "KPICardNew";

// Single sentiment/status progress row — extracted to avoid 8× duplicated markup
const ProgressRow = React.memo(({ label, count, total, barColor, textColor, hoverColor, onClick }) => (
  <div
    className="cursor-pointer group hover:bg-zinc-50/80 p-2 -mx-2 rounded-lg transition-colors"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    aria-label={`View ${label} reviews`}
  >
    <div className="flex justify-between text-xs mb-1.5">
      <span className={`font-semibold text-zinc-700 ${hoverColor} transition-colors`}>{label}</span>
      <span className={`${textColor} font-bold`}>{count}</span>
    </div>
    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={count} aria-valuemax={total}>
      <div
        className={`h-full ${barColor} rounded-full transition-all duration-500`}
        style={{ width: `${(count / (total || 1)) * 100}%` }}
      />
    </div>
  </div>
));
ProgressRow.displayName = "ProgressRow";

// Star rating display
const StarRating = React.memo(({ rating }) => (
  <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={12}
        aria-hidden="true"
        className={i < (rating || 0) ? "fill-orange-400 text-orange-400" : "fill-zinc-100 text-zinc-200"}
      />
    ))}
  </div>
));
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
  escalatedCount: reviews.filter(r => r.status === "ESCALATED").length,
  suspiciousCount: reviews.filter(r => r.status === "Suspicious").length,
});

// ─── Main Dashboard Component ─────────────────────────────────────────────────

const Dashboard = () => {
  const stats = useDerivedStats();
  const { state } = useAppContext();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tablePage, setTablePage] = useState(1);

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
    const sorted = [...filteredReviews].sort(
      (a, b) => new Date(a.review_date ?? a.createdAt ?? 0) - new Date(b.review_date ?? b.createdAt ?? 0)
    );
    sorted.forEach(r => {
      const dateVal = r.review_date ?? r.createdAt;
      if (!dateVal) return;
      const key = new Date(dateVal).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (!dateMap[key]) dateMap[key] = { date: key, Positive: 0, Negative: 0, Neutral: 0, Mixed: 0 };
      const sent = r.sentiment ?? "Neutral";
      if (sent in dateMap[key]) dateMap[key][sent]++;
    });
    return Object.values(dateMap);
  }, [filteredReviews]);

  const platformData = useMemo(() => {
    const map = {};
    filteredReviews.forEach(r => {
      const p = r.platform ?? "Direct";
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredReviews]);

  // ── Stable navigation callbacks ───────────────────────────────────────────────
  const goToReviews = useCallback(() => navigate("/reviews"), [navigate]);
  const goToSettings = useCallback(() => navigate("/settings"), [navigate]);
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
  console.log(paginatedReviews, 'paginatedReviews')

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
                icon={MessageSquare}
                color="orange"
                trend="All channels"
                trendType="neutral"
                onClick={goToReviews}
              />
              <KPICardNew
                title="Avg Rating"
                value={filteredStats.avgRating}
                icon={Star}
                color="purple"
                trend={`${filteredStats.avgRating} / 5`}
                trendType={avgRatingNum >= 4 ? "up" : avgRatingNum >= 3 ? "warn" : "down"}
              />
              <KPICardNew
                title="Escalated"
                value={filteredStats.escalatedCount}
                icon={AlertTriangle}
                color={filteredStats.escalatedCount > 0 ? "red" : "slate"}
                trend={filteredStats.escalatedCount > 0 ? "Needs action" : "All clear"}
                trendType={filteredStats.escalatedCount > 0 ? "down" : "up"}
                onClick={goToEscalated}
              />
              <KPICardNew
                title="Positive Responses"
                value={filteredStats.positiveCount}
                icon={ThumbsUp}
                color="green"
                trend="Looking good"
                trendType="up"
                onClick={goToPositive}
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {state.isAppLoading ? (
            <>
              <div className="glass-card lg:col-span-2 p-5 flex flex-col h-[320px]">
                <div className="mb-4 pb-3 border-b border-zinc-100">
                  <div className="h-4 bg-zinc-200 rounded w-32 mb-2 animate-pulse" />
                  <div className="h-3 bg-zinc-100 rounded w-48 animate-pulse" />
                </div>
                <div className="flex-1 flex items-end justify-around gap-2">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-zinc-200 rounded-t animate-pulse" style={{ height: `${40 + (i * 7) % 60}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card p-5 flex flex-col h-[320px]">
                <div className="mb-4 pb-3 border-b border-zinc-100">
                  <div className="h-4 bg-zinc-200 rounded w-32 mb-2 animate-pulse" />
                  <div className="h-3 bg-zinc-100 rounded w-40 animate-pulse" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="absolute w-40 h-40 rounded-full border-[12px] border-zinc-200 animate-pulse" />
                    <div className="absolute w-24 h-24 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Sentiment Trends */}
              <div className="glass-card lg:col-span-2 p-5 flex flex-col h-[320px]">
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-zinc-100">
                  <div>
                    <h3 className="text-[15px] font-bold text-zinc-900">Sentiment Trends</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Positive vs. Negative over time</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    {[["#10b981", "Positive"], ["#ef4444", "Negative"]].map(([color, label]) => (
                      <div key={label} className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                        <div className="w-4 h-1 rounded-full" style={{ background: color }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={AREA_CHART_MARGIN}>
                        <defs>
                          <linearGradient id="gradPositive" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradNegative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Area type="monotone" dataKey="Positive" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#gradPositive)" />
                        <Area type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#gradNegative)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400 text-xs">No data to show trends</div>
                  )}
                </div>
              </div>

              {/* Platform Share */}
              <div className="glass-card p-5 flex flex-col h-[320px]">
                <div className="mb-4 pb-3 border-b border-zinc-100">
                  <h3 className="text-[15px] font-bold text-zinc-900">Platform Share</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Distribution across channels</p>
                </div>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  {platformData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={platformData} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                          {platformData.map((_, index) => (
                            <Cell key={index} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Legend verticalAlign="bottom" align="center" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#52525b" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-zinc-400 text-xs">No platform data</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Reviews Table */}
        <div className="glass-card flex flex-col mb-6">
          <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-white/50 rounded-t-2xl">
            <h3 className="text-[15px] font-bold text-zinc-900">Recent Reviews</h3>
            <button
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
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
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th scope="col" className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Guest &amp; Review</th>
                      <th scope="col" className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Platform</th>
                      <th scope="col" className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Rating</th>
                      <th scope="col" className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedReviews.map((r) => (
                      <ReviewRow key={r.review_id} review={r} navigate={navigate} />
                    ))}
                    {paginatedReviews.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-sm">No reviews found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-white/50 rounded-b-2xl">
                  <span className="text-[11px] text-zinc-500 font-medium">
                    Page {tablePage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={tablePage === 1}
                      onClick={goToPrevPage}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-lg disabled:opacity-50 hover:bg-zinc-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={tablePage === totalPages}
                      onClick={goToNextPage}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-lg disabled:opacity-50 hover:bg-zinc-50 cursor-pointer"
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
      <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
        {state.isAppLoading ? (
          <>
            <SkeletonBlock />
            <SkeletonBlock />
            <SkeletonBlock />
          </>
        ) : (
          <>
            {/* Add Property CTA */}
            <div
              className="glass-card p-5 cursor-pointer hover:bg-zinc-50/50 transition-colors group"
              onClick={goToSettings}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && goToSettings()}
              aria-label="Go to settings to add a new property"
            >
              <h3 className="text-[15px] font-bold text-zinc-900 mb-1">Add New Property</h3>
              <p className="text-[11px] text-zinc-500 font-medium mb-4">
                Manage your hotels and connect new platforms in Settings.
              </p>
              <span className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 group-hover:translate-x-1 transition-transform">
                GO TO SETTINGS <ArrowRight size={12} aria-hidden="true" />
              </span>
            </div>

            {/* Sentiment Breakdown */}
            <div className="glass-card p-5">
              <h3 className="text-[15px] font-bold text-zinc-900 mb-4 pb-3 border-b border-zinc-100 flex items-center gap-2">
                <Activity size={16} className="text-orange-500" aria-hidden="true" />
                Sentiment Breakdown
              </h3>
              <div className="space-y-2">
                <ProgressRow label="Positive" count={filteredStats.positiveCount} total={filteredStats.totalReviews} barColor="bg-emerald-500" textColor="text-emerald-600" hoverColor="group-hover:text-emerald-600" onClick={goToPositive} />
                <ProgressRow label="Negative" count={filteredStats.negativeCount} total={filteredStats.totalReviews} barColor="bg-red-500" textColor="text-red-600" hoverColor="group-hover:text-red-600" onClick={goToNegative} />
                <ProgressRow label="Mixed Reviews" count={filteredStats.mixedCount} total={filteredStats.totalReviews} barColor="bg-purple-500" textColor="text-purple-600" hoverColor="group-hover:text-purple-600" onClick={goToMixed} />
                <ProgressRow label="Neutral" count={filteredStats.neutralCount} total={filteredStats.totalReviews} barColor="bg-zinc-400" textColor="text-zinc-600" hoverColor="group-hover:text-zinc-900" onClick={goToNeutral} />
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="glass-card p-5">
              <h3 className="text-[15px] font-bold text-zinc-900 mb-4 pb-3 border-b border-zinc-100 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-orange-500" aria-hidden="true" />
                Review Status
              </h3>
              <div className="space-y-2">
                <ProgressRow label="Approved" count={filteredStats.approvedCount} total={filteredStats.totalReviews} barColor="bg-blue-500" textColor="text-blue-600" hoverColor="group-hover:text-blue-600" onClick={goToApproved} />
                <ProgressRow label="Suspicious" count={filteredStats.suspiciousCount} total={filteredStats.totalReviews} barColor="bg-amber-500" textColor="text-amber-600" hoverColor="group-hover:text-amber-600" onClick={goToSuspicious} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Extracted table row — prevents full table re-render when only one row changes
const ReviewRow = React.memo(({ review: r, navigate }) => {
  const handleClick = useCallback(() => {
    navigate(`/reviews?search=${encodeURIComponent(r.reviewer_name ?? r.guest_name ?? "")}`);
  }, [navigate, r.reviewer_name, r.guest_name]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") handleClick();
  }, [handleClick]);



  return (
    <tr
      className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-label={`Review by ${r.reviewer_name}`}
    >
      <td className="px-5 py-3.5 max-w-[300px]">
        <p className="text-[13px] font-bold text-zinc-900 truncate group-hover:text-orange-600 transition-colors">
          {r.reviewer_name}
        </p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{r.review_text}</p>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-medium text-zinc-700">{r.platform}</span>
      </td>
      <td className="px-5 py-3.5">
        <StarRating rating={r.rating} />
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge value={r.status} />
      </td>
      <td className="px-5 py-3.5 text-right">
        <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">{dateFormat(r)}</span>
      </td>
    </tr>
  );
});
ReviewRow.displayName = "ReviewRow";

export default Dashboard;