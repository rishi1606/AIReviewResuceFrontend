import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Star, RefreshCcw, Copy, Check, Pencil, Flag, CheckCircle2,
  MessageSquare, AlertCircle, AlertTriangle, ChevronDown, User, Clock,
  FileText, Users, TrendingUp, Send, Save, RotateCcw, Info, Loader2,
  History, Eye, X, Sparkles, Shield, Zap, BookOpen
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import {
  getReviewDetail, saveDraft, getReviewerProfile, getSimilarReviews,
  approveResponse, rejectResponse, reanalyseReview, updateClassification,
  addReviewNote, flagReviewEnhanced, reopenReview, removeFlag
} from "../api/apiClient";
import { classifyReview } from "../utils/aiClassifier";
import { generateResponse } from "../utils/aiResponseGenerator";
import InfoTooltip from "../components/InfoTooltip";
import ConfirmModal from "../components/ConfirmModal";

const ReviewDetail = () => {
  const { review_id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, sendNotification } = useAppContext();
  const { currentUser } = useAuth();

  const [review, setReview] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI Draft state
  const [tone, setTone] = useState("Formal");
  const [proposal, setProposal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const templateRef = React.useRef(null);
  const [editText, setEditText] = useState("");
  const [copied, setCopied] = useState(false);
  const [draftHistory, setDraftHistory] = useState([]);
  const [activeDraftVersion, setActiveDraftVersion] = useState(null);

  // Re-analysis
  const [loadingAI, setLoadingAI] = useState(false);

  // Reviewer intelligence
  const [reviewerProfile, setReviewerProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Similar reviews
  const [similarData, setSimilarData] = useState(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Notes
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Flag
  const [showFlagPanel, setShowFlagPanel] = useState(false);
  const [flagCategory, setFlagCategory] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [flagAssignTo, setFlagAssignTo] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [deflagging, setDeflagging] = useState(false);

  // Approval
  const [approving, setApproving] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopening, setReopening] = useState(false);

  const handleReopen = async () => {
    setReopening(true);
    try {
      const res = await reopenReview(review.review_id);
      setReview(res.data);
      sendNotification({
        type: "info",
        title: `Review reopened — ${review?.reviewer_name || "guest"}`,
        message: `"${(review?.review_text || "").slice(0, 80)}${(review?.review_text || "").length > 80 ? "…" : ""}"`,
        link_to: `/reviews/${review?.review_id || review_id}`,
        timestamp: Date.now(),
        read: false
      });
      setShowReopenModal(false);
    } catch (err) {
      alert(err.message || "Failed to reopen");
    } finally {
      setReopening(false);
    }
  };

  const handleRemoveFlag = async () => {
    setDeflagging(true);
    try {
      const res = await removeFlag(review.review_id);
      setReview(res.data);
      sendNotification({
        type: "info",
        title: `Flag removed — ${review?.reviewer_name || "guest"}`,
        message: `Review returned to Classified status. "${(review?.review_text || "").slice(0, 80)}${(review?.review_text || "").length > 80 ? "…" : ""}"`,
        link_to: `/reviews/${review?.review_id || review_id}`,
        timestamp: Date.now(),
        read: false
      });
    } catch (err) {
      console.error("Remove flag failed:", err);
    } finally {
      setDeflagging(false);
    }
  };

  const TONES = [
    { value: "Formal", desc: "Professional and respectful — best for standard reviews" },
    { value: "Empathetic", desc: "Warm and understanding — for guests who felt let down" },
    { value: "Apologetic", desc: "Takes full accountability — for serious complaints" },
    { value: "Promotional", desc: "Addresses issue then invites guest back — for mixed reviews" },
    { value: "Escalation", desc: "Names the GM, offers direct contact — for high-risk reviews" }
  ];

  const FLAG_CATEGORIES = [
    "Fake review", "Sensitive content", "Legal concern", "Needs escalation", "Other"
  ];

  useEffect(() => {
    document.title = "ReviewRescue — Review Detail";
    fetchReview();
  }, [review_id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplates(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchReview = async () => {
    setLoading(true);
    // Reset all local state for the new review
    setProposal("");
    setDraftHistory([]);
    setActiveDraftVersion(null);
    setIsEditing(false);
    setEditText("");
    setCopied(false);
    setTone("Formal");
    setShowFlagPanel(false);
    setFlagCategory("");
    setFlagReason("");
    setFlagging(false);
    setShowReopenModal(false);
    setShowTemplates(false);
    setReviewerProfile(null);
    setSimilarData(null);
    setNoteText("");
    try {
      const res = await getReviewDetail(review_id);
      setReview(res.data.review);
      setTicket(res.data.ticket);
      setDraftHistory(res.data.review.draft_history || []);
      if (res.data.review.response_text) setProposal(res.data.review.response_text);

      // Fetch side panel data
      fetchReviewerProfile(res.data.review.reviewer_name);
      fetchSimilar();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewerProfile = async (name) => {
    setLoadingProfile(true);
    try {
      const res = await getReviewerProfile(name);
      setReviewerProfile(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingProfile(false); }
  };

  const fetchSimilar = async () => {
    setLoadingSimilar(true);
    try {
      const res = await getSimilarReviews(review_id);
      setSimilarData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingSimilar(false); }
  };

  // ─── AI Actions ───
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const text = await generateResponse(review, tone, state.hotelConfig);
      if (text) {
        setProposal(text);
        // Save draft version to backend
        const res = await saveDraft(review_id, {
          text, tone, generated_by: "ai",
          editor: currentUser?.name || currentUser?.email
        });
        setReview(res.data);
        setDraftHistory(res.data.draft_history || []);
        setActiveDraftVersion(res.data.draft_history?.length || 1);
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReanalyse = async () => {
    setLoadingAI(true);
    try {
      await reanalyseReview(review_id);
      const result = await classifyReview(review);
      if (result) {
        const res = await updateClassification(review_id, result);
        setReview(res.data);
      }
    } catch (err) {
      console.error("Re-analysis failed:", err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = async () => {
    if (!proposal) return;
    setApproving(true);
    try {
      const res = await approveResponse(review_id, {
        response_text: proposal,
        response_tone: tone,
        approved_by: currentUser?.name || currentUser?.email,
        is_submission: false
      });
      setReview(res.data);
      dispatch({ type: "APPROVE_RESPONSE", payload: res.data });
      sendNotification({
        type: "success",
        title: `Response approved for ${review?.reviewer_name || "guest"}`,
        message: `"${(review?.review_text || "").slice(0, 80)}${(review?.review_text || "").length > 80 ? "…" : ""}"`,
        link_to: `/reviews/${review_id}`,
        timestamp: Date.now(),
        read: false
      });
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setApproving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const res = await addReviewNote(review_id, {
        text: noteText,
        author: currentUser?.name || currentUser?.email
      });
      setReview(res.data);
      setNoteText("");
    } catch (err) {
      console.error("Note failed:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleFlag = async () => {
    if (!flagReason.trim()) return;
    setFlagging(true);
    try {
      const staff = state.staff || [];
      const assignee = staff.find(s => s._id === flagAssignTo);
      const res = await flagReviewEnhanced(review_id, {
        suspicious_reason: flagReason,
        flag_reason_category: flagCategory || "Other",
        flag_assigned_to: flagAssignTo || null,
        flag_assigned_to_name: assignee?.name || null
      });
      setReview(res.data);
      sendNotification({
        type: "warning",
        title: `Review flagged — ${review?.reviewer_name || "guest"}`,
        message: `${flagCategory || "Suspicious"}: "${(review?.review_text || "").slice(0, 60)}${(review?.review_text || "").length > 60 ? "…" : ""}"`,
        link_to: `/reviews/${review_id}`,
        timestamp: Date.now(),
        read: false
      });
      setShowFlagPanel(false);
      setFlagReason("");
      setFlagCategory("");
    } catch (err) {
      console.error("Flag failed:", err);
    } finally {
      setFlagging(false);
    }
  };

  const handleSaveDraftOnly = async () => {
    if (!proposal) return;
    try {
      const res = await saveDraft(review_id, {
        text: proposal, tone, generated_by: "manual",
        editor: currentUser?.name || currentUser?.email
      });
      setReview(res.data);
      setDraftHistory(res.data.draft_history || []);
    } catch (err) { console.error(err); }
  };

  const handleSaveEdit = async () => {
    setProposal(editText);
    setIsEditing(false);
    try {
      await saveDraft(review_id, {
        text: editText, tone, generated_by: "manual",
        editor: currentUser?.name || currentUser?.email
      });
    } catch (err) { console.error(err); }
  };

  // ─── Helpers ───
  const getSentimentColor = (s) => {
    switch (s?.toLowerCase()) {
      case "positive": return { text: "#16a34a", border: "#bbf7d0" };
      case "negative": return { text: "#dc2626", border: "#fecaca" };
      case "mixed": return { text: "#d97706", border: "#fde68a" };
      default: return { text: "#71717a", border: "#e4e4e7" };
    }
  };

  const getConfColor = (c) => {
    if (c >= 75) return "#16a34a";
    if (c >= 50) return "#d97706";
    return "#dc2626";
  };

  const timeAgo = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - (typeof ts === "number" ? ts : new Date(ts).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={32} className="animate-spin text-orange-500" />
    </div>
  );

  if (error || !review) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <AlertTriangle size={40} className="text-red-400" />
      <p className="text-zinc-600 font-medium">{error || "Review not found"}</p>
      <button onClick={() => navigate("/reviews")} className="text-orange-600 underline text-sm">Back to Reviews</button>
    </div>
  );

  const sc = getSentimentColor(review.sentiment);
  const conf = review.confidence;

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        .rd-panel {
          background: #fff; border: 1px solid #e4e4e7; border-radius: 16px;
          padding: 24px; transition: box-shadow 0.15s;
        }
        .rd-panel:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
        .rd-panel-title {
          font-size: 14px; font-weight: 700; color: #3f3f46;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 16px; padding-bottom: 12px;
          border-bottom: 1px solid #f4f4f5;
        }
        .rd-tag {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 0; border-radius: 0; font-size: 14px; font-weight: 700;
          border: none; line-height: 1; background: none;
        }
        .rd-info-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 0; border-bottom: 1px solid #fafafa;
        }
        .rd-info-label {
          font-size: 13px; font-weight: 600; color: #a1a1aa;
          min-width: 110px; flex-shrink: 0;
        }
        .rd-info-value { font-size: 14px; color: #3f3f46; font-weight: 500; flex: 1; }
        .rd-info-why {
          font-size: 12px; color: #a1a1aa; font-style: italic; margin-top: 3px;
        }
        .rd-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
          border: 1px solid; cursor: pointer; transition: all 0.12s;
        }
        .rd-btn-primary { background: #534AB7; color: #fff; border-color: #534AB7; }
        .rd-btn-primary:hover { background: #4338ca; }
        .rd-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .rd-btn-outline { background: #fff; color: #3f3f46; border-color: #e4e4e7; }
        .rd-btn-outline:hover { background: #f4f4f5; }
        .rd-btn-danger { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .rd-btn-danger:hover { background: #fee2e2; }
        .rd-btn-success { background: #16a34a; color: #fff; border-color: #16a34a; }
        .rd-btn-success:hover { background: #15803d; }
        .rd-btn-success:disabled { opacity: 0.5; cursor: not-allowed; }
        .rd-btn-amber { background: #f59e0b; color: #fff; border-color: #f59e0b; }
        .rd-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;
        }
        .rd-draft-area {
          width: 100%; min-height: 120px; border: 1px solid #e4e4e7;
          border-radius: 10px; padding: 12px; font-size: 13px; font-family: inherit;
          resize: vertical; outline: none; transition: border-color 0.12s;
          color: #3f3f46; line-height: 1.6;
        }
        .rd-draft-area:focus { border-color: #534AB7; }
        .rd-version-pill {
          padding: 4px 10px; border-radius: 7px; font-size: 11px; font-weight: 600;
          cursor: pointer; border: 1px solid #e4e4e7; background: #fff; color: #71717a;
          transition: all 0.12s;
        }
        .rd-version-pill.active {
          background: #534AB7; color: #fff; border-color: #534AB7;
        }
        .rd-note-item {
          padding: 10px 0; border-bottom: 1px solid #fafafa;
        }
        .rd-similar-card {
          padding: 10px; border: 1px solid #f4f4f5; border-radius: 10px;
          cursor: pointer; transition: all 0.12s;
        }
        .rd-similar-card:hover { background: #fafafa; border-color: #e4e4e7; }
        .rd-audit-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 8px 0; font-size: 12px;
        }
        .rd-audit-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/reviews")} className="rd-btn rd-btn-outline" style={{ padding: "6px 12px" }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-zinc-800">Review Detail</h1>
          <p className="text-sm text-zinc-400 font-medium mt-0.5">
            {review.reviewer_name} · {review.platform} · {review.hotel_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {review.status && (
            <span className="rd-badge" style={{
              background: review.status === "RESPONDED" ? "#f0fdf4" : review.status === "ESCALATED" ? "#fff7ed" : review.status === "Suspicious" ? "#fef2f2" : "#f5f3ff",
              border: `1px solid ${review.status === "RESPONDED" ? "#bbf7d0" : review.status === "ESCALATED" ? "#fed7aa" : review.status === "Suspicious" ? "#fecaca" : "#ede9fe"}`,
              color: review.status === "RESPONDED" ? "#16a34a" : review.status === "ESCALATED" ? "#c2410c" : review.status === "Suspicious" ? "#dc2626" : "#6d28d9",
              fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5
            }}>
              {review.status === "RESPONDED" ? "✓ Responded" : review.status === "ESCALATED" ? "⚠ Escalated" : review.status === "Suspicious" ? "⚠ Flagged" : (review.status === "Pending AI" || review.status === "Pending") ? "⏳ Processing" : "✓ Classified"}
              <InfoTooltip
                size={11}
                color={review.status === "RESPONDED" ? "#16a34a" : review.status === "ESCALATED" ? "#c2410c" : review.status === "Suspicious" ? "#dc2626" : "#6d28d9"}
                text={review.status === "RESPONDED"
                  ? "A response has been approved and published for this review."
                  : review.status === "ESCALATED"
                  ? "This review was escalated because the guest rating is at or below your hotel's escalation threshold. Your management team has been notified."
                  : review.status === "Suspicious"
                  ? "This review has been flagged as potentially suspicious — it may be fake, contain a rating-text mismatch, or include flagged keywords."
                  : (review.status === "Pending AI" || review.status === "Pending")
                  ? "This review is being processed. Sentiment, department, and urgency will be assigned shortly."
                  : `This review has been fully analysed: ${review.sentiment || "—"} sentiment, assigned to ${review.primary_department || "—"}, with ${review.confidence || "—"}% confidence.`
                }
              />
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ════════════ LEFT COLUMN (3/5) ════════════ */}
        <div className="lg:col-span-3 space-y-6">

          {/* ── Panel 1: Review Info ── */}
          <div className="rd-panel">
            <div className="rd-panel-title"><BookOpen size={14} className="text-orange-500" /> Review Information</div>

            <div className="flex items-start gap-4 mb-5">
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: sc.bg, color: sc.text,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 16, border: `1px solid ${sc.border}`, flexShrink: 0
              }}>
                {review.reviewer_name?.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-zinc-800">{review.reviewer_name}</h2>
                <p className="text-sm text-zinc-400 font-medium mt-0.5">
                  {review.platform} · {review.hotel_name} · {timeAgo(review.imported_at)}
                </p>
                <div className="flex items-center gap-0.5 mt-2">
                  {(() => {
                    const is10 = review.platform === "Booking.com" || review.platform === "Agoda";
                    const starCount = is10 ? 10 : 5;
                    const rawVal = is10 ? (review.raw_rating || review.rating * 2) : review.rating;
                    const filled = Math.round(rawVal);
                    return (
                      <>
                        {[...Array(starCount)].map((_, i) => (
                          <Star key={i} size={is10 ? 11 : 14} className={i < filled ? "text-amber-400" : "text-zinc-200"}
                            fill={i < filled ? "currentColor" : "none"} strokeWidth={i < filled ? 0 : 2} />
                        ))}
                        <span className="text-sm font-bold text-zinc-600 ml-1">{rawVal}/{starCount === 10 ? 10 : 5}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              {conf != null && (
                <div style={{ cursor: "help" }}>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: getConfColor(conf), display: "inline-flex", alignItems: "center", gap: 4 }}>{conf}%
                      <InfoTooltip text="Confidence score shows how reliable this analysis is. Scores above 75% are considered trustworthy. Lower scores may need your manual verification." size={12} color={getConfColor(conf)} position="left" />
                    </span>
                    <div className="w-20 h-1.5 rounded-full bg-zinc-100 mt-1">
                      <div className="h-full rounded-full transition-all" style={{ width: `${conf}%`, background: getConfColor(conf) }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Guest Stay Info */}
            {(review.country || review.room_type || review.traveler_type || review.stay_duration || review.stay_date) && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16,
                padding: "10px 14px", background: "#faf9ff", borderRadius: 12,
                border: "1px solid #f0eff5"
              }}>
                {review.country && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#71717a" }}>
                    <span style={{ fontSize: 13 }}>🌍</span>
                    <span style={{ fontWeight: 600 }}>{review.country}</span>
                  </div>
                )}
                {review.room_type && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#71717a" }}>
                    <span style={{ fontSize: 13 }}>🛏️</span>
                    <span style={{ fontWeight: 600 }}>{review.room_type}</span>
                  </div>
                )}
                {review.traveler_type && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#71717a" }}>
                    <span style={{ fontSize: 13 }}>👤</span>
                    <span style={{ fontWeight: 600 }}>{review.traveler_type}</span>
                  </div>
                )}
                {review.stay_duration && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#71717a" }}>
                    <span style={{ fontSize: 13 }}>🌙</span>
                    <span style={{ fontWeight: 600 }}>{review.stay_duration}</span>
                  </div>
                )}
                {review.stay_date && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#71717a" }}>
                    <span style={{ fontSize: 13 }}>📅</span>
                    <span style={{ fontWeight: 600 }}>{review.stay_date}</span>
                  </div>
                )}
              </div>
            )}

            {/* Full review text */}
            <div style={{
              background: "#fafafa", borderRadius: 10, padding: 16,
              fontSize: 14, lineHeight: 1.7, color: "#3f3f46", fontWeight: 450,
              borderLeft: `3px solid ${sc.border}`, marginBottom: 16
            }}>
              "{review.review_text}"
            </div>

            {/* Guest Photos */}
            {review.photo_urls?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 8 }}>Guest photos ({review.photo_urls.length})</p>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {review.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ flexShrink: 0 }}>
                      <img src={url} alt={`Guest photo ${i + 1}`}
                        style={{
                          width: 80, height: 80, objectFit: "cover",
                          borderRadius: 10, border: "1px solid #e4e4e7",
                          cursor: "pointer", transition: "transform 0.12s"
                        }}
                        onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
                        onMouseLeave={e => e.target.style.transform = "scale(1)"}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Classification details with explanations */}
            <div className="space-y-0">
              <div className="rd-info-row">
                <span className="rd-info-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>Sentiment
                  <InfoTooltip text="The overall emotional tone detected in this review — whether the guest's experience was Positive, Negative, Mixed, or Neutral. This is determined by analysing the words and phrases the guest used." size={12} />
                </span>
                <div className="rd-info-value">
                  <span className="rd-tag" style={{ color: sc.text }}>
                    {review.sentiment || "Pending"}
                  </span>

                </div>
              </div>
              <div className="rd-info-row">
                <span className="rd-info-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>Department
                  <InfoTooltip text="The hotel department this review is assigned to, based on the topics and complaints mentioned. For example, mentions of 'room cleaning' route to Housekeeping, while 'check-in delay' routes to Front Office." size={12} />
                </span>
                <div className="rd-info-value">
                  <span className="rd-tag" style={{ color: "#4f46e5" }}>
                    {review.primary_department || "Pending"}
                  </span>

                </div>
              </div>
              <div className="rd-info-row">
                <span className="rd-info-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>Urgency
                  <InfoTooltip text="How quickly this review needs your team's attention. High urgency means severe complaints or very low ratings that could impact your hotel's reputation. Medium is for mixed feedback, and Low is for generally positive reviews." size={12} />
                </span>
                <div className="rd-info-value">
                  <span className="rd-tag" style={{
                    color: review.urgency === "High" ? "#dc2626" : review.urgency === "Low" ? "#16a34a" : "#d97706"
                  }}>
                    {review.urgency || "Pending"} urgency
                  </span>

                </div>
              </div>
              {review.guest_emotion && (
                <div className="rd-info-row">
                  <span className="rd-info-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>Guest emotion
                    <InfoTooltip text="The primary emotion the guest expressed in their review — such as Angry, Disappointed, Satisfied, or Delighted. This helps your team understand the guest's state of mind and respond with the right tone." size={12} />
                  </span>
                  <div className="rd-info-value">
                    <span className="text-sm">{review.guest_emotion}</span>

                  </div>
                </div>
              )}
              {review.issues?.length > 0 && (
                <div className="rd-info-row">
                  <span className="rd-info-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>Issues
                    <InfoTooltip text="Specific problems or complaints the guest mentioned. These are extracted from the review text to help your team understand exactly what went wrong." size={12} />
                  </span>
                  <div className="rd-info-value flex flex-wrap gap-1.5">
                    {review.issues.map((issue, i) => (
                      <span key={i} className="rd-tag" style={{ color: "#e11d48" }}>
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {review.positive_aspects?.length > 0 && (
                <div className="rd-info-row">
                  <span className="rd-info-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>Positives
                    <InfoTooltip text="Things the guest specifically praised or appreciated. Use these in your response to acknowledge what your hotel did well." size={12} />
                  </span>
                  <div className="rd-info-value flex flex-wrap gap-1.5">
                    {review.positive_aspects.map((p, i) => (
                      <span key={i} className="rd-tag" style={{ color: "#0d9488" }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(review.status === "ESCALATED" || review.escalation) && (
                <div className="rd-info-row" style={{ background: "#FAEEDA", margin: "8px -16px", padding: "12px 16px", borderRadius: 8 }}>
                  <span className="rd-info-label" style={{ color: "#854F0B", display: "flex", alignItems: "center", gap: 5 }}>⚠ Escalated
                    <InfoTooltip text={<>Reviews rated <strong>≤ 2/5</strong> on Google / Agoda (equivalent to <strong>≤ 4/10</strong> on Booking.com / Agoda) are automatically escalated. The threshold is configurable in Settings → AI &amp; Rules.</>} size={12} color="#854F0B" maxWidth={320} />
                  </span>
                  <div className="rd-info-value" style={{ color: "#854F0B" }}>
                    {review.escalation_reason || "Review rating is at or below your escalation threshold"}
                  </div>
                </div>
              )}
              {review.is_suspicious && (
                <div className="rd-info-row" style={{ background: "#fef2f2", margin: "8px -16px", padding: "12px 16px", borderRadius: 8 }}>
                  <span className="rd-info-label" style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>⚠ Suspicious
                    <InfoTooltip text="This review has been flagged as potentially suspicious. Common reasons include: rating that contradicts the text, very low ratings (1 star or below), or matching your hotel's flagged keyword list. Your team should verify this review before responding." size={12} color="#dc2626" maxWidth={320} />
                  </span>
                  <div className="rd-info-value" style={{ color: "#991b1b" }}>
                    {review.suspicious_reason || "This review was flagged for manual verification"}
                    {review.flag_reason_category && <p className="rd-info-why">Category: {review.flag_reason_category}</p>}
                  </div>
                </div>
              )}
              {/* Keyword Alert Banner */}
              {(() => {
                const keywords = state.hotelConfig?.keywordAlerts || [];
                if (keywords.length === 0) return null;
                const reviewText = (review.review_text || "").toLowerCase();
                const matched = keywords.filter(kw => reviewText.includes(kw.toLowerCase()));
                if (matched.length === 0) return null;
                return (
                  <div className="rd-info-row" style={{ background: "#fef2f2", margin: "8px -16px", padding: "12px 16px", borderRadius: 8 }}>
                    <span className="rd-info-label" style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
                      🚨 Keyword Alert
                      <InfoTooltip text={<>This review contains <strong>{matched.length}</strong> flagged keyword(s) from your keyword alerts list in Settings → Rules.</>} size={12} color="#dc2626" maxWidth={280} />
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                      {matched.map((kw, i) => (
                        <span key={i} style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca"
                        }}>
                          "{kw}"
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {review.needs_human_review && (
                <div className="rd-info-row" style={{ background: "#fef3c7", margin: "8px -16px", padding: "12px 16px", borderRadius: 8 }}>
                  <span className="rd-info-label" style={{ color: "#92400e", display: "flex", alignItems: "center", gap: 5 }}>⚠ Needs verification
                    <InfoTooltip text="The analysis confidence for this review is below your hotel's trust threshold (configurable in Settings → Rules). A team member should manually verify that the sentiment, department, and urgency are correct before acting on it." size={12} color="#92400e" maxWidth={320} />
                  </span>
                  <div className="rd-info-value" style={{ color: "#854F0B" }}>
                    {review.human_review_reason ? review.human_review_reason.replace(/AI confidence/g, 'Analysis confidence') : "The analysis confidence is low — please verify manually"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Panel 2: Response Draft Panel ── */}
          <div className="rd-panel">
            <div className="rd-panel-title"><Sparkles size={14} className="text-violet-500" /> Smart Response Draft</div>

            {/* Tone selector */}
            <div className="mb-4">
              <label className="text-[12px] font-semibold text-zinc-500 mb-2 block">Response Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button key={t.value} onClick={() => setTone(t.value)}
                    title={t.desc}
                    className={`rd-version-pill ${tone === t.value ? "active" : ""}`}
                    style={tone === t.value ? {} : {}}
                  >
                    {t.value}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-zinc-400 mt-1.5 italic">
                {TONES.find(t => t.value === tone)?.desc}
              </p>
            </div>

            {/* Generate / Regenerate */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button onClick={handleGenerate} disabled={isGenerating || review.status === "RESPONDED"} className="rd-btn rd-btn-primary" style={review.status === "RESPONDED" ? { opacity: 0.4, cursor: "not-allowed" } : {}} title={review.status === "RESPONDED" ? "Reopen the review to generate a new draft" : ""}>
                {isGenerating ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : proposal ? <><RotateCcw size={13} /> Regenerate</> : <><Sparkles size={13} /> Generate Draft</>}
              </button>
              {proposal && review.status !== "RESPONDED" && (
                <>
                  <button onClick={handleCopy} className="rd-btn rd-btn-outline">
                    {copied ? <><Check size={12} strokeWidth={3} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <button onClick={() => { setIsEditing(true); setEditText(proposal); }} className="rd-btn rd-btn-outline">
                    <Pencil size={12} /> Edit
                  </button>
                </>
              )}
              {/* Template Selector */}
              {(() => {
                const templates = state.hotelConfig?.responseTemplates || [];
                if (templates.length === 0) return null;

                // Map sentiment to template category for smart suggestions
                const sentimentCategoryMap = {
                  Positive: "Positive", Praise: "Positive",
                  Negative: "Negative", Complaint: "Complaint",
                  Mixed: "General", Neutral: "General"
                };
                const suggestedCategory = sentimentCategoryMap[review?.sentiment] || "General";
                const suggested = templates.filter(t => t.category === suggestedCategory);
                const others = templates.filter(t => t.category !== suggestedCategory);
                const sorted = [...suggested, ...others];

                return (
                  <div className="relative" ref={templateRef} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <button onClick={() => setShowTemplates(!showTemplates)} className="rd-btn rd-btn-outline" style={{ gap: 4 }}>
                      <BookOpen size={12} /> Templates <ChevronDown size={11} />
                    </button>
                    <InfoTooltip text="Pre-built response templates from Settings → Rules. Templates matching the review's sentiment are suggested first. Click a template to auto-fill the response draft." size={13} position="top" />
                    {showTemplates && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, zIndex: 50, marginTop: 4,
                        background: "white", border: "1px solid #e4e4e7", borderRadius: 12,
                        boxShadow: "0 8px 30px rgba(0,0,0,0.12)", width: 340, maxHeight: 320, overflow: "auto"
                      }}>
                        <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid #f4f4f5" }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {suggested.length > 0 ? `Suggested for ${review?.sentiment || "this"} review` : "All Templates"}
                          </p>
                        </div>
                        {sorted.map((tpl, i) => {
                          const isSuggested = suggested.includes(tpl);
                          return (
                            <button key={i}
                              onClick={() => {
                                const guestName = review?.reviewer_name || review?.guest_name || "Guest";
                                const filled = tpl.content.replace(/\{guest_name\}/g, guestName);
                                setProposal(filled);
                                setShowTemplates(false);
                              }}
                              style={{
                                display: "block", width: "100%", padding: "10px 14px", textAlign: "left",
                                background: isSuggested ? "#fff7ed" : "transparent", border: "none",
                                borderBottom: "1px solid #f4f4f5", cursor: "pointer", transition: "background 0.15s"
                              }}
                              onMouseEnter={e => e.target.style.background = isSuggested ? "#ffedd5" : "#f4f4f5"}
                              onMouseLeave={e => e.target.style.background = isSuggested ? "#fff7ed" : "transparent"}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#18181b" }}>{tpl.name}</span>
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                                  background: isSuggested ? "#f97316" : "#e4e4e7",
                                  color: isSuggested ? "white" : "#71717a", textTransform: "uppercase"
                                }}>{isSuggested ? "★ Suggested" : tpl.category}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: 11, color: "#71717a", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {tpl.content.substring(0, 80)}…
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Draft textarea */}
            {isEditing ? (
              <div className="mb-3">
                <textarea className="rd-draft-area" value={editText} onChange={e => setEditText(e.target.value)} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px] text-zinc-400">{editText.length} / 4096 characters</span>
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="rd-btn rd-btn-outline" style={{ padding: "5px 12px" }}>Cancel</button>
                    <button onClick={handleSaveEdit} className="rd-btn rd-btn-primary" style={{ padding: "5px 12px" }}>
                      <Check size={12} /> Save edit
                    </button>
                  </div>
                </div>
              </div>
            ) : proposal ? (
              <div className="mb-3">
                <div style={{
                  background: "#fafafa", borderRadius: 10, padding: 14,
                  fontSize: 12, lineHeight: 1.7, color: "#3f3f46",
                  border: "1px solid #e4e4e7"
                }}>
                  "{proposal}"
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px] text-zinc-400">{proposal.length} / 4096 characters</span>
                </div>
              </div>
            ) : (
              <div style={{
                background: "#fafafa", borderRadius: 10, padding: 20,
                textAlign: "center", color: "#a1a1aa", fontSize: 12
              }}>
                No draft generated yet. Select a tone and click "Generate Draft".
              </div>
            )}

            {/* Version history */}
            {draftHistory.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-100">
                <div className="flex items-center gap-2 mb-2">
                  <History size={12} className="text-zinc-400" />
                  <span className="text-[12px] font-semibold text-zinc-500">Draft History</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {draftHistory.map((d, i) => (
                    <button key={i}
                      onClick={() => { setProposal(d.text); setActiveDraftVersion(d.version); setTone(d.tone); }}
                      className={`rd-version-pill ${activeDraftVersion === d.version ? "active" : ""}`}
                    >
                      v{d.version} · {d.tone} · {d.generated_by === "ai" ? "Auto" : "Manual"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Panel 3: Response Approval ── */}
          <div className="rd-panel">
            <div className="rd-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} className="text-green-500" /> Response Approval
              <InfoTooltip text="Approve your response draft here. Once approved, copy the text and paste it on the review platform (Google, Booking.com, etc.). There is no auto-publishing — responses must be posted manually." size={13} />
            </div>

            {review.status === "RESPONDED" ? (
              <div>
                <div style={{ background: "#dcfce7", borderRadius: 10, padding: 14 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-green-700" />
                    <span className="text-sm font-bold text-green-800">Response Approved</span>
                  </div>
                  <p className="text-sm text-green-700" style={{ lineHeight: 1.6 }}>"{review.response_text}"</p>
                  <p className="text-[12px] text-green-600 mt-2">
                    Approved by {review.approved_by} on {review.approved_at ? new Date(review.approved_at).toLocaleString() : "—"}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 italic">📋 Copy this response and paste it on the review platform.</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { navigator.clipboard.writeText(review.response_text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="rd-btn rd-btn-success" style={{ gap: 5 }}>
                    {copied ? <><Check size={12} strokeWidth={3} /> Copied!</> : <><Copy size={12} /> Copy Response</>}
                  </button>
                  <button onClick={() => setShowReopenModal(true)} className="rd-btn rd-btn-outline" style={{ gap: 5 }}>
                    <RotateCcw size={12} /> Reopen
                  </button>
                  <ConfirmModal
                    open={showReopenModal}
                    onClose={() => setShowReopenModal(false)}
                    onConfirm={handleReopen}
                    icon={RotateCcw}
                    iconColor="text-orange-500"
                    iconBg="bg-orange-50"
                    title="Reopen Review"
                    message="The approved response will be preserved in the audit trail. You can generate a new draft and re-approve."
                    confirmText="Yes, reopen"
                    confirmClass="bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                    loading={reopening}
                  />
                </div>
              </div>
            ) : (
              <div>
                {(review.status === "Suspicious" || review.is_suspicious) && (
                  <div style={{ background: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <p className="text-[12px] font-bold text-red-700 m-0">⚠ This review is flagged as suspicious</p>
                    <p className="text-[11px] text-red-600 mt-0.5 m-0">You can still approve a response — the flag is for your team's awareness.</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleApprove} disabled={!proposal || approving} className="rd-btn rd-btn-success">
                    {approving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Approve
                  </button>
                  <button onClick={handleSaveDraftOnly} disabled={!proposal} className="rd-btn rd-btn-outline">
                    <Save size={12} /> Save draft only
                  </button>
                  {!proposal && (
                    <p className="text-[12px] text-zinc-400 italic self-center ml-2">Generate a draft first to enable approval</p>
                  )}
                </div>
              </div>
            )}

            {/* Audit Trail */}
            {review.audit_log?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-100">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={12} className="text-zinc-400" />
                  <span className="text-[12px] font-semibold text-zinc-500">Audit Trail</span>
                </div>
                <div className="space-y-0">
                  {(review.audit_log || [])
                    .filter(log => log.actor !== "AI Worker" && log.action !== "classified")
                    .map((log, i) => (
                      <div key={i} className="rd-audit-item">
                        <div className="rd-audit-dot" style={{
                          background: log.action === "approved" ? "#16a34a" : log.action === "flagged" ? "#dc2626" : "#d97706"
                        }} />
                        <div>
                          <span className="font-semibold text-zinc-700">{log.actor}</span>
                          <span className="text-zinc-400 ml-1">· {log.details}</span>
                          <span className="text-zinc-300 ml-1">· {timeAgo(log.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Panel 4: Flag Workflow ── */}
          <div className="rd-panel">
            <div className="rd-panel-title"><Flag size={14} className="text-red-400" /> Flag Review</div>

            {review.is_suspicious ? (
              <div className="p-3 rounded-lg" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                <p className="text-sm font-bold text-red-700">This review is already flagged</p>
                <p className="text-[12px] text-red-600 mt-1">
                  {review.flag_reason_category && `Category: ${review.flag_reason_category} · `}
                  {review.suspicious_reason}
                  {review.flagged_by && ` · Flagged by ${review.flagged_by}`}
                </p>
                <button
                  onClick={handleRemoveFlag}
                  disabled={deflagging}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all cursor-pointer disabled:opacity-50"
                >
                  {deflagging ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  {deflagging ? "Removing…" : "Remove Flag"}
                </button>
              </div>
            ) : (
              <>
                {!showFlagPanel ? (
                  <button onClick={() => setShowFlagPanel(true)} className="rd-btn rd-btn-danger">
                    <Flag size={12} /> Flag this review
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[12px] font-semibold text-zinc-500 mb-1.5 block">Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {FLAG_CATEGORIES.map(c => (
                          <button key={c} onClick={() => setFlagCategory(c)}
                            className={`rd-version-pill ${flagCategory === c ? "active" : ""}`}
                            style={flagCategory === c ? { background: "#dc2626", borderColor: "#dc2626" } : {}}
                          >{c}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-zinc-500 mb-1.5 block">Reason</label>
                      <textarea className="rd-draft-area" style={{ minHeight: 60 }} placeholder="Describe why this review should be flagged..."
                        value={flagReason} onChange={e => setFlagReason(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleFlag} disabled={flagging || !flagReason.trim()} className="rd-btn rd-btn-danger">
                        {flagging ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
                        Submit Flag
                      </button>
                      <button onClick={() => setShowFlagPanel(false)} className="rd-btn rd-btn-outline">Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN (2/5) ════════════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Panel 5: Reviewer Intelligence ── */}
          <div className="rd-panel">
            <div className="rd-panel-title"><User size={14} className="text-blue-500" /> Reviewer Intelligence</div>
            {loadingProfile ? (
              <div className="text-center py-6"><Loader2 size={20} className="animate-spin text-zinc-300 mx-auto" /></div>
            ) : reviewerProfile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Total reviews</span>
                  <span className="text-sm font-bold text-zinc-800">{reviewerProfile.total_reviews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Average rating</span>
                  <span className="text-sm font-bold text-zinc-800">
                    {(review.platform === "Booking.com" || review.platform === "Agoda")
                      ? `${(reviewerProfile.avg_rating * 2).toFixed(1)}/10`
                      : `${reviewerProfile.avg_rating}/5`}
                  </span>
                </div>
                {reviewerProfile.platforms?.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Platforms</span>
                    <span className="text-sm font-medium text-zinc-600">{reviewerProfile.platforms.join(", ")}</span>
                  </div>
                )}
                {reviewerProfile.properties?.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Properties</span>
                    <span className="text-sm font-medium text-zinc-600">{reviewerProfile.properties.join(", ")}</span>
                  </div>
                )}
                {reviewerProfile.total_reviews > 1 && (
                  <div className="pt-2 border-t border-zinc-100">
                    <p className="text-[12px] text-zinc-400 mb-2">Past reviews by this guest</p>
                    {reviewerProfile.reviews?.slice(0, 4).map((r, i) => (
                      <Link key={i} to={`/reviews/${r.review_id}`} className="block text-sm text-zinc-500 hover:text-orange-600 py-1 truncate">
                        {[...Array(5)].map((_, j) => j < r.rating ? "★" : "☆").join("")} · {r.platform} · {r.review_text?.slice(0, 60)}...
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">No reviewer data available</p>
            )}
          </div>

          {/* ── Panel 6: Staff Mentions ── */}
          {review.staff_mentions?.length > 0 && (
            <div className="rd-panel">
              <div className="rd-panel-title"><Users size={14} className="text-amber-500" /> Staff Praised</div>
              <div className="flex flex-wrap gap-2">
                {review.staff_mentions.map((name, i) => (
                  <span key={i} className="rd-tag" style={{ color: "#0284c7" }}>
                    <User size={10} /> {name}
                  </span>
                ))}
              </div>
              <p className="text-[12px] text-zinc-400 mt-2 italic">
                Staff members mentioned by the guest in their review
              </p>
            </div>
          )}

          {/* ── Panel 7: Similar Reviews ── */}
          <div className="rd-panel">
            <div className="rd-panel-title"><TrendingUp size={14} className="text-emerald-500" /> Similar Reviews</div>
            {loadingSimilar ? (
              <div className="text-center py-6"><Loader2 size={20} className="animate-spin text-zinc-300 mx-auto" /></div>
            ) : similarData?.similar?.length > 0 ? (
              <div className="space-y-2">
                {similarData.trend?.message && (
                  <div className="p-2.5 rounded-lg mb-2" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
                    <p className="text-[12px] font-semibold text-amber-800">
                      <TrendingUp size={10} className="inline mr-1" />
                      {similarData.trend.message}
                    </p>
                  </div>
                )}
                {similarData.similar.map((r, i) => (
                  <Link key={i} to={`/reviews/${r.review_id}`} className="rd-similar-card block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-zinc-700">{r.reviewer_name}</span>
                      <span className="rd-badge" style={{
                        background: "none", border: "none",
                        color: getSentimentColor(r.sentiment).text,
                        fontSize: 11, fontWeight: 700
                      }}>{r.sentiment}</span>
                    </div>
                    <p className="text-[12px] text-zinc-500 truncate">{r.review_text?.slice(0, 80)}...</p>
                    <p className="text-[11px] text-zinc-300 mt-1">{r.platform} · {timeAgo(r.imported_at)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">No similar reviews found</p>
            )}
          </div>

          {/* ── Panel 8: Internal Notes ── */}

        </div>
      </div>
    </div>
  );
};

export default ReviewDetail;
