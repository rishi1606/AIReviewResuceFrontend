import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { getReviews } from "../api/apiClient";
import ReviewCard from "../components/ReviewCard";
import { getUIStatus } from "../components/StatusBadge";
import { LayoutDashboard, Loader2, AlertCircle } from "lucide-react";

const COLUMNS = [
  "Unassigned",
  "Assigned",
  "In Progress",
  "Pending Approval",
  "Lead Approved",
  "Rejected",
  "Published"
];

const ReviewBoard = () => {
  const { state } = useAppContext();
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUser?.role === "superadmin";

  useEffect(() => {
    document.title = "ReviewRescue — Review Board";
    fetchBoardReviews();
  }, [currentUser, state.activeFilters?.property, state.activeFilters?.platform]);

  const fetchBoardReviews = async () => {
    setLoading(true);
    try {
      const res = await getReviews({
        limit: 200,
        sortBy: "NEWEST",
        property: state.activeFilters?.property || "ALL",
        platform: state.activeFilters?.platform || "ALL"
      });
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error("Failed to fetch reviews for board", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state.reviews.length > 0 && reviews.length > 0) {
      setReviews(prev => prev.map(r => {
        const updated = state.reviews.find(sr => sr.review_id === r.review_id);
        return updated ? updated : r;
      }));
    }
  }, [state.reviews]);

  const columnsData = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach(col => { grouped[col] = []; });
    
    reviews.forEach(review => {
      const status = getUIStatus(review);
      if (grouped[status]) {
        grouped[status].push(review);
      } else {
        grouped["Unassigned"].push(review);
      }
    });
    return grouped;
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 pb-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Review Board</h2>
            <p className="text-xs text-zinc-500 font-medium">
              {isSuperAdmin ? "Read-only Monitor View" : "Manage your department's reviews"}
            </p>
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold">
          <AlertCircle size={16} />
          You are viewing the board in Read-Only Monitor Mode.
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-4 min-w-max h-full items-start">
          {COLUMNS.map(col => (
            <div key={col} className="w-[350px] flex flex-col max-h-[calc(100vh-180px)] bg-zinc-50 border border-zinc-200 rounded-2xl shrink-0 overflow-hidden">
              {/* Column Header */}
              <div className="px-4 py-3 border-b border-zinc-200 bg-white flex items-center justify-between shadow-sm z-10">
                <h3 className="text-sm font-bold text-zinc-800">{col}</h3>
                <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md text-[11px] font-bold">
                  {columnsData[col].length}
                </span>
              </div>

              {/* Column Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {columnsData[col].length === 0 ? (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-xl">
                    <span className="text-xs text-zinc-400 font-medium">No reviews</span>
                  </div>
                ) : (
                  columnsData[col].map(review => (
                    <div key={review.review_id}>
                      <ReviewCard
                        review={review}
                        isBoardView={true}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewBoard;
