import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import TicketDetailPanel from "../components/TicketDetailPanel";
import { classifyAllPending } from "../utils/aiClassifier";
import { useAuth } from "../context/AuthContext";
import { useDerivedStats } from "../hooks/useDerivedStats";
import {
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  ArrowUpDown,
  Sparkles,
  Loader2,
  RefreshCcw,
  Zap,
  Calendar,
  AlertTriangle,
  Flag
} from "lucide-react";
import { DEPARTMENTS } from "../utils/constants";
import { SkeletonKPI, SkeletonTicketRow } from "../components/Skeleton";

const Tickets = () => {
  const { state, dispatch } = useAppContext();
  const { currentUser } = useAuth();
  const location = useLocation();
  const stats = useDerivedStats();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [search, setSearch] = useState("");
  const isScopedUser = currentUser?.role === "staff" || currentUser?.role === "dept_head";
  const [filter, setFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState(
    isScopedUser && currentUser?.department ? currentUser.department.toUpperCase() : "ALL DEPARTMENTS"
  );
  const [urgencyFilter, setUrgencyFilter] = useState("ALL URGENCY");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL STAFF");
  const [dateRange, setDateRange] = useState({ label: "All Time", start: null, end: null });
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const departments = DEPARTMENTS;

  const filterByDate = (items, dateField) => {
    if (!dateRange.start) return items;
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end || new Date());
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return items.filter(item => {
      const val = item[dateField];
      if (!val) return false;
      const d = new Date(val);
      return d >= start && d <= end;
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get("highlight");
    if (highlight) {
      const ticket = state.tickets.find(t => t.ticket_id === highlight);
      if (ticket) setSelectedTicket(ticket);
    }
  }, [location, state.tickets]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);

  const formatTimeLeft = (ms) => {
    if (ms <= 0) return "OVERDUE";
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m left`;
  };

  const selectedPlatform = state.activeFilters?.platform || "ALL";
  const selectedProperty = state.activeFilters?.property || "ALL";

  const filteredTickets = filterByDate(state.tickets, "created_at").filter(t => {
    const linkedReview = state.reviews.find(r => r.review_id === t.review_id);
    const matchesPlatform = selectedPlatform === "ALL" ? true : linkedReview?.platform === selectedPlatform;
    const matchesProperty = selectedProperty === "ALL" ? true : linkedReview?.hotel_name === selectedProperty;

    // 1. Status Filter
    const matchesStatus = filter === "ALL" ? true : (t.status || "").toUpperCase() === filter;

    // 2. Department Filter
    const matchesDept = deptFilter === "ALL DEPARTMENTS" ? true : (t.department || "").toUpperCase() === deptFilter.toUpperCase();

    // 3. Urgency Filter
    const matchesUrgency = urgencyFilter === "ALL URGENCY" ? true : (t.urgency || "").toUpperCase() === urgencyFilter.toUpperCase();

    // 4. Assignee Filter
    const matchesAssignee = assigneeFilter === "ALL STAFF" ? true : t.assignee_id === assigneeFilter;

    // 5. Overdue Filter
    const matchesOverdue = !overdueOnly ? true : (t.sla_deadline < now && !["Closed", "Resolved"].includes(t.status));

    // 6. Search Filter
    const matchesSearch = !search ? true : (
      (t.guest_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.ticket_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.review_text || "").toLowerCase().includes(search.toLowerCase())
    );

    return matchesPlatform && matchesProperty && matchesStatus && matchesDept && matchesUrgency && matchesAssignee && matchesOverdue && matchesSearch;
  });

  const runAnalysis = async () => {
    setLoading(true);
    try {
      await classifyAllPending(state.reviews, null, dispatch, currentUser, state.staff, state.tickets, state.hotelConfig);
    } catch (err) {
      alert("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const datePresets = [
    { label: "All Time", start: null, end: null },
    { label: "Today", start: new Date().setHours(0,0,0,0), end: new Date().setHours(23,59,59,999) },
    { label: "Last 7 Days", start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).setHours(0,0,0,0), end: new Date().setHours(23,59,59,999) },
    { label: "This Month", start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(), end: new Date().setHours(23,59,59,999) }
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header & Stats Grid */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Sparkles size={20} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Operations Tickets</h1>
          </div>
          <p className="text-slate-500">Real-time resolution pipeline for guest issues.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:w-[60%]">
          {state.isAppLoading ? (
            [1, 2, 3, 4].map(i => <SkeletonKPI key={i} />)
          ) : (
            [
              { label: "Active Tickets", val: filteredTickets.filter(t => !["Closed", "Resolved"].includes(t.status)).length, icon: AlertCircle, col: "indigo" },
              { label: "Overdue", val: filteredTickets.filter(t => t.sla_deadline < now && !["Closed", "Resolved"].includes(t.status)).length, icon: Clock, col: "red" },
              { label: "Resolved", val: filteredTickets.filter(t => ["Closed", "Resolved"].includes(t.status)).length, icon: CheckCircle2, col: "green" },
              { label: "Avg Res Time", val: `${stats.avgResolutionTime}h`, icon: Zap, col: "amber" }
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <kpi.icon size={14} className={kpi.col === "red" ? "text-red-500" : ""} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{kpi.label}</span>
                </div>
                <p className={`text-xl font-bold ${kpi.col === "red" ? "text-red-600" : "text-slate-900"}`}>{kpi.val}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search guest, ID or issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="relative">
            <select
              disabled={isScopedUser}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={`border rounded-2xl text-[10px] font-black px-5 py-3.5 outline-none tracking-widest uppercase transition-all ${
                isScopedUser
                  ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed pr-5"
                  : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 cursor-pointer pr-10 focus:ring-2 focus:ring-indigo-500"
              }`}
            >
              {isScopedUser ? (
                <option value={currentUser.department.toUpperCase()}>
                  {currentUser.department.toUpperCase()} (LOCKED)
                </option>
              ) : (
                <>
                  <option value="ALL DEPARTMENTS">ALL DEPARTMENTS</option>
                  {departments.map(d => (
                    <option key={d} value={d.toUpperCase()}>{d.toUpperCase()}</option>
                  ))}
                </>
              )}
            </select>
            {!isScopedUser && (
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black px-5 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-100 transition-all appearance-none pr-10 uppercase tracking-widest"
            >
              <option value="ALL">ALL STATUS</option>
              <option value="OPEN">OPEN</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
              <option value="PENDING VERIFICATION">PENDING VERIFICATION</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={12} />
          </div>

          {/* Urgency Filter */}
          <div className="relative">
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black px-5 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-100 transition-all appearance-none pr-10 uppercase tracking-widest"
            >
              <option value="ALL URGENCY">ALL URGENCY</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
          </div>

          {/* Assignee Filter */}
          <div className="relative">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black px-5 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-100 transition-all appearance-none pr-10 uppercase tracking-widest"
            >
              <option value="ALL STAFF">ALL STAFF</option>
              {state.staff.map(s => (
                <option key={s._id} value={s._id}>{s.name.toUpperCase()}</option>
              ))}
            </select>
            <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
          </div>

          {/* Date Range */}
          <div className="relative">
            <select
              onChange={(e) => {
                const preset = datePresets.find(p => p.label === e.target.value);
                if (preset) setDateRange(preset);
              }}
              className="bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black px-5 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-slate-100 transition-all appearance-none pr-10 uppercase tracking-widest"
            >
              {datePresets.map(p => <option key={p.label} value={p.label}>{p.label.toUpperCase()}</option>)}
            </select>
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
          </div>

          {/* Overdue Toggle */}
          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${overdueOnly ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-200" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-red-50 hover:text-red-500"}`}
          >
            <Clock size={14} />
            Overdue Only
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue / Review</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dept</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guest & Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">SLA Progress</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignee</th>

            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {state.isAppLoading ? (
              [1, 2, 3, 4, 5].map(i => <SkeletonTicketRow key={i} />)
            ) : (
              <>
                {state.tickets.length > 0 && filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400 text-xs italic">
                      No tickets match the current filters ({state.tickets.length} total tickets in system).
                    </td>
                  </tr>
                )}
                {filteredTickets.map(t => {
                  const overdue = t.sla_deadline < now && !["Closed", "Resolved"].includes(t.status);
                  const totalTime = t.sla_deadline - t.created_at;
                  const timeLeft = t.sla_deadline - now;
                  const pct = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
                  const statusSteps = ["Open", "In Progress", "Pending Verification", "Resolved", "Closed"];
                  const currentStep = statusSteps.indexOf(t.status);

                  return (
                    <tr key={t.ticket_id} className={`group transition-all cursor-pointer ${overdue ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-slate-50/80"}`} onClick={() => setSelectedTicket(t)}>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${t.urgency === "High" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-amber-500"}`}></span>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1 italic">"{t.review_text}"</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">#{t.ticket_id.slice(-6)}</p>
                          {t.is_recurring && (
                            <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                              <RefreshCcw size={8} /> REC
                            </span>
                          )}
                          {overdue && (
                            <span className="bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                              <AlertTriangle size={8} /> Overdue
                            </span>
                          )}
                          {t.is_flagged && (
                            <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shadow-[0_0_12px_rgba(220,38,38,0.4)]">
                              <Flag size={8} /> FLAGGED BY MANAGER
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black rounded uppercase whitespace-nowrap">
                          {t.department}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900 mb-1">{t.guest_name}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm ${t.urgency === "High" ? "bg-red-100 text-red-600 border border-red-200" :
                            t.urgency === "Medium" ? "bg-amber-100 text-amber-600 border border-amber-200" :
                              "bg-blue-100 text-blue-600 border border-blue-200"
                            }`}>
                            {t.urgency}
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${t.status === "Open" ? "bg-red-50 text-red-600 border border-red-100" :
                            t.status === "In Progress" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              t.status === "Pending Verification" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                                "bg-green-50 text-green-600 border border-green-100"
                            }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {statusSteps.map((step, idx) => (
                            <div
                              key={step}
                              className={`h-1 rounded-full transition-all ${idx <= currentStep ? "bg-slate-800" : "bg-slate-100"}`}
                              style={{ width: "12px" }}
                              title={step}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[120px]">
                          {overdue ? (
                            <p className="text-xs font-bold text-red-600">BREACHED</p>
                          ) : ["Resolved", "Closed"].includes(t.status) ? (
                            <p className="text-xs font-bold text-green-600">COMPLETED</p>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                <span>{Math.round(timeLeft / 3600000)}h left</span>
                                <span>{Math.round(pct)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${pct < 25 ? "bg-red-500" : pct < 50 ? "bg-amber-500" : "bg-green-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {t.assignee_name ? (
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                              {t.assignee_name[0]}
                            </div>
                          ) : (
                            <div className="w-7 h-7 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                              <User size={12} />
                            </div>
                          )}
                          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{t.assignee_name || "Unassigned"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
        {!state.isAppLoading && filteredTickets.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Clock size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Queue is empty</h3>
            <p className="text-slate-500 text-sm">All guest issues have been addressed.</p>
          </div>
        )}
      </div>

      {selectedTicket && (
        <TicketDetailPanel
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          staff={state.staff}
        />
      )}
    </div>
  );
};

export default Tickets;
