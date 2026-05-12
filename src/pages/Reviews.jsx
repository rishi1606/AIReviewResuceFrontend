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
  Loader2
} from "lucide-react";
import { flagSuspicious, createTicket, clusterTickets } from "../api/apiClient";
import { createTicketFromReview } from "../utils/ticketFactory";

const Reviews = () => {
  const { state, dispatch } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState(null);

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

  const filteredReviews = state.reviews.filter(r => {
    const matchesTab = 
      tab === "ALL" ? true :
      tab === "APPROVED" ? r.status === "Approved" :
      tab === "PENDING" ? r.status === "Pending AI" || r.status === "Classified" :
      tab === "SUSPICIOUS" ? r.is_suspicious :
      r.sentiment?.toUpperCase() === tab;

    const matchesSearch = 
      r.reviewer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.review_text.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleConfirmFlag = async () => {
    if (!flagModal.reason) return;
    setFlagModal(prev => ({ ...prev, loading: true }));
    try {
      const fullReason = flagModal.reason + (flagModal.notes ? " — " + flagModal.notes : "");
      const res = await flagSuspicious(flagModal.review.review_id, fullReason);
      
      dispatch({ type: "FLAG_SUSPICIOUS", payload: { review_id: flagModal.review.review_id, suspicious_reason: fullReason } });
      
      dispatch({ type: "ADD_NOTIFICATION", payload: {
        type: "suspicious",
        message: `Review flagged — ${flagModal.review.reviewer_name} on ${flagModal.review.platform}`,
        urgency: "High",
        link_to: `/reviews?tab=suspicious&highlight=${flagModal.review.review_id}`,
        created_at: Date.now(),
        read: false
      }});

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

  const tabs = ["ALL", "NEGATIVE", "MIXED", "NEUTRAL", "POSITIVE", "APPROVED", "SUSPICIOUS"];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Guest Reviews</h1>
          <p className="text-slate-500">Manage and respond to guest feedback across all platforms.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by reviewer, content or issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-1 p-1 bg-slate-50 rounded-xl overflow-x-auto max-w-full no-scrollbar">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab === t ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredReviews.length > 0 ? filteredReviews.map(r => (
          <ReviewCard 
            key={r.review_id} 
            review={r} 
            highlight={highlightId === r.review_id}
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
