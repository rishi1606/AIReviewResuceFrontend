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
  Info,
  Users,
  RotateCcw
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateResponse } from "../utils/aiResponseGenerator";
import {
  approveResponse,
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
        payload: {
          type: "success",
          message: `Assigned to ${selectedStaff.name}`,
          created_at: Date.now()
        }
      });
    } catch (err) {
      alert("Assignment failed: " + err.message);
    }
  };

  // Disabling auto-generate on load as per user request
  // Use the tone dropdown or dedicated button to generate manually
  /*
  useEffect(() => {
    if (!review.response_text && !proposal && !isGenerating && (review.status === "Classified" || review.status === "Approved" || review.status === "Pending AI")) {
      handleGenerate(tone);
    }
  }, [review.review_id, review.status]);
  */

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

  const isApprover = currentUser?.role === "gm" || currentUser?.role === "dept_head" || currentUser?.role === "manager" || currentUser?.role === "superadmin";

  const handleApprove = async () => {
    // Staff always submits. Approvers always post. 
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
        handleGenerate(tone);
      }
    } catch (err) {
      alert("Re-analysis failed — try again");
    } finally {
      setLoadingAI(false);
    }
  };

  const navigate = useNavigate();

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
    if (conf >= confidenceThreshold) return "text-green-600";
    if (conf >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getStatusStyles = (status) => {
    const mapping = {
      "NEW": "bg-blue-100 text-blue-700 border-blue-200",
      "IN REVIEW": "bg-indigo-100 text-indigo-700 border-indigo-200",
      "PENDING APPROVAL": "bg-amber-100 text-amber-700 border-amber-200",
      "RESPONDED": "bg-green-100 text-green-700 border-green-200",
      "CLOSED": "bg-slate-100 text-slate-500 border-slate-200",
      "ESCALATED": "bg-red-100 text-red-700 border-red-200 animate-pulse",
      "PENDING APPROVAL": "bg-amber-100 text-amber-700 border-amber-200 font-black",
      // Legacy Mappings
      "Classified": "bg-indigo-100 text-indigo-700 border-indigo-200",
      "Approved": "bg-green-100 text-green-700 border-green-200",
      "Pending AI": "bg-blue-100 text-blue-700 border-blue-200",
      "Suspicious": "bg-red-100 text-red-700 border-red-200"
    };
    return mapping[status] || "bg-slate-100 text-slate-600 border-slate-200";
  };

  const conf = review.confidence;
  const isClassified = !["NEW", "Pending AI"].includes(review.status);
  const isHighConfidence = isClassified && conf !== null && conf !== undefined && conf >= confidenceThreshold;
  const isMediumConfidence = isClassified && conf !== null && conf !== undefined && conf >= 50 && conf < confidenceThreshold;
  const isLowConfidence = isClassified && (conf === null || conf === undefined || conf < 50);

  return (
    <div
      id={review.review_id}
      className={`glass-card p-6 border-l-4 transition-all relative group/card ${highlight ? "ring-2 ring-indigo-500 ring-offset-2" : ""} ${isLowConfidence ? "border-l-red-500 bg-red-50/10" : isMediumConfidence ? "border-l-amber-500" : review.rating >= 4 ? "border-l-green-500" : review.rating === 3 ? "border-l-amber-500" : "border-l-red-500"}`}
      style={isMediumConfidence ? { borderLeft: "3px solid #F59E0B" } : {}}
    >
      {loadingAI && (
        <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-3xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <span className="text-sm font-bold text-slate-600">Re-analysing…</span>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        {/* Selection Checkbox */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(review.review_id);
          }}
          className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${isSelected ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white border-slate-200 hover:border-indigo-300"}`}
        >
          {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
        </div>

        {/* Re-analyse Button (Existing) */}
        {/* <button 
          onClick={handleReanalyse}
          title="Re-analyse Review"
          className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <RotateCcw size={14} />
        </button> */}
      </div>

      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} />
              ))}
            </div>
            <span className="text-sm font-bold text-slate-900">{review.reviewer_name}</span>
            <span className="text-xs text-slate-500">{review.platform} • {new Date(review.review_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getStatusStyles(review.status)}`}>
              {review.status || "NEW"}
            </span>
            {review.linked_ticket_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/tickets?highlight=${review.linked_ticket_id}`);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded-full transition-all flex items-center gap-1 border border-indigo-100"
              >
                TICKET: {review.linked_ticket_id.slice(-6)}
              </button>
            )}
            <div className="flex gap-1 items-center">
              {[...Array(Math.max(0, Math.floor((review.confidence || 0) / 20)))].map((_, i) => (
                <div key={i} className={`w-1 h-1 rounded-full ${isLowConfidence ? "bg-red-400" : isMediumConfidence ? "bg-amber-400" : "bg-green-400"}`} />
              ))}
            </div>
          <div className="flex gap-1">
            {["NEW", "IN REVIEW", "RESPONDED", "CLOSED"].map((s, idx) => {
              const statusSteps = ["NEW", "IN REVIEW", "RESPONDED", "CLOSED"];
              const currentStep = statusSteps.indexOf(review.status);
              const isActive = statusSteps.indexOf(s) <= currentStep && review.status !== "ESCALATED";
              return (
                <div key={s} title={s} className={`w-3 h-1 rounded-full ${isActive ? "bg-indigo-500" : "bg-slate-100"}`}></div>
              );
            })}
            {review.status === "ESCALATED" && <div className="w-12 h-1 bg-red-500 rounded-full animate-pulse"></div>}
          </div>
        </div>
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

      {/* Assignment Section */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
          <Users size={14} className="text-slate-400" />
          <div className="flex-1">
            <select
              value={review.assignee_id || ""}
              onChange={(e) => handleAssign(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer appearance-none p-0"
            >
              <option value="">{review.assignee_name || "Assign Staff..."}</option>
              {filteredStaff.length > 0 ? (
                filteredStaff.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.role === 'gm' ? 'GM' : 'Staff'})</option>
                ))
              ) : (
                <option disabled>No staff in {review.primary_department}. Add in Settings.</option>
              )}
            </select>
          </div>
          {review.assignee_id && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase">
              <Check size={10} /> Assigned
            </div>
          )}
        </div>

        {review.status === "PENDING APPROVAL" && (
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              <span>Submitted by: <span className="text-slate-900">{review.submitted_by || "Staff"}</span></span>
            </div>
            {review.assignee_id && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                <span>Assigned to: <span className="text-slate-600">{review.assignee_name}</span></span>
              </div>
            )}
          </div>
        )}
      </div>

      {isHighConfidence && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded text-[11px] font-bold uppercase tracking-wider">
            <CheckCircle2 size={12} /> High Trust Analysis
          </span>
        </div>
      )}

      {isMediumConfidence && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] rounded text-[11px] font-bold uppercase tracking-wider">
            <AlertCircle size={12} /> LOW CONFIDENCE
          </span>
        </div>
      )}

      {isLowConfidence && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-700 rounded text-[11px] font-bold uppercase tracking-wider">
            <AlertTriangle size={12} /> REVIEW REQUIRED
          </span>
        </div>
      )}

      {review.needs_human_review && !isLowConfidence && !isMediumConfidence && (
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
      {review.status !== "RESPONDED" && !isLowConfidence && (
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
            ) : proposal ? (
              <div className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 italic overflow-y-auto">
                {proposal}
              </div>
            ) : (
              <div className="w-full h-32 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl gap-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No draft generated yet</p>
                <button 
                  onClick={() => handleGenerate(tone)}
                  className="px-6 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-50 transition-all shadow-sm"
                >
                  Generate AI Draft
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-4 items-center">
              <button onClick={() => onFlag(review)} className="text-[10px] font-bold text-slate-400 hover:text-red-600 transition-colors uppercase">FLAG REVIEW</button>
              <button onClick={() => setIsAddingNote(!isAddingNote)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase">ADD NOTE {review.internal_notes?.length > 0 && `(${review.internal_notes.length})`}</button>
              {review.status === "PENDING APPROVAL" && isApprover && (
                <button onClick={handleReject} className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase flex items-center gap-1">
                  <X size={12} /> REJECT DRAFT
                </button>
              )}
            </div>

            {review.status === "PENDING APPROVAL" && !isApprover ? (
              <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100">
                Awaiting Manager Approval
              </div>
            ) : (
              <button
                onClick={handleApprove}
                disabled={isGenerating || !proposal}
                title={!isApprover ? "Requires Manager approval to post" : ""}
                className={`px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 ${(isMediumConfidence || review.status === "PENDING APPROVAL" || !isApprover) ? "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600" : "bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700"}`}
              >
                <CheckCircle2 size={14} />
                {isApprover ? "APPROVE & POST" : "SUBMIT FOR APPROVAL"}
              </button>
            )}
          </div>
        </div>
      )}

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

      {isLowConfidence && review.status !== "RESPONDED" && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center gap-2 text-center">
            <Pencil size={24} className="text-slate-300" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Manual Response Required</p>
            <p className="text-[10px] text-slate-400">AI confidence is too low for this review. Please draft a response manually.</p>
            <button
              onClick={() => {
                setIsEditing(true);
              }}
              className="mt-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase"
            >
              Start Drafting
            </button>
          </div>
        </div>
      )}

      {review.status === "RESPONDED" && (
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
