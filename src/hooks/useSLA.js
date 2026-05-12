import { useState, useEffect } from "react";

export function useSLAStatus(ticket) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!ticket.sla_deadline) return null;
  if (ticket.status === "Closed" || ticket.status === "Resolved") return { status: "done", label: "Completed", color: "green" };

  const remaining = ticket.sla_deadline - now;
  const totalSLA = ticket.sla_deadline - ticket.created_at;
  const pctLeft = (remaining / totalSLA) * 100;

  if (remaining <= 0) {
    const overdueMs = Math.abs(remaining);
    const overdueH = Math.floor(overdueMs / 3600000);
    const overdueM = Math.floor((overdueMs % 3600000) / 60000);
    return { status: "overdue", label: "OVERDUE " + overdueH + "h " + overdueM + "m", color: "red", pct: 0 };
  }

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return { 
    status: pctLeft > 50 ? "good" : "warning", 
    label: h + "h " + m + "m left", 
    color: pctLeft > 50 ? "green" : "amber", 
    pct: Math.round(pctLeft) 
  };
}
