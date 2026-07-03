import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import apiClient from "../api/apiClient";
import StatusBadge, { getUIStatus } from "../components/StatusBadge";
import { Inbox, Loader2, Calendar, Star, MessageSquare, ExternalLink } from "lucide-react";

const MyReviews = () => {
  const { currentUser } = useAuth();
  const { state } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("todo"); // "todo" or "submitted"
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "ReviewRescue — My Reviews";
    fetchMyQueue();
  }, [currentUser]);

  const fetchMyQueue = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/reviews/queue/my");
      console.log('[MyReviews] API response:', res);
      if (res.success) {
        setReviews(res.reviews || []);
      }
    } catch (err) {
      console.error("Failed to fetch my queue", err);
    } finally {
      setLoading(false);
    }
  };

  const todoReviews = reviews.filter(r => {
    const status = getUIStatus(r);
    return status === "Assigned" || status === "In Progress" || status === "Rejected" || status === "Reopened";
  });

  const submittedReviews = reviews.filter(r => {
    const status = getUIStatus(r);
    return status === "Pending Approval" || status === "Lead Approved" || status === "Published";
  });

  const displayedReviews = activeTab === "todo" ? todoReviews : submittedReviews;

  return (
    <div className="flex flex-col h-full space-y-6 pb-12 animate-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto w-full">
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
              <Inbox size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">My Reviews</h2>
              <p className="text-xs text-zinc-500 font-medium">Manage your assigned reviews and drafts</p>
            </div>
          </div>
          
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("todo")}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "todo" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              To Do ({todoReviews.length})
            </button>
            <button
              onClick={() => setActiveTab("submitted")}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "submitted" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Submitted ({submittedReviews.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center flex flex-col items-center">
          <Inbox size={48} className="text-zinc-300 mb-4" />
          <h3 className="text-lg font-bold text-zinc-800 mb-2">No reviews found</h3>
          <p className="text-sm text-zinc-500">
            {activeTab === "todo" 
              ? "You don't have any reviews assigned to you at the moment."
              : "You haven't submitted any reviews for approval yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedReviews.map(review => (
            <div 
              key={review.review_id}
              onClick={() => navigate(`/reviews/${review.review_id}`)}
              className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge customStatus={getUIStatus(review)} />
                    <span className="text-xs font-bold text-zinc-900">{review.reviewer_name}</span>
                    <span className="text-zinc-300">•</span>
                    <div className="flex items-center text-orange-500">
                      <Star size={12} className="fill-current" />
                      <span className="text-xs font-bold ml-1">{review.rating}</span>
                    </div>
                    <span className="text-zinc-300">•</span>
                    <span className="text-[11px] font-semibold text-zinc-500">{review.platform}</span>
                    <span className="text-zinc-300">•</span>
                    <div className="flex items-center text-zinc-400">
                      <Calendar size={12} className="mr-1" />
                      <span className="text-[11px] font-medium">
                        {review.assigned_at ? new Date(review.assigned_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-zinc-700 line-clamp-2 leading-relaxed">
                    {review.review_text}
                  </p>
                </div>
                
                <div className="flex items-center shrink-0 sm:mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold text-orange-600 flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg">
                    {activeTab === "todo" ? "Draft Response" : "View Details"} <ExternalLink size={14} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReviews;
