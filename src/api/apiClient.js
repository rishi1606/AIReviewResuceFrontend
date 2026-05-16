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
      throw new Error(response.data.error);
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("rr_token");
      window.location.href = "/login";
    }
    throw new Error(error.response?.data?.error || error.message);
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

// Staff
export const getStaff = () => apiClient.get("/staff");
export const addStaff = (body) => apiClient.post("/staff", body);
export const updateStaff = (id, fields) => apiClient.put(`/staff/${id}`, fields);
export const removeStaff = (id) => apiClient.delete(`/staff/${id}`);

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

export default apiClient;
