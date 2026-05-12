import React, { createContext, useContext, useReducer, useEffect } from "react";
import { initialState } from "./initialState";
import * as actions from "./actions";
import { getReviews, getTickets, getStaff, getHotel } from "../api/apiClient";
import { useAuth } from "./AuthContext";

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const reducer = (state, action) => {
  switch (action.type) {
    case actions.LOAD_INITIAL_DATA:
      return {
        ...state,
        reviews: action.payload.reviews || [],
        tickets: action.payload.tickets || [],
        staff: action.payload.staff || [],
        hotelConfig: action.payload.hotelConfig || {}
      };
    case actions.SET_LOADING_REVIEWS:
      return { ...state, isLoadingReviews: action.payload };
    case actions.SET_LOADING_TICKETS:
      return { ...state, isLoadingTickets: action.payload };
    case actions.IMPORT_REVIEWS:
      return { ...state, reviews: [...action.payload, ...state.reviews] };
    case actions.UPDATE_REVIEW_CLASSIFICATION:
      return {
        ...state,
        reviews: state.reviews.map(r => r.review_id === action.payload.review_id ? { ...r, ...action.payload } : r)
      };
    case actions.APPROVE_RESPONSE:
      return {
        ...state,
        reviews: state.reviews.map(r => r.review_id === action.payload.review_id ? { 
          ...r, 
          status: "Approved", 
          response_text: action.payload.response_text,
          response_tone: action.payload.response_tone,
          approved_by: action.payload.approved_by,
          approved_at: action.payload.approved_at 
        } : r),
        responses: {
          ...state.responses,
          [action.payload.review_id]: action.payload.version_history
        },
        // Update linked ticket status if exists
        tickets: state.tickets.map(t => {
          if (t.review_id === action.payload.review_id) {
            return {
              ...t,
              status: "Pending Verification",
              status_history: [...(t.status_history || []), { 
                status: "Pending Verification", 
                changed_by: "System — Response Approved", 
                timestamp: Date.now() 
              }]
            };
          }
          return t;
        })
      };
    case actions.FLAG_SUSPICIOUS:
      return {
        ...state,
        reviews: state.reviews.map(r => r.review_id === action.payload.review_id ? { 
          ...r, 
          is_suspicious: true, 
          status: "Suspicious", 
          suspicious_reason: action.payload.suspicious_reason 
        } : r)
      };
    case actions.ADD_INTERNAL_NOTE_TO_REVIEW:
      return {
        ...state,
        reviews: state.reviews.map(r => r.review_id === action.payload.review_id ? { 
          ...r, 
          internal_notes: [...(r.internal_notes || []), action.payload.note] 
        } : r)
      };
    case actions.CREATE_CLUSTER_TICKET:
      return {
        ...state,
        tickets: [action.payload.ticket, ...state.tickets],
        tickets: state.tickets.map(t => action.payload.review_ids.includes(t.review_id) ? { ...t, cluster_id: action.payload.cluster_id } : t)
      };
    case actions.UPDATE_TICKET_STATUS:
      return {
        ...state,
        tickets: state.tickets.map(t => t.ticket_id === action.payload.ticket_id ? { ...t, ...action.payload } : t)
      };
    case actions.ASSIGN_TICKET:
      return {
        ...state,
        tickets: state.tickets.map(t => t.ticket_id === action.payload.ticket_id ? { ...t, ...action.payload } : t)
      };
    case actions.ADD_NOTIFICATION:
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case actions.MARK_NOTIFICATION_READ:
      return {
        ...state,
        notifications: state.notifications.map((n, i) => i === action.payload ? { ...n, read: true } : n)
      };
    case actions.MARK_ALL_NOTIFICATIONS_READ:
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      };
    case actions.SET_ACTIVE_FILTERS:
      return { ...state, activeFilters: { ...state.activeFilters, ...action.payload } };
    case actions.CLEAR_FILTERS:
      return { ...state, activeFilters: initialState.activeFilters };
    case actions.LOAD_STAFF:
      return { ...state, staff: action.payload };
    case actions.UPDATE_HOTEL_CONFIG:
      return { ...state, hotelConfig: { ...state.hotelConfig, ...action.payload } };
    case actions.REANALYSE_REVIEW:
      return {
        ...state,
        reviews: state.reviews.map(r => r.review_id === action.payload ? { 
          ...r, 
          status: "Pending AI",
          sentiment: null,
          confidence: null,
          primary_department: null,
          urgency: null,
          issues: [],
          needs_human_review: null
        } : r)
      };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isAuthenticated } = useAuth();

  const loadData = async () => {
    try {
      const [revs, tkts, stf, hotel] = await Promise.all([
        getReviews(),
        getTickets(),
        getStaff(),
        getHotel()
      ]);

      const reviews = revs.data.reviews || [];

      dispatch({
        type: actions.LOAD_INITIAL_DATA,
        payload: {
          reviews,
          tickets: tkts.data.tickets,
          staff: stf.data,
          hotelConfig: hotel.data
        }
      });
      // Cache hotel config for AI classifier
      localStorage.setItem("rr_hotel_config", JSON.stringify(hotel.data));
    } catch (err) {
      console.error("Failed to load initial data", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  return (
    <AppContext.Provider value={{ state, dispatch, refreshData: loadData }}>
      {children}
    </AppContext.Provider>
  );
};
