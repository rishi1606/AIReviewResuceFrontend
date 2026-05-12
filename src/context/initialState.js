export const initialState = {
  reviews: [],
  tickets: [],
  notifications: [],
  staff: [],
  hotelConfig: {},
  activeFilters: {
    dateRange: { start: null, end: null },
    sentiment: "ALL",
    department: "ALL",
    urgency: "ALL",
    status: "ALL",
    platform: "ALL",
    rating: "ALL"
  },
  importHistory: [],
  analyticsCache: null,
  isLoadingReviews: false,
  isLoadingTickets: false,
  responses: {}
};
