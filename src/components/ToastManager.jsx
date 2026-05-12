import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X,
  Zap,
  AlarmClock
} from "lucide-react";

const ToastManager = () => {
  const { state, dispatch } = useAppContext();
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Listen to notifications in context and show as toasts
    // Include original index to ensure correct dismissal
    const unread = state.notifications
      .map((n, index) => ({ ...n, originalIndex: index }))
      .filter(n => !n.read)
      .slice(0, 3);
    setToasts(unread);
  }, [state.notifications]);

  const removeToast = (originalIndex) => {
    dispatch({ type: "MARK_NOTIFICATION_READ", payload: originalIndex });
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[300] space-y-3 pointer-events-none">
      {toasts.map((t, i) => (
        <div 
          key={i}
          className="pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 flex gap-4 w-80 animate-in slide-in-from-right duration-300"
        >
          <div className={`p-2 rounded-xl flex-shrink-0 ${t.urgency === "High" ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"}`}>
            {t.type === "new_ticket" && <Zap size={18} />}
            {t.type === "escalation_success" && <CheckCircle2 size={18} />}
            {t.type === "sla_breach" && <AlarmClock size={18} />}
            {t.type === "suspicious" && <AlertTriangle size={18} />}
            {!t.type && <Info size={18} />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{t.message}</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">{t.urgency || "Info"}</p>
          </div>
          <button onClick={() => removeToast(t.originalIndex)} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastManager;
