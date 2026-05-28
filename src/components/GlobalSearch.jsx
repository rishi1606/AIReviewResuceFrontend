import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const GlobalSearch = () => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const { state } = useAppContext();
    const navigate = useNavigate();
    const inputRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === "Escape") closeModal();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    const closeModal = () => {
        setOpen(false);
        setQuery("");
    };

    const q = query.trim().toLowerCase();

    const selectedPlatform = state.activeFilters?.platform;
    const selectedProperty = state.activeFilters?.property; // or wherever it lives in your state

    const matchedReviews = q.length < 2 ? [] : (state.reviews || [])
        .filter(r => !selectedPlatform || selectedPlatform === "ALL" || r.platform === selectedPlatform)
        .filter(r => !selectedProperty || selectedProperty === "ALL" || r.hotel_name === selectedProperty)
        .filter(r =>
            r.reviewer_name?.toLowerCase().includes(q) ||
            r.review_text?.toLowerCase().includes(q) ||
            r.room_number?.toLowerCase().includes(q) ||
            r.platform?.toLowerCase().includes(q) ||
            r.hotel_name?.toLowerCase().includes(q) ||
            r.primary_department?.toLowerCase().includes(q) ||
            r.guest_email?.toLowerCase().includes(q) ||
            r.loyalty_tier?.toLowerCase().includes(q)
        )
        .slice(0, 5);

    const matchedTickets = q.length < 2 ? [] : (state.tickets || [])
        .filter(t => !selectedPlatform || selectedPlatform === "ALL" || t.platform === selectedPlatform)
        .filter(t => !selectedProperty || selectedProperty === "ALL" || t.hotel_name === selectedProperty)
        .filter(t =>
            t.guest_name?.toLowerCase().includes(q) ||
            t.ticket_id?.toLowerCase().includes(q) ||
            t.department?.toLowerCase().includes(q) ||
            t.assignee_name?.toLowerCase().includes(q) ||
            t.review_text?.toLowerCase().includes(q)
        )
        .slice(0, 5);

    const hasResults = matchedReviews.length > 0 || matchedTickets.length > 0;

    const sentimentStyle = (s) => ({
        Positive: "bg-green-50 text-green-700 border border-green-200",
        Negative: "bg-red-50 text-red-700 border border-red-200",
        Mixed: "bg-amber-50 text-amber-700 border border-amber-200",
        Neutral: "bg-slate-100 text-slate-600 border border-slate-200",
    }[s] || "bg-slate-100 text-slate-500 border border-slate-200");

    const urgencyStyle = (u) => ({
        High: "bg-red-50 text-red-700 border border-red-200",
        Medium: "bg-amber-50 text-amber-700 border border-amber-200",
        Low: "bg-green-50 text-green-700 border border-green-200",
    }[u] || "bg-slate-100 text-slate-500 border border-slate-200");

    const urgencyDot = (u) => ({
        High: "bg-red-500",
        Medium: "bg-amber-400",
        Low: "bg-green-400",
    }[u] || "bg-slate-300");

    const platformIcon = (platform) => ({
        "Google": "🔵",
        "Airbnb": "🟢",
        "Booking.com": "🔷",
        "Agoda": "🟡",
    }[platform] || "⚪");

    const handleSelect = (path) => {
        closeModal();
        navigate(path);
    };

    return (
        <>
            {/* Trigger button — looks like a search input */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 h-9 w-64 pl-3 pr-3 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-300 hover:bg-white transition-all"
            >
                <Search size={15} className="flex-shrink-0" />
                <span className="flex-1 text-left">Search reviews, tickets…</span>
                <kbd className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400">⌘K</kbd>
            </button>

            {/* Modal overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(2px)" }}
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">

                        {/* Search input inside modal */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                            <Search size={18} className="text-slate-400 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by reviewer, platform, room, department…"
                                className="flex-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent outline-none p-2"
                            />
                            {query && (
                                <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
                                    <X size={15} />
                                </button>
                            )}
                            <button
                                onClick={closeModal}
                                className="text-[11px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 hover:bg-slate-200 transition-colors"
                            >
                                Esc
                            </button>
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto">

                            {/* Empty state — no query */}
                            {q.length < 2 && (
                                <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                                    <Search size={32} className="mb-3 opacity-30" />
                                    <p className="text-sm">Type at least 2 characters to search</p>
                                    <p className="text-xs mt-1 text-slate-300">Reviews · Tickets · Guests · Departments</p>
                                </div>
                            )}

                            {/* No results */}
                            {q.length >= 2 && !hasResults && (
                                <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                                    <p className="text-sm">No results for "<span className="text-slate-600 font-medium">{query}</span>"</p>
                                </div>
                            )}

                            {/* Reviews */}
                            {matchedReviews.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest px-5 pt-4 pb-2">
                                        Reviews · {matchedReviews.length}
                                    </p>
                                    {matchedReviews.map(r => (
                                        <button
                                            key={r.review_id}
                                            onClick={() => handleSelect(`/reviews?highlight=${r.review_id}`)}
                                            className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 border-t border-slate-100 text-left transition-colors"
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${urgencyDot(r.urgency)}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                    <span className="text-sm font-semibold text-slate-900">{r.reviewer_name}</span>
                                                    <span className="text-xs text-slate-400">·</span>
                                                    <span className="text-xs text-slate-500">{platformIcon(r.platform)} {r.platform}</span>
                                                    {r.room_number && (
                                                        <>
                                                            <span className="text-xs text-slate-400">·</span>
                                                            <span className="text-xs text-slate-500">Room {r.room_number}</span>
                                                        </>
                                                    )}
                                                    {r.hotel_name && (
                                                        <>
                                                            <span className="text-xs text-slate-400">·</span>
                                                            <span className="text-xs text-indigo-500 font-medium">{r.hotel_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 truncate mb-2">{r.review_text}</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {r.sentiment && (
                                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sentimentStyle(r.sentiment)}`}>
                                                            {r.sentiment}
                                                        </span>
                                                    )}
                                                    {r.primary_department && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                            {r.primary_department}
                                                        </span>
                                                    )}
                                                    {r.loyalty_tier && r.loyalty_tier !== "None" && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                                            {r.loyalty_tier}
                                                        </span>
                                                    )}
                                                    {r.urgency && (
                                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${urgencyStyle(r.urgency)}`}>
                                                            {r.urgency} urgency
                                                        </span>
                                                    )}
                                                    {r.review_date && (
                                                        <span className="text-[10px] text-slate-400 ml-auto">
                                                            {new Date(r.review_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Tickets */}
                            {matchedTickets.length > 0 && (
                                <div className={matchedReviews.length > 0 ? "border-t border-slate-100" : ""}>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest px-5 pt-4 pb-2">
                                        Tickets · {matchedTickets.length}
                                    </p>
                                    {matchedTickets.map(t => (
                                        <button
                                            key={t.ticket_id}
                                            onClick={() => handleSelect(`/tickets?highlight=${t.ticket_id}`)}
                                            className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 border-t border-slate-100 text-left transition-colors"
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${urgencyDot(t.urgency)}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                    <span className="text-sm font-semibold text-slate-900">{t.ticket_id}</span>
                                                    <span className="text-xs text-slate-400">·</span>
                                                    <span className="text-xs text-slate-500">{t.guest_name}</span>
                                                    {t.department && (
                                                        <>
                                                            <span className="text-xs text-slate-400">·</span>
                                                            <span className="text-xs text-indigo-500 font-medium">{t.department}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 truncate mb-2">{t.review_text}</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {t.status && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                                            {t.status}
                                                        </span>
                                                    )}
                                                    {t.urgency && (
                                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${urgencyStyle(t.urgency)}`}>
                                                            {t.urgency} urgency
                                                        </span>
                                                    )}
                                                    {t.assignee_name && t.assignee_name !== "Unassigned" && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                            👤 {t.assignee_name}
                                                        </span>
                                                    )}
                                                    {t.created_at && (
                                                        <span className="text-[10px] text-slate-400 ml-auto">
                                                            {new Date(t.created_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {hasResults && (
                            <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                                <span className="text-[11px] text-slate-400">
                                    {matchedReviews.length + matchedTickets.length} result{matchedReviews.length + matchedTickets.length !== 1 ? "s" : ""}
                                    {selectedPlatform && selectedPlatform !== "ALL" && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded font-medium">
                                            {selectedPlatform} only
                                        </span>
                                    )}
                                </span>
                                <span className="text-[11px] text-slate-400">↵ to open · Esc to close</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalSearch;