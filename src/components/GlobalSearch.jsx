import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
    useDeferredValue,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { DEFAULT_BADGE, DEFAULT_DOT, MAX_RESULTS, MIN_QUERY_LENGTH, PLATFORM_LABELS, SENTIMENT_GLOBAL, URGENCY_DOT, URGENCY_STYLES } from "../constants/constants";
import { dateFormat } from "../common/dateUtils";

// ─── Constants (outside component — never recreated on render) ────────────────



// ─── Pure helpers (outside component) ────────────────────────────────────────

const getSentimentClass = (s) => SENTIMENT_GLOBAL[s] ?? DEFAULT_BADGE;
const getUrgencyClass = (u) => URGENCY_STYLES[u] ?? DEFAULT_BADGE;
const getUrgencyDot = (u) => URGENCY_DOT[u] ?? DEFAULT_DOT;
const getPlatformLabel = (p) => PLATFORM_LABELS[p] ?? p ?? "Unknown";

const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const includes = (field, q) => field?.toLowerCase().includes(q) ?? false;

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = React.memo(({ className, children }) => (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${className}`}>
        {children}
    </span>
));
Badge.displayName = "Badge";

const UrgencyDot = React.memo(({ urgency }) => (
    <span
        className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${getUrgencyDot(urgency)}`}
        aria-hidden="true"
    />
));
UrgencyDot.displayName = "UrgencyDot";

const SectionHeader = React.memo(({ label, count }) => (
    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest px-5 pt-4 pb-2">
        {label} · {count}
    </p>
));
SectionHeader.displayName = "SectionHeader";

