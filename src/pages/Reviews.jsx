import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
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
  ArrowUpDown,
  Star
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
import { SkeletonKPI, SkeletonReviewCard } from "../components/Skeleton";
import { FileText } from "lucide-react";

// ─── Click-outside hook ────────────────────────────────────────────────────
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

// ─── Reusable dropdown ─────────────────────────────────────────────────────
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
          onClick={(e) => {
            // Close dropdown when an option is clicked (leaf button inside)
            if (e.target.tagName === "BUTTON") setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const Reviews = () => {
  const { state, dispatch, sendNotification } = useAppContext();
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      const matched = ["ALL", "Negative", "Mixed", "Neutral", "Positive", "Approved", "Suspicious", "Escalated"].find(t => t.toUpperCase() === tabParam.toUpperCase());
      return matched || "ALL";
    }
    return "ALL";
  });
  const [selectedIds, setSelectedIds] = useState([]);

  const isScopedUser = currentUser?.role === "staff" || currentUser?.role === "dept_head";
  const [department, setDepartment] = useState(
    isScopedUser && currentUser?.department ? currentUser.department : "ALL"
  );
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
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  });
  const [highlightId, setHighlightId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [serverReviews, setServerReviews] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [isFetchingReviews, setIsFetchingReviews] = useState(false);
  const [openFilter, setOpenFilter] = useState(null);
  const [searchChip, setSearchChip] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  });
  const ITEMS_PER_PAGE = 10;

  // Page title
  useEffect(() => { document.title = "ReviewRescue \u2014 Reviews"; }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, department, sortBy, dateRange, search, hideLowConfidence, state.activeFilters]);

  const tabs = ["ALL", "Negative", "Mixed", "Neutral", "Positive", "Approved", "Suspicious", "Escalated"];

  const confidenceThreshold = state.hotelConfig?.aiConfig?.confidenceThreshold || 75;
  const departments = DEPARTMENTS;

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
      setTimeout(() => setHighlightId(null), 4000);
    }
    const tabParam = params.get("tab");
    if (tabParam) {
      const matched = tabs.find(t => t.toUpperCase() === tabParam.toUpperCase());
      if (matched) {
        setTab(matched);
      }
    } else {
      setTab("ALL");
    }
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
      setSearchChip(searchParam);
    } else {
      setSearch("");
      setSearchChip("");
    }
  }, [location.search]);

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

  // Server-side fetch effect
  useEffect(() => {
    let isCancelled = false;

    const fetchServerReviews = async () => {
      setIsFetchingReviews(true);
      try {
        let statusParam = "ALL";
        let sentimentParam = "ALL";
        const upperTab = tab.toUpperCase();
        if (upperTab === "APPROVED") statusParam = "RESPONDED,Approved";
        else if (upperTab === "PENDING APPROVAL") statusParam = "PENDING APPROVAL";
        else if (upperTab === "SUSPICIOUS") statusParam = "Suspicious";
        else if (upperTab === "ESCALATED") statusParam = "ESCALATED";
        else sentimentParam = tab;

        let sortByParam = "NEWEST";
        if (sortBy === "OLDEST") sortByParam = "OLDEST";
        if (sortBy === "LOWEST_RATING") sortByParam = "RATING_LOW";
        if (sortBy === "HIGHEST_RISK") sortByParam = "CONFIDENCE_LOW";

        const res = await getReviews({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          sentiment: sentimentParam,
          status: statusParam,
          department: department,
          search: search,
          minConfidence: hideLowConfidence ? confidenceThreshold : undefined,
          sortBy: sortByParam,
          platform: state.activeFilters?.platform || "ALL",
          property: state.activeFilters?.property || "ALL",
          dateStart: dateRange.start ? new Date(dateRange.start).toISOString() : undefined,
          dateEnd: dateRange.end ? new Date(dateRange.end).toISOString() : undefined
        });

        if (!isCancelled) {
          if (currentPage === 1) {
            setServerReviews(res.data.reviews || []);
          } else {
            setServerReviews(prev => [...prev, ...(res.data.reviews || [])]);
          }
          setServerTotal(res.data.total || 0);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to fetch paginated reviews", err);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingReviews(false);
        }
      }
    };
    fetchServerReviews();

    return () => { isCancelled = true; };
  }, [currentPage, tab, department, search, hideLowConfidence, sortBy, dateRange, state.activeFilters?.platform, state.activeFilters?.property]);

  // Sync local serverReviews with global state to preserve optimistic UI updates
  useEffect(() => {
    setServerReviews(prev => prev.map(sr => {
      const updated = state.reviews?.find(r => r.review_id === sr.review_id);
      return updated ? updated : sr;
    }));
  }, [state.reviews]);

  const paginatedReviews = serverReviews;

  const setPresetRange = (label) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    if (label === "Today") {
      setDateRange({ label, start: today, end: endOfToday });
    } else if (label === "Last 7 Days") {
      const start = new Date();
      start.setDate(today.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      setDateRange({ label, start, end: endOfToday });
    } else if (label === "Last 30 Days") {
      const start = new Date();
      start.setDate(today.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      setDateRange({ label, start, end: endOfToday });
    } else {
      setDateRange({ label: "All Time", start: null, end: null });
    }
  };

  const handleConfirmFlag = async () => {
    if (!flagModal.reason) return;
    setFlagModal(prev => ({ ...prev, loading: true }));
    try {
      const fullReason = flagModal.reason + (flagModal.notes ? " — " + flagModal.notes : "");
      await flagSuspicious(flagModal.review.review_id, fullReason);

      dispatch({ type: "FLAG_SUSPICIOUS", payload: { review_id: flagModal.review.review_id, suspicious_reason: fullReason } });
      sendNotification({
        type: "suspicious",
        message: `Review flagged — ${flagModal.review.reviewer_name} on ${flagModal.review.platform}`,
        urgency: "High",
        link_to: `/reviews?tab=suspicious&highlight=${flagModal.review.review_id}`,
        created_at: Date.now(),
        read: false
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
      await clusterTickets({ ticket_ids: ticketIdsToCluster, cluster_id });
      dispatch({
        type: "CREATE_CLUSTER_TICKET",
        payload: { ticket: masterTicket, cluster_id, review_ids: [review.review_id, ...matches.map(m => m.review_id)] }
      });
      sendNotification({
        type: "recurring_issue",
        message: `Cluster ticket created — ${review.primary_department} (${matches.length + 1} issues)`,
        urgency: "High",
        link_to: "/tickets?highlight=" + masterTicket.ticket_id,
        created_at: Date.now(),
        read: false
      });
      setSimilarModal({ open: false, review: null, matches: [], loading: false });
    } catch (err) {
      alert("Failed to create cluster ticket: " + err.message);
      setSimilarModal(prev => ({ ...prev, loading: false }));
    }
  };

  // ─── Bulk assign dropdown (click-based) ──────────────────────────────────
  const BulkAssignDropdown = () => {
    const selectedReviews = state.reviews.filter(r => selectedIds.includes(r.review_id));
    const depts = new Set(selectedReviews.map(r => r.primary_department));
    const sameDept = depts.size === 1;
    const deptName = Array.from(depts)[0];
    const [assignOpen, setAssignOpen] = useState(false);
    const assignRef = useRef(null);
    useClickOutside(assignRef, () => setAssignOpen(false));

    return (
      <div className="relative" ref={assignRef}>
        <button
          disabled={!sameDept || isBulkActionLoading}
          onClick={() => sameDept && setAssignOpen(v => !v)}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold ${!sameDept ? "opacity-30 cursor-not-allowed" : "bg-white text-slate-900 hover:bg-slate-100 cursor-pointer"
            }`}
        >
          <UserPlus size={14} /> Bulk Assign
        </button>
        {!sameDept && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[9px] font-bold rounded-lg whitespace-nowrap pointer-events-none">
            Mixed departments. Select same department only.
          </div>
        )}
        {sameDept && assignOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-50">
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Assign to {deptName}</p>
            </div>
            {state.staff.filter(s => s.department === deptName && s.status === "active").map(staff => (
              <button
                key={staff._id}
                onClick={() => { handleBulkAssign(staff); setAssignOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <p className="text-xs font-bold text-white">{staff.name}</p>
                <p className="text-[9px] text-slate-500 font-medium">{staff.email}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Fetch ALL reviews for export (respects current filters) ────────────
  const fetchAllForExport = async () => {
    try {
      let statusParam = "ALL";
      let sentimentParam = "ALL";
      const upperTab = tab.toUpperCase();
      if (upperTab === "APPROVED") statusParam = "RESPONDED,Approved";
      else if (upperTab === "PENDING APPROVAL") statusParam = "PENDING APPROVAL";
      else if (upperTab === "SUSPICIOUS") statusParam = "Suspicious";
      else if (upperTab === "ESCALATED") statusParam = "ESCALATED";
      else sentimentParam = tab;

      let sortByParam = "NEWEST";
      if (sortBy === "OLDEST") sortByParam = "OLDEST";
      if (sortBy === "LOWEST_RATING") sortByParam = "RATING_LOW";
      if (sortBy === "HIGHEST_RISK") sortByParam = "CONFIDENCE_LOW";

      const res = await getReviews({
        page: 1,
        limit: 9999,
        sentiment: sentimentParam,
        status: statusParam,
        department: department,
        search: search,
        minConfidence: hideLowConfidence ? confidenceThreshold : undefined,
        sortBy: sortByParam,
        platform: state.activeFilters?.platform || "ALL",
        property: state.activeFilters?.property || "ALL",
        dateStart: dateRange.start ? new Date(dateRange.start).toISOString() : undefined,
        dateEnd: dateRange.end ? new Date(dateRange.end).toISOString() : undefined
      });
      return res.data.reviews || [];
    } catch (err) {
      console.error("Export fetch failed:", err);
      return state.reviews || [];
    }
  };

  // ─── Export CSV ─────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    const rows = await fetchAllForExport();
    if (!rows.length) return alert("No reviews to export.");
    const headers = ["Reviewer", "Platform", "Hotel", "Rating", "Sentiment", "Department", "Urgency", "Status", "Confidence", "Review Text", "Date"];
    const escape = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
    const csvRows = [headers.join(",")];
    rows.forEach(r => {
      const rawRating = r.raw_rating || r.rating;
      const scale = r.raw_rating_scale || ((r.platform === "Booking.com" || r.platform === "Agoda") ? 10 : 5);
      csvRows.push([
        escape(r.reviewer_name),
        escape(r.platform),
        escape(r.hotel_name),
        escape(`${rawRating}/${scale}`),
        escape(r.sentiment),
        escape(r.primary_department),
        escape(r.urgency),
        escape(r.status),
        escape(r.confidence != null ? `${r.confidence}%` : ""),
        escape(r.review_text),
        escape(r.review_date)
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ReviewRescue_Export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Export PDF ─────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    try {
      const rows = await fetchAllForExport();
      if (!rows.length) return alert("No reviews to export.");

      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default || autoTableModule.autoTable;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Header
      doc.setFillColor(83, 74, 183);
      doc.rect(0, 0, 297, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("ReviewRescue - Review Export", 14, 14);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${rows.length} reviews`, 297 - 14, 14, { align: "right" });

      // Summary row
      const pos = rows.filter(r => r.sentiment === "Positive").length;
      const neg = rows.filter(r => r.sentiment === "Negative").length;
      const esc = rows.filter(r => r.status === "ESCALATED").length;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.text(`Positive: ${pos}  |  Negative: ${neg}  |  Escalated: ${esc}  |  Avg Confidence: ${rows.length ? Math.round(rows.reduce((s, r) => s + (r.confidence || 0), 0) / rows.length) : 0}%`, 14, 30);

      // Table
      const tableData = rows.map(r => {
        const rawRating = r.raw_rating || r.rating;
        const scale = r.raw_rating_scale || ((r.platform === "Booking.com" || r.platform === "Agoda") ? 10 : 5);
        return [
          r.reviewer_name || "",
          r.platform || "",
          r.hotel_name || "",
          `${rawRating}/${scale}`,
          r.sentiment || "",
          r.primary_department || "",
          r.urgency || "",
          r.status || "",
          r.confidence != null ? `${r.confidence}%` : "",
          (r.review_text || "").slice(0, 80) + ((r.review_text || "").length > 80 ? "..." : ""),
        ];
      });

      autoTable(doc, {
        startY: 35,
        head: [["Reviewer", "Platform", "Hotel", "Rating", "Sentiment", "Dept", "Urgency", "Status", "Conf", "Review"]],
        body: tableData,
        styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
        headStyles: { fillColor: [83, 74, 183], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        alternateRowStyles: { fillColor: [250, 249, 255] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 22 },
          2: { cellWidth: 30 },
          3: { cellWidth: 14 },
          4: { cellWidth: 18 },
          5: { cellWidth: 22 },
          6: { cellWidth: 16 },
          7: { cellWidth: 20 },
          8: { cellWidth: 12 },
          9: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const val = data.cell.raw;
            if (val === "Positive") data.cell.styles.textColor = [22, 163, 74];
            else if (val === "Negative") data.cell.styles.textColor = [220, 38, 38];
            else data.cell.styles.textColor = [217, 119, 6];
          }
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`ReviewRescue | Page ${i} of ${pageCount}`, 297 / 2, 205, { align: "center" });
      }

      doc.save(`ReviewRescue_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("PDF export failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-orange-500" />
            <h3 className="font-bold text-sm text-zinc-800">Filters</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              Showing <span className="bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full text-[11px]">{serverTotal}</span> reviews
            </span>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-700 transition-all cursor-pointer"
              title="Export filtered reviews as CSV"
            >
              <Download size={12} />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-700 transition-all cursor-pointer"
              title="Export filtered reviews as PDF report"
            >
              <FileText size={12} />
              PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* ── Date Range Filter ── */}
          <FilterDropdown
            align="left"
            trigger={
              <button
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all cursor-pointer ${dateRange.label === "All Time"
                  ? "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  : "border-orange-200 bg-orange-50 text-orange-700"
                  }`}
              >
                <Calendar size={14} className={dateRange.label !== "All Time" ? "text-orange-500" : "text-zinc-400"} />
                {dateRange.label}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {["All Time", "Today", "Last 7 Days", "Last 30 Days"].map(label => (
              <button
                key={label}
                onClick={() => setPresetRange(label)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${dateRange.label === label ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
              >
                {label}
              </button>
            ))}
          </FilterDropdown>

          {/* ── Categories Filter ── */}
          <FilterDropdown
            align="left"
            trigger={
              <button
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all cursor-pointer ${tab === "ALL"
                  ? "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  : "border-orange-200 bg-orange-50 text-orange-700"
                  }`}
              >
                <Filter size={14} className={tab !== "ALL" ? "text-orange-500" : "text-zinc-400"} />
                {tab === "ALL" ? "All Categories" : tab}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${tab === t ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
              >
                {t}
              </button>
            ))}
          </FilterDropdown>

          {/* ── Department Filter ── */}
          {isScopedUser ? (
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border-2 border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
            >
              <Briefcase size={14} className="text-zinc-400" />
              {currentUser?.department} (Locked)
            </button>
          ) : (
            <FilterDropdown
              align="right"
              trigger={
                <button
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all cursor-pointer ${department === "ALL"
                    ? "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                    : "border-orange-200 bg-orange-50 text-orange-700"
                    }`}
                >
                  <Briefcase size={14} className={department !== "ALL" ? "text-orange-500" : "text-zinc-400"} />
                  {department === "ALL" ? "All Departments" : department}
                  <ChevronDown size={14} className="ml-1 opacity-50" />
                </button>
              }
            >
              <button
                onClick={() => setDepartment("ALL")}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${department === "ALL" ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
              >
                All Departments
              </button>
              {departments.map(d => (
                <button
                  key={d}
                  onClick={() => setDepartment(d)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${department === d ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                >
                  {d}
                </button>
              ))}
            </FilterDropdown>
          )}

          {/* ── Sort Filter ── */}
          <FilterDropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border-2 border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all cursor-pointer">
                <ArrowUpDown size={14} className="text-zinc-400" />
                {sortBy === "NEWEST" ? "Newest first" : sortBy === "OLDEST" ? "Oldest first" : sortBy === "LOWEST_RATING" ? "Lowest rating" : sortBy.replace("_", " ")}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {[
              { id: "NEWEST", label: "Newest First" },
              { id: "OLDEST", label: "Oldest First" },
              { id: "LOWEST_RATING", label: "Lowest Rating First" },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${sortBy === option.id ? "bg-orange-50 text-orange-600" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
              >
                {option.label}
              </button>
            ))}
          </FilterDropdown>

          {/* Divider */}
          <div className="h-6 w-[1px] bg-zinc-200 hidden md:block mx-1"></div>

          {/* ── Hide Low Confidence Toggle ── */}
          <div className="flex items-center gap-2.5 px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-200/60 shadow-sm" title={`Hides reviews with AI confidence below ${confidenceThreshold}%`}>
            <span className="text-[11px] font-semibold text-zinc-500 select-none">{hideLowConfidence ? "Hiding low confidence" : "Hide low confidence"}</span>
            <button
              onClick={() => setHideLowConfidence(!hideLowConfidence)}
              className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${hideLowConfidence ? "bg-orange-500" : "bg-zinc-200"}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${hideLowConfidence ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </div>
      </div>
      {searchChip && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Search:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold rounded-full">
            <Search size={11} />
            {searchChip}
            <button
              onClick={() => {
                setSearchChip("");
                setSearch("");
                // Remove search param from URL without full reload
                const params = new URLSearchParams(window.location.search);
                params.delete("search");
                navigate(`/reviews?${params.toString()}`, { replace: true });
              }}
              className="ml-1 hover:text-indigo-900 transition-colors"
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          </span>
        </div>
      )}

      <div className={`grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 transition-opacity duration-200 ${isFetchingReviews && currentPage === 1 ? 'opacity-50' : 'opacity-100'}`}>
        {state.isAppLoading || (isFetchingReviews && currentPage === 1 && paginatedReviews.length === 0) ? (
          [1, 2, 3, 4, 5, 6].map(i => <SkeletonReviewCard key={i} />)
        ) : paginatedReviews.length > 0 ? (
          <>
            {paginatedReviews.map((r, idx) => (
              <div key={r.review_id} style={{ animationDelay: `${idx * 40}ms` }} className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
              <ReviewCard
                review={r}
                confidenceThreshold={confidenceThreshold}
                highlight={highlightId === r.review_id || highlightId === r._id}
                isSelected={selectedIds.includes(r.review_id)}
                onSelect={toggleSelect}
                onFlag={(rev) => setFlagModal({ open: true, review: rev, reason: "", notes: "", loading: false })}
                onSimilar={(rev) => {
                  const matches = findSimilarReviews(rev);
                  setSimilarModal({ open: true, review: rev, matches, loading: false });
                }}
              />
              </div>
            ))}
            {isFetchingReviews && currentPage > 1 && (
              [1, 2, 3].map(i => <SkeletonReviewCard key={`loading-more-${i}`} />)
            )}
          </>
        ) : (
          <div className="col-span-full py-32 text-center border-dashed border-2 border-zinc-200 rounded-3xl bg-zinc-50/50">
            <div className="w-20 h-20 bg-white border border-zinc-200 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400 shadow-sm">
              <Filter size={32} />
            </div>
            <h3 className="text-lg font-bold text-zinc-800">No reviews matched your filters</h3>
            <p className="text-zinc-500 mt-2 text-sm font-medium">Try selecting a different tab or clearing your search.</p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {paginatedReviews.length < serverTotal && (
        <div className="flex justify-center mt-8 pb-8">
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={isFetchingReviews}
            className="px-6 py-3 bg-white border-2 border-indigo-100 text-indigo-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isFetchingReviews ? <Loader2 size={16} className="animate-spin" /> : "Load 10 More Reviews"}
          </button>
        </div>
      )}

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
                className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
              >
                <Flag size={14} className="text-red-400" /> Flag Selected
              </button>

              <button
                onClick={handleBulkExport}
                className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
              >
                <Download size={14} className="text-indigo-400" /> Export
              </button>

              <BulkAssignDropdown />

              <button
                onClick={clearSelection}
                className="ml-2 w-8 h-8 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:text-white cursor-pointer"
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
                <button onClick={() => setFlagModal({ ...flagModal, open: false })} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Reason for flagging</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Fake Review", "Competitor Attack", "Spam", "Bot Generated", "Other"].map(r => (
                      <button
                        key={r}
                        onClick={() => setFlagModal({ ...flagModal, reason: r })}
                        className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all text-left cursor-pointer ${flagModal.reason === r
                          ? "border-red-600 bg-red-50 text-red-600"
                          : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"
                          }`}
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
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  disabled={!flagModal.reason || flagModal.loading}
                  onClick={handleConfirmFlag}
                  className="flex-[2] py-4 bg-red-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-red-600/20 hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                <button onClick={() => setSimilarModal({ ...similarModal, open: false })} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"><X size={20} /></button>
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
                          <span className="text-[10px] font-black text-slate-400">
                            {isNaN(Date.parse(m.review_date)) ? m.review_date : new Date(m.review_date).toLocaleDateString()}
                          </span>
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
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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