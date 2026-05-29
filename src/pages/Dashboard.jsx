import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  Zap,
  ArrowRight,
  Flag,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useDerivedStats } from "../hooks/useDerivedStats";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import KPICard from "../components/KPICard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie, Legend
} from 'recharts';
import { SkeletonKPI, SkeletonChart, SkeletonBlock, SkeletonReview, SkeletonBase } from "../components/Skeleton";

/* ─────────────────────────────────────────────
   Inline style helpers (no extra CSS file needed)
───────────────────────────────────────────── */
const s = {
  /* KPI card */
  kpiCard: {
    background: "#fff",
    border: "1px solid #e4e4e7",
    borderRadius: 16,
    padding: "18px 18px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    cursor: "pointer",
    transition: "border-color 180ms, transform 180ms, box-shadow 180ms",
    position: "relative",
    overflow: "hidden",
  },
  kpiTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  kpiLabel: {
    fontSize: 10, fontWeight: 600, color: "#71717a",
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  kpiValue: { fontSize: 28, fontWeight: 700, color: "#09090b", lineHeight: 1 },

  /* Icon badge */
  iconBadge: (bg, color, border) => ({
    width: 40, height: 40, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, background: bg, color, border: `1px solid ${border}`,
    flexShrink: 0,
    transition: "transform 150ms",
  }),

  /* Trend pill */
  trend: (bg, color) => ({
    fontSize: 10, fontWeight: 700, padding: "2px 8px",
    borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 3,
    background: bg, color,
  }),

  /* Dashboard panel */
  panel: {
    background: "#fff",
    border: "1px solid #e4e4e7",
    borderRadius: 16,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    transition: "border-color 180ms",
  },
  panelHead: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #f4f4f5",
  },
  panelTitle: { fontSize: 15, fontWeight: 700, color: "#09090b" },
  panelSub: { fontSize: 11, color: "#a1a1aa", marginTop: 2 },
  panelLink: { fontSize: 10, fontWeight: 700, color: "#7c3aed", cursor: "pointer", letterSpacing: "0.04em" },

  /* Escalation item */
  escalationItem: {
    padding: "12px 14px",
    background: "#fff",
    border: "1px solid #e4e4e7",
    borderLeft: "3px solid #ef4444",
    borderRadius: 12,
    transition: "transform 180ms, box-shadow 180ms, border-color 180ms",
    cursor: "pointer",
  },
  escDept: {
    fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
    background: "#fef2f2", color: "#dc2626", border: "1px solid #fee2e2",
    padding: "2px 8px", borderRadius: 999,
  },
  escType: {
    fontSize: 9, fontWeight: 600,
    background: "#f4f4f5", color: "#52525b", border: "1px solid #e4e4e7",
    padding: "2px 7px", borderRadius: 999,
  },
  escLink: { fontSize: 10, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 },

  /* Review row */
  reviewRow: {
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: 10, borderRadius: 12, border: "1px solid transparent",
    cursor: "pointer", transition: "background 150ms, border-color 150ms, transform 150ms",
  },
  ratingBadge: (bg) => ({
    width: 38, height: 38, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "#fff", background: bg, flexShrink: 0,
  }),

  /* Table */
  tableWrap: {
    background: "#fff", border: "1px solid #e4e4e7",
    borderRadius: 16, overflow: "hidden",
  },
  tableHeadRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px 14px", borderBottom: "1px solid #f4f4f5",
    background: "rgba(249,249,251,.6)",
  },
  tableCount: {
    fontSize: 11, fontWeight: 700, color: "#7c3aed",
    background: "#f5f3ff", border: "1px solid #ede9fe",
    padding: "3px 10px", borderRadius: 999,
  },
  avatarCell: {
    width: 28, height: 28, borderRadius: "50%",
    background: "#f5f3ff", border: "1px solid #ede9fe",
    color: "#7c3aed", fontSize: 11, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  platBadge: {
    background: "#f4f4f5", border: "1px solid #e4e4e7", color: "#3f3f46",
    padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
  },
};

