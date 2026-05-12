import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useDerivedStats } from "../hooks/useDerivedStats";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Download, Calendar, Filter, TrendingUp, Users, MessageSquare } from "lucide-react";

const Analytics = () => {
  const stats = useDerivedStats();
  const { state } = useAppContext();

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const platformData = Object.entries(stats.platformBreakdown).map(([name, value]) => ({ name, value }));
  const deptData = Object.entries(stats.departmentBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Insights</h1>
          <p className="text-slate-500">Deep dive into your hotel's operational and reputation metrics.</p>
        </div>
        {/* <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2"><Calendar size={18} /> Last 30 Days</button>
          <button className="btn-primary flex items-center gap-2"><Download size={18} /> Export PDF</button>
        </div> */}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Reviews", val: stats.totalReviews, color: "indigo" },
          { label: "Avg Rating", val: stats.avgRating, color: "indigo" },
          { label: "Response Rate", val: `${stats.responseRate}%`, color: "green" },
          { label: "Resolved", val: stats.resolvedTickets, color: "green" },
          { label: "Avg Res Time", val: `${stats.avgResolutionTime}h`, color: "amber" },
          { label: "Overdue", val: stats.overdueTickets, color: "red" }
        ].map((kpi, i) => (
          <div key={i} className="glass-card p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color === "red" ? "text-red-600" : kpi.color === "green" ? "text-green-600" : "text-slate-900"}`}>{kpi.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rating Distribution */}
        <div className="glass-card p-6 h-[350px]">
          <h3 className="text-lg font-bold mb-6">Rating Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.ratingDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="star" tickFormatter={(v) => `${v} ★`} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Breakdown */}
        <div className="glass-card p-6 h-[350px]">
          <h3 className="text-lg font-bold mb-6">Platform Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {platformData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Performance */}
        <div className="lg:col-span-2 glass-card p-6 overflow-hidden">
          <h3 className="text-lg font-bold mb-6">Department Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b">
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Total Tickets</th>
                  <th className="px-4 py-3">Resolved</th>
                  <th className="px-4 py-3">Resolution Rate</th>
                  <th className="px-4 py-3">Avg Time (h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(stats.departmentBreakdown).map(([dept, count], idx) => {
                  const resolved = state.tickets.filter(t => t.department === dept && (t.status === "Closed" || t.status === "Resolved")).length;
                  const rate = count > 0 ? Math.round((resolved / count) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-900">{dept}</td>
                      <td className="px-4 py-4">{count}</td>
                      <td className="px-4 py-4">{resolved}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${rate}%` }}></div>
                          </div>
                          <span className="text-xs font-bold">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">--</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
