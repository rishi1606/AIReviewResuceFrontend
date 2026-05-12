import React from "react";
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

const Dashboard = () => {
  const stats = useDerivedStats();
  const { state } = useAppContext();
  const navigate = useNavigate();

  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === "staff";

  const urgentEscalations = stats.urgentEscalations;
  const recentReviews = state.reviews.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Hotel Performance</h1>
          <p className="text-slate-500 dark:text-slate-400">Here's what's happening at {state.hotelConfig?.hotel_name || "your hotel"} today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/import")} className="btn-secondary flex items-center gap-2">
            <TrendingUp size={18} />
            Import Reviews
          </button>
          <button onClick={() => navigate("/reviews")} className="btn-primary flex items-center gap-2">
            <Zap size={18} />
            AI Workspace
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Reviews"
          value={stats.totalReviews}
          icon={MessageSquare}
          color="indigo"
          onClick={() => navigate("/reviews")}
        />
        <KPICard
          title="Avg Rating"
          value={stats.avgRating}
          icon={Star}
          trend={+2.4}
          color="amber"
          onClick={() => navigate("/analytics")}
        />
        <KPICard
          title="Critical Issues"
          value={stats.criticalCount}
          icon={AlertTriangle}
          color={stats.criticalCount > 0 ? "red" : "indigo"}
          onClick={() => navigate("/tickets?filter=urgency:High,status:Open")}
        />
        <KPICard
          title="Escalation Risk"
          value={stats.escalationRisks}
          icon={Zap}
          color={stats.escalationRisks > 0 ? "red" : "indigo"}
          onClick={() => navigate("/reviews?filter=escalation:true")}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <KPICard
          title="Mixed Reviews"
          value={stats.mixedCount}
          icon={MessageSquare}
          color="amber"
          onClick={() => navigate("/reviews?filter=sentiment:Mixed")}
        />
        <KPICard
          title="Neutral"
          value={stats.neutralCount}
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
          value={stats.approvedCount}
          icon={CheckCircle2}
          color="blue"
          onClick={() => navigate("/reviews?filter=status:Approved")}
        />
        <KPICard
          title="Flagged"
          value={stats.suspiciousCount}
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
              <BarChart data={stats.sentimentDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                >
                  {stats.sentimentDistribution.map((entry, index) => {
                    const colors = {
                      Positive: '#10B981',
                      Negative: '#EF4444',
                      Mixed: '#F59E0B',
                      Neutral: '#64748B'
                    };
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
                {Object.entries(stats.departmentBreakdown).map(([dept, count]) => (
                  <div key={dept}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{dept}</span>
                      <span className="text-slate-500">{count} Tickets</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${(count / stats.totalReviews) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                {Object.keys(stats.departmentBreakdown).length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic">No data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Section */}
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
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-slate-900 shadow-sm ${r.rating >= 4 ? "bg-green-500" : r.rating === 3 ? "bg-amber-500" : "bg-red-500"}`}>
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
                  <p>No reviews yet</p>
                </div>
              )}
            </div>
          </div>

          {/* <div className="bg-[#EEF2FF] border border-[#E0E7FF] rounded-2xl p-6 text-[#4F46E5] shadow-sm">
            <Zap className="mb-4 text-[#818CF8]" size={32} />
            <h3 className="text-xl font-bold mb-2">AI Insights</h3>
            <p className="text-[#6366F1] text-sm mb-6 leading-relaxed">
              Reviews about <b>Maintenance</b> have increased by 15% this week. Suggested: Check HVAC service logs for the 3rd floor.
            </p>
            <button className="w-full py-3 bg-white text-[#4F46E5] border border-[#E0E7FF] rounded-xl font-bold hover:bg-[#F8FAFC] transition-colors shadow-sm">
              VIEW FULL REPORT
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