/* ── Tiny helpers ─────────────────────────────── */
const ICON_THEMES = {
  indigo: { bg: "#f5f3ff", color: "#7c3aed", border: "#ede9fe" },
  amber: { bg: "#fffbeb", color: "#d97706", border: "#fef3c7" },
  red: { bg: "#fef2f2", color: "#dc2626", border: "#fee2e2" },
  green: { bg: "#ecfdf5", color: "#059669", border: "#d1fae5" },
  slate: { bg: "#f4f4f5", color: "#52525b", border: "#e4e4e7" },
  blue: { bg: "#eff6ff", color: "#2563eb", border: "#dbeafe" },
  orange: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
};

const trendConfig = {
  up: { bg: "#ecfdf5", color: "#059669" },
  down: { bg: "#fef2f2", color: "#dc2626" },
  warn: { bg: "#fffbeb", color: "#d97706" },
  neutral: { bg: "#f4f4f5", color: "#52525b" },
};

const ratingBg = (v) => v >= 4 ? "#10b981" : v >= 3 ? "#f59e0b" : "#ef4444";

/* Sentiment pill */
const SENTIMENT_STYLES = {
  Positive: { bg: "#ecfdf5", color: "#059669", border: "rgba(16,185,129,.2)", dot: "#10b981" },
  Negative: { bg: "#fef2f2", color: "#dc2626", border: "rgba(239,68,68,.2)", dot: "#ef4444" },
  Mixed: { bg: "#f5f3ff", color: "#7c3aed", border: "rgba(124,58,237,.2)", dot: "#7c3aed" },
  Neutral: { bg: "#fffbeb", color: "#d97706", border: "rgba(245,158,11,.2)", dot: "#f59e0b" },
};
const SentimentPill = ({ value }) => {
  const st = SENTIMENT_STYLES[value] || SENTIMENT_STYLES.Neutral;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700,
      display: "inline-flex", alignItems: "center", gap: 4,
      background: st.bg, color: st.color, border: `1px solid ${st.border}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot }} />
      {value || "N/A"}
    </span>
  );
};

/* Status badge */
const STATUS_STYLES = {
  RESPONDED: { bg: "#ecfdf5", color: "#059669", border: "#d1fae5" },
  Approved: { bg: "#ecfdf5", color: "#059669", border: "#d1fae5" },
  ESCALATED: { bg: "#fef2f2", color: "#dc2626", border: "#fee2e2" },
  Suspicious: { bg: "#fffbeb", color: "#d97706", border: "#fef3c7" },
  CLASSIFIED: { bg: "#eff6ff", color: "#2563eb", border: "#dbeafe" },
};
const StatusBadge = ({ value }) => {
  const st = STATUS_STYLES[value] || { bg: "#eff6ff", color: "#2563eb", border: "#dbeafe" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.05em",
      background: st.bg, color: st.color, border: `1px solid ${st.border}`,
    }}>
      {value || "Open"}
    </span>
  );
};

/* Compact KPI card (used for both rows) */
const KPICardNew = ({ title, value, icon: Icon, color = "slate", trend, trendType = "neutral", onClick }) => {
  const theme = ICON_THEMES[color] || ICON_THEMES.slate;
  const tc = trendConfig[trendType] || trendConfig.neutral;
  return (
    <div
      style={s.kpiCard}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "#d4d4d8"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "#e4e4e7"; }}
    >
      <div style={s.kpiTop}>
        <div style={s.iconBadge(theme.bg, theme.color, theme.border)}>
          <Icon size={18} />
        </div>
        {trend && (
          <span style={s.trend(tc.bg, tc.color)}>{trend}</span>
        )}
      </div>
      <div>
        <div style={s.kpiLabel}>{title}</div>
        <div style={s.kpiValue}>{value}</div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Dashboard Component
───────────────────────────────────────────── */
const Dashboard = () => {
  const stats = useDerivedStats();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;

  // --- USE GLOBAL FILTERS ---
  const selectedPlatform = state.activeFilters?.platform || "ALL";
  const selectedProperty = state.activeFilters?.property || "ALL";

  // --- filtered reviews based on selections ---
  const filteredReviews = (state.reviews || []).filter(r => {
    const platformMatch = selectedPlatform === "ALL" || r.platform === selectedPlatform;
    const propertyMatch = selectedProperty === "ALL" || r.hotel_name === selectedProperty;
    return platformMatch && propertyMatch;
  });

  const totalPages = Math.ceil(filteredReviews.length / TABLE_PAGE_SIZE);
  const paginatedReviews = filteredReviews.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);

  const urgentEscalations = [
    ...state.tickets
      .filter(t => t.status === "ESCALATED")
      .map(t => ({ ...t, type: "ticket" })),
    ...filteredReviews
      .filter(r => r.status === "ESCALATED")
      .map(r => ({ ...r, type: "review" }))
  ]
    .sort((a, b) =>
      new Date(b.created_at || b.review_date || 0) -
      new Date(a.created_at || a.review_date || 0)
    )
    .slice(0, 5);

  const recentReviews = filteredReviews.slice(0, 5);

  // --- filtered mini-stats derived from filteredReviews ---
  const filteredStats = {
    totalReviews: filteredReviews.length,
    avgRating: filteredReviews.length
      ? (filteredReviews.reduce((s, r) => s + (r.rating || 0), 0) / filteredReviews.length).toFixed(1)
      : "0.0",
    criticalCount: filteredReviews.filter(r => r.urgency === "High").length,
    escalationRisks: filteredReviews.filter(r => r.escalation_risk).length,
    mixedCount: filteredReviews.filter(r => r.sentiment?.toLowerCase() === "mixed").length,
    neutralCount: filteredReviews.filter(r => r.sentiment?.toLowerCase() === "neutral").length,
    approvedCount: filteredReviews.filter(r => r.status === "Approved" || r.status === "RESPONDED").length,
    positiveCount: filteredReviews.filter(r => r.sentiment?.toLowerCase() === "positive").length,
    negativeCount: filteredReviews.filter(r => r.sentiment?.toLowerCase() === "negative").length,
    escalatedCount: filteredReviews.filter(r => r.status === "ESCALATED" || r.escalation === true).length,
    suspiciousCount: filteredReviews.filter(r => r.status === "Suspicious" || r.is_suspicious === true).length,
    sentimentDistribution: ["Positive", "Negative", "Mixed", "Neutral"].map(name => ({
      name,
      count: filteredReviews.filter(r => r.sentiment === name).length,
    })),
    departmentBreakdown: filteredReviews.reduce((acc, r) => {
      const dept = r.primary_department;
      if (dept) acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {}),
  };

  const trendData = React.useMemo(() => {
    const dates = {};
    const sorted = [...filteredReviews].sort(
      (a, b) => new Date(a.review_date || a.createdAt || 0) - new Date(b.review_date || b.createdAt || 0)
    );
    sorted.forEach(r => {
      const dateVal = r.review_date || r.createdAt;
      if (!dateVal) return;
      const dateStr = new Date(dateVal).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (!dates[dateStr]) dates[dateStr] = { date: dateStr, Positive: 0, Negative: 0, Neutral: 0, Mixed: 0 };
      const sent = r.sentiment || "Neutral";
      if (dates[dateStr][sent] !== undefined) dates[dateStr][sent]++;
    });
    return Object.values(dates);
  }, [filteredReviews]);

  const platformData = React.useMemo(() => {
    const platforms = {};
    filteredReviews.forEach(r => {
      const p = r.platform || "Direct";
      platforms[p] = (platforms[p] || 0) + 1;
    });
    return Object.entries(platforms).map(([name, value]) => ({ name, value }));
  }, [filteredReviews]);

  const PLATFORM_COLORS = [
    "var(--color-indigo-500)",
    "#2563eb",
    "#0ea5e9",
    "#06b6d4",
    "#6366f1"
  ];

  const scrollableStyle = {
    flex: 1,
    overflowY: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: "#e4e4e7 transparent",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── KPI Row 1 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
        {state.isAppLoading ? (
          [1, 2, 3, 4].map(i => <SkeletonKPI key={i} />)
        ) : (
          <>
            <KPICardNew
              title="Total Reviews"
              value={filteredStats.totalReviews}
              icon={MessageSquare}
              color="indigo"
              trend="All channels"
              trendType="neutral"
              onClick={() => navigate("/reviews")}
            />
            <KPICardNew
              title="Avg Rating"
              value={filteredStats.avgRating}
              icon={Star}
              color="amber"
              trend={`${filteredStats.avgRating} / 5`}
              trendType={filteredStats.avgRating >= 4 ? "up" : filteredStats.avgRating >= 3 ? "warn" : "down"}
            />
            <KPICardNew
              title="Escalated"
              value={filteredStats.escalatedCount}
              icon={AlertTriangle}
              color={filteredStats.escalatedCount > 0 ? "red" : "slate"}
              trend={filteredStats.escalatedCount > 0 ? "Needs action" : "All clear"}
              trendType={filteredStats.escalatedCount > 0 ? "down" : "up"}
              onClick={() => navigate("/reviews?tab=Escalated")}
            />
            <KPICardNew
              title="Suspicious"
              value={filteredStats.suspiciousCount}
              icon={Flag}
              color={filteredStats.suspiciousCount > 0 ? "amber" : "slate"}
              trend={filteredStats.suspiciousCount > 0 ? "Under review" : "All clear"}
              trendType={filteredStats.suspiciousCount > 0 ? "warn" : "up"}
              onClick={() => navigate("/reviews?tab=Suspicious")}
            />
          </>
        )}
      </div>

      {/* ── KPI Row 2 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12 }}>
        {state.isAppLoading ? (
          [1, 2, 3, 4, 5].map(i => <SkeletonKPI key={i} />)
        ) : (
          <>
            <KPICardNew title="Positive" value={filteredStats.positiveCount} icon={ThumbsUp} color="green" onClick={() => navigate("/reviews?tab=Positive")} />
            <KPICardNew title="Negative" value={filteredStats.negativeCount} icon={ThumbsDown} color="red" onClick={() => navigate("/reviews?tab=Negative")} />
            <KPICardNew title="Mixed Reviews" value={filteredStats.mixedCount} icon={MessageSquare} color="amber" onClick={() => navigate("/reviews?tab=Mixed")} />
            <KPICardNew title="Neutral" value={filteredStats.neutralCount} icon={TrendingUp} color="slate" onClick={() => navigate("/reviews?tab=Neutral")} />
            <KPICardNew title="Approved" value={filteredStats.approvedCount} icon={CheckCircle2} color="blue" onClick={() => navigate("/reviews?tab=Approved")} />
          </>
        )}
      </div>

      {/* ── Charts Row ── */}
      {!state.isAppLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 12 }}>

          {/* Sentiment Trends */}
          <div style={{ ...s.panel, height: 300 }}>
            <div style={s.panelHead}>
              <div>
                <div style={s.panelTitle}>Sentiment Trends</div>
                <div style={s.panelSub}>Positive vs. Negative sentiment evolution</div>
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                {[["#10b981", "Positive"], ["#ef4444", "Negative"]].map(([color, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#71717a", fontWeight: 500 }}>
                    <div style={{ width: 20, height: 2, borderRadius: 1, background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e4e4e7",
                        borderRadius: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontFamily: "inherit",
                        fontSize: 11,
                      }}
                    />
                    <Area type="monotone" dataKey="Positive" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPositive)" />
                    <Area type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorNegative)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#a1a1aa", fontSize: 12 }}>
                  No data to show trends
                </div>
              )}
            </div>
          </div>

          {/* Platform Share */}
          <div style={{ ...s.panel, height: 300 }}>
            <div style={s.panelHead}>
              <div>
                <div style={s.panelTitle}>Platform Share</div>
                <div style={s.panelSub}>Review distribution across channels</div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {platformData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%" cy="45%"
                      innerRadius={55} outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e4e4e7",
                        borderRadius: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontFamily: "inherit",
                        fontSize: 11,
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconSize={8}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, fontFamily: "inherit", color: "#52525b" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: "#a1a1aa", fontSize: 12 }}>No platform distribution data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Escalations + Recent Reviews ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>

        {/* Urgent Escalations */}
        <div style={{ ...s.panel, height: 440 }}>
          <div style={s.panelHead}>
            <div style={s.panelTitle}>Urgent Escalations</div>
            <span
              style={s.panelLink}
              onClick={() => navigate("/reviews?tab=Escalated")}
              onMouseEnter={e => { e.currentTarget.style.color = "#5b21b6"; e.currentTarget.style.textDecoration = "underline"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#7c3aed"; e.currentTarget.style.textDecoration = "none"; }}
            >
              VIEW ALL
            </span>
          </div>

          <div style={scrollableStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {state.isAppLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <SkeletonBase className="h-20 w-full rounded-xl" />
                  <SkeletonBase className="h-20 w-full rounded-xl" />
                </div>
              ) : urgentEscalations.length > 0 ? (
                urgentEscalations.map((item) => (
                  <div
                    key={item.ticket_id || item.review_id}
                    style={s.escalationItem}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateX(3px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = "#d4d4d8"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "#e4e4e7"; e.currentTarget.style.borderLeftColor = "#ef4444"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={s.escDept}>{item.department || item.primary_department || "General"}</span>
                      <span style={s.escType}>{item.type === "ticket" ? "Ticket" : "Review Risk"}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#09090b", marginBottom: 2 }}>
                      {item.guest_name || item.reviewer_name}
                    </p>
                    <p style={{ fontSize: 11, color: "#71717a", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.review_text}
                    </p>
                    <button
                      onClick={() => navigate(`/reviews?tab=Escalated&highlight=${item.review_id}`)}
                      style={{ ...s.escLink, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                      <ArrowRight size={11} />
                      <span>VIEW DETAILS</span>
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "48px 0", color: "#a1a1aa" }}>
                  <CheckCircle2 size={32} style={{ margin: "0 auto 8px", color: "#10b981", opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>No urgent escalations!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div style={{ ...s.panel, height: 440 }}>
          <div style={s.panelHead}>
            <div style={s.panelTitle}>Recent Reviews</div>
            <span
              style={s.panelLink}
              onClick={() => navigate("/reviews")}
              onMouseEnter={e => { e.currentTarget.style.color = "#5b21b6"; e.currentTarget.style.textDecoration = "underline"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#7c3aed"; e.currentTarget.style.textDecoration = "none"; }}
            >
              VIEW ALL
            </span>
          </div>

          <div style={scrollableStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {state.isAppLoading ? (
                [1, 2, 3, 4].map(i => <SkeletonReview key={i} />)
              ) : recentReviews.length > 0 ? (
                recentReviews.map((r) => {
                  const ratingVal = r.rating || 0;
                  return (
                    <div
                      key={r.review_id}
                      style={s.reviewRow}
                      onClick={() => navigate(`/reviews?highlight=${r.review_id}`)}
                      onMouseEnter={e => { e.currentTarget.style.background = "#f9f9fb"; e.currentTarget.style.borderColor = "#e4e4e7"; e.currentTarget.style.transform = "translateX(2px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = ""; }}
                    >
                      <div style={s.ratingBadge(ratingBg(ratingVal))}>{ratingVal}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#09090b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.reviewer_name}
                          </p>
                          <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 500, flexShrink: 0 }}>
                            {new Date(r.review_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: 10, color: "#a1a1aa", margin: "1px 0 3px" }}>{r.platform}</p>
                        <p style={{ fontSize: 11, color: "#52525b", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {r.review_text}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "48px 0", color: "#a1a1aa" }}>
                  <MessageSquare size={32} style={{ margin: "0 auto 8px", opacity: 0.2 }} />
                  <p style={{ fontSize: 13 }}>No reviews match filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── All Reviews Table ── */}
      <div style={s.tableWrap}>
        <div style={s.tableHeadRow}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#09090b" }}>All Reviews</div>
            <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
              Comprehensive feed of guest reviews across all channels
            </div>
          </div>
          <span style={s.tableCount}>{filteredReviews.length} results</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(249,249,251,.5)", borderBottom: "1px solid #f4f4f5" }}>
                {["Reviewer", "Rating", "Property", "Platform", "Sentiment", "Status", "Date"].map(col => (
                  <th key={col} style={{
                    padding: "10px 16px", textAlign: "left",
                    fontSize: 9, fontWeight: 700, color: "#a1a1aa",
                    textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap",
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", fontSize: 13, color: "#a1a1aa" }}>
                    No reviews match your filters.
                  </td>
                </tr>
              ) : (
                paginatedReviews.map((r) => (
                  <tr
                    key={r._id}
                    style={{ borderBottom: "1px solid #f9f9fb", transition: "background 120ms", cursor: "default" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(249,249,251,.7)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={s.avatarCell}>
                          {r.reviewer_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#09090b" }}>
                            {r.reviewer_name || "Anonymous"}
                          </div>
                          {r.room_number && (
                            <div style={{ fontSize: 10, color: "#a1a1aa" }}>Room {r.room_number}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#09090b" }}>
                        {r.normalised_rating ?? r.rating}
                        <Star size={12} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
                      </div>
                    </td>

                    <td style={{ padding: "11px 16px", fontSize: 11, color: "#71717a", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.hotel_name || "—"}
                    </td>

                    <td style={{ padding: "11px 16px" }}>
                      <span style={s.platBadge}>{r.platform}</span>
                    </td>

                    <td style={{ padding: "11px 16px" }}>
                      <SentimentPill value={r.sentiment} />
                    </td>

                    <td style={{ padding: "11px 16px" }}>
                      <StatusBadge value={r.status} />
                    </td>

                    <td style={{ padding: "11px 16px", fontSize: 11, color: "#a1a1aa" }}>
                      {new Date(r.createdAt || r.imported_at || r.review_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{
            padding: "12px 20px",
            borderTop: "1px solid #f4f4f5",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
          }}>
            <div style={{ fontSize: 11, color: "#71717a" }}>
              Showing{" "}
              <strong style={{ color: "#09090b" }}>{(tablePage - 1) * TABLE_PAGE_SIZE + 1}</strong>
              {" "}to{" "}
              <strong style={{ color: "#09090b" }}>{Math.min(tablePage * TABLE_PAGE_SIZE, filteredReviews.length)}</strong>
              {" "}of{" "}
              <strong style={{ color: "#09090b" }}>{filteredReviews.length}</strong>
              {" "}reviews
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <PgBtn
                label="Previous"
                disabled={tablePage === 1}
                onClick={() => setTablePage(p => Math.max(p - 1, 1))}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PgBtn
                  key={page}
                  label={String(page)}
                  active={tablePage === page}
                  onClick={() => setTablePage(page)}
                  square
                />
              ))}
              <PgBtn
                label="Next"
                disabled={tablePage === totalPages}
                onClick={() => setTablePage(p => Math.min(p + 1, totalPages))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Pagination Button ──────────────────────── */
const PgBtn = ({ label, active, disabled, onClick, square }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: square ? 0 : "4px 10px",
      width: square ? 30 : undefined,
      height: square ? 30 : undefined,
      borderRadius: 8,
      border: `1px solid ${active ? "#09090b" : "#e4e4e7"}`,
      background: active ? "#09090b" : disabled ? "#f4f4f5" : "#fff",
      color: active ? "#fff" : disabled ? "#a1a1aa" : "#3f3f46",
      fontSize: 11, fontWeight: active ? 700 : 500,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 120ms",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
    onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = "#f4f4f5"; }}
    onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = "#fff"; }}
  >
    {label}
  </button>
);

export default Dashboard;