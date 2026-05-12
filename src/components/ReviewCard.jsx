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
  History,
  AlertCircle,
  Info
} from "lucide-react";
import { generateResponse } from "../utils/aiResponseGenerator";
import {
  approveResponse,
  reanalyseReview,
  updateClassification,
  addReviewNote
} from "../api/apiClient";
import { classifyReview } from "../utils/aiClassifier";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";

const ReviewCard = ({ review, highlight, onFlag, onSimilar, onHistory }) => {
  const { state, dispatch } = useAppContext();
  const { currentUser } = useAuth();
  const [loadingAI, setLoadingAI] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tone, setTone] = useState(review.response_tone || (review.escalation_risk ? "Escalation" : (state.hotelConfig?.default_response_tone || "Formal")));
  const [proposal, setProposal] = useState(review.response_text || "");
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState("");
  const editRef = useRef(null);

  // Auto-generate if missing
  useEffect(() => {
    if (!review.response_text && !proposal && !isGenerating && (review.status === "Classified" || review.status === "Approved" || review.status === "Pending AI")) {
      handleGenerate(tone);
    }
  }, [review.review_id, review.status]);

  const handleGenerate = async (selectedTone) => {
    setTone(selectedTone);
    setIsGenerating(true);
    try {
      console.log(`[Groq] Generating response for review_id: ${review.review_id}, tone: ${selectedTone}`);
      const text = await generateResponse(review, selectedTone, state.hotelConfig);
      setProposal(text);
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await approveResponse(review.review_id, {
        response_text: proposal,
        response_tone: tone,
        approved_by: currentUser?.name || "Staff"
      });

      dispatch({
        type: "APPROVE_RESPONSE",
        payload: {
          review_id: review.review_id,
          response_text: res.data.response_text,
          response_tone: res.data.response_tone,
          approved_by: res.data.approved_by,
          approved_at: res.data.approved_at,
          version_history: res.data.response_history
        }
      });
    } catch (err) {
      alert("Failed to approve: " + err.message);
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
        handleGenerate(tone);
      }
    } catch (err) {
      alert("Re-analysis failed — try again");
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

  const getEmotionStyles = (emotion) => {
    const mapping = {
      Angry: "bg-red-100 text-red-800",
      Frustrated: "bg-orange-100 text-orange-800",
      Disappointed: "bg-amber-100 text-amber-800",
      Neutral: "bg-slate-100 text-slate-700",
      Satisfied: "bg-green-100 text-green-700",
      Delighted: "bg-emerald-100 text-emerald-800",
      Concerned: "bg-yellow-100 text-yellow-800",
      Anxious: "bg-purple-100 text-purple-800"
    };
    return mapping[emotion] || "bg-slate-100 text-slate-600";
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 75) return "text-slate-500";
    if (conf >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div
      id={review.review_id}
      className={`glass-card p-6 border-l-4 transition-all relative group/card ${highlight ? "ring-2 ring-indigo-500 ring-offset-2" : ""} ${review.needs_human_review ? "border-l-[#F59E0B]" : review.rating >= 4 ? "border-l-green-500" : review.rating === 3 ? "border-l-amber-500" : "border-l-red-500"}`}
      style={review.needs_human_review ? { borderLeft: "3px solid #F59E0B" } : {}}
    >
      {loadingAI && (
        <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-3xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <span className="text-sm font-bold text-slate-600">Re-analysing…</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} />
            ))}
          </div>
          <span className="text-sm font-bold text-slate-900">{review.reviewer_name}</span>
          <span className="text-xs text-slate-500">{review.platform} • {new Date(review.review_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-bold ${getConfidenceColor(review.confidence)}`}>
            Confidence: {review.confidence ?? "--"}%
          </span>
          <button
            onClick={handleReanalyse}
            title="Re-analyse with AI"
            className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-full transition-all"
          >
            <RefreshCcw size={14} className={loadingAI ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-slate-700 leading-relaxed italic">"{review.review_text}"</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {review.sentiment && (
          <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${review.sentiment === "Positive" ? "bg-green-100 text-green-700" : review.sentiment === "Negative" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
            {review.sentiment}
          </span>
        )}
        {review.primary_department && (
          <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase">
            {review.primary_department}
          </span>
        )}
        {review.urgency && review.urgency !== "None" && (
          <span className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase ${review.urgency === "High" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-700"}`}>
            {review.urgency}
          </span>
        )}
        {review.guest_emotion && (
          <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${getEmotionStyles(review.guest_emotion)}`}>
            {review.guest_emotion}
          </span>
        )}
      </div>

      {review.needs_human_review && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] rounded text-[11px] font-bold">
            <AlertCircle size={12} /> Needs Human Review
          </span>
        </div>
      )}

      {review.escalation_risk && (
        <div className="relative group/tooltip inline-block mb-4">
          <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-help">ESCALATION RISK</span>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 hidden group-hover/tooltip:block z-30 w-52 p-3 bg-slate-800 text-white text-[11px] rounded-xl shadow-xl">
            {review.escalation_reason || "Escalation risk detected by AI"}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 bg-slate-800 w-2 h-2 rotate-45"></div>
          </div>
        </div>
      )}

      {/* AI Proposal Section */}
      {review.status !== "Approved" && !review.is_suspicious && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
              <MessageSquare size={14} />
              AI PROPOSAL
            </div>
            <div className="flex items-center gap-2">
              <select
                disabled={isGenerating}
                value={tone}
                onChange={(e) => handleGenerate(e.target.value)}
                className="text-[10px] font-black bg-slate-50 border-none rounded-lg focus:ring-0 cursor-pointer disabled:opacity-50"
              >
                <option>Formal</option>
                <option>Empathetic</option>
                <option>Apologetic</option>
                <option>Promotional</option>
                <option>Escalation</option>
              </select>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            {isGenerating && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10 gap-2">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Generating...</span>
              </div>
            )}

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  ref={editRef}
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  className="w-full h-32 p-4 bg-white border-2 border-indigo-100 rounded-xl text-sm focus:ring-0 outline-none transition-all resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase">Cancel</button>
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase flex items-center gap-1"><Check size={12} /> Save Edit</button>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 italic overflow-y-auto">
                {proposal || "Waiting for generation..."}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-4">
              <button onClick={() => onFlag(review)} className="text-[10px] font-bold text-slate-400 hover:text-red-600 transition-colors uppercase">FLAG REVIEW</button>
              {/* <button onClick={() => onSimilar(review)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase">SIMILAR COMPLAINTS</button> */}
              <button onClick={() => setIsAddingNote(!isAddingNote)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase">ADD NOTE {review.internal_notes?.length > 0 && `(${review.internal_notes.length})`}</button>
            </div>
            <button
              onClick={handleApprove}
              disabled={isGenerating || !proposal}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> APPROVE & POST
            </button>
          </div>

          {isAddingNote && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
              <textarea
                rows="3"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note about this review..."
                className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {noteError && <p className="text-red-500 text-[10px] mt-1">{noteError}</p>}
              <div className="flex justify-end gap-2 mt-2">
                {noteSaved ? (
                  <span className="text-green-600 text-xs font-bold flex items-center gap-1 animate-in fade-in">Note saved ✓</span>
                ) : (
                  <>
                    <button onClick={() => setIsAddingNote(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 uppercase">Cancel</button>
                    <button onClick={handleSaveNote} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase">Save Note</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {review.status === "Approved" && (
        <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-xl relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-green-700 font-bold text-xs">
              <CheckCircle2 size={14} /> POSTED RESPONSE ({review.response_tone})
            </div>
          </div>
          <p className="text-sm text-green-800 italic">"{review.response_text}"</p>
          <div className="mt-2 text-[10px] text-green-600/70 font-medium">Approved by {review.approved_by} on {new Date(review.approved_at).toLocaleString()}</div>
        </div>
      )}

      {/* Internal Notes Feed */}
      {review.internal_notes?.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">
            <Info size={12} /> Internal Notes
          </div>
          {review.internal_notes.map((note, idx) => (
            <div key={idx} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 group/note relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-slate-900 uppercase">{note.author}</span>
                <span className="text-[9px] font-bold text-slate-400">{new Date(note.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{note.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
