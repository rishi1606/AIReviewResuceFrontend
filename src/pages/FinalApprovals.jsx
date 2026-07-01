import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { getReviews } from "../api/apiClient";
import apiClient from "../api/apiClient";
import StatusBadge, { getUIStatus } from "../components/StatusBadge";
import { CheckCircle2, XCircle, ShieldCheck, Loader2, Star, MessageSquare, AlertCircle } from "lucide-react";

const FinalApprovals = () => {
  const { currentUser } = useAuth();
  const { state, sendNotification } = useAppContext();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isSuperAdmin = currentUser?.role === "superadmin";

  useEffect(() => {
    document.title = "ReviewRescue — Final Approvals";
    fetchFinalApprovals();
  }, [currentUser]);

  const fetchFinalApprovals = async () => {
    setLoading(true);
    try {
      // Fetch reviews that might be Lead Approved
      // We assume they have approval_status = "approved" and are not yet published
      const res = await getReviews({ limit: 100 });
      if (res.success || res.data?.success || res.reviews || res.data?.reviews) {
        const fetchedReviews = res.data?.reviews || res.reviews || res.data?.data?.reviews || [];
        const leadApproved = fetchedReviews.filter(r => getUIStatus(r) === "Lead Approved");
        setReviews(leadApproved);
        if (leadApproved.length > 0) {
          setSelectedReview(leadApproved[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch final approvals", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishApprove = async () => {
    if (!selectedReview) return;
    setIsActionLoading(true);
    try {
      await apiClient.post(`/reviews/${selectedReview.review_id}/approve-response`, {
        approved_by: currentUser?.name
      });
      
      const reviewerName = selectedReview.reviewer_name || "Guest";
      setReviews(prev => prev.filter(r => r.review_id !== selectedReview.review_id));
      setSelectedReview(null);

      sendNotification({
        type: "success",
        title: "✓ Response Published",
        message: `Response for ${reviewerName} has been published successfully!`,
        timestamp: Date.now()
      });
    } catch (err) {
      sendNotification({
        type: "error",
        title: "Publish Failed",
        message: err.message || "Failed to publish response.",
        timestamp: Date.now()
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectToLead = async () => {
    if (!selectedReview || !rejectionReason.trim()) return;
    setIsActionLoading(true);
    try {
      await apiClient.post(`/reviews/${selectedReview.review_id}/reject-response`, {
        rejection_reason: rejectionReason
      });
      
      const reviewerName = selectedReview.reviewer_name || "Guest";
      setReviews(prev => prev.filter(r => r.review_id !== selectedReview.review_id));
      setSelectedReview(null);
      setRejectionReason("");

      sendNotification({
        type: "info",
        title: "Response Rejected",
        message: `Response for ${reviewerName} sent back to Lead with feedback.`,
        timestamp: Date.now()
      });
    } catch (err) {
      sendNotification({
        type: "error",
        title: "Reject Failed",
        message: err.message || "Failed to reject response.",
        timestamp: Date.now()
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Final Approvals</h2>
            <p className="text-xs text-zinc-500 font-medium">
              {isSuperAdmin ? "Read-only Monitor View" : "Final review before publishing to platform"}
            </p>
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold shrink-0">
          <AlertCircle size={16} />
          You are viewing final approvals in Read-Only Monitor Mode.
        </div>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left List Panel (35%) */}
        <div className="w-[35%] bg-white rounded-2xl border border-zinc-200 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50 shrink-0">
            <h3 className="font-bold text-zinc-800 text-sm">Lead Approved ({reviews.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center p-8 text-zinc-400 text-sm font-medium">
                No reviews waiting for final approval.
              </div>
            ) : (
              reviews.map(review => (
                <div 
                  key={review.review_id}
                  onClick={() => setSelectedReview(review)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedReview?.review_id === review.review_id 
                    ? "bg-orange-50 border-orange-200" 
                    : "bg-white border-transparent hover:bg-zinc-50 hover:border-zinc-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-zinc-900 text-sm truncate pr-2">{review.reviewer_name}</span>
                    <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap bg-zinc-100 px-1.5 py-0.5 rounded">
                      Lead: {review.approved_by || "System"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-orange-500 mb-1.5">
                    <Star size={10} className="fill-current" />
                    <span className="text-[10px] font-bold">{review.rating}</span>
                  </div>
                  <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                    {review.review_text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Detail Panel (65%) */}
        <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col overflow-hidden">
          {selectedReview ? (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
              <div className="p-6 border-b border-zinc-100 space-y-4 shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">{selectedReview.reviewer_name}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge customStatus="Lead Approved" />
                      <span className="text-zinc-300">•</span>
                      <span className="text-sm font-bold text-zinc-600">{selectedReview.platform}</span>
                      <span className="text-zinc-300">•</span>
                      <span className="text-sm font-semibold text-zinc-500">{selectedReview.primary_department}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center text-orange-500 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 mb-1">
                      <Star size={14} className="fill-current" />
                      <span className="text-sm font-bold ml-1">{selectedReview.rating} / 5</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <div className="flex items-center gap-2 mb-2 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                    <MessageSquare size={14} /> Guest Review
                  </div>
                  <p className="text-sm text-zinc-800 leading-relaxed">
                    {selectedReview.review_text}
                  </p>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck size={14} /> Final Response Content
                </div>
                <div className="bg-white border-2 border-orange-100 rounded-xl p-4 flex-1 mb-4 shadow-sm relative">
                  <span className="absolute -top-3 left-4 bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-orange-200">
                    Approved by Lead: {selectedReview.approved_by || "System"}
                  </span>
                  <div className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap mt-2">
                    {selectedReview.response_text}
                  </div>
                </div>

                {/* Actions */}
                {!isSuperAdmin && (
                  <div className="space-y-4 shrink-0 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-1.5 uppercase tracking-wider">
                        Rejection Feedback for Lead
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain what needs to be changed..."
                        className="w-full text-sm p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none h-20"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleRejectToLead}
                        disabled={!rejectionReason.trim() || isActionLoading}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={18} />}
                        Reject to Lead
                      </button>
                      <button
                        onClick={handlePublishApprove}
                        disabled={isActionLoading}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Publish Response
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <ShieldCheck size={48} className="mb-4 text-zinc-300" />
              <p className="text-sm font-medium">Select a review from the queue to approve</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalApprovals;
