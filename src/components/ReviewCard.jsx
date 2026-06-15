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
  const { state, dispatch } = useAppContext();
  const { currentUser } = useAuth();
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
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: { type: "success", message: `Assigned to ${selectedStaff.name}`, created_at: Date.now() }
      });
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
      dispatch({ type: "ADD_NOTIFICATION", payload: { type: "error", message: `AI draft generation failed: ${err.message}`, created_at: Date.now(), read: false } });
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
        dispatch({
          type: "ADD_NOTIFICATION", payload: {
            type: "success",
            message: `Response posted for ${review.reviewer_name}`,
            created_at: Date.now()
          }
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
        dispatch({ type: "ADD_NOTIFICATION", payload: { type: "error", message: `Re-analysis returned no results for ${review.reviewer_name}`, created_at: Date.now(), read: false } });
      }
    } catch (err) {
      console.error("Re-analysis failed:", err);
      dispatch({ type: "ADD_NOTIFICATION", payload: { type: "error", message: `Re-analysis failed: ${err.message}`, created_at: Date.now(), read: false } });
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
      setNoteError("Failed to save note — try again");
    }
  };

  const handleCopy = () => {
    if (!proposal) return;
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const conf = review.confidence;
  const isClassified = !["NEW", "Pending AI"].includes(review.status);
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
      case "tripadvisor": return { bg: "rc-plat-ta", icon: "T" };
      case "agoda": return { bg: "rc-plat-agoda", icon: "A" };
      default: return { bg: "rc-plat-default", icon: "R" };
    }
  };

  // Avatar color palette — deterministic hash from name
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

  // Border color based on sentiment (primary), then confidence
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
  const filledCount = displayScale === 10 ? Math.round(Math.round(displayRaw) / 2) : Math.round(displayRaw);

  return (
    <>
      {/* Scoped styles injected once — idempotent via id check */}
      <style id="rc-styles">{`
        .rc-card {
          background: #ffffff;
          border: 0.5px solid #e4e4e7;
          border-radius: 14px;
          padding: 20px;
          position: relative;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
          display: flex;
          flex-direction: column;
        }
        .rc-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
          transform: translateY(-1px);
        }
        .rc-border-red  { border-left: 3px solid #e24b4a; border-radius: 0 14px 14px 0; }
        .rc-border-amber{ border-left: 3px solid #ef9f27; border-radius: 0 14px 14px 0; }
        .rc-border-green{ border-left: 3px solid #639922; border-radius: 0 14px 14px 0; }

        /* Checkbox */
        .rc-checkbox {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 10;
          cursor: pointer;
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid #d4d4d8;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.12s;
          opacity: 0;
        }
        .rc-card:hover .rc-checkbox,
        .rc-checkbox.is-selected { opacity: 1; }
        .rc-checkbox.is-selected { background: #534AB7; border-color: #534AB7; color: #fff; }

        /* Top row */
        .rc-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
        .rc-avatar-wrap { display: flex; align-items: flex-start; gap: 10px; }
        .rc-avatar {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 12px;
          position: relative; flex-shrink: 0;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .rc-plat-badge {
          position: absolute; bottom: -4px; right: -4px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #fff; border: 1.5px solid #e4e4e7;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; z-index: 2;
        }
        .rc-plat-google  { color: #dc2626; }
        .rc-plat-booking { color: #2563eb; }
        .rc-plat-ta      { color: #059669; }
        .rc-plat-agoda   { color: #7c3aed; }
        .rc-plat-default { color: #71717a; }

        .rc-name { font-size: 13px; font-weight: 600; color: #18181b; line-height: 1.2; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .rc-meta { font-size: 11px; color: #a1a1aa; margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .rc-status-micro { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
        .rc-status-escalated { background: #fef3c7; color: #92400e; }
        .rc-status-suspicious { background: #fee2e2; color: #991b1b; }
        .rc-stars { display: flex; align-items: center; gap: 3px; margin-top: 5px; }
        .rc-star-fill { color: #e8c13a; }
        .rc-star-empty { color: #d4d4d8; }
        .rc-rating-chip {
          font-size: 10px; font-weight: 500; color: #71717a;
          background: #f4f4f5; border: 0.5px solid #e4e4e7;
          border-radius: 5px; padding: 1px 5px; margin-left: 3px;
        }
        .rc-hotel-chip {
          background: #EEEDFE; color: #534AB7; border: 0.5px solid #CECBF6;
          font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 5px;
        }

        /* Right side of top row */
        .rc-top-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .rc-conf { font-size: 11px; font-weight: 600; }
        .rc-conf-green { color: #3B6D11; }
        .rc-conf-amber { color: #854F0B; }
        .rc-conf-red   { color: #A32D2D; }
        .rc-reanalyse {
          width: 26px; height: 26px; border-radius: 8px;
          background: #f4f4f5; border: 0.5px solid #e4e4e7;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.12s, color 0.12s; color: #71717a;
        }
        .rc-reanalyse:hover { background: #ede9fe; color: #534AB7; }

        /* Review text */
        .rc-review-text {
          font-size: 12.5px; color: #52525b; line-height: 1.65;
          font-style: italic; margin-bottom: 14px;
          background: #f9f9fb; border: 0.5px solid #e4e4e7;
          border-radius: 8px; padding: 10px 12px;
        }

        /* Tags */
        .rc-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
        .rc-tag {
          font-size: 10px; font-weight: 600; padding: 3px 8px;
          border-radius: 6px; border: 0.5px solid; display: inline-flex; align-items: center; gap: 4px;
        }
        .rc-tag-green  { background: #EAF3DE; color: #3B6D11; border-color: #C0DD97; }
        .rc-tag-red    { background: #FCEBEB; color: #A32D2D; border-color: #F7C1C1; }
        .rc-tag-amber  { background: #FAEEDA; color: #854F0B; border-color: #FAC775; }
        .rc-tag-orange { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
        .rc-tag-purple { background: #EEEDFE; color: #534AB7; border-color: #CECBF6; }
        .rc-tag-neutral{ background: #f4f4f5; color: #52525b; border-color: #e4e4e7; }
        .rc-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .rc-dot-green  { background: #639922; }
        .rc-dot-red    { background: #e24b4a; }
        .rc-dot-neutral{ background: #a1a1aa; }

        /* Trust pills */
        .rc-trust-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 600; padding: 3px 8px;
          border-radius: 6px; margin-bottom: 12px; border: 0.5px solid;
        }
        .rc-trust-high   { background: #EAF3DE; color: #3B6D11; border-color: #C0DD97; }
        .rc-trust-mid    { background: #FAEEDA; color: #854F0B; border-color: #FAC775; }
        .rc-trust-low    { background: #FCEBEB; color: #A32D2D; border-color: #F7C1C1; }
        .rc-trust-review { background: #FAEEDA; color: #854F0B; border-color: #FAC775; }
        .rc-esc-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 600; padding: 3px 8px;
          border-radius: 6px; margin-bottom: 12px;
          background: #FCEBEB; color: #A32D2D; border: 0.5px solid #F7C1C1;
          cursor: help; position: relative;
        }
        .rc-esc-tooltip {
          display: none; position: absolute; bottom: 0; left: 50%;
          transform: translateX(-50%) translateY(100%);
          margin-top: 6px;
          background: #18181b; color: #fff;
          font-size: 10px; font-weight: 500; border-radius: 8px;
          padding: 8px 10px; width: 200px; z-index: 30;
          line-height: 1.5;
        }
        .rc-esc-pill:hover .rc-esc-tooltip { display: block; }

        /* Linked ticket */
        .rc-ticket-btn {
          background: #EEEDFE; color: #534AB7; border: 0.5px solid #CECBF6;
          font-size: 10px; font-weight: 600; padding: 4px 10px;
          border-radius: 20px; cursor: pointer; display: inline-flex;
          align-items: center; gap: 6px; margin-bottom: 12px;
          transition: background 0.12s;
        }
        .rc-ticket-btn:hover { background: #CECBF6; }
        .rc-ticket-dot { width: 6px; height: 6px; border-radius: 50%; background: #7c3aed; animation: ping 1.2s infinite; }
        @keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }

        /* AI console */
        .rc-console {
          background: #f9f9fb; border: 0.5px solid #e4e4e7;
          border-radius: 10px; padding: 12px; margin-top: 8px;
          transition: border-color 0.15s;
        }
        .rc-console:hover { border-color: #d4d4d8; }
        .rc-console-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px; padding-bottom: 8px;
          border-bottom: 0.5px solid #e4e4e7;
        }
        .rc-console-label {
          font-size: 11px; font-weight: 700; color: #7c3aed;
          display: flex; align-items: center; gap: 5px;
        }
        .rc-console-controls { display: flex; align-items: center; gap: 6px; }
        .rc-tone-select {
          font-size: 10px; font-weight: 600;
          background: #fff; border: 0.5px solid #e4e4e7;
          border-radius: 6px; padding: 3px 6px;
          color: #52525b; outline: none; cursor: pointer;
          text-transform: uppercase; letter-spacing: 0.03em;
        }
        .rc-tone-select:disabled { opacity: 0.5; }
        .rc-edit-btn { padding: 3px; color: #a1a1aa; cursor: pointer; border: none; background: none; transition: color 0.12s; }
        .rc-edit-btn:hover { color: #7c3aed; }
        .rc-copy-btn { padding: 3px; color: #a1a1aa; cursor: pointer; border: none; background: none; transition: color 0.12s; display: flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 600; }
        .rc-copy-btn:hover { color: #534AB7; }
        .rc-copy-btn.copied { color: #3B6D11; }

        /* Proposal box */
        .rc-proposal-box {
          background: #fff; border: 0.5px solid #e4e4e7;
          border-radius: 8px; padding: 10px 12px;
          min-height: 70px; font-size: 12px;
          color: #52525b; line-height: 1.6; font-style: italic;
          overflow-y: auto;
        }
        .rc-empty-draft {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 8px; min-height: 70px;
          background: #fff; border: 0.5px dashed #d4d4d8;
          border-radius: 8px;
        }
        .rc-empty-label { font-size: 10px; font-weight: 500; color: #a1a1aa; }
        .rc-gen-btn {
          font-size: 10px; font-weight: 600; background: transparent;
          color: #534AB7; border: 1px solid #534AB7; border-radius: 6px;
          padding: 4px 11px; cursor: pointer; transition: all 0.15s;
        }
        .rc-gen-btn:hover { background: #534AB7; color: #fff; }

        /* Generating overlay */
        .rc-gen-overlay {
          position: absolute; inset: 0; background: rgba(255,255,255,0.8);
          backdrop-filter: blur(1px); display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          border-radius: 8px; z-index: 10; gap: 6px;
        }
        .rc-gen-overlay span { font-size: 10px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.06em; }

        /* Editing textarea */
        .rc-edit-area {
          width: 100%; height: 110px; padding: 10px 12px;
          background: #fff; border: 1px solid #d4d4d8;
          border-radius: 8px; font-size: 12px; color: #18181b;
          line-height: 1.6; outline: none; resize: none;
          font-family: inherit; transition: border-color 0.12s;
        }
        .rc-edit-area:focus { border-color: #7c3aed; }
        .rc-edit-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px; }
        .rc-edit-cancel { font-size: 10px; font-weight: 600; color: #a1a1aa; background: none; border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-edit-save {
          font-size: 10px; font-weight: 600; background: #ede9fe;
          color: #534AB7; border: none; border-radius: 6px;
          padding: 4px 10px; cursor: pointer; display: flex; align-items: center; gap: 4px;
        }

        /* Console footer */
        .rc-console-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 10px; padding-top: 8px;
          border-top: 0.5px solid #e4e4e7;
        }
        .rc-footer-links { display: flex; gap: 8px; align-items: center; }
        .rc-footer-link {
          font-size: 10px; font-weight: 600; color: #71717a;
          background: none; border: 1px solid #e4e4e7; cursor: pointer;
          padding: 4px 10px; border-radius: 7px;
          transition: all 0.12s; display: inline-flex; align-items: center; gap: 4px;
        }
        .rc-footer-link:hover { color: #52525b; background: #f4f4f5; }
        .rc-footer-link-danger { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
        .rc-footer-link-danger:hover { color: #dc2626; background: #fee2e2; }

        /* Action buttons */
        .rc-approve-btn {
          font-size: 10px; font-weight: 700; padding: 4px 11px;
          border-radius: 7px; border: 1px solid transparent; cursor: pointer;
          display: inline-flex; align-items: center; gap: 5px;
          transition: all 0.15s;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .rc-approve-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .rc-approve-btn:not(:disabled):hover { transform: translateY(-1px); }
        .rc-approve-indigo { background: transparent; color: #534AB7; border-color: #534AB7; }
        .rc-approve-indigo:not(:disabled):hover { background: #534AB7; color: #fff; }
        .rc-approve-amber  { background: transparent; color: #ef9f27; border-color: #ef9f27; }
        .rc-approve-amber:not(:disabled):hover { background: #ef9f27; color: #fff; }
        .rc-awaiting-badge {
          font-size: 10px; font-weight: 600; padding: 5px 10px;
          background: #FAEEDA; color: #854F0B;
          border-radius: 7px; border: 0.5px solid #FAC775;
        }
        .rc-reject-link { color: #e24b4a !important; }
        .rc-reject-link:hover { color: #A32D2D !important; }

        /* Manual draft area */
        .rc-manual-section {
          margin-top: 12px; border-top: 0.5px solid #e4e4e7;
          padding-top: 12px;
        }
        .rc-manual-box {
          background: #FCEBEB; border: 0.5px dashed #F7C1C1;
          border-radius: 10px; padding: 16px;
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; text-align: center;
        }
        .rc-manual-title { font-size: 10px; font-weight: 700; color: #A32D2D; text-transform: uppercase; letter-spacing: 0.05em; }
        .rc-manual-desc  { font-size: 10px; color: #71717a; }
        .rc-manual-btn {
          font-size: 10px; font-weight: 700; background: #18181b;
          color: #fff; border: none; border-radius: 6px;
          padding: 5px 14px; cursor: pointer; margin-top: 4px;
          transition: background 0.12s; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .rc-manual-btn:hover { background: #27272a; }

        /* Responded banner */
        .rc-responded {
          margin-top: 12px; padding: 14px;
          background: #EAF3DE; border: 0.5px solid #C0DD97;
          border-radius: 10px;
        }
        .rc-responded-header {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 700; color: #3B6D11;
          text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px;
        }
        .rc-responded-text { font-size: 12px; color: #3B6D11; font-style: italic; line-height: 1.6; }
        .rc-responded-meta { margin-top: 6px; font-size: 10px; color: #639922; font-weight: 500; }

        /* Notes */
        .rc-notes-section { margin-top: 12px; border-top: 0.5px solid #e4e4e7; padding-top: 12px; }
        .rc-notes-header { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
        .rc-note-item { padding: 10px 12px; background: #f9f9fb; border: 0.5px solid #e4e4e7; border-radius: 8px; margin-bottom: 6px; }
        .rc-note-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .rc-note-author { font-size: 10px; font-weight: 700; color: #18181b; text-transform: uppercase; }
        .rc-note-time   { font-size: 9px; color: #a1a1aa; font-weight: 500; }
        .rc-note-text   { font-size: 11px; color: #52525b; line-height: 1.55; }

        /* Add note panel */
        .rc-add-note {
          margin-top: 12px; padding: 14px;
          background: #f9f9fb; border: 0.5px solid #e4e4e7;
          border-radius: 10px;
        }
        .rc-note-textarea {
          width: 100%; padding: 10px 12px; font-size: 12px;
          background: #fff; border: 0.5px solid #d4d4d8;
          border-radius: 8px; outline: none; resize: none;
          font-family: inherit; line-height: 1.55; color: #18181b;
          transition: border-color 0.12s;
        }
        .rc-note-textarea:focus { border-color: #7c3aed; }
        .rc-note-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
        .rc-note-cancel { font-size: 10px; font-weight: 600; color: #a1a1aa; background: none; border: none; cursor: pointer; text-transform: uppercase; padding: 4px 0; }
        .rc-note-save { font-size: 10px; font-weight: 600; background: #534AB7; color: #fff; border: none; border-radius: 6px; padding: 5px 12px; cursor: pointer; }
        .rc-note-saved { font-size: 11px; font-weight: 600; color: #3B6D11; display: flex; align-items: center; gap: 4px; }
        .rc-note-error { font-size: 10px; color: #A32D2D; margin-top: 4px; }

        /* Loading overlay */
        .rc-loading-overlay {
          position: absolute; inset: 0;
          background: rgba(249,249,251,0.7); backdrop-filter: blur(2px);
          z-index: 20; display: flex; align-items: center; justify-content: center;
          border-radius: 14px; flex-direction: column; gap: 10px;
        }
        .rc-loading-label { font-size: 12px; font-weight: 700; color: #52525b; }
      `}</style>

      <div
        id={review.review_id}
        className={`rc-card ${highlight ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
      >
        {/* Loading overlay */}
        {loadingAI && (
          <div className="rc-loading-overlay">
            <Loader2 className="animate-spin" size={28} color="#7c3aed" />
            <span className="rc-loading-label">Re-analysing…</span>
          </div>
        )}

        {/* Checkbox */}
        {/* <div
          onClick={(e) => { e.stopPropagation(); onSelect(review.review_id); }}
          className={`rc-checkbox ${isSelected ? "is-selected" : ""}`}
        >
          {isSelected && <Check size={10} strokeWidth={4} />}
        </div> */}

        {/* ─── Top Row ─── */}
        <div className="rc-top">
          <div className="rc-avatar-wrap">
            <div className="rc-avatar" style={{ background: avatarColor.bg, color: avatarColor.text }}>
              {getInitials(review.reviewer_name)}
              <div className={`rc-plat-badge ${getPlatformBadge(review.platform).bg}`}>
                {getPlatformBadge(review.platform).icon}
              </div>
            </div>

            <div>
              <div className="rc-name">
                {review.reviewer_name}
                {review.hotel_name && (
                  <span className="rc-hotel-chip">🏢 {review.hotel_name}</span>
                )}
              </div>
              <div className="rc-meta">
                <span>{review.platform} · {isNaN(Date.parse(review.review_date)) ? review.review_date : new Date(review.review_date).toLocaleDateString()}</span>
                {(review.status === "ESCALATED" || review.escalation) && (
                  <span className="rc-status-micro rc-status-escalated">Escalated</span>
                )}
                {review.is_suspicious && (
                  <span className="rc-status-micro rc-status-suspicious">Suspicious</span>
                )}
              </div>
              <div className="rc-stars">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < filledCount ? "rc-star-fill" : "rc-star-empty"}
                    fill={i < filledCount ? "currentColor" : "none"}
                    strokeWidth={i < filledCount ? 0 : 2}
                  />
                ))}
                <span className="rc-rating-chip">
                  {displayRaw}/{displayScale}
                </span>
              </div>
            </div>
          </div>

          <div className="rc-top-right">
            <span
              className={`rc-conf ${review.confidence != null ? getConfidenceColor(review.confidence) : ""}`}
              title={review.confidence != null ? `AI confidence: ${review.confidence}% — Higher means more reliable classification` : "AI classification pending"}
              style={{ cursor: "help" }}
            >
              {review.confidence != null ? <>AI {review.confidence}%</> : <span style={{ color: "#a1a1aa", fontSize: 10, fontWeight: 500 }}>Pending</span>}
            </span>
            <button
              onClick={handleReanalyse}
              title={loadingAI ? "Re-analysing…" : "Re-analyse with AI"}
              className="rc-reanalyse"
            >
              <RefreshCcw size={13} className={loadingAI ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ─── Review Text ─── */}
        <div className="rc-review-text">"{review.review_text}"</div>

        {/* ─── AI Failure Banner ─── */}
        {review.ai_error && (
          <div style={{
            padding: "12px 14px", marginBottom: 12,
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10
          }}>
            <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", margin: 0 }}>AI analysis failed</p>
              <p style={{ fontSize: 10, color: "#b91c1c", margin: "3px 0 0", lineHeight: 1.5 }}>{review.ai_error}</p>
            </div>
            <button
              onClick={handleReanalyse}
              disabled={loadingAI}
              style={{
                fontSize: 10, fontWeight: 600, color: "#dc2626",
                background: "none", border: "1px solid #fecaca",
                borderRadius: 6, padding: "3px 10px", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 4,
                whiteSpace: "nowrap"
              }}
            >
              {loadingAI ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              Retry
            </button>
          </div>
        )}

        {/* ─── Tags ─── */}
        <div className="rc-tags">
          {review.sentiment && (
            <span className={getSentimentClass(review.sentiment)}>
              <span className={`rc-dot ${getSentimentDot(review.sentiment)}`} />
              {review.sentiment}
            </span>
          )}
          {review.primary_department && (
            <span className="rc-tag rc-tag-purple">{review.primary_department}</span>
          )}
          {review.urgency && review.urgency !== "None" && (
            <span className={`rc-tag ${review.urgency === "High" ? "rc-tag-red" : review.urgency === "Low" ? "rc-tag-green" : "rc-tag-amber"}`}>
              {review.urgency} urgency
            </span>
          )}
          {review.guest_emotion && (
            <span className={getEmotionStyles(review.guest_emotion)}>{review.guest_emotion}</span>
          )}
        </div>

        {/* ─── Linked Ticket ─── */}
        {review.linked_ticket_id && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/tickets?highlight=${review.linked_ticket_id}`); }}
            className="rc-ticket-btn"
          >
            <span className="rc-ticket-dot" />
            Linked ticket: {review.linked_ticket_id.slice(-6).toUpperCase()}
          </button>
        )}

        {/* ─── Trust / Confidence Pills ─── */}
        {/* {isHighConfidence && (
          <span className="rc-trust-pill rc-trust-high">
            <ShieldCheck size={11} /> High trust analysis
          </span>
        )}
        {isMediumConfidence && (
          <span className="rc-trust-pill rc-trust-mid">
            <AlertCircle size={11} /> Medium confidence
          </span>
        )}
        {isLowConfidence && (
          <span className="rc-trust-pill rc-trust-low">
            <AlertTriangle size={11} /> Review required
          </span>
        )} */}
        {review.needs_human_review && !isLowConfidence && !isMediumConfidence && (
          <span
            className="rc-trust-pill rc-trust-review"
            title={review.human_review_reason || "AI flagged this review for manual review due to mixed signals or edge-case classification"}
            style={{ cursor: "help" }}
          >
            <AlertCircle size={11} /> Needs human review
          </span>
        )}

        {/* ─── Escalation Risk ─── */}
        {review.escalation_risk && (
          <span className="rc-esc-pill">
            <AlertTriangle size={11} /> Escalation risk
            <span className="rc-esc-tooltip">
              {review.escalation_reason || "Escalation risk detected by AI"}
            </span>
          </span>
        )}

        {/* ─── AI Proposal Console ─── */}
        {review.status !== "RESPONDED" && (!isLowConfidence || isEditing || proposal) && (
          <div className="rc-console">
            <div className="rc-console-header">
              <span className="rc-console-label">
                <MessageSquare size={12} />
                {isLowConfidence ? "Manual draft" : "AI Proposal"}
              </span>
              <div className="rc-console-controls">
                {!isLowConfidence && (
                  <select
                    disabled={isGenerating}
                    value={tone}
                    onChange={(e) => handleGenerate(e.target.value)}
                    className="rc-tone-select"
                  >
                    <option>Formal</option>
                    <option>Empathetic</option>
                    <option>Apologetic</option>
                    <option>Promotional</option>
                    <option>Escalation</option>
                  </select>
                )}
                {!isEditing && proposal && (
                  <button onClick={handleCopy} className={`rc-copy-btn${copied ? " copied" : ""}`} title="Copy response">
                    {copied ? <><Check size={12} strokeWidth={3} />Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                )}
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="rc-edit-btn" title="Edit response draft">
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ position: "relative" }}>
              {isGenerating && (
                <div className="rc-gen-overlay">
                  <Loader2 className="animate-spin" size={18} color="#7c3aed" />
                  <span>Generating…</span>
                </div>
              )}

              {isEditing ? (
                <div>
                  <textarea
                    autoFocus
                    ref={editRef}
                    value={proposal}
                    onChange={(e) => setProposal(e.target.value)}
                    className="rc-edit-area"
                  />
                  <div className="rc-edit-actions">
                    <button onClick={() => setIsEditing(false)} className="rc-edit-cancel">Cancel</button>
                    <button onClick={() => setIsEditing(false)} className="rc-edit-save">
                      <Check size={11} strokeWidth={3} /> Save
                    </button>
                  </div>
                </div>
              ) : proposal ? (
                <div className="rc-proposal-box">"{proposal}"</div>
              ) : (
                <div className="rc-empty-draft">
                  <span className="rc-empty-label">No draft generated yet</span>
                  <button onClick={() => handleGenerate(tone)} disabled={isGenerating} className="rc-gen-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {isGenerating ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : "Generate AI draft"}
                  </button>
                </div>
              )}
            </div>

            <div className="rc-console-footer">
              <div className="rc-footer-links">
                {review.is_suspicious ? "" : <button onClick={() => onFlag(review)} className="rc-footer-link rc-footer-link-danger">
                  <Flag size={11} /> Flag
                </button>}

                {/* <button onClick={() => onSimilar(review)} className="rc-footer-link">
                  Similar issues
                </button> */}
                {review.status === "PENDING APPROVAL" && isApprover && (
                  <button onClick={handleReject} className="rc-footer-link rc-reject-link">
                    <X size={10} strokeWidth={3} style={{ display: "inline", marginRight: 2 }} />
                    Reject
                  </button>
                )}
              </div>

              {review.status === "PENDING APPROVAL" && !isApprover ? (
                <span className="rc-awaiting-badge">Awaiting approval</span>
              ) : (
                <button
                  onClick={handleApprove}
                  disabled={isGenerating || !proposal}
                  title={!proposal ? "Generate a draft first to enable approval" : ""}
                  className={`rc-approve-btn ${(isMediumConfidence || review.status === "PENDING APPROVAL" || !isApprover) ? "rc-approve-amber" : "rc-approve-indigo"}`}
                >
                  <CheckCircle2 size={12} />
                  {isApprover ? "Approve" : "Submit for approval"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Add Note Panel ─── */}
        {isAddingNote && (
          <div className="rc-add-note">
            <textarea
              rows="3"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note about this review…"
              className="rc-note-textarea"
            />
            {noteError && <p className="rc-note-error">{noteError}</p>}
            <div className="rc-note-actions">
              {noteSaved ? (
                <span className="rc-note-saved"><Check size={12} /> Note saved</span>
              ) : (
                <>
                  <button onClick={() => setIsAddingNote(false)} className="rc-note-cancel">Cancel</button>
                  <button onClick={handleSaveNote} className="rc-note-save">Save note</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Low Confidence Manual Prompt ─── */}
        {isLowConfidence && review.status !== "RESPONDED" && !isEditing && !proposal && (
          <div className="rc-manual-section">
            <div className="rc-manual-box">
              <Pencil size={18} color="#A32D2D" />
              <span className="rc-manual-title">Manual response required</span>
              <span className="rc-manual-desc">AI confidence is below the trust threshold. Please draft a response manually.</span>
              <button onClick={() => setIsEditing(true)} className="rc-manual-btn">
                Start drafting
              </button>
            </div>
          </div>
        )}

        {/* ─── Responded Banner ─── */}
        {review.status === "RESPONDED" && (
          <div className="rc-responded">
            <div className="rc-responded-header">
              <CheckCircle2 size={13} /> Posted response · {review.response_tone}
            </div>
            <p className="rc-responded-text">"{review.response_text}"</p>
            <p className="rc-responded-meta">
              Approved by {review.approved_by} on {new Date(review.approved_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* ─── Internal Notes Feed ─── */}
        {review.internal_notes?.length > 0 && (
          <div className="rc-notes-section">
            <div className="rc-notes-header">
              <Info size={11} /> Internal notes
            </div>
            {review.internal_notes.map((note, idx) => (
              <div key={idx} className="rc-note-item">
                <div className="rc-note-meta">
                  <span className="rc-note-author">{note.author}</span>
                  <span className="rc-note-time">
                    {new Date(note.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="rc-note-text">{note.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ReviewCard;