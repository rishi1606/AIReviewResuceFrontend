import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("rr_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data.success === false) {
      throw new Error(response.data.message || response.data.error);
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("rr_token");
      window.location.href = "/login";
    }
    throw new Error(error.response?.data?.message || error.response?.data?.error || error.message);
  }
);

// Auth
export const loginUser = (email, password) => apiClient.post("/auth/login", { email, password });
export const registerUser = (body) => apiClient.post("/auth/register", body);
export const getMe = () => apiClient.get("/auth/me");
export const updateMe = (fields) => apiClient.put("/auth/me", fields);
export const completeOnboarding = () => apiClient.post("/hotel/complete-onboarding");

// Hotel
export const getHotel = () => apiClient.get("/hotel");
export const updateHotel = (fields) => apiClient.put("/hotel", fields);

// Staff Management
export const createStaff = (body) => apiClient.post("/staff", body);
export const getStaffByBusiness = (business_id) => apiClient.get(`/staff/business/${business_id}`);
export const getStaffByProperty = (business_id, property_id) => apiClient.get(`/staff/business/${business_id}/property/${property_id}`);
export const updateStaff = (id, fields) => apiClient.put(`/staff/${id}`, fields);
export const deactivateStaff = (id) => apiClient.patch(`/staff/${id}/deactivate`);
export const removeStaff = (id) => apiClient.delete(`/staff/${id}`);

// Legacy
export const getStaff = () => apiClient.get("/staff");
export const addStaff = (body) => apiClient.post("/staff", body);

// Reviews
export const getReviews = (filters) => apiClient.get("/reviews", { params: filters });
export const importReviews = (reviews) => apiClient.post("/reviews/import", { reviews });
export const updateClassification = (review_id, data) => apiClient.put(`/reviews/${review_id}/classification`, data);
export const approveResponse = (review_id, data) => apiClient.put(`/reviews/${review_id}/approve-response`, data);
export const rejectResponse = (review_id) => apiClient.put(`/reviews/${review_id}/reject-response`);
export const flagSuspicious = (review_id, reason) => apiClient.put(`/reviews/${review_id}/flag-suspicious`, { suspicious_reason: reason });
export const addReviewNote = (review_id, data) => apiClient.post(`/reviews/${review_id}/notes`, data);
export const reanalyseReview = (review_id) => apiClient.put(`/reviews/${review_id}/reanalyse`);
export const assignReviewStaff = (review_id, data) => apiClient.put(`/reviews/${review_id}/assign-staff`, data);
export const scrapeGoogle = (url) => apiClient.post("/import/scrape-google", { url });
export const scrapeBooking = (url) => apiClient.post("/import/scrape-booking", { url });
export const scrapeExpedia = (url) => apiClient.post("/import/scrape-expedia", { url });
export const scrapeAgoda = (url) => apiClient.post("/import/scrape-agoda", { url });
export const scrapeHotels = (url) => apiClient.post("/import/scrape-hotels", { url });
export const scrapeAirbnb = (url) => apiClient.post("/import/scrape-airbnb", { url });
export const getImportHistory = () => apiClient.get("/import/history");
export const runFullAnalysis = () => apiClient.post("/import/analyze-all");
export const deleteAllReviews = () => apiClient.delete("/reviews/delete-all");
export const deleteReview = (id) => apiClient.delete(`/reviews/${id}`);
export const getPendingStatus = () => apiClient.get("/reviews/pending-status");

// Review Detail Page
export const getReviewDetail = (review_id) => apiClient.get(`/reviews/${review_id}/detail`);
export const saveDraft = (review_id, data) => apiClient.post(`/reviews/${review_id}/drafts`, data);
export const flagReviewEnhanced = (review_id, data) => apiClient.put(`/reviews/${review_id}/flag-suspicious`, data);
export const removeFlag = (review_id) => apiClient.put(`/reviews/${review_id}/remove-flag`);
export const getReviewerProfile = (name) => apiClient.get(`/reviews/reviewer/${encodeURIComponent(name)}`);
export const getSimilarReviews = (review_id) => apiClient.get(`/reviews/${review_id}/similar`);
export const reopenReview = (review_id) => apiClient.put(`/reviews/${review_id}/reopen`);

