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
  Zap
} from "lucide-react";

const Tickets = () => {
  const { state, dispatch } = useAppContext();
  const { currentUser } = useAuth();
  const location = useLocation();
  const stats = useDerivedStats();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL DEPARTMENTS");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get("highlight");
    if (highlight) {
      const ticket = state.tickets.find(t => t.ticket_id === highlight);
      if (ticket) setSelectedTicket(ticket);
    }
  }, [location, state.tickets]);

  const filteredTickets = state.tickets.filter(t => {
    if (!currentUser) return false;
    const isStaff = currentUser.role === "staff";
    const isAssignedToMe = t.assignee_id === currentUser._id;
    const canSee = !isStaff || isAssignedToMe;
    if (!canSee) return false;

    const matchesStatus = filter === "ALL" ? true : t.status.toUpperCase() === filter;
    const matchesDept = deptFilter === "ALL DEPARTMENTS" ? true : t.department?.toUpperCase() === deptFilter.toUpperCase();
    const matchesSearch =
      t.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesDept && matchesSearch;
  });

  const runAnalysis = async () => {
    setLoading(true);
    try {
      await classifyAllPending(state.reviews, null, dispatch, currentUser, state.staff);
    } catch (err) {
      alert("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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
          {[
            { label: "Active Tickets", val: stats.activeTicketsCount, icon: AlertCircle, col: "indigo" },
            { label: "Overdue", val: stats.overdueTickets, icon: Clock, col: "red" },
            { label: "Resolved", val: stats.resolvedTickets, icon: CheckCircle2, col: "green" },
            { label: "Avg Res Time", val: `${stats.avgResolutionTime}h`, icon: Zap, col: "amber" }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <kpi.icon size={14} className={kpi.col === "red" ? "text-red-500" : ""} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.col === "red" ? "text-red-600" : "text-slate-900"}`}>{kpi.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search guest, ID or issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-50 border-none rounded-xl text-xs font-bold px-4 py-3 focus:ring-0 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option>ALL DEPARTMENTS</option>
            {["Front Office", "Housekeeping", "Maintenance", "F&B", "Security", "Concierge", "Spa", "Management"].map(d => (
              <option key={d} value={d.toUpperCase()}>{d.toUpperCase()}</option>
            ))}
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-50 border-none rounded-xl text-xs font-bold px-4 py-3 focus:ring-0 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="ALL">ALL STATUS</option>
            <option value="OPEN">OPEN</option>
            <option value="IN PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          {/* <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-transparent cursor-pointer hover:bg-slate-100 transition-colors">
            <Clock size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Today</span>
            <ArrowUpDown size={14} className="text-slate-300" />
          </div> */}
          {/* <button 
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all ml-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            GENERATE TICKETS
          </button> */}
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
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTickets.map(t => {
              const overdue = t.sla_deadline < Date.now() && !["Closed", "Resolved"].includes(t.status);
              const totalTime = t.sla_deadline - t.created_at;
              const timeLeft = t.sla_deadline - Date.now();
              const pct = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
              const statusSteps = ["Open", "In Progress", "Pending Verification", "Resolved", "Closed"];
              const currentStep = statusSteps.indexOf(t.status);

              return (
                <tr key={t.ticket_id} className="group hover:bg-slate-50/80 transition-all cursor-pointer" onClick={() => setSelectedTicket(t)}>
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
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black rounded uppercase whitespace-nowrap">
                      {t.department}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900 mb-2">{t.guest_name}</p>
                    <div className="flex gap-1.5">
                      {statusSteps.map((step, idx) => (
                        <div
                          key={step}
                          title={step}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${idx <= currentStep ? "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)] scale-125" : "bg-slate-200"}`}
                        ></div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[10px] font-bold ${overdue ? "text-red-600" : "text-slate-500"}`}>
                        {overdue ? "OVERDUE" : `${Math.max(0, Math.round(timeLeft / 3600000))}h left`}
                      </span>
                      {overdue && <span className="bg-red-100 text-red-600 text-[8px] font-black px-1 rounded animate-pulse">ALARM</span>}
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${overdue ? "bg-red-500" : pct < 25 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${overdue ? 100 : pct}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 group/assignee relative">
                      {t.assignee_id ? (
                        <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm ring-1 ring-slate-100">
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
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all" title="Assign">
                        <User size={14} />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all" title="Escalate">
                        <AlertCircle size={14} />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-300">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTickets.length === 0 && (
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
