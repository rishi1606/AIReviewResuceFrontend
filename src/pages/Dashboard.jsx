import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, MessageSquare, AlertTriangle, CheckCircle2, Clock, Star, Zap,
  ArrowRight, Flag, ThumbsUp, ThumbsDown, User, Bell, LayoutDashboard, Target,
  Award, Calendar, ChevronRight, Activity
} from "lucide-react";
import { useDerivedStats } from "../hooks/useDerivedStats";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import KPICard from "../components/KPICard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie, Legend
} from 'recharts';
import { SkeletonKPI, SkeletonChart, SkeletonBlock, SkeletonReview, SkeletonBase } from "../components/Skeleton";

// --- Helpers ---
const ICON_THEMES = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  red: "bg-red-50 text-red-600 border-red-100",
  green: "bg-emerald-50 text-emerald-600 border-emerald-100",
  slate: "bg-zinc-100 text-zinc-600 border-zinc-200",
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
};

const trendConfig = {
  up: "bg-emerald-50 text-emerald-700",
  down: "bg-red-50 text-red-700",
  warn: "bg-amber-50 text-amber-700",
  neutral: "bg-zinc-100 text-zinc-600",
};

const ratingBg = (v) => v >= 4 ? "bg-emerald-500" : v >= 3 ? "bg-amber-500" : "bg-red-500";

