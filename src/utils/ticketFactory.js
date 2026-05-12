export function createTicketFromReview(review, classification, slaConfig) {
  const slaHours = slaConfig || { High: 4, Medium: 24, Low: 72 };
  const urgency = classification.urgency === "None" ? "Low" : classification.urgency;

  return {
    ticket_id: "TKT-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5).toUpperCase(),
    review_id: review.review_id,
    guest_name: review.reviewer_name,
    guest_email: review.guest_email || null,
    room_number: review.room_number || null,
    rating: review.rating,
    platform: review.platform,
    review_text: review.review_text,
    department: classification.primary_department,
    all_departments: classification.departments,
    issues: classification.issues,
    suggested_action: classification.suggested_action,
    guest_emotion: classification.guest_emotion,
    escalation_risk: classification.escalation_risk,
    urgency: urgency,
    status: "Open",
    assignee_id: null,
    assignee_name: "Unassigned",
    created_at: Date.now(),
    sla_deadline: Date.now() + ((slaHours[urgency] || 24) * 60 * 60 * 1000),
    resolved_at: null,
    closed_at: null,
    escalated: false,
    escalation_reason: null,
    resolution_note: null,
    is_recurring: false,
    recurring_count: 0,
    cluster_id: null,
    status_history: [{ status: "Open", changed_by: "System", timestamp: Date.now() }],
    notes: [],
    attachments: []
  };
}
