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

const Dashboard = () => {
  const stats = useDerivedStats();
  const { state } = useAppContext();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // --- NEW: filter state ---
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [selectedProperty, setSelectedProperty] = useState("All");

  // --- NEW: derive unique platforms & properties from reviews ---
  const platforms = ["All", ...new Set((state.reviews || []).map(r => r.platform).filter(Boolean))];
  const properties = [
    "All",
    ...new Set(
      (
        state?.hotelConfig?.properties || []
      )
        .map(property => property.name)
        .filter(Boolean)
    )
  ];
  // --- NEW: filtered reviews based on selections ---
  const filteredReviews = (state.reviews || []).filter(r => {
    const platformMatch =
      selectedPlatform === "All" ||
      r.platform === selectedPlatform;

    const propertyMatch =
      selectedProperty === "All" ||
      r.hotel_name === selectedProperty;

    return platformMatch && propertyMatch;
  });

  const urgentEscalations = filteredReviews.filter(
    r => r.escalation_risk
  ).length;

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

  const isFiltered = selectedPlatform !== "All" || selectedProperty !== "All";

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

          {/* --- NEW: Filter dropdowns below title --- */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Property filter */}
            <div className="relative">
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className={`h-8 pl-3 pr-7 text-xs rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${selectedProperty !== "All"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                  : "border-slate-200 bg-white text-slate-600"
                  }`}
              >
                {properties.map(p => (
                  <option key={p} value={p}>{p === "All" ? "All Properties" : p}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Platform filter */}
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className={`h-8 pl-3 pr-7 text-xs rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${selectedPlatform !== "All"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                  : "border-slate-200 bg-white text-slate-600"
                  }`}
              >
                {platforms.map(p => (
                  <option key={p} value={p}>{p === "All" ? "All Platforms" : p}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Clear filters badge */}
            {isFiltered && (
              <button
                onClick={() => { setSelectedPlatform("All"); setSelectedProperty("All"); }}
                className="h-8 px-3 text-xs rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                ✕ Clear filters
              </button>
            )}

            {/* Active filter pill */}
            {isFiltered && (
              <span className="text-xs text-slate-400">
                Showing <span className="font-medium text-slate-600">{filteredReviews.length}</span> of <span className="font-medium text-slate-600">{state.reviews.length}</span> reviews
              </span>
            )}
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
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-6 h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Sentiment Trend</h3>
              <select className="bg-transparent border-none text-sm font-medium focus:ring-0">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              {/* now uses filteredStats.sentimentDistribution */}
              <BarChart data={filteredStats.sentimentDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                  {filteredStats.sentimentDistribution.map((entry, index) => {
                    const colors = { Positive: '#10B981', Negative: '#EF4444', Mixed: '#F59E0B', Neutral: '#64748B' };
                    return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#6366F1'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">Urgent Escalations</h3>
              <div className="space-y-4">
                {urgentEscalations.length > 0 ? urgentEscalations.map(item => (
                  <div key={item.ticket_id || item.review_id} className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-red-600 uppercase tracking-tighter">{item.department || item.primary_department}</span>
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-red-200">
                        {item.type === 'ticket' ? 'Ticket' : 'Review Risk'}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{item.guest_name || item.reviewer_name}</p>
                    <p className="text-sm text-slate-500 line-clamp-1 mb-3">{item.review_text}</p>
                    <button
                      onClick={() => navigate(item.type === 'ticket' ? `/tickets?highlight=${item.ticket_id}` : `/reviews?highlight=${item.review_id}`)}
                      className="text-xs font-bold text-red-600 flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      {item.type === 'ticket' ? 'VIEW TICKET' : 'VIEW REVIEW'} <ArrowRight size={14} />
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500 opacity-50" />
                    <p>No urgent escalations!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">Department Load</h3>
              <div className="space-y-4">
                {/* now uses filteredStats.departmentBreakdown */}
                {Object.entries(filteredStats.departmentBreakdown).map(([dept, count]) => (
                  <div key={dept}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{dept}</span>
                      <span className="text-slate-500">{count} Tickets</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${(count / filteredStats.totalReviews) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {Object.keys(filteredStats.departmentBreakdown).length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic">No data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — Recent Reviews uses filteredReviews */}
        <div className="space-y-8">
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Recent Reviews</h3>
              <button onClick={() => navigate("/reviews")} className="text-xs font-bold text-indigo-600 hover:underline">VIEW ALL</button>
            </div>
            <div className="space-y-6">
              {recentReviews.length > 0 ? recentReviews.map(r => (
                <div key={r.review_id} className="group cursor-pointer" onClick={() => navigate(`/reviews?highlight=${r.review_id}`)}>
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${r.rating >= 4 ? "bg-green-500" : r.rating === 3 ? "bg-amber-500" : "bg-red-500"}`}>
                      {r.rating}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{r.reviewer_name}</p>
                      <p className="text-xs text-slate-500 mb-2">{r.platform} • {new Date(r.review_date).toLocaleDateString()}</p>
                      <p className="text-sm text-slate-600 line-clamp-2 group-hover:text-indigo-600 transition-colors">{r.review_text}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No reviews match filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
