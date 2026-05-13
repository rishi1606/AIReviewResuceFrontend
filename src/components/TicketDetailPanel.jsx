import React, { useState } from "react";
import {
  X,
  User,
  Clock,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Send,
  CheckCircle2,
  Lock,
  Loader2,
  Sparkles
} from "lucide-react";
import { useSLAStatus } from "../hooks/useSLA";
import { updateTicketStatus, addTicketNote, assignTicket, escalateTicket } from "../api/apiClient";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";

const TicketDetailPanel = ({ ticket, onClose, staff }) => {
  const { currentUser } = useAuth();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const sla = useSLAStatus(ticket);
  const { state, dispatch } = useAppContext();

  // Find the linked review to check for flags
  const linkedReview = state.reviews.find(r => r.review_id === ticket.review_id);
  const isFlagged = linkedReview?.is_suspicious;

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      const res = await updateTicketStatus(ticket.ticket_id, {
        status: newStatus,
        changed_by: "Current User",
        note: newStatus === "Resolved" ? "Issue addressed via internal workflow." : undefined
      });
      dispatch({ type: "UPDATE_TICKET_STATUS", payload: res.data });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      const res = await addTicketNote(ticket.ticket_id, {
        text: note,
        author: "Current User"
      });
      dispatch({ type: "UPDATE_TICKET_STATUS", payload: res.data });
      setNote("");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssign = async (staffId, staffName) => {
    try {
      const res = await assignTicket(ticket.ticket_id, {
        assignee_id: staffId,
        assignee_name: staffName
      });
      dispatch({ type: "ASSIGN_TICKET", payload: res.data });
    } catch (err) {
      alert(err.message);
    }
  };

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");

  const handleEscalate = async () => {
    if (!escalateReason.trim()) return;
    setLoading(true);
    try {
      // Find the GM in the staff list
      const gm = staff.find(s => s.role === "manager" || s.name.toUpperCase().includes("GM") || s.department.toUpperCase() === "MANAGEMENT");

      const res = await escalateTicket(ticket.ticket_id, {
        escalation_reason: escalateReason,
        assignee_id: gm?._id,
        assignee_name: gm?.name
      });

      dispatch({ type: "ESCALATE_TICKET", payload: res.data });
      if (gm) {
        dispatch({ type: "ASSIGN_TICKET", payload: res.data });
      }
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          message: `Ticket ${ticket.ticket_id} escalated to management.`,
          type: "escalation_success",
          urgency: "Info",
          read: false
        }
      });
      setShowEscalateModal(false);
      setEscalateReason("");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusSteps = ["Open", "In Progress", "Pending Verification", "Resolved", "Closed"];
  const currentStepIndex = statusSteps.indexOf(ticket.status);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-[100] border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {ticket.ticket_id}
            {ticket.escalated && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest">ESCALATED</span>}
          </h2>
          <p className="text-sm text-slate-500">Guest: {ticket.guest_name}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Status Stepper */}
        <div className="flex justify-between items-center px-4">
          {statusSteps.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1 group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${i <= currentStepIndex ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-100 text-slate-400"}`}
                >
                  {i < currentStepIndex ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${i <= currentStepIndex ? "text-indigo-600" : "text-slate-400"}`}>{s}</span>
              </div>
              {i < statusSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < currentStepIndex ? "bg-indigo-600" : "bg-slate-100"}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Department</p>
            <p className="font-bold text-indigo-600">{ticket.department}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">SLA Deadline</p>
            <p className={`font-bold ${sla?.color === "red" ? "text-red-600" : "text-slate-700"}`}>{sla?.label}</p>
          </div>
        </div>

        {/* Original Review */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <MessageSquare size={14} /> Guest Review
          </h3>
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl italic text-slate-700">
            "{ticket.review_text}"
          </div>
        </div>

        {/* Internal Notes */}
        <div>
          {/* <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <Clock size={14} /> Internal Notes
          </h3>
          <div className="space-y-4 mb-4">
            {ticket.notes?.map((n, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-xs">
                  {n.author[0]}
                </div>
                <div className="flex-1 p-3 bg-slate-100 rounded-xl rounded-tl-none">
                  <p className="text-sm text-slate-800">{n.text}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div> */}
          {/* <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a private note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 p-3 bg-slate-50 border rounded-xl text-sm"
            />
            <button
              onClick={handleAddNote}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Send size={18} />
            </button>
          </div> */}
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50/50 grid grid-cols-2 gap-4">
        <div className="relative group">
          <button className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <User size={16} /> {ticket.assignee_name || "Assign Staff"}
          </button>
          <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl hidden group-hover:block overflow-hidden max-h-48 overflow-y-auto">
            {staff.map(s => (
              <button
                key={s._id}
                onClick={() => handleAssign(s._id, s.name)}
                className="w-full p-3 text-left hover:bg-slate-50 text-sm border-b last:border-0"
              >
                {s.name} ({s.department})
              </button>
            ))}
          </div>
        </div>

        {isFlagged && (
          <div className="col-span-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertTriangle size={18} />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest">Flagged by Manager</p>
              <p className="text-[10px] opacity-80">This review has been marked as suspicious. Ticket resolution is locked.</p>
            </div>
            <Lock size={16} />
          </div>
        )}

        {ticket.status === "Open" && (
          <button
            disabled={isFlagged || loading}
            onClick={() => handleStatusChange("In Progress")}
            className={`btn-primary ${isFlagged ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Acknowledge & Start"}
          </button>
        )}
        {ticket.status === "In Progress" && (
          <button
            disabled={isFlagged || loading}
            onClick={() => handleStatusChange("Pending Verification")}
            className={`btn-primary ${isFlagged ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Submit for Verification"}
          </button>
        )}
        {ticket.status === "Pending Verification" && (
          <div className="col-span-2">
            {["gm", "dept_head"].includes(currentUser?.role) ? (
              <button
                disabled={isFlagged || loading}
                onClick={() => handleStatusChange("Resolved")}
                className={`w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 ${isFlagged ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> Verify & Resolve</>}
              </button>
            ) : (
              <div className="w-full py-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-center text-xs uppercase tracking-widest border border-slate-200">
                Waiting for Management Verification
              </div>
            )}
          </div>
        )}
        {ticket.status === "Resolved" && (
          <div className="col-span-2">
            {currentUser?.role === "gm" ? (
              <button
                disabled={loading}
                onClick={() => handleStatusChange("Closed")}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Final Close (Manual)"}
              </button>
            ) : (
              <div className="w-full py-3 bg-green-50 text-green-600 rounded-xl font-bold text-center text-xs uppercase tracking-widest border border-green-100">
                Resolved • Auto-closing in 24h
              </div>
            )}
          </div>
        )}
        {ticket.status === "Closed" && (
          <div className="col-span-2 flex items-center justify-center gap-2 text-green-600 font-bold bg-green-50 py-3 rounded-xl border border-green-100">
            <CheckCircle2 size={18} /> TICKET COMPLETED
          </div>
        )}

        {/* {!["Resolved", "Closed"].includes(ticket.status) && !ticket.escalated && !isFlagged && (
          <button onClick={() => setShowEscalateModal(true)} className="col-span-2 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl border border-red-100 transition-all">
            Escalate to Management
          </button>
        )} */}
      </div>

      {/* Escalation Modal Overlay */}
      {showEscalateModal && (
        <div className="absolute inset-0 z-[150] bg-white/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in zoom-in duration-200">
          <div className="w-full space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={32} />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-slate-900 text-xl tracking-tight">Escalate Ticket?</h4>
              <p className="text-sm text-slate-500 mt-1">Provide a reason for the management team.</p>
            </div>
            <textarea
              autoFocus
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="Explain why this requires management attention..."
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none h-32 resize-none shadow-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handleEscalate}
                disabled={!escalateReason.trim() || loading}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {loading ? "ESCALATING..." : "CONFIRM ESCALATION"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailPanel;
