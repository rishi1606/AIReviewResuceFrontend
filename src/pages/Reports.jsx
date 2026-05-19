import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { getHotel, getReviews, getTickets } from '../api/apiClient';
import { Loader2, TrendingUp, TrendingDown, Clock, AlertTriangle, AlertCircle, FileText, CheckCircle2, Ticket } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const SENTIMENT_COLORS = { Positive: '#10b981', Neutral: '#f59e0b', Negative: '#ef4444' };
const STATUS_COLORS = { Open: '#ef4444', 'In Progress': '#f59e0b', 'Pending Verification': '#3b82f6', Resolved: '#10b981', Closed: '#64748b' };

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hotelData, setHotelData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Filters
  const [dateRange, setDateRange] = useState('all'); // today, 7days, 30days, 3months, all
  const [selectedProperty, setSelectedProperty] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  const [viewMode, setViewMode] = useState('charts'); // 'charts' | 'table'
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews', 'urgency', 'tickets', 'staff'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hRes, rRes, tRes] = await Promise.all([
        getHotel(),
        getReviews({ limit: 5000 }), // Fetching a large set for accurate reports
        getTickets({ limit: 5000 })
      ]);
      setHotelData(hRes.data || hRes);
      setReviews(rRes.data?.reviews || rRes.reviews || rRes.data || []);
      setTickets(tRes.data?.tickets || tRes.tickets || tRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const properties = useMemo(() => {
    return hotelData?.properties?.map(p => p.name) || [];
  }, [hotelData]);

  const platforms = useMemo(() => {
    const plats = new Set();
    hotelData?.properties?.forEach(p => {
      if (p.platforms) {
        Object.keys(p.platforms).forEach(plat => {
          if (p.platforms[plat]) plats.add(plat);
        });
      }
    });
    return Array.from(plats);
  }, [hotelData]);

  const departments = useMemo(() => {
    const depts = new Set();
    tickets.forEach(t => depts.add(t.assigned_department));
    return Array.from(depts).filter(Boolean);
  }, [tickets]);

  // Apply filters
  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    // Property
    if (selectedProperty !== 'All') {
      filtered = filtered.filter(r => r.property_name === selectedProperty);
    }

    // Platform
    if (selectedPlatform !== 'All') {
      filtered = filtered.filter(r => r.platform === selectedPlatform);
    }

    // Date Range (Mock logic using createdAt)
    const now = new Date();
    filtered = filtered.filter(r => {
      const rDate = new Date(r.createdAt || r.imported_at || r.review_date);
      if (isNaN(rDate.getTime())) return true; // Keep if date is unparseable

      const diffTime = Math.abs(now - rDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateRange === 'today') return diffDays <= 1;
      if (dateRange === '7days') return diffDays <= 7;
      if (dateRange === '30days') return diffDays <= 30;
      if (dateRange === '3months') return diffDays <= 90;
      return true;
    });

    return filtered;
  }, [reviews, selectedProperty, selectedPlatform, dateRange]);

  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    if (selectedProperty !== 'All') {
      filtered = filtered.filter(t => t.review_id?.property_name === selectedProperty);
    }
    if (selectedDepartment !== 'All') {
      filtered = filtered.filter(t => t.assigned_department === selectedDepartment);
    }

    // Date Range
    const now = new Date();
    filtered = filtered.filter(t => {
      const tDate = new Date(t.createdAt || t.created_at);
      if (isNaN(tDate.getTime())) return true;

      const diffTime = Math.abs(now - tDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateRange === 'today') return diffDays <= 1;
      if (dateRange === '7days') return diffDays <= 7;
      if (dateRange === '30days') return diffDays <= 30;
      if (dateRange === '3months') return diffDays <= 90;
      return true;
    });

    return filtered;
  }, [tickets, selectedProperty, selectedDepartment, dateRange]);

  // --- CALCS: Reviews ---

  // Rating Distribution
  const ratingDist = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredReviews.forEach(r => {
      if (r.normalised_rating >= 1 && r.normalised_rating <= 5) {
        dist[Math.round(r.normalised_rating)]++;
      }
    });
    return Object.keys(dist).map(k => ({ rating: `${k} Star`, count: dist[k] }));
  }, [filteredReviews]);

  // Sentiment
  const sentimentData = useMemo(() => {
    let pos = 0, neu = 0, neg = 0;
    filteredReviews.forEach(r => {
      if (r.sentiment === 'Positive') pos++;
      else if (r.sentiment === 'Neutral') neu++;
      else if (r.sentiment === 'Negative') neg++;
    });
    return [
      { name: 'Positive', value: pos },
      { name: 'Neutral', value: neu },
      { name: 'Negative', value: neg }
    ];
  }, [filteredReviews]);

  // Platform Avg
  const platformAvg = useMemo(() => {
    const platMap = {};
    filteredReviews.forEach(r => {
      if (!r.platform) return;
      if (!platMap[r.platform]) platMap[r.platform] = { sum: 0, count: 0 };
      platMap[r.platform].sum += (r.normalised_rating || 0);
      platMap[r.platform].count += 1;
    });
    return Object.keys(platMap).map(p => ({
      platform: p,
      avg: parseFloat((platMap[p].sum / platMap[p].count).toFixed(2))
    }));
  }, [filteredReviews]);

  // AI Acceptance Rate
  const aiStats = useMemo(() => {
    let total = 0, accepted = 0, edited = 0, lowConf = 0;
    filteredReviews.forEach(r => {
      if (r.suggested_reply) total++;
      if (r.status === 'Responded') accepted++; // Approximating accepted
      if (r.confidence !== undefined && r.confidence < 50) lowConf++;
    });
    return {
      total,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      editRate: total > 0 ? Math.round(((total - accepted) / total) * 100) : 0, // Mock
      lowConf
    };
  }, [filteredReviews]);

  // High Urgency Reviews
  const highUrgencyReviews = useMemo(() => {
    return filteredReviews.filter(r => r.urgency === 'High');
  }, [filteredReviews]);

  // --- CALCS: Tickets ---
  const ticketStatusData = useMemo(() => {
    const counts = { Open: 0, 'In Progress': 0, 'Pending Verification': 0, Resolved: 0, Closed: 0 };
    filteredTickets.forEach(t => {
      if (counts[t.status] !== undefined) counts[t.status]++;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [filteredTickets]);

  const ticketsByDept = useMemo(() => {
    const map = {};
    filteredTickets.forEach(t => {
      const d = t.assigned_department || 'Unassigned';
      map[d] = (map[d] || 0) + 1;
    });
    return Object.keys(map).map(k => ({ department: k, count: map[k] }));
  }, [filteredTickets]);

  const overdueTickets = useMemo(() => {
    return filteredTickets.filter(t => t.sla_breached && !['Resolved', 'Closed'].includes(t.status));
  }, [filteredTickets]);

  // Staff Assignments
  const staffAssignments = useMemo(() => {
    const assignments = {};
    filteredTickets.forEach(t => {
      const name = t.assignee_name || 'Unassigned';
      if (!assignments[name]) {
        assignments[name] = { name, open: 0, resolved: 0, closed: 0, total: 0 };
      }
      assignments[name].total++;
      if (t.status === 'Open' || t.status === 'In Progress' || t.status === 'Pending Verification') {
        assignments[name].open++;
      } else if (t.status === 'Resolved') {
        assignments[name].resolved++;
      } else if (t.status === 'Closed') {
        assignments[name].closed++;
      }
    });
    return Object.values(assignments).sort((a, b) => b.total - a.total);
  }, [filteredTickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 mt-6 max-w-lg mx-auto shadow-sm">
        <FileText className="mx-auto text-slate-300 mb-4" size={48} />
        <h2 className="text-lg font-bold text-slate-800 mb-2">No Data Available Yet</h2>
        <p className="text-sm text-slate-500 mb-6">Connect properties and platforms in Settings to start generating reports.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto pb-20">

      {/* Header & Sticky Nav */}
      <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md pb-4 pt-2 border-b border-slate-200 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Reports & Analytics</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Cross-property performance, AI insights, and ticket metrics.</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex bg-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('charts')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'charts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Charts
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Data Table
              </button>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
              <option value="all">All Time</option>
            </select>

            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Properties</option>
              {properties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Platforms</option>
              {platforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Tabs */}
        {viewMode === 'charts' && (
          <div className="flex items-center gap-6 mt-6 border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'reviews' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
            >Reviews</button>
            <button 
              onClick={() => setActiveTab('urgency')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'urgency' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
            >Urgency & AI</button>
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'tickets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
            >Tickets & SLA</button>
            <button 
              onClick={() => setActiveTab('staff')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'staff' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
            >Staff & Assignments</button>
          </div>
        )}
      </div>

      {viewMode === 'charts' ? (
        <div className="animate-in fade-in duration-300">
          {/* REVIEWS REPORTS */}
          {activeTab === 'reviews' && (
            <section id="reviews" className="mb-12 animate-in slide-in-from-bottom-2 fade-in duration-500">
            <h2 className="text-lg font-black text-slate-800 mb-1">Reviews Performance</h2>
            <p className="text-sm text-slate-500 mb-6">Rating distributions, sentiment breakdown, and platform averages.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Rating Distribution */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Rating Distribution (1-5 Stars)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ratingDist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="rating" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sentiment Donut */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Sentiment Breakdown</h3>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Platform Averages */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Average Rating by Platform</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformAvg} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="platform" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="avg" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </section>
          )}

          {/* URGENCY & AI REPORTS */}
          {activeTab === 'urgency' && (
          <section id="urgency" className="mb-12 animate-in slide-in-from-bottom-2 fade-in duration-500">
            <h2 className="text-lg font-black text-slate-800 mb-1">Urgency & AI Performance</h2>
            <p className="text-sm text-slate-500 mb-6">AI draft accuracy, confidence scores, and high urgency alerts.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Draft Acceptance</h3>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-slate-800">{aiStats.acceptanceRate}%</span>
                  <span className="flex items-center text-xs font-bold text-green-500 mb-1"><TrendingUp size={14} className="mr-1" /> +4%</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Draft Edit Rate</h3>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-slate-800">{aiStats.editRate}%</span>
                  <span className="flex items-center text-xs font-bold text-slate-400 mb-1">~</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Low Confidence Flags</h3>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-slate-800">{aiStats.lowConf}</span>
                  <span className="flex items-center text-xs font-bold text-amber-500 mb-1">Reviews</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between bg-gradient-to-br from-indigo-50 to-white">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">High Urgency Volume</h3>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-indigo-900">{filteredReviews.filter(r => r.urgency === 'High').length}</span>
                  <span className="flex items-center text-xs font-bold text-indigo-600 mb-1">Total</span>
                </div>
              </div>
            </div>

            {/* High Urgency Reviews Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-red-500 flex items-center gap-2 uppercase tracking-wider">
                  <AlertTriangle size={16} /> Flagged High Urgency Reviews
                </h3>
                <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-lg">{highUrgencyReviews.length} Flagged</span>
              </div>
              
              {highUrgencyReviews.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="mx-auto text-green-400 mb-2" size={32} />
                  <p className="text-sm font-bold text-slate-600">All caught up!</p>
                  <p className="text-xs text-slate-400">No high urgency reviews.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Reviewer</th>
                        <th className="pb-3 font-semibold">Rating</th>
                        <th className="pb-3 font-semibold">Sentiment</th>
                        <th className="pb-3 font-semibold text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {highUrgencyReviews.map(r => (
                        <tr key={r._id} className="hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-700">
                            {r.reviewer_name || 'Anonymous'}
                            <div className="text-[10px] text-slate-400 mt-0.5">{r.hotel_name || r.property_name} • {r.platform}</div>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold border border-red-100">
                              {r.normalised_rating} ★
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                              {r.sentiment || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold">
                              <Clock size={12} /> {Math.round((new Date() - new Date(r.createdAt || r.imported_at)) / (1000 * 60 * 60))} hrs ago
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
          )}

          {/* TICKETS REPORTS */}
          {activeTab === 'tickets' && (
          <section id="tickets" className="mb-12 animate-in slide-in-from-bottom-2 fade-in duration-500">
            <h2 className="text-lg font-black text-slate-800 mb-1">Tickets & SLA Metrics</h2>
            <p className="text-sm text-slate-500 mb-6">Resolution times, stage bottlenecks, and departmental load.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Tickets by Dept */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Tickets by Department</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsByDept} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis dataKey="department" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ticket Status */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Ticket Stage Breakdown</h3>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ticketStatusData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {ticketStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* SLA Breaches */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={16} /> Currently Overdue Tickets
                </h3>
                <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-lg">{overdueTickets.length} Breaches</span>
              </div>

              {overdueTickets.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm font-bold text-slate-600">Great job!</p>
                  <p className="text-xs text-slate-400">All open tickets are within SLA.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Ticket ID</th>
                        <th className="pb-3 font-semibold">Department</th>
                        <th className="pb-3 font-semibold">Property</th>
                        <th className="pb-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {overdueTickets.map(t => (
                        <tr key={t._id} className="hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-700">#{t._id.slice(-6).toUpperCase()}</td>
                          <td className="py-3 text-slate-600">{t.assigned_department || '-'}</td>
                          <td className="py-3 text-slate-600">{t.review_id?.property_name || '-'}</td>
                          <td className="py-3 text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
          )}

          {/* STAFF & ASSIGNMENTS REPORTS */}
          {activeTab === 'staff' && (
          <section id="staff" className="mb-12 animate-in slide-in-from-bottom-2 fade-in duration-500">
            <h2 className="text-lg font-black text-slate-800 mb-1">Staff & Assignments</h2>
            <p className="text-sm text-slate-500 mb-6">Track team workload and resolution progress.</p>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="p-4 font-bold">Staff Member</th>
                      <th className="p-4 font-bold text-center">Open Tickets</th>
                      <th className="p-4 font-bold text-center">Resolved</th>
                      <th className="p-4 font-bold text-center">Closed</th>
                      <th className="p-4 font-bold text-center text-indigo-600">Total Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffAssignments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center">
                          <p className="text-sm font-bold text-slate-500">No staff assignments found.</p>
                        </td>
                      </tr>
                    ) : staffAssignments.map(s => (
                      <tr key={s.name} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">
                          {s.name}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] h-6 rounded-full text-xs font-bold ${s.open > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                            {s.open}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] h-6 rounded-full text-xs font-bold ${s.resolved > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                            {s.resolved}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] h-6 rounded-full text-xs font-bold ${s.closed > 0 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>
                            {s.closed}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[32px] h-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
                            {s.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          )}

        </div>
      ) : (
        <section className="mb-12 animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-800">Filtered Review Data</h2>
              <p className="text-sm text-slate-500">Detailed list of all reviews matching your current filters ({filteredReviews.length} results).</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="p-4 font-bold">Reviewer</th>
                    <th className="p-4 font-bold">Rating</th>
                    <th className="p-4 font-bold">Property</th>
                    <th className="p-4 font-bold">Platform</th>
                    <th className="p-4 font-bold">Sentiment</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-300 mb-3">
                          <FileText size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-500">No reviews found for these filters.</p>
                      </td>
                    </tr>
                  ) : filteredReviews.map(r => (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">
                        {r.reviewer_name || 'Anonymous'}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black border border-amber-100">
                          {r.normalised_rating} ★
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-600">{r.hotel_name}</td>
                      <td className="p-4 text-slate-500">{r.platform}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${r.sentiment === 'Positive' ? 'bg-green-50 text-green-700 border-green-100' :
                          r.sentiment === 'Negative' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                          {r.sentiment || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                          {r.status || 'Open'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-xs font-medium">
                        {new Date(r.createdAt || r.imported_at || r.review_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
