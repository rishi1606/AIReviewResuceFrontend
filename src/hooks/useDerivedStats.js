import { useAppContext } from "../context/AppContext";

export function useDerivedStats() {
  const { state } = useAppContext();
  const { reviews, tickets, activeFilters } = state;

  const filterByDate = (items, dateField) => {
    if (!activeFilters.dateRange.start) return items;
    const start = new Date(activeFilters.dateRange.start);
    const end = new Date(activeFilters.dateRange.end || new Date());
    return items.filter(item => {
      const val = item[dateField];
      if (!val) return false;
      const d = new Date(typeof val === "number" ? val : val);
      return d >= start && d <= end;
    });
  };

  const filteredReviews = filterByDate(reviews, "review_date");
  const filteredTickets = filterByDate(tickets, "created_at");

  const totalReviews = filteredReviews.length;
  const positiveCount = filteredReviews.filter(r => r.sentiment === "Positive").length;
  const negativeCount = filteredReviews.filter(r => r.sentiment === "Negative").length;
  const mixedCount = filteredReviews.filter(r => r.sentiment === "Mixed").length;
  const neutralCount = filteredReviews.filter(r => r.sentiment === "Neutral").length;
  const activeTicketsCount = filteredTickets.filter(t => !["Closed", "Resolved"].includes(t.status)).length;
  const pendingAI = filteredReviews.filter(r => r.status === "Pending AI").length;
  const criticalCount = filteredTickets.filter(t => t.urgency === "High" && (t.status === "Open" || t.status === "In Progress")).length;
  const approvedCount = filteredReviews.filter(r => r.status === "Approved").length;
  const resolvedTickets = filteredTickets.filter(t => t.status === "Closed" || t.status === "Resolved").length;
  
  const avgRating = totalReviews > 0 
    ? (filteredReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1) 
    : "0.0";

  const requiresResponse = filteredReviews.filter(r => r.requires_response && r.status !== "Approved").length;
  const responseRate = (requiresResponse + approvedCount) > 0 
    ? Math.round((approvedCount / (requiresResponse + approvedCount)) * 100) 
    : 0;

  const overdueTickets = filteredTickets.filter(t => 
    t.sla_deadline < Date.now() && 
    !["Closed", "Resolved"].includes(t.status)
  ).length;

  const closedWithTime = filteredTickets.filter(t => t.resolved_at && t.created_at);
  const avgResolutionTime = closedWithTime.length > 0 
    ? Math.round(closedWithTime.reduce((sum, t) => sum + ((t.resolved_at - t.created_at) / 3600000), 0) / closedWithTime.length) 
    : 0;

  const departmentBreakdown = filteredTickets.reduce((acc, t) => {
    acc[t.department] = (acc[t.department] || 0) + 1;
    return acc;
  }, {});

  const platformBreakdown = filteredReviews.reduce((acc, r) => {
    acc[r.platform] = (acc[r.platform] || 0) + 1;
    return acc;
  }, {});

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: filteredReviews.filter(r => r.rating === star).length,
    pct: totalReviews > 0 ? Math.round((filteredReviews.filter(r => r.rating === star).length / totalReviews) * 100) : 0
  }));

  const sentiments = ["Positive", "Negative", "Mixed", "Neutral"];
  const sentimentDistribution = sentiments.map(s => ({
    name: s,
    count: filteredReviews.filter(r => r.sentiment === s).length
  }));

  return {
    totalReviews, positiveCount, negativeCount, mixedCount, neutralCount,
    pendingAI, criticalCount, approvedCount, resolvedTickets, activeTicketsCount,
    avgRating, responseRate, overdueTickets, avgResolutionTime,
    departmentBreakdown, platformBreakdown, ratingDistribution, sentimentDistribution,
    escalationRisks: filteredReviews.filter(r => r.escalation_risk).length,
    suspiciousCount: filteredReviews.filter(r => r.is_suspicious).length,
    needsHumanReview: filteredReviews.filter(r => r.needs_human_review).length,
    requiresResponse,
    urgentEscalations: [
      ...filteredTickets
        .filter(t => (t.urgency === "High" || t.escalated) && !["Closed", "Resolved"].includes(t.status))
        .map(t => ({ ...t, type: 'ticket' })),
      ...filteredReviews
        .filter(r => r.escalation_risk && r.status !== "Approved" && !r.linked_ticket_id)
        .map(r => ({ ...r, type: 'review' }))
    ].sort((a, b) => (b.created_at || b.review_date || 0) - (a.created_at || a.review_date || 0)).slice(0, 5)
  };
}
