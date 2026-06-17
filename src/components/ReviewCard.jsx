import React, { useState, useEffect, useRef } from "react";
import {
  Star,
  Flag,
  MessageSquare,
  AlertTriangle,
  RefreshCcw,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Loader2,
  Pencil,
  X,
  Check,
  Copy,
  History,
  AlertCircle,
  Info,
  Users,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateResponse } from "../utils/aiResponseGenerator";
import {
  approveResponse,
  rejectResponse,
  reanalyseReview,
  updateClassification,
  addReviewNote,
  assignReviewStaff
} from "../api/apiClient";
import { classifyReview } from "../utils/aiClassifier";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";

const ReviewCard = ({ review, highlight, onFlag, onSimilar, onHistory, isSelected, onSelect, confidenceThreshold = 75 }) => {
  const { state, dispatch, sendNotification } = useAppContext();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loadingAI, setLoadingAI] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tone, setTone] = useState(review.response_tone || (review.escalation_risk ? "Escalation" : (state.hotelConfig?.default_response_tone || "Formal")));
  const [proposal, setProposal] = useState(review.response_text || "");
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const editRef = useRef(null);

  const filteredStaff = state.staff?.filter(s =>
    s.status === "active" &&
    (s.department === review.primary_department || review.primary_department === "Management")
  ) || [];

  const handleAssign = async (staffId) => {
    if (!staffId) return;
    const selectedStaff = state.staff.find(s => s._id === staffId);
    if (!selectedStaff) return;
    try {
      const res = await assignReviewStaff(review.review_id, {
        staff_id: selectedStaff._id,
        staff_name: selectedStaff.name
      });
      dispatch({ type: "UPDATE_REVIEW", payload: res.data });
      sendNotification({ type: "success", message: `Assigned to ${selectedStaff.name}`, created_at: Date.now() });
    } catch (err) {
      alert("Assignment failed: " + err.message);
    }
  };

  const handleGenerate = async (selectedTone) => {
    setTone(selectedTone);
    setIsGenerating(true);
    try {
      console.log(`[Groq] Generating response for review_id: ${review.review_id}, tone: ${selectedTone}`);
      const text = await generateResponse(review, selectedTone, state.hotelConfig);
      if (text) {
        setProposal(text);
      } else {
        console.warn("[Groq] Empty response returned");
        setProposal("");
      }
    } catch (err) {
      console.error("Generation failed", err);
      sendNotification({ type: "error", message: `Draft generation failed: ${err.message}`, created_at: Date.now(), read: false });
    } finally {
      setIsGenerating(false);
    }
  };

  const isApprover = currentUser?.role === "gm" || currentUser?.role === "dept_head" || currentUser?.role === "manager" || currentUser?.role === "superadmin";

  const handleApprove = async () => {
    const isSubmission = !isApprover || (currentUser?.role === "staff" && isMediumConfidence);
    console.log("Approving review:", review.review_id, "isSubmission:", isSubmission, "Role:", currentUser?.role);
    try {
      const res = await approveResponse(review.review_id, {
        response_text: proposal,
        response_tone: tone,
        approved_by: currentUser?.name || "Staff",
        is_submission: isSubmission
      });
      dispatch({ type: "UPDATE_REVIEW", payload: res.data });
      if (!isSubmission) {
        sendNotification({
          type: "success",
          message: `Response posted for ${review.reviewer_name}`,
          created_at: Date.now()
        });
      }
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  };

  const handleReject = async () => {
    try {
      const res = await rejectResponse(review.review_id);
      dispatch({ type: "UPDATE_REVIEW", payload: res.data });
    } catch (err) {
      alert("Failed to reject: " + err.message);
    }
  };

  const handleReanalyse = async () => {
    setLoadingAI(true);
    try {
      console.log(`[Groq] Re-analysing review_id: ${review.review_id}`);
      await reanalyseReview(review.review_id);
      dispatch({ type: "REANALYSE_REVIEW", payload: review.review_id });
      const result = await classifyReview(review);
      if (result) {
        const res = await updateClassification(review.review_id, result);
        dispatch({ type: "UPDATE_REVIEW_CLASSIFICATION", payload: res.data });
        // Auto-generate a draft after successful re-analysis
        handleGenerate(tone);
      } else {
        sendNotification({ type: "error", message: `Re-analysis returned no results for ${review.reviewer_name}`, created_at: Date.now(), read: false });
      }
    } catch (err) {
      console.error("Re-analysis failed:", err);
      sendNotification({ type: "error", message: `Re-analysis failed: ${err.message}`, created_at: Date.now(), read: false });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    try {
      const res = await addReviewNote(review.review_id, {
        text: noteText,
        author: currentUser?.name || "Staff"
      });
      const savedNote = res.data.internal_notes[res.data.internal_notes.length - 1];
      dispatch({
        type: "ADD_INTERNAL_NOTE_TO_REVIEW",
        payload: { review_id: review.review_id, note: savedNote }
      });
      setNoteSaved(true);
      setNoteText("");
      setTimeout(() => {
        setNoteSaved(false);
        setIsAddingNote(false);
      }, 2000);
    } catch (err) {
      setNoteError("Failed to save note \u2014 try again");
    }
  };

  const handleCopy = () => {
    if (!proposal) return;
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const conf = review.confidence;
  const isClassified = !["NEW", "Pending AI", "Pending"].includes(review.status);
  const isHighConfidence = isClassified && conf !== null && conf !== undefined && conf >= confidenceThreshold;
  const isMediumConfidence = isClassified && conf !== null && conf !== undefined && conf >= 50 && conf < confidenceThreshold;
  const isLowConfidence = isClassified && (conf === null || conf === undefined || conf < 50);

  const getConfidenceColor = (conf) => {
    if (conf >= confidenceThreshold) return "rc-conf-green";
    if (conf >= 50) return "rc-conf-amber";
    return "rc-conf-red";
  };

  const getEmotionStyles = (emotion) => {
    const mapping = {
      Angry: "rc-tag rc-tag-red",
      Frustrated: "rc-tag rc-tag-orange",
      Disappointed: "rc-tag rc-tag-amber",
      Neutral: "rc-tag rc-tag-neutral",
      Satisfied: "rc-tag rc-tag-green",
      Delighted: "rc-tag rc-tag-green",
      Concerned: "rc-tag rc-tag-amber",
      Anxious: "rc-tag rc-tag-purple"
    };
    return mapping[emotion] || "rc-tag rc-tag-neutral";
  };

  const getPlatformBadge = (platform) => {
    switch (platform?.toLowerCase()) {
      case "google": return { bg: "rc-plat-google", icon: "G" };
      case "booking.com": return { bg: "rc-plat-booking", icon: "B" };
      case "Airbnb": return { bg: "rc-plat-ta", icon: "AB" };
      case "agoda": return { bg: "rc-plat-agoda", icon: "A" };
      default: return { bg: "rc-plat-default", icon: "R" };
    }
  };

  // Avatar color palette
  const AVATAR_COLORS = [
    { bg: "#fef3c7", text: "#92400e" },
    { bg: "#dbeafe", text: "#1e40af" },
    { bg: "#f3e8ff", text: "#6b21a8" },
    { bg: "#dcfce7", text: "#166534" },
    { bg: "#ffe4e6", text: "#9f1239" },
    { bg: "#e0f2fe", text: "#075985" },
  ];

  const getAvatarColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.split(" ");
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  const getSentimentClass = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return "rc-tag rc-tag-green";
      case "negative": return "rc-tag rc-tag-red";
      case "neutral": return "rc-tag rc-tag-neutral";
      default: return "rc-tag rc-tag-amber";
    }
  };

  const getSentimentDot = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return "rc-dot-green";
      case "negative": return "rc-dot-red";
      default: return "rc-dot-neutral";
    }
  };

  const getBorderClass = () => {
    const s = review.sentiment?.toLowerCase();
    if (s === "positive") return "rc-border-green";
    if (s === "negative") return "rc-border-red";
    if (s === "mixed") return "rc-border-amber";
    return isLowConfidence ? "rc-border-red" : "rc-border-amber";
  };

  const avatarColor = getAvatarColor(review.reviewer_name);

  const displayRaw = review.raw_rating || (review.platform === "Booking.com" || review.platform === "Agoda" ? review.rating * 2 : review.rating);
  const displayScale = review.raw_rating_scale || (review.platform === "Booking.com" || review.platform === "Agoda" ? 10 : 5);
  const starCount = displayScale === 10 ? 10 : 5;
  const filledCount = displayScale === 10 ? Math.round(displayRaw) : Math.round(displayRaw);

  return (
    <>
      <style id="rc-styles">{`
        .rc-card {
          background: #ffffff; border: 1px solid #f0eff5; border-radius: 18px;
          padding: 22px; position: relative;
          transition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s;
          display: flex; flex-direction: column;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .rc-card:hover {
          box-shadow: 0 16px 48px rgba(83,74,183,0.06), 0 4px 16px rgba(0,0,0,0.03);
          transform: translateY(-3px); border-color: #e8e5f3;
        }
        .rc-guest-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; padding: 6px 0; font-size: 11.5px; color: #a1a1aa; font-weight: 500; }
        .rc-guest-meta span { display: inline-flex; align-items: center; gap: 3px; background: #fafafa; padding: 2px 8px; border-radius: 6px; border: 1px solid #f4f4f5; }
        .rc-checkbox { position: absolute; top: 16px; right: 16px; z-index: 10; cursor: pointer; width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #d4d4d8; background: #fff; display: flex; align-items: center; justify-content: center; transition: opacity 0.12s; opacity: 0; }
        .rc-card:hover .rc-checkbox, .rc-checkbox.is-selected { opacity: 1; }
        .rc-checkbox.is-selected { background: #534AB7; border-color: #534AB7; color: #fff; }
        .rc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 12px; }
        .rc-header-left { display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0; }
        .rc-avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; letter-spacing: 0.02em; flex-shrink: 0; position: relative; }
        .rc-plat-badge { position: absolute; bottom: -3px; right: -3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 1.5px solid #e4e4e7; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 800; z-index: 2; }
        .rc-plat-google { color: #dc2626; } .rc-plat-booking { color: #2563eb; } .rc-plat-ta { color: #059669; } .rc-plat-agoda { color: #7c3aed; } .rc-plat-default { color: #71717a; }
        .rc-header-info { flex: 1; min-width: 0; }
        .rc-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .rc-name { font-size: 14.5px; font-weight: 700; color: #18181b; line-height: 1.3; }
        .rc-hotel-chip { background: #f5f3ff; color: #6d28d9; border: 1px solid #ede9fe; font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 20px; display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
        .rc-meta-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
        .rc-meta-text { font-size: 12px; color: #b4b4bd; font-weight: 500; }
        .rc-stars-row { display: flex; align-items: center; gap: 2px; margin-top: 6px; }
        .rc-star-fill { color: #f59e0b; } .rc-star-empty { color: #e4e4e7; }
        .rc-rating-chip { font-size: 11px; font-weight: 600; color: #71717a; background: #fafafa; border: 1px solid #f0f0f3; border-radius: 6px; padding: 2px 7px; margin-left: 5px; }
        .rc-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .rc-status-pill { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px; }
        .rc-pill-escalated { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
        .rc-pill-suspicious { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .rc-pill-responded { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .rc-quote { background: #fafafa; border: 1px solid #f4f4f5; border-radius: 12px; padding: 14px 16px 14px 26px; font-size: 13px; color: #52525b; line-height: 1.75; font-style: italic; margin-bottom: 16px; position: relative; scrollbar-width: none; -ms-overflow-style: none; }
        .rc-quote::-webkit-scrollbar { display: none; }
        .rc-quote::before { content: '\\201C'; position: absolute; top: 6px; left: 10px; font-size: 28px; color: #e4e4e7; font-family: Georgia, serif; line-height: 1; }
        .rc-insights { display: flex; align-items: stretch; border: 1px solid #f4f4f5; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
        .rc-insight-cell { flex: 1; padding: 10px 14px; display: flex; flex-direction: column; gap: 3px; position: relative; }
        .rc-insight-cell + .rc-insight-cell::before { content: ''; position: absolute; left: 0; top: 20%; bottom: 20%; width: 1px; background: #f0f0f3; }
        .rc-insight-label { font-size: 10px; font-weight: 600; color: #c4c4cc; text-transform: uppercase; letter-spacing: 0.06em; }
        .rc-insight-value { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 5px; }
        .rc-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .rc-dot-green { background: #16a34a; } .rc-dot-red { background: #dc2626; } .rc-dot-amber { background: #d97706; } .rc-dot-neutral { background: #a1a1aa; }
        .rc-view-btn { width: 100%; padding: 10px 0; font-size: 13px; font-weight: 600; color: #6d28d9; background: #faf8ff; border: 1px solid #ede9fe; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease; margin-top: auto; letter-spacing: 0.01em; }
        .rc-view-btn:hover { background: #f5f3ff; border-color: #ddd6fe; color: #5b21b6; }
        .rc-view-btn .rc-arrow { transition: transform 0.2s; }
        .rc-view-btn:hover .rc-arrow { transform: translateX(3px); }
        .rc-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; }
        .rc-tag { font-size: 11px; font-weight: 700; padding: 0; border: none; display: inline-flex; align-items: center; gap: 4px; background: none; }
        .rc-tag-green { color: #16a34a; } .rc-tag-red { color: #dc2626; } .rc-tag-amber { color: #d97706; } .rc-tag-orange { color: #e11d48; } .rc-tag-purple { color: #4f46e5; } .rc-tag-neutral { color: #71717a; }
        .rc-trust-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; padding: 0; margin-bottom: 12px; border: none; background: none; }
        .rc-trust-high { color: #16a34a; } .rc-trust-mid { color: #d97706; } .rc-trust-low { color: #dc2626; } .rc-trust-review { color: #d97706; }
        .rc-esc-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; padding: 0; margin-bottom: 12px; background: none; color: #dc2626; border: none; cursor: help; position: relative; }
        .rc-esc-tooltip { display: none; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) translateY(100%); margin-top: 6px; background: #18181b; color: #fff; font-size: 10px; font-weight: 500; border-radius: 8px; padding: 8px 10px; width: 200px; z-index: 30; line-height: 1.5; }
        .rc-esc-pill:hover .rc-esc-tooltip { display: block; }
        .rc-ticket-btn { background: none; color: #4f46e5; border: none; font-size: 10px; font-weight: 700; padding: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px; transition: color 0.12s; }
        .rc-ticket-btn:hover { color: #4338ca; }
        .rc-ticket-dot { width: 6px; height: 6px; border-radius: 50%; background: #7c3aed; animation: ping 1.2s infinite; }
        @keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        .rc-top-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .rc-conf { font-size: 11px; font-weight: 600; }
        .rc-conf-green { color: #16a34a; } .rc-conf-amber { color: #d97706; } .rc-conf-red { color: #dc2626; }
        .rc-reanalyse { width: 28px; height: 28px; border-radius: 8px; background: #fafafa; border: 1px solid #f0f0f3; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; color: #a1a1aa; }
        .rc-reanalyse:hover { background: #f5f3ff; color: #6d28d9; border-color: #ede9fe; }
        .rc-console { background: #f9f9fb; border: 0.5px solid #e4e4e7; border-radius: 10px; padding: 12px; margin-top: 8px; transition: border-color 0.15s; }
        .rc-console:hover { border-color: #d4d4d8; }
        .rc-console-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 0.5px solid #e4e4e7; }
        .rc-console-label { font-size: 11px; font-weight: 700; color: #7c3aed; display: flex; align-items: center; gap: 5px; }
        .rc-console-controls { display: flex; align-items: center; gap: 6px; }
        .rc-tone-select { font-size: 10px; font-weight: 600; background: #fff; border: 0.5px solid #e4e4e7; border-radius: 6px; padding: 3px 6px; color: #52525b; outline: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.03em; }
        .rc-tone-select:disabled { opacity: 0.5; }
        .rc-edit-btn { padding: 3px; color: #a1a1aa; cursor: pointer; border: none; background: none; transition: color 0.12s; }
        .rc-edit-btn:hover { color: #7c3aed; }
        .rc-copy-btn { padding: 3px; color: #a1a1aa; cursor: pointer; border: none; background: none; transition: color 0.12s; display: flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 600; }
        .rc-copy-btn:hover { color: #534AB7; }
        .rc-copy-btn.copied { color: #16a34a; }
        .rc-proposal-box { background: #fff; border: 0.5px solid #e4e4e7; border-radius: 8px; padding: 10px 12px; min-height: 70px; font-size: 12px; color: #52525b; line-height: 1.6; font-style: italic; overflow-y: auto; }
        .rc-empty-draft { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 70px; background: #fff; border: 0.5px dashed #d4d4d8; border-radius: 8px; }
        .rc-empty-label { font-size: 10px; font-weight: 500; color: #a1a1aa; }
        .rc-gen-btn { font-size: 10px; font-weight: 600; background: transparent; color: #534AB7; border: 1px solid #534AB7; border-radius: 6px; padding: 4px 11px; cursor: pointer; transition: all 0.15s; }
        .rc-gen-btn:hover { background: #534AB7; color: #fff; }
        .rc-gen-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(1px); display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; z-index: 10; gap: 6px; }
        .rc-gen-overlay span { font-size: 10px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.06em; }
        .rc-edit-area { width: 100%; height: 110px; padding: 10px 12px; background: #fff; border: 1px solid #d4d4d8; border-radius: 8px; font-size: 12px; color: #18181b; line-height: 1.6; outline: none; resize: none; font-family: inherit; transition: border-color 0.12s; }
        .rc-edit-area:focus { border-color: #7c3aed; }
        .rc-edit-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px; }
        .rc-edit-cancel { font-size: 10px; font-weight: 600; color: #a1a1aa; background: none; border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-edit-save { font-size: 10px; font-weight: 600; background: #ede9fe; color: #534AB7; border: none; border-radius: 6px; padding: 4px 10px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .rc-console-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 0.5px solid #e4e4e7; }
        .rc-footer-links { display: flex; gap: 8px; align-items: center; }
        .rc-footer-link { font-size: 10px; font-weight: 600; color: #71717a; background: none; border: 1px solid #e4e4e7; cursor: pointer; padding: 4px 10px; border-radius: 7px; transition: all 0.12s; display: inline-flex; align-items: center; gap: 4px; }
        .rc-footer-link:hover { color: #52525b; background: #f4f4f5; }
        .rc-footer-link-danger { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
        .rc-footer-link-danger:hover { color: #dc2626; background: #fee2e2; }
        .rc-approve-btn { font-size: 10px; font-weight: 700; padding: 4px 11px; border-radius: 7px; border: 1px solid transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-approve-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .rc-approve-btn:not(:disabled):hover { transform: translateY(-1px); }
        .rc-approve-indigo { background: transparent; color: #534AB7; border-color: #534AB7; }
        .rc-approve-indigo:not(:disabled):hover { background: #534AB7; color: #fff; }
        .rc-approve-amber { background: transparent; color: #ef9f27; border-color: #ef9f27; }
        .rc-approve-amber:not(:disabled):hover { background: #ef9f27; color: #fff; }
        .rc-awaiting-badge { font-size: 10px; font-weight: 600; padding: 5px 10px; background: #FAEEDA; color: #854F0B; border-radius: 7px; border: 0.5px solid #FAC775; }
        .rc-reject-link { color: #e24b4a !important; } .rc-reject-link:hover { color: #A32D2D !important; }
        .rc-manual-section { margin-top: 12px; border-top: 0.5px solid #e4e4e7; padding-top: 12px; }
        .rc-manual-box { background: #FCEBEB; border: 0.5px dashed #F7C1C1; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
        .rc-manual-title { font-size: 10px; font-weight: 700; color: #A32D2D; text-transform: uppercase; letter-spacing: 0.05em; }
        .rc-manual-desc { font-size: 10px; color: #71717a; }
        .rc-manual-btn { font-size: 10px; font-weight: 700; background: #18181b; color: #fff; border: none; border-radius: 6px; padding: 5px 14px; cursor: pointer; margin-top: 4px; transition: background 0.12s; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-manual-btn:hover { background: #27272a; }
        .rc-responded { margin-top: 12px; padding: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; }
        .rc-responded-header { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
        .rc-responded-text { font-size: 12px; color: #166534; font-style: italic; line-height: 1.6; }
        .rc-responded-meta { margin-top: 6px; font-size: 10px; color: #22c55e; font-weight: 500; }
        .rc-notes-section { margin-top: 12px; border-top: 0.5px solid #e4e4e7; padding-top: 12px; }
        .rc-notes-header { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
        .rc-note-item { padding: 10px 12px; background: #f9f9fb; border: 0.5px solid #e4e4e7; border-radius: 8px; margin-bottom: 6px; }
        .rc-note-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .rc-note-author { font-size: 10px; font-weight: 700; color: #18181b; text-transform: uppercase; }
        .rc-note-time { font-size: 9px; color: #a1a1aa; font-weight: 500; }
        .rc-note-text { font-size: 11px; color: #52525b; line-height: 1.55; }
        .rc-add-note { margin-top: 12px; padding: 14px; background: #f9f9fb; border: 0.5px solid #e4e4e7; border-radius: 10px; }
        .rc-note-textarea { width: 100%; padding: 10px 12px; font-size: 12px; background: #fff; border: 0.5px solid #d4d4d8; border-radius: 8px; outline: none; resize: none; font-family: inherit; line-height: 1.55; color: #18181b; transition: border-color 0.12s; }
        .rc-note-textarea:focus { border-color: #7c3aed; }
        .rc-note-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
        .rc-note-cancel { font-size: 10px; font-weight: 600; color: #a1a1aa; background: none; border: none; cursor: pointer; text-transform: uppercase; padding: 4px 0; }
        .rc-note-save { font-size: 10px; font-weight: 600; background: #534AB7; color: #fff; border: none; border-radius: 6px; padding: 5px 12px; cursor: pointer; }
        .rc-note-saved { font-size: 11px; font-weight: 600; color: #16a34a; display: flex; align-items: center; gap: 4px; }
        .rc-note-error { font-size: 10px; color: #dc2626; margin-top: 4px; }
        .rc-loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.75); backdrop-filter: blur(3px); z-index: 20; display: flex; align-items: center; justify-content: center; border-radius: 18px; flex-direction: column; gap: 10px; }
        .rc-loading-label { font-size: 12px; font-weight: 700; color: #52525b; }
      `}</style>

      <div
        id={review.review_id}
        className={`rc-card ${highlight ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
        onClick={(e) => {
          if (e.target.closest("button, select, textarea, input, a, .rc-tone-dropdown")) return;
          navigate(`/reviews/${review.review_id}`);
        }}
        style={{ cursor: "pointer" }}
      >
        {/* Loading overlay */}
        {loadingAI && (
          <div className="rc-loading-overlay">
            <Loader2 className="animate-spin" size={28} color="#7c3aed" />
            <span className="rc-loading-label">Re-analysing\u2026</span>
          </div>
        )}

        {/* Header */}
        <div className="rc-header">
          <div className="rc-header-left">
            <div className="rc-avatar" style={{ background: avatarColor.bg, color: avatarColor.text }}>
              {getInitials(review.reviewer_name)}
              <div className={`rc-plat-badge ${getPlatformBadge(review.platform).bg}`}>
                {getPlatformBadge(review.platform).icon}
              </div>
            </div>
            <div className="rc-header-info">
              <div className="rc-name-row">
                <span className="rc-name">{review.reviewer_name}</span>
                {review.hotel_name && <span className="rc-hotel-chip">{review.hotel_name}</span>}
              </div>
              <div className="rc-meta-row">
                <span className="rc-meta-text">
                  {review.platform} &middot; {isNaN(Date.parse(review.review_date)) ? review.review_date : new Date(review.review_date).toLocaleDateString()}
                </span>
              </div>
              <div className="rc-stars-row">
                {[...Array(starCount)].map((_, i) => (
                  <Star
                    key={i}
                    size={starCount === 10 ? 10 : 13}
                    className={i < filledCount ? "rc-star-fill" : "rc-star-empty"}
                    fill={i < filledCount ? "currentColor" : "none"}
                    strokeWidth={i < filledCount ? 0 : 2}
                  />
                ))}
                <span className="rc-rating-chip">{displayRaw}/{displayScale}</span>
              </div>
            </div>
          </div>
          <div className="rc-header-right">
            {(review.status === "ESCALATED" || review.escalation) && (
              <span className="rc-status-pill rc-pill-escalated"><AlertTriangle size={10} /> ESCALATED</span>
            )}
            {review.is_suspicious && (
              <span className="rc-status-pill rc-pill-suspicious"><AlertCircle size={10} /> SUSPICIOUS</span>
            )}
            {review.status === "RESPONDED" && (
              <span className="rc-status-pill rc-pill-responded"><CheckCircle2 size={10} /> RESPONDED</span>
            )}
          </div>
        </div>

        {/* Guest Metadata */}
        {(review.country || review.room_type || review.traveler_type) && (
          <div className="rc-guest-meta">
            {review.country && <span>{review.country}</span>}
            {review.room_type && <span>{review.room_type}</span>}
            {review.traveler_type && <span>{review.traveler_type}</span>}
            {review.stay_duration && <span>{review.stay_duration}</span>}
          </div>
        )}

        {/* Review Quote */}
        <div className="rc-quote" style={{
          maxHeight: 90, overflowY: "auto",
        }}>
          {review.review_text}
        </div>

        {/* AI Insights */}
        {(review.sentiment || review.primary_department || review.urgency) && (
          <div className="rc-insights">
            {review.sentiment && (
              <div className="rc-insight-cell">
                <span className="rc-insight-label">Sentiment</span>
                <span className="rc-insight-value" style={{
                  color: review.sentiment === "Positive" ? "#16a34a" : review.sentiment === "Negative" ? "#dc2626" : "#d97706"
                }}>
                  <span className={`rc-dot ${review.sentiment === "Positive" ? "rc-dot-green" : review.sentiment === "Negative" ? "rc-dot-red" : "rc-dot-amber"}`} />
                  {review.sentiment}
                </span>
              </div>
            )}
            {review.primary_department && (
              <div className="rc-insight-cell">
                <span className="rc-insight-label">Department</span>
                <span className="rc-insight-value" style={{ color: "#4f46e5" }}>{review.primary_department}</span>
              </div>
            )}
            {review.urgency && review.urgency !== "None" && (
              <div className="rc-insight-cell">
                <span className="rc-insight-label">Urgency</span>
                <span className="rc-insight-value" style={{
                  color: review.urgency === "High" ? "#dc2626" : review.urgency === "Low" ? "#16a34a" : "#d97706"
                }}>
                  <span className={`rc-dot ${review.urgency === "High" ? "rc-dot-red" : review.urgency === "Low" ? "rc-dot-green" : "rc-dot-amber"}`} />
                  {review.urgency}
                </span>
              </div>
            )}
            {(review.status === "Pending AI" || review.status === "Pending") && (
              <div className="rc-insight-cell">
                <span className="rc-insight-label">Status</span>
                <span className="rc-insight-value" style={{ color: "#a1a1aa" }}>Pending</span>
              </div>
            )}
          </div>
        )}

        {/* View Review Button */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/reviews/${review.review_id}`); }}
          className="rc-view-btn"
        >
          View Review <span className="rc-arrow" style={{ fontSize: 14 }}>&rarr;</span>
        </button>
      </div>
    </>
  );
};

export default ReviewCard;