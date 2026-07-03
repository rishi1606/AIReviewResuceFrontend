import React from "react";
import { CircleDot, UserCircle2, Clock, FileCheck, CheckCircle2, Globe2, AlertCircle, RotateCcw } from "lucide-react";

export const getUIStatus = (review) => {
  if (!review) return "Unassigned";

  // Check backend status/approval flow
  // "RESPONDED" implies it went all the way to platform
  if (review.approval_status === "approved" || review.status === "RESPONDED") {
    // If we have a BO approval flow, maybe we check who approved it?
    // Let's assume if status is RESPONDED, it's published.
    // If BO approved it, we can also consider it published.
    return "Published";
  }

  if (review.approval_status === "reopened") {
    return "Reopened";
  }

  if (review.approval_status === "rejected") {
    return "Rejected";
  }

  if (review.approval_status === "lead_approved" || review.status === "LEAD APPROVED") {
    return "Lead Approved";
  }

  // If staff submitted it to Lead
  if (review.approval_status === "submitted") {
    return "Pending Approval";
  }

  // If assigned
  if (review.assigned_to_staff_id || review.assignee_id) {
    if (review.response_text || (review.draft_history && review.draft_history.length > 0)) {
        return "In Progress";
    }
    return "Assigned";
  }

  return "Unassigned";
};

const StatusBadge = ({ review, customStatus }) => {
  const status = customStatus || getUIStatus(review);

  const styles = {
    "Unassigned": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: CircleDot },
    "Assigned": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: UserCircle2 },
    "In Progress": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: Clock },
    "Pending Approval": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: FileCheck },
    "Lead Approved": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: CheckCircle2 },
    "Reopened": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: RotateCcw },
    "Rejected": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertCircle },
    "Published": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: Globe2 },
  };

  const config = styles[status] || styles["Unassigned"];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={12} strokeWidth={2.5} />
      {status}
    </div>
  );
};

export default StatusBadge;