const EmptyState = React.memo(({ query }) => {
    if (query.length < MIN_QUERY_LENGTH) {
        return (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400" role="status">
                <Search size={32} className="mb-3 opacity-30" aria-hidden="true" />
                <p className="text-sm">Type at least {MIN_QUERY_LENGTH} characters to search</p>
                <p className="text-xs mt-1 text-slate-300">Reviews · Tickets · Guests · Departments</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center py-14 text-slate-400" role="status">
            <p className="text-sm">
                No results for{" "}
                <span className="text-slate-600 font-medium">"{query}"</span>
            </p>
        </div>
    );
});
EmptyState.displayName = "EmptyState";

const ReviewResult = React.memo(({ review: r, onSelect }) => {
    const handleClick = useCallback(() => {
        onSelect(`/reviews?search=${encodeURIComponent(r.reviewer_name ?? r.guest_name ?? "")}&highlight=${r.review_id}`);
    }, [onSelect, r.review_id, r.reviewer_name, r.guest_name]);



    return (
        <button
            type="button"
            onClick={handleClick}
            className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 border-t border-slate-100 text-left transition-colors focus-visible:bg-slate-50 focus-visible:outline-none"
            aria-label={`Review by ${r.reviewer_name ?? "Unknown"} on ${r.platform}`}
        >
            <UrgencyDot urgency={r.urgency} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-slate-900">{r.reviewer_name}</span>
                    <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                    <span className="text-xs text-slate-500">{getPlatformLabel(r.platform)}</span>
                    {r.room_number && (
                        <>
                            <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                            <span className="text-xs text-slate-500">Room {r.room_number}</span>
                        </>
                    )}
                    {r.hotel_name && (
                        <>
                            <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                            <span className="text-xs text-indigo-500 font-semibold">{r.hotel_name}</span>
                        </>
                    )}
                </div>
                <p className="text-xs text-slate-500 truncate mb-2">{r.review_text}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {r.sentiment && (
                        <Badge className={getSentimentClass(r.sentiment)}>{r.sentiment}</Badge>
                    )}
                    {r.primary_department && (
                        <Badge className="bg-orange-50 text-orange-600 border border-orange-100">
                            {r.primary_department}
                        </Badge>
                    )}
                    {r.loyalty_tier && r.loyalty_tier !== "None" && (
                        <Badge className="bg-amber-50 text-amber-600 border border-amber-100">
                            {r.loyalty_tier}
                        </Badge>
                    )}
                    {r.urgency && (
                        <Badge className={getUrgencyClass(r.urgency)}>{r.urgency} urgency</Badge>
                    )}
                    {dateFormat && (
                        <span className="text-[10px] text-slate-400 ml-auto">{dateFormat(r)}</span>
                    )}
                </div>
            </div>
        </button>
    );
});
ReviewResult.displayName = "ReviewResult";

// const TicketResult = React.memo(({ ticket: t, onSelect }) => {
//     const handleClick = useCallback(() => {
//         onSelect(`/tickets?search=${encodeURIComponent(t.ticket_id)}&highlight=${t.ticket_id}`);
//     }, [onSelect, t.ticket_id]);

//     const date = useMemo(() => formatDate(t.created_at), [t.created_at]);

//     return (
//         <button
//             type="button"
//             onClick={handleClick}
//             className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 border-t border-slate-100 text-left transition-colors focus-visible:bg-slate-50 focus-visible:outline-none"
//             aria-label={`Ticket ${t.ticket_id} for ${t.guest_name ?? "Unknown guest"}`}
//         >
//             <UrgencyDot urgency={t.urgency} />
//             <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-2 flex-wrap mb-0.5">
//                     <span className="text-sm font-semibold text-slate-900">{t.ticket_id}</span>
//                     <span className="text-xs text-slate-400" aria-hidden="true">·</span>
//                     <span className="text-xs text-slate-500">{t.guest_name}</span>
//                     {t.department && (
//                         <>
//                             <span className="text-xs text-slate-400" aria-hidden="true">·</span>
//                             <span className="text-xs text-orange-500 font-medium">{t.department}</span>
//                         </>
//                     )}
//                 </div>
//                 <p className="text-xs text-slate-500 truncate mb-2">{t.review_text}</p>
//                 <div className="flex items-center gap-1.5 flex-wrap">
//                     {t.status && (
//                         <Badge className="bg-blue-50 text-blue-600 border border-blue-100">{t.status}</Badge>
//                     )}
//                     {t.urgency && (
//                         <Badge className={getUrgencyClass(t.urgency)}>{t.urgency} urgency</Badge>
//                     )}
//                     {t.assignee_name && t.assignee_name !== "Unassigned" && (
//                         <Badge className="bg-slate-100 text-slate-600 border border-slate-200">
//                             {t.assignee_name}
//                         </Badge>
//                     )}
//                     {date && (
//                         <span className="text-[10px] text-slate-400 ml-auto">{date}</span>
//                     )}
//                 </div>
//             </div>
//         </button>
//     );
// });
// TicketResult.displayName = "TicketResult";

// ─── Main Component ───────────────────────────────────────────────────────────

const GlobalSearch = () => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const { state } = useAppContext();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const triggerRef = useRef(null);
    const modalRef = useRef(null);

    // React 18 — defers heavy filter work until after input is painted
    const deferredQuery = useDeferredValue(query.trim().toLowerCase());

    const selectedPlatform = state.activeFilters?.platform ?? "ALL";
    const selectedProperty = state.activeFilters?.property ?? "ALL";

    // ── Open / close ──────────────────────────────────────────────────────────

    const closeModal = useCallback(() => {
        setOpen(false);
        setQuery("");
        // Return focus to the trigger button when modal closes
        triggerRef.current?.focus();
    }, []);

    const openModal = useCallback(() => setOpen(true), []);

    // ── Keyboard shortcut (⌘K / Ctrl+K) + Escape ─────────────────────────────

    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
                return;
            }
            if (e.key === "Escape" && open) {
                closeModal();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, closeModal]);

    // ── Auto-focus input when modal opens ─────────────────────────────────────

    useEffect(() => {
        if (!open) return;
        // rAF is safer than setTimeout — fires after paint, no arbitrary delay
        const id = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(id);
    }, [open]);

    // ── Focus trap inside modal ───────────────────────────────────────────────

    useEffect(() => {
        if (!open) return;
        const modal = modalRef.current;
        if (!modal) return;

        const focusable = () =>
            Array.from(
                modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
            ).filter((el) => !el.disabled);

        const handleTab = (e) => {
            if (e.key !== "Tab") return;
            const els = focusable();
            const first = els[0];
            const last = els[els.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        };

        modal.addEventListener("keydown", handleTab);
        return () => modal.removeEventListener("keydown", handleTab);
    }, [open]);

    // ── Filtered results (deferred — won't block typing) ─────────────────────

    const matchedReviews = useMemo(() => {
        if (deferredQuery.length < MIN_QUERY_LENGTH) return [];
        return (state.reviews ?? [])
            .filter(r => selectedPlatform === "ALL" || r.platform === selectedPlatform)
            .filter(r => selectedProperty === "ALL" || r.hotel_name === selectedProperty)
            .filter(r =>
                includes(r.reviewer_name, deferredQuery) ||
                includes(r.review_text, deferredQuery) ||
                includes(r.room_number, deferredQuery) ||
                includes(r.platform, deferredQuery) ||
                includes(r.hotel_name, deferredQuery) ||
                includes(r.primary_department, deferredQuery) ||
                includes(r.guest_email, deferredQuery) ||
                includes(r.loyalty_tier, deferredQuery)
            )
            .slice(0, MAX_RESULTS);
    }, [deferredQuery, state.reviews, selectedPlatform, selectedProperty]);

    const matchedTickets = useMemo(() => {
        if (deferredQuery.length < MIN_QUERY_LENGTH) return [];
        return (state.tickets ?? [])
            .filter(t => selectedPlatform === "ALL" || t.platform === selectedPlatform)
            .filter(t => selectedProperty === "ALL" || t.hotel_name === selectedProperty)
            .filter(t =>
                includes(t.guest_name, deferredQuery) ||
                includes(t.ticket_id, deferredQuery) ||
                includes(t.department, deferredQuery) ||
                includes(t.assignee_name, deferredQuery) ||
                includes(t.review_text, deferredQuery)
            )
            .slice(0, MAX_RESULTS);
    }, [deferredQuery, state.tickets, selectedPlatform, selectedProperty]);

    const totalResults = matchedReviews.length + matchedTickets.length;
    const hasResults = totalResults > 0;

    // ── Navigation ────────────────────────────────────────────────────────────

    const handleSelect = useCallback((path) => {
        closeModal();
        navigate(path);
    }, [closeModal, navigate]);

    // ── Overlay click ─────────────────────────────────────────────────────────

    const handleOverlayClick = useCallback((e) => {
        if (e.target === e.currentTarget) closeModal();
    }, [closeModal]);

    // ── Query change ──────────────────────────────────────────────────────────

    const handleQueryChange = useCallback((e) => setQuery(e.target.value), []);
    const handleQueryClear = useCallback(() => setQuery(""), []);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Trigger button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={openModal}
                aria-label="Open search (Ctrl+K)"
                aria-keyshortcuts="Control+k Meta+k"
                aria-haspopup="dialog"
                aria-expanded={open}
                className="flex items-center gap-2 h-9 w-64 pl-3 pr-3 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:border-orange-300 hover:bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
                <Search size={15} className="flex-shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">Search reviews, tickets…</span>
                <kbd
                    className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400"
                    aria-hidden="true"
                >
                    ⌘K
                </kbd>
            </button>

            {/* Modal — portal to document.body */}
            {open && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Search reviews and tickets"
                    className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]"
                    style={{
                        backgroundColor: "rgba(15, 23, 42, 0.3)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                    }}
                    onClick={handleOverlayClick}
                >
                    <div
                        ref={modalRef}
                        className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
                    >
                        {/* Search input row */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                            <Search size={18} className="text-slate-400 flex-shrink-0" aria-hidden="true" />
                            <input
                                ref={inputRef}
                                type="search"
                                role="searchbox"
                                aria-label="Search reviews and tickets"
                                aria-autocomplete="list"
                                aria-controls="search-results"
                                value={query}
                                onChange={handleQueryChange}
                                placeholder="Search by reviewer, platform, room, department…"
                                className="flex-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent outline-none p-2"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={handleQueryClear}
                                    aria-label="Clear search"
                                    className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
                                >
                                    <X size={15} aria-hidden="true" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={closeModal}
                                aria-label="Close search"
                                className="text-[11px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                            >
                                Esc
                            </button>
                        </div>

                        {/* Results */}
                        <div
                            id="search-results"
                            className="max-h-[60vh] overflow-y-auto"
                            role="listbox"
                            aria-label="Search results"
                        >
                            {(!hasResults) && (
                                <EmptyState query={query} />
                            )}

                            {matchedReviews.length > 0 && (
                                <section aria-label={`Reviews — ${matchedReviews.length} results`}>
                                    <SectionHeader label="Reviews" count={matchedReviews.length} />
                                    {matchedReviews.map(r => (
                                        <ReviewResult key={r.review_id} review={r} onSelect={handleSelect} />
                                    ))}
                                </section>
                            )}

                            {matchedTickets.length > 0 && (
                                <section
                                    aria-label={`Tickets — ${matchedTickets.length} results`}
                                    className={matchedReviews.length > 0 ? "border-t border-slate-100" : ""}
                                >
                                    <SectionHeader label="Tickets" count={matchedTickets.length} />
                                    {matchedTickets.map(t => (
                                        <TicketResult key={t.ticket_id} ticket={t} onSelect={handleSelect} />
                                    ))}
                                </section>
                            )}
                        </div>

                        {/* Footer */}
                        {hasResults && (
                            <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                                <span className="text-[11px] text-slate-400">
                                    {totalResults} result{totalResults !== 1 ? "s" : ""}
                                    {selectedPlatform !== "ALL" && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-orange-50 text-orange-500 rounded font-medium">
                                            {selectedPlatform} only
                                        </span>
                                    )}
                                </span>
                                <span className="text-[11px] text-slate-400" aria-hidden="true">
                                    ↵ to open · Esc to close
                                </span>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default GlobalSearch;