const SENTIMENT_STYLES = {
  Positive: { wrapper: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Negative: { wrapper: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  Mixed: { wrapper: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  Neutral: { wrapper: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
};

const SentimentPill = ({ value }) => {
  const st = SENTIMENT_STYLES[value] || SENTIMENT_STYLES.Neutral;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1 border ${st.wrapper}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {value || "N/A"}
    </span>
  );
};

const STATUS_STYLES = {
  RESPONDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ESCALATED: "bg-red-50 text-red-700 border-red-200",
  Suspicious: "bg-amber-50 text-amber-700 border-amber-200",
  CLASSIFIED: "bg-blue-50 text-blue-700 border-blue-200",
};

const StatusBadge = ({ value }) => {
  const st = STATUS_STYLES[value] || "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${st}`}>
      {value || "Open"}
    </span>
  );
};

// Compact KPI card
const KPICardNew = ({ title, value, icon: Icon, color = "slate", trend, trendType = "neutral", onClick }) => {
  const themeClass = ICON_THEMES[color] || ICON_THEMES.slate;
  const tcClass = trendConfig[trendType] || trendConfig.neutral;

  return (
    <div
      onClick={onClick}
      className={`glass-card p-4 lg:p-5 flex flex-col gap-3 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${themeClass} group-hover:scale-105 transition-transform`}>
          <Icon size={18} />
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
};

/* ─────────────────────────────────────────────
   Main Dashboard Component
───────────────────────────────────────────── */
const Dashboard = () => {
  const stats = useDerivedStats();
  const { state } = useAppContext();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 8;

  // --- USE GLOBAL FILTERS ---
  const selectedPlatform = state.activeFilters?.platform || "ALL";
  const selectedProperty = state.activeFilters?.property || "ALL";

  // --- filtered reviews based on selections ---
  const filteredReviews = (state.reviews || []).filter(r => {
    const platformMatch = selectedPlatform === "ALL" || r.platform === selectedPlatform;
    const propertyMatch = selectedProperty === "ALL" || r.hotel_name === selectedProperty;
    return platformMatch && propertyMatch;
  });

  const totalPages = Math.ceil(filteredReviews.length / TABLE_PAGE_SIZE);
  const paginatedReviews = filteredReviews.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);

  const urgentEscalations = [
    ...state.tickets
      .filter(t => t.status === "ESCALATED")
      .map(t => ({ ...t, type: "ticket" })),
    ...filteredReviews
      .filter(r => r.status === "ESCALATED")
      .map(r => ({ ...r, type: "review" }))
  ]
    .sort((a, b) => new Date(b.created_at || b.review_date || 0) - new Date(a.created_at || a.review_date || 0))
    .slice(0, 4);

  const recentReviews = filteredReviews.slice(0, 4);

  const filteredStats = {
    totalReviews: filteredReviews.length,
    avgRating: filteredReviews.length
      ? (filteredReviews.reduce((s, r) => s + (r.rating || 0), 0) / filteredReviews.length).toFixed(1)
      : "0.0",
    positiveCount: filteredReviews.filter(r => r.sentiment?.toLowerCase() === "positive").length,
    negativeCount: filteredReviews.filter(r => r.sentiment?.toLowerCase() === "negative").length,
    mixedCount: filteredReviews.filter(r => r.sentiment?.toLowerCase() === "mixed").length,
    neutralCount: filteredReviews.filter(r => r.sentiment?.toLowerCase() === "neutral").length,
    approvedCount: filteredReviews.filter(r => r.status === "Approved" || r.status === "RESPONDED").length,
    escalatedCount: filteredReviews.filter(r => r.status === "ESCALATED" || r.escalation === true).length,
    suspiciousCount: filteredReviews.filter(r => r.status === "Suspicious" || r.is_suspicious === true).length,
  };

  const trendData = React.useMemo(() => {
    const dates = {};
    const sorted = [...filteredReviews].sort(
      (a, b) => new Date(a.review_date || a.createdAt || 0) - new Date(b.review_date || b.createdAt || 0)
    );
    sorted.forEach(r => {
      const dateVal = r.review_date || r.createdAt;
      if (!dateVal) return;
      const dateStr = new Date(dateVal).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (!dates[dateStr]) dates[dateStr] = { date: dateStr, Positive: 0, Negative: 0, Neutral: 0, Mixed: 0 };
      const sent = r.sentiment || "Neutral";
      if (dates[dateStr][sent] !== undefined) dates[dateStr][sent]++;
    });
    return Object.values(dates);
  }, [filteredReviews]);

  const platformData = React.useMemo(() => {
    const platforms = {};
    filteredReviews.forEach(r => {
      const p = r.platform || "Direct";
      platforms[p] = (platforms[p] || 0) + 1;
    });
    return Object.entries(platforms).map(([name, value]) => ({ name, value }));
  }, [filteredReviews]);

  const PLATFORM_COLORS = [
    "var(--color-orange-500)",
    "var(--color-purple-500)",
    "#0ea5e9",
    "#10b981",
    "#f59e0b"
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6">

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">

        {/* Main KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {state.isAppLoading ? (
            [1, 2, 3, 4].map(i => <SkeletonKPI key={i} />)
          ) : (
            <>
              <KPICardNew
                title="Total Reviews" value={filteredStats.totalReviews} icon={MessageSquare}
                color="orange" trend="All channels" trendType="neutral" onClick={() => navigate("/reviews")}
              />
              <KPICardNew
                title="Avg Rating" value={filteredStats.avgRating} icon={Star}
                color="purple" trend={`${filteredStats.avgRating} / 5`} trendType={filteredStats.avgRating >= 4 ? "up" : filteredStats.avgRating >= 3 ? "warn" : "down"}
              />
              <KPICardNew
                title="Escalated" value={filteredStats.escalatedCount} icon={AlertTriangle}
                color={filteredStats.escalatedCount > 0 ? "red" : "slate"} trend={filteredStats.escalatedCount > 0 ? "Needs action" : "All clear"} trendType={filteredStats.escalatedCount > 0 ? "down" : "up"} onClick={() => navigate("/reviews?tab=Escalated")}
              />
              <KPICardNew
                title="Positive Responses" value={filteredStats.positiveCount} icon={ThumbsUp}
                color="green" trend="Looking good" trendType="up" onClick={() => navigate("/reviews?tab=Positive")}
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {state.isAppLoading ? (
            <>
              {/* Sentiment Trends Skeleton */}
              <div className="glass-card lg:col-span-2 p-5 flex flex-col h-[320px]">
                <div className="mb-4 pb-3 border-b border-zinc-100">
                  <div className="h-4 bg-zinc-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-zinc-100 rounded w-48 animate-pulse"></div>
                </div>
                <div className="flex-1 flex items-end justify-around gap-2">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-zinc-200 rounded-t animate-pulse" style={{ height: `${Math.random() * 60 + 40}%` }}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Share Skeleton - Donut Chart */}
              <div className="glass-card p-5 flex flex-col h-[320px]">
                <div className="mb-4 pb-3 border-b border-zinc-100">
                  <div className="h-4 bg-zinc-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-zinc-100 rounded w-40 animate-pulse"></div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  {/* Donut Chart Skeleton */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="absolute w-40 h-40 rounded-full border-[12px] border-zinc-200 animate-pulse"></div>
                    <div className="absolute w-24 h-24 rounded-full bg-white"></div>
                  </div>
                  {/* Legend Skeleton */}
                  <div className="mt-6 flex flex-col gap-2 w-full px-4">
                    <div className="h-3 bg-zinc-200 rounded w-24 mx-auto animate-pulse"></div>
                    <div className="h-3 bg-zinc-200 rounded w-28 mx-auto animate-pulse"></div>
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
                    <p className="text-[11px] text-zinc-500 mt-0.5">Positive vs. Negative sentiment evolution</p>
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
                      <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }} />
                        <Area type="monotone" dataKey="Positive" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPositive)" />
                        <Area type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorNegative)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-xs">No data to show trends</div>
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
                          {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }} />
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
            <button className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1" onClick={() => navigate("/reviews")}>
              VIEW ALL <ArrowRight size={12} />
            </button>
          </div>
          {state.isAppLoading ? (
            <div className="divide-y divide-zinc-100">
              {[1, 2, 3, 4].map(i => <SkeletonReview key={i} />)}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Guest & Review</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Platform</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Rating</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedReviews.map((r) => (
                      <tr key={r.review_id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/reviews?search=${encodeURIComponent(r.reviewer_name || r.guest_name || "")}`)}>
                        <td className="px-5 py-3.5 max-w-[300px]">
                          <p className="text-[13px] font-bold text-zinc-900 truncate group-hover:text-orange-600 transition-colors">{r.reviewer_name}</p>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">{r.review_text}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium text-zinc-700">{r.platform}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={12} className={i < (r.rating || 0) ? "fill-orange-400 text-orange-400" : "fill-zinc-100 text-zinc-200"} />
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge value={r.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">{new Date(r.review_date).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))}
                    {paginatedReviews.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-sm">No reviews found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-white/50 rounded-b-2xl">
                  <span className="text-[11px] text-zinc-500 font-medium">Page {tablePage} of {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={tablePage === 1}
                      onClick={() => setTablePage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-lg disabled:opacity-50 hover:bg-zinc-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={tablePage === totalPages}
                      onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
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

      {/* ── Right Sidebar Panel ── */}
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
            <div className="glass-card p-5 cursor-pointer hover:bg-zinc-50/50 transition-colors group" onClick={() => navigate("/settings")}>
              <h3 className="text-[15px] font-bold text-zinc-900 mb-1">Add New Property</h3>
              <p className="text-[11px] text-zinc-500 font-medium mb-4">Manage your hotels and connect new platforms in Settings.</p>
              <button className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 group-hover:translate-x-1 transition-transform">
                GO TO SETTINGS <ArrowRight size={12} />
              </button>
            </div>

            {/* Sentiment Breakdown */}
            <div className="glass-card p-5">
              <h3 className="text-[15px] font-bold text-zinc-900 mb-4 pb-3 border-b border-zinc-100 flex items-center gap-2">
                <Activity size={16} className="text-orange-500" /> Sentiment Breakdown
              </h3>
              <div className="space-y-2">
                {/* Positive */}
                <div
                  className="cursor-pointer group hover:bg-zinc-50/80 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => navigate("/reviews?tab=Positive")}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-700 group-hover:text-emerald-600 transition-colors">Positive</span>
                    <span className="text-emerald-600 font-bold">{filteredStats.positiveCount}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(filteredStats.positiveCount / (filteredStats.totalReviews || 1)) * 100}%` }}></div>
                  </div>
                </div>
                {/* Negative */}
                <div
                  className="cursor-pointer group hover:bg-zinc-50/80 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => navigate("/reviews?tab=Negative")}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-700 group-hover:text-red-600 transition-colors">Negative</span>
                    <span className="text-red-600 font-bold">{filteredStats.negativeCount}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(filteredStats.negativeCount / (filteredStats.totalReviews || 1)) * 100}%` }}></div>
                  </div>
                </div>
                {/* Mixed */}
                <div
                  className="cursor-pointer group hover:bg-zinc-50/80 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => navigate("/reviews?tab=Mixed")}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-700 group-hover:text-purple-600 transition-colors">Mixed Reviews</span>
                    <span className="text-purple-600 font-bold">{filteredStats.mixedCount}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(filteredStats.mixedCount / (filteredStats.totalReviews || 1)) * 100}%` }}></div>
                  </div>
                </div>
                {/* Neutral */}
                <div
                  className="cursor-pointer group hover:bg-zinc-50/80 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => navigate("/reviews?tab=Neutral")}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-700 group-hover:text-zinc-900 transition-colors">Neutral</span>
                    <span className="text-zinc-600 font-bold">{filteredStats.neutralCount}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-400 rounded-full" style={{ width: `${(filteredStats.neutralCount / (filteredStats.totalReviews || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="glass-card p-5">
              <h3 className="text-[15px] font-bold text-zinc-900 mb-4 pb-3 border-b border-zinc-100 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-orange-500" /> Review Status
              </h3>
              <div className="space-y-2">
                {/* Approved */}
                <div
                  className="cursor-pointer group hover:bg-zinc-50/80 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => navigate("/reviews?tab=Approved")}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-700 group-hover:text-blue-600 transition-colors">Approved</span>
                    <span className="text-blue-600 font-bold">{filteredStats.approvedCount}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(filteredStats.approvedCount / (filteredStats.totalReviews || 1)) * 100}%` }}></div>
                  </div>
                </div>
                {/* Suspicious */}
                <div
                  className="cursor-pointer group hover:bg-zinc-50/80 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => navigate("/reviews?tab=Suspicious")}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-700 group-hover:text-amber-600 transition-colors">Suspicious</span>
                    <span className="text-amber-600 font-bold">{filteredStats.suspiciousCount}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(filteredStats.suspiciousCount / (filteredStats.totalReviews || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

    </div>
  );
};

export default Dashboard;