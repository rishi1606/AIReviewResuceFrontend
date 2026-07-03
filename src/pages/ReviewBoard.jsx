import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { getReviews } from "../api/apiClient";
import ReviewCard from "../components/ReviewCard";
import { getUIStatus } from "../components/StatusBadge";
import { LayoutDashboard, Loader2, AlertCircle, Search, X, FileText, CheckCircle2, SearchX, SlidersHorizontal, Filter, Calendar, Building2, ArrowUpDown, ShieldAlert, Globe, ChevronDown } from "lucide-react";
import InfoTooltip from "../components/InfoTooltip";

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
          className={`absolute mt-2 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 z-50 min-w-[180px] ${
            align === "right" ? "right-0" : "left-0"
          }`}
          onClick={(e) => {
            if (e.target.tagName === "BUTTON") setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const COLUMNS = [
  "Unassigned",
  "Assigned",
  "In Progress",
  "Pending Approval",
  "Lead Approved",
  "Reopened",
  "Rejected",
  "Published"
];

const ReviewBoard = () => {
  const { state } = useAppContext();
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [sentimentFilter, setSentimentFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");

  // FIX 1 Option A & FIX 5: Show 4 main workflow columns + Published (always visible)
  const [visibleColumns, setVisibleColumns] = useState([
    "Unassigned",
    "Assigned",
    "In Progress",
    "Pending Approval",
    "Reopened",
    "Published"
  ]);

  const isSuperAdmin = currentUser?.role === "superadmin";

  useEffect(() => {
    document.title = "ReviewRescue — Review Board";
    fetchBoardReviews();
  }, [currentUser, state.activeFilters?.property, state.activeFilters?.platform]);

  const fetchBoardReviews = async () => {
    setLoading(true);
    try {
      const res = await getReviews({
        limit: 200,
        sortBy: "NEWEST",
        property: state.activeFilters?.property || "ALL",
        platform: state.activeFilters?.platform || "ALL"
      });
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error("Failed to fetch reviews for board", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state.reviews.length > 0 && reviews.length > 0) {
      setReviews(prev => prev.map(r => {
        const updated = state.reviews.find(sr => sr.review_id === r.review_id);
        return updated ? updated : r;
      }));
    }
  }, [state.reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.reviewer_name || "").toLowerCase().includes(q);
        const textMatch = (r.review_text || "").toLowerCase().includes(q);
        if (!nameMatch && !textMatch) return false;
      }
      if (urgencyFilter !== "ALL" && r.urgency !== urgencyFilter) return false;
      if (sentimentFilter !== "ALL" && (r.sentiment || "").toLowerCase() !== sentimentFilter.toLowerCase()) return false;
      if (platformFilter !== "ALL" && r.platform !== platformFilter) return false;
      return true;
    });
  }, [reviews, searchQuery, urgencyFilter, sentimentFilter, platformFilter]);

  const columnsData = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach(col => { grouped[col] = []; });
    
    filteredReviews.forEach(review => {
      const status = getUIStatus(review);
      if (grouped[status]) {
        grouped[status].push(review);
      } else {
        grouped["Unassigned"].push(review);
      }
    });
    return grouped;
  }, [filteredReviews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F97316" }} />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--surface-0)", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", height: "100%", gap: "16px", paddingBottom: "48px" }} className="animate-in slide-in-from-bottom-4 duration-500">
      <div style={{ display: "flex", alignItems: "center", justify: "space-between", background: "var(--surface-1)", padding: "20px", borderRadius: "16px", border: "0.5px solid var(--border)", boxShadow: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", background: "var(--bg-accent)", color: "var(--text-accent)", borderRadius: "12px", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <LayoutDashboard size={20} style={{ display: "block", margin: "auto" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Review Board</h2>
              <InfoTooltip text="The Review Board is an interactive Kanban workflow where reviews progress through stages: Unassigned → Assigned → In Progress → Pending Approval → Lead Approved → Published. Manage team responsibilities, monitor resolution status, and streamline collaborative response drafting across departments." size={15} />
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "400", margin: 0 }}>
              {isSuperAdmin ? "Read-only Monitor View" : "Manage your department's reviews"}
            </p>
          </div>
        </div>
      </div>

      {/* FIX 2 — FILTER BAR (Matching Image 1 & Reviews.jsx dropdown style) */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e4e4e7",
        borderRadius: "16px",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
      }}>
        {/* Top Header Row */}
        <div style={{ display: "flex", alignItems: "center", justify: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SlidersHorizontal size={18} style={{ color: "#f97316" }} />
            <span style={{ fontSize: "15px", fontWeight: "700", color: "#18181b" }}>Filters</span>
          </div>
          <div style={{ fontSize: "13px", color: "#71717a", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Showing</span>
            <span style={{ background: "#fff7ed", color: "#f97316", fontWeight: "700", padding: "2px 8px", borderRadius: "6px", border: "1px solid #ffedd5" }}>
              {Object.values(columnsData).reduce((sum, arr) => sum + (arr?.length || 0), 0)}
            </span>
            <span>reviews</span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "260px" }}>
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "6px 12px 6px 34px", fontSize: "13px", fontWeight: "500",
                background: "#ffffff", border: "1px solid #e4e4e7",
                borderRadius: "10px", color: "#27272a", outline: "none"
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#71717a", cursor: "pointer" }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Urgency Filter */}
          <FilterDropdown
            align="left"
            trigger={
              <button
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-all cursor-pointer ${
                  urgencyFilter === "ALL"
                    ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    : "border-orange-300 bg-orange-50 text-orange-700"
                }`}
              >
                <ShieldAlert size={14} className={urgencyFilter !== "ALL" ? "text-orange-500" : "text-zinc-400"} />
                {urgencyFilter === "ALL" ? "Urgency: All" : `Urgency: ${urgencyFilter}`}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {["ALL", "High", "Medium", "Low"].map(u => (
              <button
                key={u}
                onClick={() => setUrgencyFilter(u)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                  urgencyFilter === u ? "bg-orange-50 text-orange-600" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {u === "ALL" ? "All Urgencies" : u}
              </button>
            ))}
          </FilterDropdown>

          {/* Sentiment Filter */}
          <FilterDropdown
            align="left"
            trigger={
              <button
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-all cursor-pointer ${
                  sentimentFilter === "ALL"
                    ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    : "border-orange-300 bg-orange-50 text-orange-700"
                }`}
              >
                <Filter size={14} className={sentimentFilter !== "ALL" ? "text-orange-500" : "text-zinc-400"} />
                {sentimentFilter === "ALL" ? "Sentiment: All" : `Sentiment: ${sentimentFilter.charAt(0).toUpperCase() + sentimentFilter.slice(1)}`}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {[
              { id: "ALL", label: "All Sentiments" },
              { id: "positive", label: "Positive" },
              { id: "negative", label: "Negative" },
              { id: "mixed", label: "Mixed" },
              { id: "neutral", label: "Neutral" },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setSentimentFilter(s.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                  sentimentFilter === s.id ? "bg-orange-50 text-orange-600" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </FilterDropdown>

          {/* Platform Filter */}
          <FilterDropdown
            align="left"
            trigger={
              <button
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-all cursor-pointer ${
                  platformFilter === "ALL"
                    ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    : "border-orange-300 bg-orange-50 text-orange-700"
                }`}
              >
                <Globe size={14} className={platformFilter !== "ALL" ? "text-orange-500" : "text-zinc-400"} />
                {platformFilter === "ALL" ? "Platform: All" : `Platform: ${platformFilter}`}
                <ChevronDown size={14} className="ml-1 opacity-50" />
              </button>
            }
          >
            {["ALL", "Booking.com", "Google", "TripAdvisor", "Agoda", "Airbnb"].map(p => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                  platformFilter === p ? "bg-orange-50 text-orange-600" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {p === "ALL" ? "All Platforms" : p}
              </button>
            ))}
          </FilterDropdown>

          {(searchQuery || urgencyFilter !== "ALL" || sentimentFilter !== "ALL" || platformFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setUrgencyFilter("ALL");
                setSentimentFilter("ALL");
                setPlatformFilter("ALL");
              }}
              style={{ background: "transparent", border: "none", color: "#f97316", fontSize: "13px", fontWeight: "600", cursor: "pointer", textDecoration: "underline", padding: "4px 8px" }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* FIX 1 — COLUMN LAYOUT TAB BAR */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        overflowX: "auto",
        paddingBottom: "4px"
      }} className="custom-scrollbar">
        <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginRight: "4px", flexShrink: 0 }}>
          COLUMNS:
        </span>
        {COLUMNS.map(col => {
          const count = columnsData[col]?.length || 0;
          const isVisible = visibleColumns.includes(col);
          const isPublished = col === "Published";
          return (
            <button
              key={col}
              onClick={() => {
                if (isPublished) return; // FIX 5: Published column always visible!
                if (isVisible && visibleColumns.length > 1) {
                  setVisibleColumns(visibleColumns.filter(c => c !== col));
                } else if (!isVisible) {
                  setVisibleColumns([...visibleColumns, col]);
                }
              }}
              style={{
                background: isVisible ? "#ffffff" : "var(--surface-1)",
                color: isVisible ? "#ea580c" : "var(--text-secondary)",
                border: isVisible ? "1.5px solid #F97316" : "0.5px solid var(--border)",
                borderRadius: "9999px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: isPublished ? "default" : "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
                boxShadow: isVisible ? "0 1px 3px rgba(249,115,22,0.08)" : "none"
              }}
            >
              <span>{col}</span>
              <span style={{
                background: isVisible ? "#fff7ed" : "var(--bg-neutral)",
                color: isVisible ? "#ea580c" : "var(--text-secondary)",
                padding: "1px 6px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: "700",
                border: isVisible ? "1px solid #ffedd5" : "1px solid transparent"
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div style={{ display: "flex", gap: "16px", minWidth: "100%", height: "100%", alignItems: "flex-start" }}>
          {visibleColumns.map(col => (
            <div
              key={col}
              style={{
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: "16px",
                minWidth: "280px",
                flex: "1",
                display: "flex",
                flexDirection: "column",
                maxHeight: "calc(100vh - 230px)",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
              }}
            >
              {/* FIX 4 Column Header (sticky, always show count) */}
              <div style={{
                padding: "14px 16px",
                borderBottom: "1px solid #f4f4f5",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#18181b", margin: 0 }}>
                  {col}
                </h3>
                <span style={{
                  background: "#fff7ed",
                  color: "#f97316",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  border: "1px solid #ffedd5"
                }}>
                  {columnsData[col]?.length || 0}
                </span>
              </div>

              {/* Column Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "12px", height: "100%", minHeight: "240px" }} className="custom-scrollbar">
                {columnsData[col]?.length === 0 ? (
                  <div style={{
                    flex: 1, display: "grid", placeContent: "center", placeItems: "center",
                    border: "1px dashed #e4e4e7", borderRadius: "14px", padding: "32px 16px", gap: "14px",
                    background: "#ffffff", width: "100%", height: "100%", minHeight: "220px"
                  }}>
                    {(searchQuery || urgencyFilter !== "ALL" || sentimentFilter !== "ALL" || platformFilter !== "ALL") ? (
                      <>
                        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#fff7ed", display: "grid", placeItems: "center", border: "1px solid #ffedd5", margin: "0 auto", flexShrink: 0 }}>
                          <SearchX size={24} style={{ color: "#f97316", display: "block", margin: "auto" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "13px", color: "#18181b", fontWeight: "700", textAlign: "center" }}>
                            No matches found
                          </span>
                          <span style={{ fontSize: "12px", color: "#71717a", fontWeight: "500", textAlign: "center", maxWidth: "200px" }}>
                            {searchQuery ? `No reviews matching "${searchQuery}" in ${col}` : `No ${col.toLowerCase()} reviews match active filters`}
                          </span>
                        </div>
                      </>
                    ) : col === "Published" ? (
                      <>
                        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#ecfdf5", display: "grid", placeItems: "center", border: "1px solid #d1fae5", margin: "0 auto", flexShrink: 0 }}>
                          <CheckCircle2 size={24} style={{ color: "#10b981", display: "block", margin: "auto" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "13px", color: "#18181b", fontWeight: "700", textAlign: "center" }}>
                            No published reviews yet
                          </span>
                          <span style={{ fontSize: "12px", color: "#71717a", fontWeight: "500", textAlign: "center" }}>
                            Approved reviews will appear here
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#fff7ed", display: "grid", placeItems: "center", border: "1px solid #ffedd5", margin: "0 auto", flexShrink: 0 }}>
                          <FileText size={24} style={{ color: "#f97316", display: "block", margin: "auto" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "13px", color: "#18181b", fontWeight: "700", textAlign: "center" }}>
                            No {col.toLowerCase()} reviews
                          </span>
                          <span style={{ fontSize: "12px", color: "#71717a", fontWeight: "500", textAlign: "center" }}>
                            Empty workflow column stage
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  columnsData[col].map(review => (
                    <div key={review.review_id}>
                      <ReviewCard
                        review={review}
                        isBoardView={true}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewBoard;
