import React, { createContext, useContext, useReducer, useEffect } from "react";
import { initialState } from "./initialState";
import * as actions from "./actions";
import { getReviews, getTickets, getHotel, getProperties, getAdminProperties, getNotifications as fetchNotifications, createNotification as postNotification, markNotificationRead, markAllNotificationsRead as apiMarkAllRead } from "../api/apiClient";
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
        hotelConfig: action.payload.hotelConfig || {},
        managedProperties: action.payload.managedProperties || [],
        isAppLoading: false
      };
    case actions.SET_APP_LOADING:
      return { ...state, isAppLoading: action.payload };
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
    case actions.UPDATE_REVIEW:
      const reviewObj = action.payload.data || action.payload; // Support both full response and direct object
      const ticketObj = action.payload.ticket;

      const updatedTickets = [...state.tickets];
      if (ticketObj) {
        const idx = updatedTickets.findIndex(t => t.ticket_id === ticketObj.ticket_id);
        if (idx > -1) updatedTickets[idx] = ticketObj;
        else updatedTickets.unshift(ticketObj);
      } else {
        // Fallback for simple assignee updates if no ticket object returned
        const idx = updatedTickets.findIndex(t => t.review_id === reviewObj.review_id);
        if (idx > -1) {
          updatedTickets[idx] = {
            ...updatedTickets[idx],
            assignee_id: reviewObj.assignee_id,
            assignee_name: reviewObj.assignee_name
          };
        }
      }
      return {
        ...state,
        reviews: state.reviews.map(r => r.review_id === reviewObj.review_id ? { ...r, ...reviewObj } : r),
        tickets: updatedTickets
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
      return { ...state, notifications: [{ ...action.payload, read: false, created_at: action.payload.created_at || new Date().toISOString() }, ...state.notifications] };
    case actions.LOAD_NOTIFICATIONS:
      return {
        ...state,
        notifications: (action.payload || []).map(n => ({
          ...n,
          read: n.isRead !== undefined ? n.isRead : n.read
        }))
      };
    case actions.MARK_NOTIFICATION_READ: {
      return {
        ...state,
        notifications: state.notifications.map((n, i) => i === action.payload ? { ...n, read: true } : n)
      };
    }
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
    case actions.ADD_STAFF_MEMBER:
      return { ...state, staff: [...state.staff, action.payload] };
    case actions.UPDATE_STAFF_MEMBER:
      return {
        ...state,
        staff: state.staff.map(s => s._id === action.payload._id ? action.payload : s)
      };
    case actions.REMOVE_STAFF_MEMBER:
      return {
        ...state,
        staff: state.staff.filter(s => s._id !== action.payload)
      };
    case actions.UPDATE_HOTEL_CONFIG:
      return { ...state, hotelConfig: { ...state.hotelConfig, ...action.payload } };
    case actions.REANALYSE_REVIEW:
      return {
        ...state,
        reviews: state.reviews.map(r => r.review_id === action.payload ? {
          ...r,
          status: "Pending",
          sentiment: null,
          confidence: null,
          primary_department: null,
          urgency: null,
          issues: [],
          needs_human_review: null,
          human_review_reason: null,
          ai_error: null
        } : r)
      };
    case actions.REMOVE_REVIEW:
      return {
        ...state,
        reviews: state.reviews.filter(r => r.review_id !== action.payload),
        tickets: state.tickets.filter(t => t.review_id !== action.payload)
      };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isAuthenticated, currentUser } = useAuth();

  const loadData = async () => {
    dispatch({ type: actions.SET_APP_LOADING, payload: true });
    try {
      const isSuperadmin = currentUser?.role === "superadmin";
      const propsPromise = isSuperadmin
        ? getAdminProperties().catch(() => ({ data: [] }))
        : getProperties().catch(() => ({ data: [] }));

      const [revs, tkts, hotel, props] = await Promise.all([
        getReviews(),
        getTickets(),
        getHotel(),
        propsPromise
      ]);

      const reviews = revs.data.reviews || [];

      dispatch({
        type: actions.LOAD_INITIAL_DATA,
        payload: {
          reviews,
          tickets: tkts.data.tickets,
          staff: [],
          hotelConfig: hotel.data,
          managedProperties: props.data || []
        }
      });

      // Load notifications from backend
      try {
        const notifs = await fetchNotifications();
        dispatch({ type: actions.LOAD_NOTIFICATIONS, payload: Array.isArray(notifs) ? notifs : (notifs.data || []) });
      } catch (e) {
        console.warn('[Notifications] Load failed:', e.message);
      }
    } catch (err) {
      console.error("Failed to load initial data", err);
      dispatch({ type: actions.SET_APP_LOADING, payload: false });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, currentUser?.role]);

  // Notification helpers — API + state in one call, no side effects in reducer
  const sendNotification = async (payload) => {
    dispatch({ type: actions.ADD_NOTIFICATION, payload });
    try {
      await postNotification(payload);
    } catch (e) {
      console.warn('[Notification] Save failed:', e.message);
    }
  };

  const handleMarkNotificationRead = (index) => {
    const notif = state.notifications[index];
    dispatch({ type: actions.MARK_NOTIFICATION_READ, payload: index });
    if (notif?._id) markNotificationRead(notif._id).catch(() => {});
  };

  const handleMarkAllRead = () => {
    dispatch({ type: actions.MARK_ALL_NOTIFICATIONS_READ });
    apiMarkAllRead().catch(() => {});
  };

  return (
    <AppContext.Provider value={{ state, dispatch, refreshData: loadData, sendNotification, handleMarkNotificationRead, handleMarkAllRead }}>
      {children}
    </AppContext.Provider>
  );
};
