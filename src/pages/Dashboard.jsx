import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  Zap,
  ArrowRight,
  Flag
} from "lucide-react";
import { useDerivedStats } from "../hooks/useDerivedStats";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import KPICard from "../components/KPICard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell
} from 'recharts';
import GlobalSearch from "../components/GlobalSearch";
import { SkeletonKPI, SkeletonChart, SkeletonBlock, SkeletonReview, SkeletonBase } from "../components/Skeleton";

const Dashboard = () => {
  const stats = useDerivedStats();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;


  // --- USE GLOBAL FILTERS ---
  const selectedPlatform = state.activeFilters?.platform || "ALL";
  const selectedProperty = state.activeFilters?.property || "ALL";

  // --- NEW: filtered reviews based on selections ---
  const filteredReviews = (state.reviews || []).filter(r => {
    const platformMatch =
      selectedPlatform === "ALL" ||
      r.platform === selectedPlatform;

    const propertyMatch =
      selectedProperty === "ALL" ||
      r.hotel_name === selectedProperty;

    return platformMatch && propertyMatch;
  });
  const totalPages = Math.ceil(filteredReviews.length / TABLE_PAGE_SIZE);
  const paginatedReviews = filteredReviews.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);

  const urgentEscalations = [
    ...state.tickets
      .filter(t => {
        const linkedReview = state.reviews.find(r => r.review_id === t.review_id);
        const matchesPlatform = selectedPlatform === "ALL" ? true : linkedReview?.platform === selectedPlatform;
        const matchesProperty = selectedProperty === "ALL" ? true : linkedReview?.hotel_name === selectedProperty;
        return matchesPlatform && matchesProperty && (t.urgency === "High" || t.escalated) && !["Closed", "Resolved"].includes(t.status);
      })
      .map(t => ({ ...t, type: 'ticket' })),
    ...filteredReviews
      .filter(r => (r.escalation_risk || r.status === "ESCALATED") && r.status !== "RESPONDED" && !r.linked_ticket_id)
      .map(r => ({ ...r, type: 'review' }))
  ].sort((a, b) => (new Date(b.created_at || b.review_date || 0)) - (new Date(a.created_at || a.review_date || 0))).slice(0, 5);

  const recentReviews = filteredReviews.slice(0, 5);

  // --- NEW: filtered mini-stats derived from filteredReviews ---
  const filteredStats = {
    totalReviews: filteredReviews.length,
    avgRating: filteredReviews.length
      ? (filteredReviews.reduce((s, r) => s + (r.rating || 0), 0) / filteredReviews.length).toFixed(1)
      : "0.0",
    criticalCount: filteredReviews.filter(r => r.urgency === "High").length,
    escalationRisks: filteredReviews.filter(r => r.escalation_risk).length,
    mixedCount: filteredReviews.filter(r => r.sentiment === "Mixed").length,
    neutralCount: filteredReviews.filter(r => r.sentiment === "Neutral").length,
    approvedCount: filteredReviews.filter(r => r.status === "Approved").length,
    suspiciousCount: filteredReviews.filter(r => r.is_suspicious).length,
    sentimentDistribution: ["Positive", "Negative", "Mixed", "Neutral"].map(name => ({
      name,
      count: filteredReviews.filter(r => r.sentiment === name).length,
    })),
    departmentBreakdown: filteredReviews.reduce((acc, r) => {
      const dept = r.primary_department;
      if (dept) acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {}),
  };

  const isFiltered = selectedPlatform !== "ALL" || selectedProperty !== "ALL";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: title + filters */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Hotel Performance</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Here's what's happening at {state.hotelConfig?.hotel_name || "your hotel"} today.
          </p>

          {/* Filters info container */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Clear filters badge */}
            {/* {isFiltered && (
              <button
                onClick={() => {
                  dispatch({ type: "SET_APP_LOADING", payload: true });
                  dispatch({
                    type: "SET_ACTIVE_FILTERS",
                    payload: { platform: "ALL", property: "ALL" }
                  });
                  setTimeout(() => {
                    dispatch({ type: "SET_APP_LOADING", payload: false });
                  }, 600);
                }}
                className="h-8 px-3 text-xs rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                ✕ Clear global filters
              </button>
            )} */}

            {/* Active filter pill */}
            {/* {isFiltered && (
              <span className="text-xs text-slate-400 mt-2 block md:inline-block md:mt-0">
                Showing <span className="font-medium text-slate-600">{filteredReviews.length}</span> of <span className="font-medium text-slate-600">{state.reviews.length}</span> reviews (Filtered globally)
              </span>
            )} */}
          </div>
        </div>

        {/* Right: search + button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <GlobalSearch />
          <button onClick={() => navigate("/import")} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
            <TrendingUp size={18} />
            Import Reviews
          </button>
        </div>
      </div>

      {/* KPI Grid — now uses filteredStats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {state.isAppLoading ? (
          [1, 2, 3, 4].map(i => <SkeletonKPI key={i} />)
        ) : (
          <>
            <KPICard
              title="Total Reviews"
              value={filteredStats.totalReviews}
              icon={MessageSquare}
              color="indigo"
              onClick={() => navigate("/reviews")}
            />
            <KPICard
              title="Avg Rating"
              value={filteredStats.avgRating}
              icon={Star}
              trend={+2.4}
              color="amber"
              onClick={() => navigate("/analytics")}
            />
            <KPICard
              title="Critical Issues"
              value={filteredStats.criticalCount}
              icon={AlertTriangle}
              color={filteredStats.criticalCount > 0 ? "red" : "indigo"}
              onClick={() => navigate("/tickets?filter=urgency:High,status:Open")}
            />
            <KPICard
              title="Escalation Risk"
              value={filteredStats.escalationRisks}
              icon={Zap}
              color={filteredStats.escalationRisks > 0 ? "red" : "indigo"}
              onClick={() => navigate("/reviews?filter=escalation:true")}
            />
          </>
        )}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {state.isAppLoading ? (
          [1, 2, 3, 4, 5].map(i => <SkeletonKPI key={i} />)
        ) : (
          <>
            <KPICard
              title="Mixed Reviews"
              value={filteredStats.mixedCount}
              icon={MessageSquare}
              color="amber"
              onClick={() => navigate("/reviews?filter=sentiment:Mixed")}
            />
            <KPICard
              title="Neutral"
              value={filteredStats.neutralCount}
              icon={TrendingUp}
              color="slate"
              onClick={() => navigate("/reviews?filter=sentiment:Neutral")}
            />
            <KPICard
              title="Resolved"
              value={stats.resolvedTickets}
              icon={CheckCircle2}
              color="green"
              onClick={() => navigate("/tickets?filter=status:Closed")}
            />
            <KPICard
              title="Approved"
              value={filteredStats.approvedCount}
              icon={CheckCircle2}
              color="blue"
              onClick={() => navigate("/reviews?filter=status:Approved")}
            />
            <KPICard
              title="Flagged"
              value={filteredStats.suspiciousCount}
              icon={Flag}
              color="red"
              onClick={() => navigate("/reviews?tab=SUSPICIOUS")}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Urgent Escalations */}
        <div className="glass-card p-6 flex flex-col h-[650px]">

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Urgent Escalations</h3>

            {!state.isAppLoading && urgentEscalations.length > 0 && (
              <span className="text-xs text-slate-400">
                {urgentEscalations.length} items
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4">
              {state.isAppLoading ? (
                <div className="space-y-3">
                  <SkeletonBase className="h-20 w-full rounded-xl" />
                  <SkeletonBase className="h-20 w-full rounded-xl" />
                </div>
              ) : urgentEscalations.length > 0 ? (
                urgentEscalations.map((item) => (
                  <div
                    key={item.ticket_id || item.review_id}
                    className="p-4 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-red-600 uppercase tracking-tighter">
                        {item.department || item.primary_department}
                      </span>

                      <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-red-200">
                        {item.type === "ticket" ? "Ticket" : "Review Risk"}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-900">
                      {item.guest_name || item.reviewer_name}
                    </p>

                    <p className="text-sm text-slate-500 line-clamp-1 mb-3">
                      {item.review_text}
                    </p>

                    <button
                      onClick={() =>
                        navigate(
                          item.type === "ticket"
                            ? `/tickets?highlight=${item.ticket_id}`
                            : `/reviews?highlight=${item.review_id}`
                        )
                      }
                      className="text-xs font-bold text-red-600 flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      {item.type === "ticket"
                        ? "VIEW TICKET"
                        : "VIEW REVIEW"}

                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle2
                    size={32}
                    className="mx-auto mb-2 text-green-500 opacity-50"
                  />

                  <p>No urgent escalations!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="glass-card p-6 flex flex-col h-[650px]">

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Recent Reviews</h3>

            <button
              onClick={() => navigate("/reviews")}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              VIEW ALL
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-6">
              {state.isAppLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <SkeletonReview key={i} />
                ))
              ) : recentReviews.length > 0 ? (
                recentReviews.map((r) => (
                  <div
                    key={r.review_id}
                    className="group cursor-pointer"
                    onClick={() =>
                      navigate(`/reviews?highlight=${r.review_id}`)
                    }
                  >
                    <div className="flex gap-4">

                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${r.rating >= 4
                            ? "bg-green-500"
                            : r.rating === 3
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                      >
                        {r.rating}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {r.reviewer_name}
                        </p>

                        <p className="text-xs text-slate-500 mb-2">
                          {r.platform} •{" "}
                          {new Date(r.review_date).toLocaleDateString()}
                        </p>

                        <p className="text-sm text-slate-600 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {r.review_text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare
                    size={32}
                    className="mx-auto mb-2 opacity-20"
                  />

                  <p>No reviews match filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Reviews Table */}
      {/* All Reviews Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">All Reviews</h3>

          <span className="text-xs text-slate-400">
            {filteredReviews.length} results
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3 text-left font-semibold">Reviewer</th>
                <th className="px-4 py-3 text-left font-semibold">Rating</th>
                <th className="px-4 py-3 text-left font-semibold">Property</th>
                <th className="px-4 py-3 text-left font-semibold">Platform</th>
                <th className="px-4 py-3 text-left font-semibold">Sentiment</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {paginatedReviews.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    No reviews match your filters.
                  </td>
                </tr>
              ) : (
                paginatedReviews.map((r) => (
                  <tr
                    key={r._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {r.reviewer_name || "Anonymous"}

                      <div className="text-[10px] text-slate-400">
                        {r.room_number ? `Room ${r.room_number}` : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100">
                        {r.normalised_rating ?? r.rating} ★
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {r.hotel_name || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {r.platform}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${r.sentiment === "Positive"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : r.sentiment === "Negative"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : r.sentiment === "Mixed"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                      >
                        {r.sentiment || "N/A"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold border border-slate-200">
                        {r.status || "Open"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(
                        r.createdAt || r.imported_at || r.review_date
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">

            <div className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold">
                {(tablePage - 1) * TABLE_PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(
                  tablePage * TABLE_PAGE_SIZE,
                  filteredReviews.length
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold">
                {filteredReviews.length}
              </span>{" "}
              reviews
            </div>

            <div className="flex items-center gap-2 flex-wrap">

              <button
                onClick={() =>
                  setTablePage((prev) => Math.max(prev - 1, 1))
                }
                disabled={tablePage === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${tablePage === 1
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                  }`}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setTablePage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all border ${tablePage === page
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() =>
                  setTablePage((prev) =>
                    Math.min(prev + 1, totalPages)
                  )
                }
                disabled={tablePage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${tablePage === totalPages
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                  }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;