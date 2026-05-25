import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { getHotel, getReviews, getTickets } from '../api/apiClient';
import { Loader2, TrendingUp, TrendingDown, Clock, AlertTriangle, AlertCircle, FileText, CheckCircle2, Ticket, BarChart3, PieChart as PieIcon, Star, MessageSquare, Zap } from 'lucide-react';

const SENTIMENT_COLORS = { Positive: '#10b981', Neutral: '#f59e0b', Mixed: '#6366f1', Negative: '#ef4444' };
const STATUS_COLORS = { Open: '#ef4444', 'In Progress': '#f59e0b', 'Pending Verification': '#3b82f6', Resolved: '#10b981', Closed: '#64748b' };

const EmptyChart = ({ icon: Icon, title = "No Data Available", subtitle = "Try adjusting your filters or date range." }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 select-none">
    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
      <Icon size={22} className="stroke-[1.5]" />
    </div>
    <h4 className="text-sm font-bold text-slate-700">{title}</h4>
    <p className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">{subtitle}</p>
  </div>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
  </div>
);

const StatCard = ({ label, value, sub, color = "indigo" }) => {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${colors[color]}`}>
      <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs opacity-60">{sub}</span>}
    </div>
  );
};

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hotelData, setHotelData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [dateRange, setDateRange] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [viewMode, setViewMode] = useState('charts');
  const [activeTab, setActiveTab] = useState('reviews');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rRes, tRes] = await Promise.all([
        getReviews({ limit: 5000 }),
        getTickets({ limit: 5000 })
      ]);
      setReviews(rRes.data?.reviews || rRes.reviews || rRes.data || []);
      setTickets(tRes.data?.tickets || tRes.tickets || tRes.data || []);
    } catch (err) {
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };;

  // Replace these two useMemos:
  const properties = useMemo(() => new Set((reviews || []).map(r => r.hotel_name).filter(Boolean)), [reviews]);
  const platforms = useMemo(() => new Set((reviews || []).map(r => r.platform).filter(Boolean)), [reviews]);
  const departments = useMemo(() => new Set((tickets || []).map(t => t.department).filter(Boolean)), [tickets]);

  const filteredReviews = useMemo(() => {
    let f = [...reviews];
    if (selectedProperty !== 'All') f = f.filter(r => r.hotel_name === selectedProperty);
    if (selectedPlatform !== 'All') f = f.filter(r => r.platform === selectedPlatform);
    const now = new Date();
    f = f.filter(r => {
      const d = new Date(r.createdAt || r.imported_at || r.review_date);
      if (isNaN(d.getTime())) return true;
      const days = Math.ceil(Math.abs(now - d) / 86400000);
      if (dateRange === 'today') return days <= 1;
      if (dateRange === '7days') return days <= 7;
      if (dateRange === '30days') return days <= 30;
      if (dateRange === '3months') return days <= 90;
      return true;
    });
    return f;
  }, [reviews, selectedProperty, selectedPlatform, dateRange]);

  const filteredTickets = useMemo(() => {
    let f = [...tickets];
    if (selectedProperty !== 'All') f = f.filter(t => {
      const r = reviews.find(r => r.review_id === t.review_id);
      return r?.hotel_name === selectedProperty;
    });
    // ADD THIS — filter tickets by platform via linked review
    if (selectedPlatform !== 'All') f = f.filter(t => {
      const r = reviews.find(r => r.review_id === t.review_id);
      return r?.platform === selectedPlatform;
    });
    if (selectedDepartment !== 'All') f = f.filter(t => t.department === selectedDepartment);
    const now = new Date();
    f = f.filter(t => {
      const d = new Date(t.createdAt || t.created_at);
      if (isNaN(d.getTime())) return true;
      const days = Math.ceil(Math.abs(now - d) / 86400000);
      if (dateRange === 'today') return days <= 1;
      if (dateRange === '7days') return days <= 7;
      if (dateRange === '30days') return days <= 30;
      if (dateRange === '3months') return days <= 90;
      return true;
    });
    return f;
  }, [tickets, reviews, selectedProperty, selectedPlatform, selectedDepartment, dateRange]);
  // ↑ added selectedPlatform to dependency array

  const ratingDist = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredReviews.forEach(r => {
      const v = r.normalised_rating ?? r.rating;
      if (v >= 1 && v <= 5) dist[Math.round(v)]++;
    });
    return Object.keys(dist).map(k => ({ rating: `${k} ★`, count: dist[k] }));
  }, [filteredReviews]);

  // FIXED: includes Mixed and Neutral
  const sentimentData = useMemo(() => {
    const counts = { Positive: 0, Neutral: 0, Mixed: 0, Negative: 0 };
    filteredReviews.forEach(r => { if (counts[r.sentiment] !== undefined) counts[r.sentiment]++; });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [filteredReviews]);

  const platformAvg = useMemo(() => {
    const map = {};
    filteredReviews.forEach(r => {
      if (!r.platform) return;
      if (!map[r.platform]) map[r.platform] = { sum: 0, count: 0 };
      map[r.platform].sum += (r.normalised_rating ?? r.rating ?? 0);
      map[r.platform].count++;
    });
    return Object.keys(map).map(p => ({ platform: p, avg: parseFloat((map[p].sum / map[p].count).toFixed(2)) }));
  }, [filteredReviews]);

  const ticketStatusData = useMemo(() => {
    const counts = { Open: 0, 'In Progress': 0, 'Pending Verification': 0, Resolved: 0, Closed: 0 };
    filteredTickets.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [filteredTickets]);

  const ticketsByDept = useMemo(() => {
    const map = {};
    filteredTickets.forEach(t => { const d = t.department || 'Unassigned'; map[d] = (map[d] || 0) + 1; });
    return Object.keys(map).map(k => ({ department: k, count: map[k] }));
  }, [filteredTickets]);

  const overdueTickets = useMemo(() => filteredTickets.filter(t => t.sla_breached && !['Resolved', 'Closed'].includes(t.status)), [filteredTickets]);

  const highUrgencyReviews = useMemo(() => filteredReviews.filter(r => r.urgency === 'High'), [filteredReviews]);

  const staffAssignments = useMemo(() => {
    const map = {};
    filteredTickets.forEach(t => {
      const n = t.assignee_name || 'Unassigned';
      if (!map[n]) map[n] = { name: n, open: 0, resolved: 0, closed: 0, total: 0 };
      map[n].total++;
      if (['Open', 'In Progress', 'Pending Verification'].includes(t.status)) map[n].open++;
      else if (t.status === 'Resolved') map[n].resolved++;
      else if (t.status === 'Closed') map[n].closed++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredTickets]);

  const avgRating = filteredReviews.length
    ? (filteredReviews.reduce((s, r) => s + (r.normalised_rating ?? r.rating ?? 0), 0) / filteredReviews.length).toFixed(1)
    : "—";

  const selectClass = "px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer";

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  const tabs = [
    { id: 'reviews', label: 'Reviews' },
    { id: 'urgency', label: 'Urgency & AI' },
    { id: 'tickets', label: 'Tickets & SLA' },
    { id: 'staff', label: 'Staff' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto pb-20 space-y-8 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Cross-property performance, AI insights, and ticket metrics.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className={selectClass}>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="all">All Time</option>
          </select>
          <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)} className={selectClass}>
            <option value="All">All Properties</option>
            {[...properties].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className={selectClass}>
            <option value="All">All Platforms</option>
            {[...platforms].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('charts')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'charts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Charts</button>
            <button onClick={() => setViewMode('table')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Data Table</button>
          </div>
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Reviews" value={filteredReviews.length} sub="matching filters" color="indigo" />
        <StatCard label="Avg Rating" value={avgRating} sub="out of 5" color="amber" />
        <StatCard label="High Urgency" value={highUrgencyReviews.length} sub="reviews" color="red" />
        <StatCard label="Open Tickets" value={filteredTickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length} sub="active" color="slate" />
      </div>


      {viewMode === 'charts' ? (
        <>
          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 border-b border-slate-200">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ════════ REVIEWS TAB ════════ */}
          {activeTab === 'reviews' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <SectionHeader title="Reviews Performance" subtitle="Rating distributions, sentiment breakdown, and platform averages." />

              {/* Table first */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">All Reviews</h3>
                  <span className="text-xs text-slate-400">{filteredReviews.length} results</span>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
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
                      {filteredReviews.length === 0 ? (
                        <tr><td colSpan="7" className="px-6 py-10 text-center text-sm text-slate-400">No reviews match your filters.</td></tr>
                      ) : filteredReviews.map(r => (
                        <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {r.reviewer_name || 'Anonymous'}
                            <div className="text-[10px] text-slate-400">{r.room_number ? `Room ${r.room_number}` : ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100">
                              {r.normalised_rating ?? r.rating} ★
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{r.hotel_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{r.platform}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${r.sentiment === 'Positive' ? 'bg-green-50 text-green-700 border-green-200' :
                              r.sentiment === 'Negative' ? 'bg-red-50 text-red-700 border-red-200' :
                                r.sentiment === 'Mixed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {r.sentiment || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold border border-slate-200">
                              {r.status || 'Open'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {new Date(r.createdAt || r.imported_at || r.review_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts below */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6 lg:col-span-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Rating Distribution</h3>
                  <div className="h-56">
                    {filteredReviews.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ratingDist} margin={{ left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="rating" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart icon={BarChart3} title="No Reviews Found" />}
                  </div>
                </div>

                {/* Sentiment Pie — now includes Mixed & Neutral */}
                <div className="glass-card p-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Sentiment Breakdown</h3>
                  <div className="h-56">
                    {sentimentData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sentimentData} innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                            {sentimentData.map((entry) => (
                              <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart icon={PieIcon} title="No Sentiment Data" />}
                  </div>
                </div>

                <div className="glass-card p-6 lg:col-span-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Average Rating by Platform</h3>
                  <div className="h-56">
                    {platformAvg.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={platformAvg} margin={{ left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="platform" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="avg" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart icon={BarChart3} title="No Platform Data" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ URGENCY TAB ════════ */}
          {activeTab === 'urgency' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <SectionHeader title="Urgency & AI Performance" subtitle="High urgency alerts and AI confidence flags." />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="High Urgency" value={highUrgencyReviews.length} color="red" />
                <StatCard label="Escalation Risk" value={filteredReviews.filter(r => r.escalation_risk).length} color="amber" />
                <StatCard label="Low Confidence" value={filteredReviews.filter(r => r.confidence < 50).length} color="slate" />
                <StatCard label="Needs Review" value={filteredReviews.filter(r => r.needs_human_review).length} color="indigo" />
              </div>

              {/* Table first */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                    <AlertTriangle size={15} /> High Urgency Reviews
                  </h3>
                  <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full border border-red-100">{highUrgencyReviews.length} flagged</span>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-3 text-left font-semibold">Reviewer</th>
                        <th className="px-4 py-3 text-left font-semibold">Rating</th>
                        <th className="px-4 py-3 text-left font-semibold">Sentiment</th>
                        <th className="px-4 py-3 text-left font-semibold">Platform</th>
                        <th className="px-4 py-3 text-left font-semibold">Confidence</th>
                        <th className="px-4 py-3 text-left font-semibold">Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {highUrgencyReviews.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-10 text-center">
                          <CheckCircle2 className="mx-auto text-green-400 mb-2" size={28} />
                          <p className="text-sm text-slate-500">No high urgency reviews!</p>
                        </td></tr>
                      ) : highUrgencyReviews.map(r => (
                        <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {r.reviewer_name || 'Anonymous'}
                            <div className="text-[10px] text-slate-400">{r.hotel_name} · {r.platform}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                              {r.normalised_rating ?? r.rating} ★
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">{r.sentiment || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{r.platform}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${(r.confidence ?? 100) < 50 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                              {r.confidence ?? '—'}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                              <Clock size={11} />
                              {Math.round((new Date() - new Date(r.createdAt || r.imported_at)) / 3600000)}h ago
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Urgency pie chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Urgency Distribution</h3>
                  <div className="h-56">
                    {(() => {
                      const urgData = ['High', 'Medium', 'Low'].map(u => ({ name: u, value: filteredReviews.filter(r => r.urgency === u).length }));
                      const urgColors = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
                      return urgData.some(d => d.value > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={urgData} innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                              {urgData.map(e => <Cell key={e.name} fill={urgColors[e.name]} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart icon={PieIcon} title="No Urgency Data" />;
                    })()}
                  </div>
                </div>
                <div className="glass-card p-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Sentiment Breakdown</h3>
                  <div className="h-56">
                    {sentimentData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sentimentData} innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                            {sentimentData.map(e => <Cell key={e.name} fill={SENTIMENT_COLORS[e.name]} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart icon={PieIcon} title="No Sentiment Data" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ TICKETS TAB ════════ */}
          {activeTab === 'tickets' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <SectionHeader title="Tickets & SLA Metrics" subtitle="Resolution times, stage bottlenecks, and departmental load." />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Tickets" value={filteredTickets.length} color="indigo" />
                <StatCard label="Open" value={filteredTickets.filter(t => t.status === 'Open').length} color="red" />
                <StatCard label="In Progress" value={filteredTickets.filter(t => t.status === 'In Progress').length} color="amber" />
                <StatCard label="Resolved" value={filteredTickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length} color="green" />
              </div>

              {/* Overdue table */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-500" /> Overdue Tickets
                  </h3>
                  <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full border border-red-100">{overdueTickets.length} breaches</span>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-3 text-left font-semibold">Ticket ID</th>
                        <th className="px-4 py-3 text-left font-semibold">Guest</th>
                        <th className="px-4 py-3 text-left font-semibold">Department</th>
                        <th className="px-4 py-3 text-left font-semibold">Assignee</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {overdueTickets.length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-10 text-center">
                          <CheckCircle2 className="mx-auto text-green-400 mb-2" size={28} />
                          <p className="text-sm text-slate-500">All tickets within SLA!</p>
                        </td></tr>
                      ) : overdueTickets.map(t => (
                        <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs text-slate-700 font-medium">{t.ticket_id}</td>
                          <td className="px-4 py-3 text-slate-700">{t.guest_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{t.department || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{t.assignee_name || 'Unassigned'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-semibold border border-amber-100">{t.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* All tickets table */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">All Tickets</h3>
                  <span className="text-xs text-slate-400">{filteredTickets.length} results</span>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-3 text-left font-semibold">Ticket ID</th>
                        <th className="px-4 py-3 text-left font-semibold">Guest</th>
                        <th className="px-4 py-3 text-left font-semibold">Department</th>
                        <th className="px-4 py-3 text-left font-semibold">Urgency</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Assignee</th>
                        <th className="px-4 py-3 text-left font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredTickets.length === 0 ? (
                        <tr><td colSpan="7" className="px-6 py-10 text-center text-sm text-slate-400">No tickets match your filters.</td></tr>
                      ) : filteredTickets.map(t => (
                        <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs font-medium text-slate-700">{t.ticket_id}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{t.guest_name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{t.department || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${t.urgency === 'High' ? 'bg-red-50 text-red-700 border-red-100' :
                              t.urgency === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-green-50 text-green-700 border-green-100'}`}>
                              {t.urgency}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold border border-slate-200">{t.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{t.assignee_name || 'Unassigned'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.createdAt || t.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Tickets by Department</h3>
                  <div className="h-56">
                    {ticketsByDept.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ticketsByDept} layout="vertical" margin={{ left: 0, right: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis dataKey="department" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart icon={BarChart3} title="No Ticket Data" />}
                  </div>
                </div>
                <div className="glass-card p-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Ticket Stage Breakdown</h3>
                  <div className="h-56">
                    {ticketStatusData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={ticketStatusData} innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                            {ticketStatusData.map(e => <Cell key={e.name} fill={STATUS_COLORS[e.name] || '#cbd5e1'} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart icon={PieIcon} title="No Status Data" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ STAFF TAB ════════ */}
          {activeTab === 'staff' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <SectionHeader title="Staff & Assignments" subtitle="Track team workload and resolution progress." />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Staff Members" value={staffAssignments.length} color="indigo" />
                <StatCard label="Unassigned" value={filteredTickets.filter(t => !t.assignee_id || t.assignee_name === 'Unassigned').length} color="amber" />
                <StatCard label="Avg per Staff" value={staffAssignments.length ? Math.round(filteredTickets.length / staffAssignments.length) : 0} sub="tickets" color="slate" />
              </div>

              {/* Staff table */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700">Staff Workload</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-3 text-left font-semibold">Staff Member</th>
                        <th className="px-4 py-3 text-center font-semibold">Open</th>
                        <th className="px-4 py-3 text-center font-semibold">In Progress</th>
                        <th className="px-4 py-3 text-center font-semibold">Resolved</th>
                        <th className="px-4 py-3 text-center font-semibold">Closed</th>
                        <th className="px-4 py-3 text-center font-semibold text-indigo-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffAssignments.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-400">No staff assignments found.</td></tr>
                      ) : staffAssignments.map(s => (
                        <tr key={s.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold ${s.open > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>{s.open}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold ${s.open > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                              {filteredTickets.filter(t => t.assignee_name === s.name && t.status === 'In Progress').length}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold ${s.resolved > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>{s.resolved}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold ${s.closed > 0 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>{s.closed}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">{s.total}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Staff bar chart */}
              <div className="glass-card p-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Workload by Staff</h3>
                <div className="h-56">
                  {staffAssignments.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffAssignments} margin={{ left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="open" name="Open" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} stackId="a" />
                        <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} stackId="a" />
                        <Bar dataKey="closed" name="Closed" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={32} stackId="a" />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart icon={BarChart3} title="No Staff Data" />}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── DATA TABLE VIEW ── */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Filtered Data</h2>
            <p className="text-sm text-slate-500">{filteredReviews.length} reviews · {filteredTickets.length} tickets</p>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">All Reviews</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
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
                  {filteredReviews.length === 0 ? (
                    <tr><td colSpan="7" className="px-6 py-10 text-center text-sm text-slate-400">No reviews found.</td></tr>
                  ) : filteredReviews.map(r => (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{r.reviewer_name || 'Anonymous'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100">{r.normalised_rating ?? r.rating} ★</span></td>
                      <td className="px-4 py-3 text-xs text-slate-600">{r.hotel_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.platform}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${r.sentiment === 'Positive' ? 'bg-green-50 text-green-700 border-green-200' :
                          r.sentiment === 'Negative' ? 'bg-red-50 text-red-700 border-red-200' :
                            r.sentiment === 'Mixed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'}`}>{r.sentiment || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold border border-slate-200">{r.status || 'Open'}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(r.createdAt || r.imported_at || r.review_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}