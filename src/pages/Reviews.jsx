import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import ReviewCard from "../components/ReviewCard";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Download,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Layers,
  History,
  Info,
  Loader2,
  ChevronDown,
  Calendar,
  Briefcase,
  Flag,
  UserPlus,
  ArrowUpDown
} from "lucide-react";
import {
  flagSuspicious,
  createTicket,
  clusterTickets,
  getReviews,
  assignReviewStaff,
  reanalyseReview
} from "../api/apiClient";
import { createTicketFromReview } from "../utils/ticketFactory";
import { DEPARTMENTS } from "../utils/constants";

const Reviews = () => {
  const { state, dispatch } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState([]);
  const [platform, setPlatform] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [dateRange, setDateRange] = useState({ label: "All Time", start: null, end: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [hideLowConfidence, setHideLowConfidence] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = ["ALL", "Negative", "Mixed", "Neutral", "Positive", "Pending Approval", "Approved", "Suspicious"];

  const confidenceThreshold = state.hotelConfig?.aiConfig?.confidenceThreshold || 75;
  const activePlatforms = state.hotelConfig?.platforms || ["Google", "TripAdvisor", "Booking.com", "Yelp"];
  const departments = DEPARTMENTS;

  // Fetch reviews on mount to apply any updated settings/healing logic
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getReviews();
        dispatch({ type: "SET_REVIEWS", payload: res.data.reviews });
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Modal States
  const [flagModal, setFlagModal] = useState({ open: false, review: null, reason: "", notes: "", loading: false });
  const [similarModal, setSimilarModal] = useState({ open: false, review: null, matches: [], loading: false });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get("highlight");
    if (highlight) {
      setHighlightId(highlight);
      setTimeout(() => {
        const element = document.getElementById(highlight);
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
    const tabParam = params.get("tab");
    if (tabParam) setTab(tabParam.toUpperCase());
  }, [location]);

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setFlagModal(prev => ({ ...prev, open: false }));
        setSimilarModal(prev => ({ ...prev, open: false }));
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleBulkFlag = async () => {
    if (!window.confirm(`Flag ${selectedIds.length} reviews as suspicious?`)) return;
    setIsBulkActionLoading(true);
    try {
      await Promise.all(selectedIds.map(id =>
        flagSuspicious(id, "Bulk Flagged")
      ));

      selectedIds.forEach(id => {
        dispatch({
          type: "FLAG_SUSPICIOUS",
          payload: { review_id: id, suspicious_reason: "Bulk Flagged" }
        });
      });

      clearSelection();
      alert(`Successfully flagged ${selectedIds.length} reviews.`);
    } catch (err) {
      console.error("Bulk flag failed", err);
      alert("Failed to flag some reviews. Please try again.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkExport = () => {
    const selectedReviews = state.reviews.filter(r => selectedIds.includes(r.review_id));

    const headers = ["Reviewer", "Rating", "Department", "Platform", "Status", "Text"];
    const rows = selectedReviews.map(r => [
      r.reviewer_name,
      r.rating,
      r.primary_department || "Unassigned",
      r.platform,
      r.status,
      `"${(r.review_text || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `review_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkAssign = async (staffMember) => {
    if (!window.confirm(`Assign ${selectedIds.length} reviews to ${staffMember.name}?`)) return;
    setIsBulkActionLoading(true);
    try {
      await Promise.all(selectedIds.map(id =>
        assignReviewStaff(id, { staff_id: staffMember._id, staff_name: staffMember.name })
      ));

      selectedIds.forEach(id => {
        dispatch({
          type: "UPDATE_REVIEW",
          payload: { review_id: id, assignee_id: staffMember._id, assignee_name: staffMember.name }
        });
      });

      clearSelection();
      alert(`Successfully assigned ${selectedIds.length} reviews to ${staffMember.name}.`);
    } catch (err) {
      console.error("Bulk assignment failed", err);
      alert("Failed to assign some reviews. Please try again.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const filteredReviews = state.reviews.filter(r => {
    // Standardize status for filtering
    let currentStatus = r.status;
    if (currentStatus === "Classified") currentStatus = "IN REVIEW";
    if (currentStatus === "Approved") currentStatus = "RESPONDED";
    if (currentStatus === "Pending AI") currentStatus = "NEW";

    const matchesTab = tab === "ALL" ? true :
      tab.toUpperCase() === "APPROVED" ? (r.status === "RESPONDED" || r.status === "Approved") :
        tab.toUpperCase() === "PENDING APPROVAL" ? r.status === "PENDING APPROVAL" :
          tab.toUpperCase() === "SUSPICIOUS" ? (r.status === "Suspicious" || r.is_suspicious) :
            r.sentiment?.toUpperCase() === tab.toUpperCase();

    const matchesPlatform = platform === "ALL" ? true : r.platform === platform;
    const matchesDept = department === "ALL" ? true : (r.primary_department || "").toUpperCase() === department.toUpperCase();
    const matchesConfidence = hideLowConfidence ? (r.confidence || 0) >= confidenceThreshold : true;

    const matchesDate = () => {
      if (!dateRange.start && !dateRange.end) return true;
      const rDate = new Date(r.review_date);
      rDate.setHours(0, 0, 0, 0);

      const start = dateRange.start ? new Date(dateRange.start) : null;
      if (start) start.setHours(0, 0, 0, 0);

      const end = dateRange.end ? new Date(dateRange.end) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && rDate < start) return false;
      if (end && rDate > end) return false;
      return true;
    };

    const matchesSearch =
      r.reviewer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.review_text.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesPlatform && matchesDept && matchesConfidence && matchesDate() && matchesSearch;
  })
    .sort((a, b) => {
      switch (sortBy) {
        case "OLDEST":
          return new Date(a.review_date) - new Date(b.review_date);
        case "LOWEST_RATING":
          return a.rating - b.rating;
        case "HIGHEST_RISK":
          return (b.escalation_risk ? 1 : 0) - (a.escalation_risk ? 1 : 0);
        case "UNASSIGNED":
          const aUnassigned = !a.assignee_id || a.assignee_name === "Unassigned";
          const bUnassigned = !b.assignee_id || b.assignee_name === "Unassigned";
          return bUnassigned - aUnassigned;
        case "NEWEST":
        default:
          return new Date(b.review_date) - new Date(a.review_date);
      }
    });

  const setPresetRange = (label) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (label === "Today") {
      setDateRange({ label, start: today, end: today });
    } else if (label === "Last 7 Days") {
      const start = new Date();
      start.setDate(today.getDate() - 7);
      setDateRange({ label, start, end: today });
    } else if (label === "Last 30 Days") {
      const start = new Date();
      start.setDate(today.getDate() - 30);
      setDateRange({ label, start, end: today });
    } else {
      setDateRange({ label: "All Time", start: null, end: null });
    }
  };

  const handleConfirmFlag = async () => {
    if (!flagModal.reason) return;
    setFlagModal(prev => ({ ...prev, loading: true }));
    try {
      const fullReason = flagModal.reason + (flagModal.notes ? " — " + flagModal.notes : "");
      const res = await flagSuspicious(flagModal.review.review_id, fullReason);

      dispatch({ type: "FLAG_SUSPICIOUS", payload: { review_id: flagModal.review.review_id, suspicious_reason: fullReason } });

      dispatch({
        type: "ADD_NOTIFICATION", payload: {
          type: "suspicious",
          message: `Review flagged — ${flagModal.review.reviewer_name} on ${flagModal.review.platform}`,
          urgency: "High",
          link_to: `/reviews?tab=suspicious&highlight=${flagModal.review.review_id}`,
          created_at: Date.now(),
          read: false
        }
      });

      setFlagModal({ open: false, review: null, reason: "", notes: "", loading: false });
    } catch (err) {
      alert("Failed to flag review: " + err.message);
      setFlagModal(prev => ({ ...prev, loading: false }));
    }
  };

  const findSimilarReviews = (review) => {
    const stopwords = ["the", "and", "for", "was", "with", "that", "this", "are", "not", "but", "have", "room", "hotel", "stay", "guest", "very", "just"];
    return state.reviews.filter(r => {
      if (r.review_id === review.review_id) return false;
      if (r.primary_department !== review.primary_department) return false;
      if (Math.abs(r.rating - review.rating) > 1) return false;

      const rIssues = (r.issues || []).map(i => i.toLowerCase());
      const revIssues = (review.issues || []).map(i => i.toLowerCase());

      return rIssues.some(ri => {
        const words = ri.split(/\s+/).filter(w => w.length >= 4 && !stopwords.includes(w));
        return words.some(w => revIssues.some(revi => revi.includes(w)));
      });
    });
  };

  const handleCreateClusterTicket = async () => {
    setSimilarModal(prev => ({ ...prev, loading: true }));
    try {
      const { review, matches } = similarModal;
      const cluster_id = "CLUSTER-" + Date.now() + "-" + review.primary_department.toUpperCase().replace(/\s+/g, "_");

      // Get unique combined issues
      const combinedIssues = Array.from(new Set([
        ...(review.issues || []),
        ...matches.flatMap(m => m.issues || [])
      ]));

      const hotelConfig = state.hotelConfig;
      const ticketData = createTicketFromReview(review, review, hotelConfig);
      ticketData.cluster_id = cluster_id;
      ticketData.issues = combinedIssues;
      ticketData.suggested_action = `Cluster of ${matches.length + 1} similar complaints — ${review.primary_department}`;

      const res = await createTicket(ticketData);
      const masterTicket = res.data;

      const ticketIdsToCluster = [masterTicket.ticket_id];
      // Note: In a real app we'd find existing tickets for the matches too

      await clusterTickets({ ticket_ids: ticketIdsToCluster, cluster_id });

      dispatch({
        type: "CREATE_CLUSTER_TICKET",
        payload: {
          ticket: masterTicket,
          cluster_id,
          review_ids: [review.review_id, ...matches.map(m => m.review_id)]
        }
      });

      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          type: "recurring_issue",
          message: `Cluster ticket created — ${review.primary_department} (${matches.length + 1} issues)`,
          urgency: "High",
          link_to: "/tickets?highlight=" + masterTicket.ticket_id,
          created_at: Date.now(),
          read: false
        }
      });

      setSimilarModal({ open: false, review: null, matches: [], loading: false });
    } catch (err) {
      alert("Failed to create cluster ticket: " + err.message);
      setSimilarModal(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Guest Reviews</h1>
          <p className="text-slate-500">Manage and respond to guest feedback across all platforms.</p>
        </div>
        {/* <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} /> Export
          </button>
        </div> */}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="flex-1 flex items-center gap-3 w-full">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by reviewer, content or issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>

          <div className="relative group/date">
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${dateRange.label === "All Time" ? "border-slate-100 bg-white text-slate-500" : "border-indigo-100 bg-indigo-50 text-indigo-600"}`}
            >
              <Calendar size={14} className={dateRange.label !== "All Time" ? "text-indigo-600" : "text-slate-400"} />
              {dateRange.label}
              <ChevronDown size={14} className="ml-1 opacity-50" />
            </button>

            <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 opacity-0 invisible group-hover/date:opacity-100 group-hover/date:visible transition-all z-50 transform origin-top-left group-hover/date:scale-100 scale-95">
              {["All Time", "Today", "Last 7 Days", "Last 30 Days"].map(label => (
                <button
                  key={label}
                  onClick={() => setPresetRange(label)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all ${dateRange.label === label ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  {label.toUpperCase()}
                </button>
              ))}
              <div className="border-t border-slate-100 my-2 pt-2 px-2">
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Custom Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    onChange={(e) => setDateRange({ label: "Custom", start: e.target.value, end: dateRange.end })}
                    className="w-full p-2 bg-slate-50 border-none rounded-lg text-[9px] font-bold text-slate-600 outline-none"
                  />
                  <input
                    type="date"
                    onChange={(e) => setDateRange({ label: "Custom", start: dateRange.start, end: e.target.value })}
                    className="w-full p-2 bg-slate-50 border-none rounded-lg text-[9px] font-bold text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative group/category">
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${tab === "ALL" ? "border-slate-100 bg-white text-slate-500" : "border-indigo-100 bg-indigo-50 text-indigo-600"}`}
            >
              <SlidersHorizontal size={14} className={tab !== "ALL" ? "text-indigo-600" : "text-slate-400"} />
              {tab === "ALL" ? "All Categories" : tab}
              <ChevronDown size={14} className="ml-1 opacity-50" />
            </button>

            <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 opacity-0 invisible group-hover/category:opacity-100 group-hover/category:visible transition-all z-50 transform origin-top-left group-hover/category:scale-100 scale-95">
              {tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all ${tab === t ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group/platform">
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${platform === "ALL" ? "border-slate-100 bg-white text-slate-500" : "border-indigo-100 bg-indigo-50 text-indigo-600"}`}
            >
              <Filter size={14} className={platform !== "ALL" ? "text-indigo-600" : "text-slate-400"} />
              {platform === "ALL" ? "All Platforms" : platform}
              <ChevronDown size={14} className="ml-1 opacity-50" />
            </button>

            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 opacity-0 invisible group-hover/platform:opacity-100 group-hover/platform:visible transition-all z-50 transform origin-top-right group-hover/platform:scale-100 scale-95">
              <button
                onClick={() => setPlatform("ALL")}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all ${platform === "ALL" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
              >
                ALL PLATFORMS
              </button>
              {activePlatforms.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all ${platform === p ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group/dept">
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${department === "ALL" ? "border-slate-100 bg-white text-slate-500" : "border-indigo-100 bg-indigo-50 text-indigo-600"}`}
            >
              <Briefcase size={14} className={department !== "ALL" ? "text-indigo-600" : "text-slate-400"} />
              {department === "ALL" ? "All Departments" : department}
              <ChevronDown size={14} className="ml-1 opacity-50" />
            </button>

            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 opacity-0 invisible group-hover/dept:opacity-100 group-hover/dept:visible transition-all z-50 transform origin-top-right group-hover/dept:scale-100 scale-95">
              <button
                onClick={() => setDepartment("ALL")}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all ${department === "ALL" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
              >
                ALL DEPARTMENTS
              </button>
              {departments.map(d => (
                <button
                  key={d}
                  onClick={() => setDepartment(d)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all ${department === d ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group/sort">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 border-slate-100 bg-white text-slate-500 transition-all"
            >
              <ArrowUpDown size={14} className="text-slate-400" />
              {sortBy.replace("_", " ")}
              <ChevronDown size={14} className="ml-1 opacity-50" />
            </button>

            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 opacity-0 invisible group-hover/sort:opacity-100 group-hover/sort:visible transition-all z-50 transform origin-top-right group-hover/sort:scale-100 scale-95">
              {[
                { id: "NEWEST", label: "Newest First" },
                { id: "OLDEST", label: "Oldest First" },
                { id: "LOWEST_RATING", label: "Lowest Rating First" },
                { id: "HIGHEST_RISK", label: "Highest Escalation Risk" },
                { id: "UNASSIGNED", label: "Unassigned First" }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all ${sortBy === option.id ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  {option.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-100 mx-1"></div>


          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Hide Low Confidence</span>
            <button
              onClick={() => setHideLowConfidence(!hideLowConfidence)}
              className={`w-10 h-5 rounded-full transition-all relative ${hideLowConfidence ? "bg-indigo-600" : "bg-slate-200"}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${hideLowConfidence ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-sm font-bold text-slate-500">Syncing latest status and safety rules...</p>
          </div>
        ) : filteredReviews.length > 0 ? filteredReviews.map(r => (
          <ReviewCard
            key={r.review_id}
            review={r}
            confidenceThreshold={confidenceThreshold}
            highlight={highlightId === r.review_id}
            isSelected={selectedIds.includes(r.review_id)}
            onSelect={toggleSelect}
            onFlag={(rev) => setFlagModal({ open: true, review: rev, reason: "", notes: "", loading: false })}
            onSimilar={(rev) => {
              const matches = findSimilarReviews(rev);
              setSimilarModal({ open: true, review: rev, matches, loading: false });
            }}
          />
        )) : (
          <div className="glass-card col-span-full py-32 text-center border-dashed border-2">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Filter size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No reviews matched your filters</h3>
            <p className="text-slate-500 mt-2">Try selecting a different tab or clear your search.</p>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 p-2 flex items-center gap-6 border border-white/10 backdrop-blur-md">
            <div className="pl-4 flex items-center gap-3 border-r border-white/10 pr-4">
              <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm">
                {selectedIds.length}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Selected</span>
            </div>

            <div className="flex items-center gap-2 pr-2">
              <button
                onClick={handleBulkFlag}
                disabled={isBulkActionLoading}
                className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
              >
                <Flag size={14} className="text-red-400" /> Flag Selected
              </button>

              <button
                onClick={handleBulkExport}
                className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
              >
                <Download size={14} className="text-indigo-400" /> Export
              </button>

              {(() => {
                const selectedReviews = state.reviews.filter(r => selectedIds.includes(r.review_id));
                const depts = new Set(selectedReviews.map(r => r.primary_department));
                const sameDept = depts.size === 1;
                const deptName = Array.from(depts)[0];

                return (
                  <div className="relative group/assign">
                    <button
                      disabled={!sameDept || isBulkActionLoading}
                      className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold ${!sameDept ? "opacity-30 cursor-not-allowed" : "bg-white text-slate-900 hover:bg-slate-100"}`}
                    >
                      <UserPlus size={14} /> Bulk Assign
                    </button>
                    {!sameDept && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[9px] font-bold rounded-lg whitespace-nowrap opacity-0 invisible group-hover/assign:opacity-100 group-hover/assign:visible transition-all">
                        Mixed departments. Select same department only.
                      </div>
                    )}
                    {sameDept && (
                      <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 opacity-0 invisible group-hover/assign:opacity-100 group-hover/assign:visible transition-all">
                        <div className="px-3 py-2 border-b border-white/5 mb-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Assign to {deptName}</p>
                        </div>
                        {state.staff.filter(s => s.department === deptName && s.status === "active").map(staff => (
                          <button
                            key={staff._id}
                            onClick={() => handleBulkAssign(staff)}
                            className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-xl transition-all"
                          >
                            <p className="text-xs font-bold text-white">{staff.name}</p>
                            <p className="text-[9px] text-slate-500 font-medium">{staff.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={clearSelection}
                className="ml-2 w-8 h-8 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Suspicious Modal */}
      {flagModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setFlagModal({ ...flagModal, open: false })}></div>
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">Flag Review as Suspicious</h3>
                  <p className="text-sm text-slate-500">This will move the review to the Suspicious tab.</p>
                </div>
                <button onClick={() => setFlagModal({ ...flagModal, open: false })} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Reason for flagging</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Fake Review", "Competitor Attack", "Spam", "Bot Generated", "Other"].map(r => (
                      <button
                        key={r}
                        onClick={() => setFlagModal({ ...flagModal, reason: r })}
                        className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all text-left ${flagModal.reason === r ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Additional notes (optional)</label>
                  <textarea
                    value={flagModal.notes}
                    onChange={(e) => setFlagModal({ ...flagModal, notes: e.target.value })}
                    rows="3"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-600 outline-none transition-all"
                    placeholder="Describe why this review seems suspicious..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setFlagModal({ ...flagModal, open: false })}
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
                >
                  CANCEL
                </button>
                <button
                  disabled={!flagModal.reason || flagModal.loading}
                  onClick={handleConfirmFlag}
                  className="flex-[2] py-4 bg-red-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-red-600/20 hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {flagModal.loading ? <Loader2 className="animate-spin" size={18} /> : <AlertTriangle size={18} />}
                  CONFIRM FLAG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Similar Complaints Modal */}
      {similarModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSimilarModal({ ...similarModal, open: false })}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">Similar Complaints Found</h3>
                  <p className="text-sm text-slate-500">{similarModal.matches.length} reviews with matching department and issues.</p>
                </div>
                <button onClick={() => setSimilarModal({ ...similarModal, open: false })} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              {similarModal.matches.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Info size={32} />
                  </div>
                  <p className="text-slate-500 font-bold">No similar complaints found for this issue.</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 mb-8">
                    {similarModal.matches.map(m => (
                      <div key={m.review_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < m.rating ? "currentColor" : "none"} />)}
                            </div>
                            <span className="text-xs font-bold text-slate-900">{m.reviewer_name}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{new Date(m.review_date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1 italic mb-2">"{m.review_text}"</p>
                        <div className="flex gap-2">
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded uppercase">{m.primary_department}</span>
                          {m.issues?.slice(0, 2).map(i => <span key={i} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-black rounded uppercase">{i}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <button
                      disabled={similarModal.loading}
                      onClick={handleCreateClusterTicket}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {similarModal.loading ? <Loader2 className="animate-spin" size={18} /> : <Layers size={18} />}
                      CREATE GROUP TICKET
                    </button>
                    <p className="text-center text-[11px] text-slate-400 font-bold">This will link all similar reviews under one cluster ticket for streamlined resolution.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
