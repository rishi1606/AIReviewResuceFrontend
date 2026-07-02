import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { getReviews } from "../api/apiClient";
import StatusBadge, { getUIStatus } from "../components/StatusBadge";
import {
  Globe, Star, Search, Filter, Calendar, MessageSquare,
  ExternalLink, CheckCircle2, Loader2, Building2, User,
  Sparkles, Award, ArrowRight, ChevronDown, RefreshCw,
  TrendingUp, TrendingDown, ThumbsUp, AlertTriangle
} from "lucide-react";
import { ICON_THEMES, TREND_CONFIG } from "../constants/constants";
import InfoTooltip from "../components/InfoTooltip";

// ─── Click-outside hook for dropdowns ──────────────────────────────────────
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// ─── Reusable dropdown matching Reviews page Filters UI ──────────────────────
function FilterDropdown({ trigger, children, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && (
        <div
          className={`absolute mt-2 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 z-50 min-w-[180px] ${align === "right" ? "right-0" : "left-0"
            }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── KPI Card matching Dashboard page exactly ────────────────────────────────
const KPICardNew = React.memo(({ title, value, subtitle, icon: Icon, color = "slate", trend, trendIcon: TrendIcon, trendType = "neutral", urgent = false, onClick }) => {
  const themeClass = ICON_THEMES[color] ?? ICON_THEMES.slate;
  const tcClass = TREND_CONFIG[trendType] ?? TREND_CONFIG.neutral;

  const trendBadge = trend ? (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${tcClass}`}>
      {TrendIcon && <TrendIcon size={10} />}
      {trend}
    </span>
  ) : null;

  const cardClass = urgent
    ? "relative overflow-hidden bg-red-50/60 border border-red-200 border-l-4 border-l-red-500 ring-1 ring-red-100 rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-100 hover:border-red-300 active:translate-y-0 active:shadow-md select-none"
    : "bg-white border border-zinc-200 rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-zinc-300 active:translate-y-0 active:shadow-md select-none";

  return (
    <div className={cardClass} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}>
      {/* Row 1: icon + trend badge */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${themeClass} group-hover:scale-110 transition-transform duration-200`}>
          <Icon size={20} aria-hidden="true" />
        </div>
        {trendBadge}
      </div>

      {/* Divider line */}
      <div className={`border-t mb-3 ${urgent ? "border-red-200/70" : "border-zinc-100"}`} />

      {/* Row 2: label + value + subtitle */}
      <p className={`text-[11px] font-semibold tracking-wide mb-1 ${urgent ? "text-red-500" : "text-zinc-400"}`}>{title}</p>
      <p className={`text-[28px] font-bold leading-none tracking-tight ${urgent ? "text-red-600" : "text-zinc-900"}`}>{value}</p>
      {subtitle && (
        <p className={`text-[11px] mt-1.5 font-medium ${urgent ? "text-red-500/80" : "text-zinc-500"}`}>{subtitle}</p>
      )}
    </div>
  );
});
KPICardNew.displayName = "KPICardNew";

const PublishedReviews = () => {
  const { currentUser } = useAuth();
  const { state } = useAppContext();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [selectedRating, setSelectedRating] = useState("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedSentiment, setSelectedSentiment] = useState("ALL");

  useEffect(() => {
    document.title = "ReviewRescue — Published Reviews";
    fetchPublishedReviews();
  }, [currentUser]);

  const fetchPublishedReviews = async () => {
    setLoading(true);
    try {
      const res = await getReviews({ limit: 500 });
      if (res.success || res.data?.success || res.reviews || res.data?.reviews) {
        const fetchedReviews = res.data?.reviews || res.reviews || res.data?.data?.reviews || [];
        const published = fetchedReviews.filter(r => {
          const status = getUIStatus(r);
          return status === "Published" || r.status === "RESPONDED" || r.approval_status === "approved";
        });
        setReviews(published);
      }
    } catch (err) {
      console.error("Failed to fetch published reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  // Extract available platforms and departments
  const platforms = useMemo(() => {
    const list = new Set(reviews.map(r => r.platform).filter(Boolean));
    return ["ALL", ...Array.from(list)];
  }, [reviews]);

  const departments = useMemo(() => {
    const list = new Set(reviews.map(r => r.primary_department).filter(Boolean));
    return ["ALL", ...Array.from(list)];
  }, [reviews]);

  // Filter logic
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = (r.reviewer_name || "").toLowerCase().includes(query);
        const hotelMatch = (r.hotel_name || "").toLowerCase().includes(query);
        const textMatch = (r.review_text || "").toLowerCase().includes(query);
        const responseMatch = (r.response_text || "").toLowerCase().includes(query);
        if (!nameMatch && !hotelMatch && !textMatch && !responseMatch) return false;
      }
      if (selectedPlatform !== "ALL" && r.platform !== selectedPlatform) {
        return false;
      }
      if (selectedDepartment !== "ALL" && r.primary_department !== selectedDepartment) {
        return false;
      }
      if (selectedRating !== "ALL") {
        if (selectedRating === "5" && Number(r.rating) !== 5) return false;
        if (selectedRating === "4" && Number(r.rating) !== 4) return false;
        if (selectedRating === "3" && Number(r.rating) !== 3) return false;
        if (selectedRating === "low" && Number(r.rating) > 2) return false;
      }
      if (selectedSentiment !== "ALL" && (r.sentiment || "Neutral") !== selectedSentiment) {
        return false;
      }
      return true;
    });
  }, [reviews, searchQuery, selectedPlatform, selectedDepartment, selectedRating, selectedSentiment]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = reviews.length;
    const avgRating = total > 0
      ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / total).toFixed(1)
      : "0.0";
    const fiveStarCount = reviews.filter(r => Number(r.rating) === 5).length;
    const fiveStarPercentage = total > 0 ? Math.round((fiveStarCount / total) * 100) : 0;
    const positiveCount = reviews.filter(r => r.sentiment === "Positive" || Number(r.rating) >= 4).length;
    const positivePercentage = total > 0 ? Math.round((positiveCount / total) * 100) : 0;
    const negativeCount = reviews.filter(r => r.sentiment === "Negative" || Number(r.rating) <= 2).length;
    const negativePercentage = total > 0 ? Math.round((negativeCount / total) * 100) : 0;
    return { total, avgRating, fiveStarCount, fiveStarPercentage, positiveCount, positivePercentage, negativeCount, negativePercentage };
  }, [reviews]);

  const getPlatformColor = (platform) => {
    switch (platform) {
      case "Google": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Booking.com": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "TripAdvisor": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Expedia": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Airbnb": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-16 animate-in slide-in-from-bottom-4 duration-500 w-full max-w-none px-4 sm:px-6 lg:px-8">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-b border-zinc-200/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200/80 rounded-2xl shadow-md">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 flex items-center gap-2">
              Published Reviews
              <InfoTooltip text="This is your published archive — all guest reviews that have been approved and had their responses finalized. These responses are ready to be copied and posted on the original review platform (Google, Booking.com, etc.). Use the filters to find specific responses by platform, department, or rating." size={15} />
            </h1>
            <p className="text-sm text-zinc-500 font-medium">
              Comprehensive archive of all guest reviews with finalized responses published to platforms
            </p>
          </div>
        </div>

        <button
          onClick={fetchPublishedReviews}
          className="cursor-pointer self-start md:self-auto px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${loading ? "animate-spin" : ""}`} />

        </button>
      </div>

      {/* ── Search Bar & Filters Section (Exact Reviews Page UI & Brand Colors) ── */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-md flex flex-wrap items-center justify-between gap-4">

        {/* Search input styled like Reviews page */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search guest name, review text, or response..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border-2 border-zinc-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-medium placeholder:text-zinc-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 font-bold text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdowns styled like Reviews page with Orange Brand accent */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Platform Filter */}
          <FilterDropdown
            align="right"
            trigger={
              <button
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all cursor-pointer shadow-sm ${selectedPlatform !== "ALL"
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
              >
                <Filter size={14} className={selectedPlatform !== "ALL" ? "text-orange-500" : "text-zinc-400"} />
                {selectedPlatform === "ALL" ? "All Platforms" : selectedPlatform}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {platforms.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${selectedPlatform === p ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
              >
                {p === "ALL" ? "All Platforms" : p}
              </button>
            ))}
          </FilterDropdown>

          {/* Department Filter */}
          <FilterDropdown
            align="right"
            trigger={
              <button
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all cursor-pointer shadow-sm ${selectedDepartment !== "ALL"
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
              >
                <Building2 size={14} className={selectedDepartment !== "ALL" ? "text-orange-500" : "text-zinc-400"} />
                {selectedDepartment === "ALL" ? "All Departments" : selectedDepartment}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {departments.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDepartment(d)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${selectedDepartment === d ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
              >
                {d === "ALL" ? "All Departments" : d}
              </button>
            ))}
          </FilterDropdown>

          {/* Rating Filter */}
          <FilterDropdown
            align="right"
            trigger={
              <button
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all cursor-pointer shadow-sm ${selectedRating !== "ALL"
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
              >
                <Star size={14} className={selectedRating !== "ALL" ? "text-orange-500 fill-orange-500" : "text-zinc-400"} />
                {selectedRating === "ALL" ? "All Ratings" : selectedRating === "low" ? "1-2 Stars (Critical)" : `${selectedRating} Stars Only`}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {[
              { id: "ALL", label: "All Ratings" },
              { id: "5", label: "5 Stars Only" },
              { id: "4", label: "4 Stars Only" },
              { id: "3", label: "3 Stars Only" },
              { id: "low", label: "1-2 Stars (Critical)" },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRating(r.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${selectedRating === r.id ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
              >
                {r.label}
              </button>
            ))}
          </FilterDropdown>

        </div>
      </div>

      {/* ── Card Grid System: 5-6 Cards in One Row on Desktop ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-zinc-200/80 shadow-md">
          <Loader2 className="w-9 h-9 text-emerald-500 animate-spin mb-3" />
          <p className="text-sm font-bold text-zinc-600">Loading published archive...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-zinc-200/80 shadow-md text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
            <Globe className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-zinc-900 mb-1">No published reviews found</h3>
          <p className="text-sm text-zinc-500 max-w-md font-medium">
            {searchQuery || selectedPlatform !== "ALL" || selectedDepartment !== "ALL" || selectedRating !== "ALL"
              ? "Try adjusting your search query or filter criteria to view published responses."
              : "When you or your managers approve review responses, they will appear permanently in this published archive."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-8">
          {filteredReviews.map((r) => {
            const s = (r.sentiment || "").toLowerCase();
            const numRating = Number(r.rating) || 0;
            // Match ReviewCard component behavior: determine quality by sentiment first
            const isPositive = s === "positive" || (!s && numRating >= 4);
            const isNegative = s === "negative" || (!s && numRating < 2.5);

            const quality = isPositive
              ? {
                border: "border-2 border-emerald-300 hover:border-emerald-400 shadow-md hover:shadow-xl hover:-translate-y-1.5",
                topLine: "bg-gradient-to-r from-emerald-300 to-teal-400",
                badge: "bg-emerald-50 text-emerald-700 border-emerald-200"
              }
              : isNegative
                ? {
                  border: "border-2 border-rose-300 hover:border-rose-400 shadow-md hover:shadow-xl hover:-translate-y-1.5",
                  topLine: "bg-gradient-to-r from-rose-400 to-red-400",
                  badge: "bg-rose-50 text-rose-700 border-rose-200"
                }
                : {
                  border: "border-2 border-amber-300 hover:border-amber-400 shadow-md hover:shadow-xl hover:-translate-y-1.5",
                  topLine: "bg-gradient-to-r from-amber-300 to-yellow-400",
                  badge: "bg-amber-50 text-amber-700 border-amber-200"
                };

            return (
              <div
                key={r.review_id || r._id}
                onClick={() => navigate(`/reviews/${r.review_id}`)}
                className={`bg-white rounded-3xl px-6 pt-6 pb-7 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[430px] relative overflow-hidden ${quality.border}`}
              >
                {/* Top Accent Indicator matching rating quality */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${quality.topLine}`} />

                {/* ── Card Header ── */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-black text-emerald-600 shrink-0">✅</span>
                      <span className="font-bold text-sm text-zinc-900 truncate" title={r.reviewer_name || "Anonymous Guest"}>
                        {r.reviewer_name || "Anonymous Guest"}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-semibold shrink-0">
                      {new Date(r.review_date || r.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getPlatformColor(r.platform)}`}>
                        {r.platform || "Platform"}
                      </span>
                      {r.primary_department && (
                        <span className="px-2 py-0.5 bg-zinc-50 border border-zinc-200/80 text-zinc-700 rounded-lg text-[10px] font-bold truncate max-w-[110px]">
                          {r.primary_department}
                        </span>
                      )}
                    </div>

                    {/* Rating + PUBLISHED status pill matching Option 3 */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-black text-[10px] shadow-2xs ${quality.badge}`}>
                      <Star className="w-3 h-3 fill-current shrink-0" />
                      <span>{r.rating || 0} ⭐ - PUBLISHED</span>
                    </div>
                  </div>
                </div>

                {/* ── Card Content: Guest Review & Published Response ── */}
                <div className="flex-1 flex flex-col justify-center my-3.5 gap-2.5 overflow-hidden">
                  {/* Guest review text box (White / Soft Gray) */}
                  <div className="bg-zinc-50/80 rounded-2xl p-3 border border-zinc-200/60 shadow-2xs">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-zinc-400" />
                      <span>Guest Review</span>
                    </p>
                    <p className="text-xs text-zinc-700 line-clamp-2 italic font-medium">
                      "{r.review_text || r.title || "No review text provided."}"
                    </p>
                  </div>

                  {/* Published response box (Light Green Only!) */}
                  <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-200/70 shadow-2xs flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">Published Response</span>
                        </span>
                        {r.response_tone && (
                          <span className="px-1.5 py-0.2 bg-white border border-emerald-200 text-emerald-800 rounded-md text-[9px] font-bold shrink-0 shadow-2xs">
                            {r.response_tone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-950 font-semibold line-clamp-3 leading-relaxed">
                        {r.response_text || "Thank you for your feedback!"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Card Footer ── */}
                <div className="pt-3 mt-1 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600 font-bold truncate max-w-[140px]" title={r.approved_by ? `By ${r.approved_by}` : "Published"}>
                    {r.approved_by ? `✓ Approved by: ${r.approved_by}` : "✓ Published"}
                  </span>
                  <span className="font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center gap-0.5 shrink-0 transition-transform group-hover:translate-x-0.5">
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default PublishedReviews;