// Tickets
export const getTickets = (filters) => apiClient.get("/tickets", { params: filters });
export const createTicket = (body) => apiClient.post("/tickets", body);
export const updateTicketStatus = (ticket_id, data) => apiClient.put(`/tickets/${ticket_id}/status`, data);
export const assignTicket = (ticket_id, data) => apiClient.put(`/tickets/${ticket_id}/assign`, data);
export const escalateTicket = (ticket_id, data) => apiClient.put(`/tickets/${ticket_id}/escalate`, data);
export const addTicketNote = (ticket_id, data) => apiClient.post(`/tickets/${ticket_id}/notes`, data);
export const addTicketAttachment = (ticket_id, data) => apiClient.post(`/tickets/${ticket_id}/attachments`, data);
export const clusterTickets = (body) => apiClient.post("/tickets/cluster", body);
export const bulkAssign = (ticket_ids, data) => apiClient.put("/tickets/bulk-assign", { ...data, ticket_ids });
export const bulkStatus = (ticket_ids, data) => apiClient.put("/tickets/bulk-status", { ...data, ticket_ids });

// Analytics
export const getAnalyticsSummary = (filters) => apiClient.get("/analytics/summary", { params: filters });

// Properties
export const getProperties = () => apiClient.get("/hotel/properties");
export const getPortfolioStats = () => apiClient.get("/properties/portfolio-stats");
export const addProperty = (body) => apiClient.post("/properties", body);
export const updatePropertyApi = (id, body) => apiClient.put(`/properties/${id}`, body);
export const deletePropertyApi = (id) => apiClient.delete(`/properties/${id}`);

// Staff Ticket Management (for staff members)
export const getMyTickets = (filters) => apiClient.get("/staff/tickets/my", { params: filters });
export const getTicketDetail = (ticketId) => apiClient.get(`/staff/tickets/${ticketId}`);
export const submitTicketForApproval = (ticketId, data) => apiClient.post(`/staff/tickets/${ticketId}/submit-approval`, data);
export const publishTicketResponse = (ticketId, data) => apiClient.post(`/staff/tickets/${ticketId}/publish`, data);
export const closeTicket = (ticketId) => apiClient.post(`/staff/tickets/${ticketId}/close`);
export const reassignTicket = (ticketId, data) => apiClient.post(`/staff/tickets/${ticketId}/reassign`, data);

// GM Approval Management (for staff tickets)
export const getPendingApprovals = () => apiClient.get("/staff/approvals/pending");
export const approveTicketResponse = (ticketId) => apiClient.post(`/staff/approvals/${ticketId}/approve`);
export const modifyAndApproveTicket = (ticketId, data) => apiClient.post(`/staff/approvals/${ticketId}/modify-approve`, data);
export const rejectTicketResponse = (ticketId, data) => apiClient.post(`/staff/approvals/${ticketId}/reject`, data);
export const getEscalatedTickets = () => apiClient.get("/staff/escalations/list");
export const getStaffWorkload = () => apiClient.get("/staff/analytics/workload");

// Notifications
export const getNotifications = (filters) => apiClient.get("/notifications", { params: filters });
export const createNotification = (data) => apiClient.post("/notifications", data);
export const getNotificationUnreadCount = () => apiClient.get("/notifications/unread/count");
export const getNotificationById = (id) => apiClient.get(`/notifications/${id}`);
export const markNotificationRead = (id) => apiClient.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => apiClient.put("/notifications/read-all");
export const deleteNotification = (id) => apiClient.delete(`/notifications/${id}`);

// Admin Panel
export const getAdminBusinesses = () => apiClient.get("/admin/businesses");
export const addAdminBusiness = (body) => apiClient.post("/admin/businesses", body);
export const updateAdminBusiness = (id, body) => apiClient.put(`/admin/businesses/${id}`, body);
export const deleteAdminBusiness = (id) => apiClient.delete(`/admin/businesses/${id}`);
export const getAdminProperties = () => apiClient.get("/admin/properties");
export const addAdminProperty = (body) => apiClient.post("/admin/properties", body);
export const updateAdminProperty = (id, body) => apiClient.put(`/admin/properties/${id}`, body);
export const deleteAdminProperty = (id) => apiClient.delete(`/admin/properties/${id}`);
export const toggleBusinessActive = (id) => apiClient.patch(`/admin/businesses/${id}/toggle-active`);
export const togglePropertyActive = (id) => apiClient.patch(`/admin/properties/${id}/toggle-active`);

export default apiClient;
