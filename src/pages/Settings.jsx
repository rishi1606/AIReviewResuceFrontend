import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import {
  getHotel, updateHotel, getStaff, addStaff, updateStaff,
  removeStaff, updateMe, runFullAnalysis
} from "../api/apiClient";
import { DEPARTMENTS } from "../utils/constants";
import { SettingsSkeleton } from "../components/Skeleton";
import {
  Hotel, Users, Shield, Settings as SettingsIcon, Plus, Trash2, Save,
  CheckCircle2, Lock, User, X, Sparkles, Loader2, Globe, Mail,
  MapPin, Building2, Filter, Edit2, UserMinus, UserCheck, Search,
  ChevronDown, AlertCircle, Zap, Check, ToggleLeft, ToggleRight,
  Clock, ShieldAlert, AlertTriangle
} from "lucide-react";
import Import from "../pages/Import";

/* ─── Design tokens — matches Dashboard/Reviews palette ─────────────── */
const C = {
  white: "#ffffff",
  bg: "#f8fafc",
  border: "#e4e4e7",
  borderHover: "#d4d4d8",
  borderFocus: "#09090b",
  text: "#09090b",
  textMuted: "#71717a",
  textLabel: "#71717a",
  accent: "#7c3aed",
  accentBg: "#f5f3ff",
  accentBorder: "#ede9fe",
  accentText: "#7c3aed",
  success: "#10b981",
  successBg: "#ecfdf5",
  successBorder: "#d1fae5",
  successText: "#059669",
  warn: "#f59e0b",
  warnBg: "#fffbeb",
  warnBorder: "#fef3c7",
  warnText: "#d97706",
  danger: "#ef4444",
  dangerBg: "#fef2f2",
  dangerBorder: "#fee2e2",
  dangerText: "#dc2626",
  inputBg: "#f9f9fb",
  zinc100: "#f4f4f5",
  zinc200: "#e4e4e7",
  zinc300: "#d4d4d8",
  zinc400: "#a1a1aa",
  zinc500: "#71717a",
  zinc600: "#52525b",
  zinc700: "#3f3f46",
  zinc800: "#27272a",
  zinc900: "#18181b",
  zinc950: "#09090b",
};

/* ─── Field error ────────────────────────────────────────────────────── */
const FieldError = ({ msg }) =>
  msg ? (
    <p style={{ color: C.dangerText, fontSize: 11, fontWeight: 600, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
      <AlertCircle size={11} /> {msg}
    </p>
  ) : null;

/* ─── Banner error ───────────────────────────────────────────────────── */
const BannerError = ({ msg }) =>
  msg ? (
    <div style={{
      background: C.dangerBg, border: `1px solid ${C.dangerBorder}`,
      borderRadius: 12, padding: "12px 16px", display: "flex",
      alignItems: "center", gap: 10, color: C.dangerText, fontWeight: 600, fontSize: 13
    }}>
      <AlertCircle size={15} /> {msg}
    </div>
  ) : null;

/* ─── Banner success ─────────────────────────────────────────────────── */
const BannerSuccess = ({ msg }) =>
  msg ? (
    <div style={{
      background: C.successBg, border: `1px solid ${C.successBorder}`,
      borderRadius: 12, padding: "12px 16px", display: "flex",
      alignItems: "center", gap: 10, color: C.successText, fontWeight: 600, fontSize: 13
    }}>
      <CheckCircle2 size={15} /> {msg}
    </div>
  ) : null;

/* ─── Input ──────────────────────────────────────────────────────────── */
const Input = ({ icon: Icon, error, ...props }) => (
  <div style={{ position: "relative" }}>
    {Icon && (
      <Icon size={15} style={{
        position: "absolute", left: 13, top: "50%",
        transform: "translateY(-50%)", color: C.zinc400, pointerEvents: "none"
      }} />
    )}
    <input
      {...props}
      style={{
        width: "100%",
        padding: Icon ? "11px 14px 11px 38px" : "11px 14px",
        background: props.disabled ? C.zinc100 : C.inputBg,
        border: `1px solid ${error ? C.dangerBorder : C.border}`,
        borderRadius: 12, outline: "none",
        fontWeight: 500, fontSize: 14, color: C.text,
        boxSizing: "border-box", transition: "border-color .15s",
        ...props.style
      }}
      onFocus={e => { if (!props.disabled) e.target.style.borderColor = error ? C.dangerBorder : C.zinc900; e.target.style.background = C.white; }}
      onBlur={e => { e.target.style.borderColor = error ? C.dangerBorder : C.border; e.target.style.background = props.disabled ? C.zinc100 : C.inputBg; }}
    />
  </div>
);

/* ─── Select ─────────────────────────────────────────────────────────── */
const Select = ({ icon: Icon, children, ...props }) => (
  <div style={{ position: "relative" }}>
    {Icon && (
      <Icon size={15} style={{
        position: "absolute", left: 13, top: "50%",
        transform: "translateY(-50%)", color: C.zinc400, pointerEvents: "none"
      }} />
    )}
    <select
      {...props}
      style={{
        width: "100%",
        padding: Icon ? "11px 38px 11px 38px" : "11px 38px 11px 14px",
        background: C.inputBg, border: `1px solid ${C.border}`,
        borderRadius: 12, outline: "none", fontWeight: 500,
        fontSize: 14, color: C.text, appearance: "none",
        boxSizing: "border-box", cursor: "pointer"
      }}
    >
      {children}
    </select>
    <ChevronDown size={14} style={{
      position: "absolute", right: 13, top: "50%",
      transform: "translateY(-50%)", color: C.zinc400, pointerEvents: "none"
    }} />
  </div>
);

/* ─── Label ──────────────────────────────────────────────────────────── */
const Label = ({ children, required }) => (
  <label style={{
    display: "block", fontSize: 10, fontWeight: 700,
    color: C.zinc500, textTransform: "uppercase",
    letterSpacing: "0.07em", marginBottom: 7
  }}>
    {children}{required && <span style={{ color: C.dangerText, marginLeft: 3 }}>*</span>}
  </label>
);

/* ─── Primary button ─────────────────────────────────────────────────── */
const PrimaryBtn = ({ children, loading, style = {}, ...props }) => (
  <button
    {...props}
    style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "11px 24px",
      background: props.disabled ? C.zinc300 : C.zinc950,
      color: "#fff", border: "none", borderRadius: 12,
      fontWeight: 600, fontSize: 13,
      cursor: props.disabled ? "not-allowed" : "pointer",
      transition: "background .15s, transform .15s",
      ...style
    }}
    onMouseEnter={e => { if (!props.disabled) { e.currentTarget.style.background = C.zinc800; e.currentTarget.style.transform = "translateY(-1px)"; } }}
    onMouseLeave={e => { e.currentTarget.style.background = props.disabled ? C.zinc300 : C.zinc950; e.currentTarget.style.transform = ""; }}
  >
    {loading ? <Loader2 size={14} className="animate-spin" /> : children}
  </button>
);

/* ─── Ghost button ───────────────────────────────────────────────────── */
const GhostBtn = ({ children, style = {}, ...props }) => (
  <button
    {...props}
    style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: "11px 20px", background: C.white, color: C.zinc600,
      border: `1px solid ${C.border}`, borderRadius: 12,
      fontWeight: 500, fontSize: 13, cursor: "pointer", transition: "all .15s", ...style
    }}
    onMouseEnter={e => { e.currentTarget.style.background = C.zinc100; e.currentTarget.style.borderColor = C.zinc300; }}
    onMouseLeave={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.border; }}
  >
    {children}
  </button>
);

/* ─── Icon badge ─────────────────────────────────────────────────────── */
const IconBadge = ({ icon: Icon, color = "indigo" }) => {
  const themes = {
    indigo: { bg: C.accentBg, color: C.accentText, border: C.accentBorder },
    green: { bg: C.successBg, color: C.successText, border: C.successBorder },
    amber: { bg: C.warnBg, color: C.warnText, border: C.warnBorder },
    red: { bg: C.dangerBg, color: C.dangerText, border: C.dangerBorder },
    slate: { bg: C.zinc100, color: C.zinc600, border: C.zinc200 },
  };
  const t = themes[color] || themes.indigo;
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: t.bg, color: t.color,
      border: `1px solid ${t.border}`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      <Icon size={18} />
    </div>
  );
};

/* ─── Section header ─────────────────────────────────────────────────── */
const SectionHeader = ({ icon, iconColor, title, subtitle, right }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.zinc100}` }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <IconBadge icon={icon} color={iconColor} />
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{title}</p>
        {subtitle && <p style={{ fontSize: 12, color: C.textMuted, margin: "2px 0 0" }}>{subtitle}</p>}
      </div>
    </div>
    {right && <div>{right}</div>}
  </div>
);

/* ─── Card wrapper ───────────────────────────────────────────────────── */
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.white, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: 24,
    transition: "border-color .15s",
    ...style
  }}>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
const Settings = () => {
  const { state, dispatch } = useAppContext();
  const { currentUser, logout, updateUser } = useAuth();
  const bannerRef = useRef(null);
  const isScopedUser = currentUser?.role === "staff" || currentUser?.role === "dept_head";
  const [activeTab, setActiveTab] = useState(isScopedUser ? "account" : "ai");
  const [loading, setLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", department: "Front Office", role: "staff" });
  const [hotelFields, setHotelFields] = useState(state.hotelConfig || {});
  const [profileFields, setProfileFields] = useState({ name: currentUser?.name || "", email: currentUser?.email || "" });
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");

  useEffect(() => {
    if (state.hotelConfig) setHotelFields(state.hotelConfig);
  }, [state.hotelConfig]);

  const flashSuccess = (msg) => {
    setGlobalSuccess(msg); setGlobalError("");
    setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setTimeout(() => setGlobalSuccess(""), 4000);
  };
  const flashError = (msg) => {
    setGlobalError(msg); setGlobalSuccess("");
    setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setTimeout(() => setGlobalError(""), 5000);
  };

  const genUid = () => "_new_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);

  const updateProperty = (idx, patch) => {
    const updated = hotelFields.properties.map((p, i) => i === idx ? { ...p, ...patch } : p);
    setHotelFields({ ...hotelFields, properties: updated });
  };

  const parseIntervalToMinutes = (val) => {
    if (!val) return 0;
    const m = val.match(/^(\d+)min$/); if (m) return parseInt(m[1]);
    const h = val.match(/^(\d+)hr$/); if (h) return parseInt(h[1]) * 60;
    return 0;
  };

  const getSyncTimeAgo = (ts) => {
    if (!ts) return "Never";
    const diff = Date.now() - new Date(ts);
    if (isNaN(diff) || diff < 0) return "Never";
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const validateSettings = () => {
    const e = {};
    if (activeTab === "hotel") {
      if (!hotelFields.hotel_name || hotelFields.hotel_name.length < 3) e.hotel_name = "Hotel name must be at least 3 characters";
      if (!hotelFields.number_of_rooms || isNaN(hotelFields.number_of_rooms)) e.number_of_rooms = "Valid number of rooms is required";
      if (!hotelFields.city) e.city = "City is required";
    }
    if (activeTab === "ai") {
      const { high, medium, low } = hotelFields.slaConfig || {};
      if (parseInt(high) >= parseInt(medium)) e.sla = "High SLA must be less than Medium SLA";
      if (parseInt(medium) >= parseInt(low)) e.sla = "Medium SLA must be less than Low SLA";
    }
    if (activeTab === "properties") {
      const props = hotelFields.properties || [];
      const allUrls = [];
      for (let i = 0; i < props.length; i++) {
        const p = props[i];
        if (!p.name) { e.properties = `Property ${i + 1}: name required`; break; }
        if (!p.city) { e.properties = `Property ${i + 1}: city required`; break; }
        if (!p.rooms) { e.properties = `Property ${i + 1}: rooms required`; break; }
        const urgentMins = parseIntervalToMinutes(p.urgent_sync_interval || "5hr");
        const lowMins = parseIntervalToMinutes(p.low_sync_interval || "10hr");
        if (lowMins <= urgentMins) { e.properties = "Low urgency sync must be less frequent than high urgency sync"; break; }
        let hasUrl = false;
        if (p.platforms) {
          for (const [plat, url] of Object.entries(p.platforms)) {
            if (url) {
              if (!url.startsWith("http")) { e.properties = `Invalid URL for ${plat} in property ${p.name || i + 1}`; break; }
              hasUrl = true;
              if (allUrls.includes(url)) { e.properties = `Duplicate URL: ${url}`; break; }
              allUrls.push(url);
            }
          }
        }
        if (!hasUrl) { e.properties = `Property ${p.name || i + 1} needs at least one platform URL`; break; }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveHotel = async (fromPropertyCard = false) => {
    if (!validateSettings()) { flashError("Please fix the errors below before saving."); return; }
    if (!fromPropertyCard) setLoading(true);
    try {
      const res = await updateHotel(hotelFields);
      dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: res.data });
      flashSuccess("Settings saved successfully!");
    } catch (err) { flashError(err.message); }
    finally { if (!fromPropertyCard) setLoading(false); }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editingStaff) {
        const res = await updateStaff(editingStaff._id, newStaff);
        dispatch({ type: "UPDATE_STAFF_MEMBER", payload: res.data });
      } else {
        const res = await addStaff(newStaff);
        dispatch({ type: "ADD_STAFF_MEMBER", payload: res.data });
      }
      setIsModalOpen(false); setEditingStaff(null);
      flashSuccess("Staff member saved!");
    } catch (err) { flashError(err.message); }
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await updateMe(profileFields);
      updateUser(res.data); flashSuccess("Profile updated!");
    } catch (err) { flashError(err.message); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: "hotel", name: "Hotel Profile", icon: Building2 },
    { id: "properties", name: "Properties", icon: Hotel },
    { id: "ai", name: "Rules", icon: Shield },
    { id: "account", name: "Account", icon: User },
  ];
  const visibleTabs = tabs.filter(t => !isScopedUser || t.id === "account");
  const departments = DEPARTMENTS;

  if (state.isAppLoading) return <SettingsSkeleton />;

  /* ── inline small input style (for property cards) ── */
  const propInput = (extraStyle = {}) => ({
    width: "100%", padding: "10px 13px",
    background: C.inputBg, border: `1px solid ${C.border}`,
    borderRadius: 10, outline: "none", fontSize: 13,
    fontWeight: 500, color: C.text, boxSizing: "border-box",
    transition: "border-color .15s", ...extraStyle
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>

      {/* ── Tab Bar ── */}
      <div style={{
        display: "flex", gap: 4, padding: "4px",
        background: C.white, borderRadius: 14,
        border: `1px solid ${C.border}`,
        width: "fit-content"
      }}>
        {visibleTabs.map(t => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setErrors({}); setGlobalError(""); setGlobalSuccess(""); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", borderRadius: 10, border: "none",
                cursor: "pointer", fontWeight: active ? 700 : 500,
                fontSize: 13, whiteSpace: "nowrap", transition: "all .15s",
                background: active ? C.zinc950 : "transparent",
                color: active ? "#fff" : C.zinc500,
              }}
            >
              <t.icon size={14} /> {t.name}
            </button>
          );
        })}
      </div>

      {/* ── Banners ── */}
      {(globalError || globalSuccess) && (
        <div ref={bannerRef} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <BannerError msg={globalError} />
          <BannerSuccess msg={globalSuccess} />
        </div>
      )}

      {/* ── Main Card ── */}
      <Card>

        {/* ════ HOTEL PROFILE ════ */}
        {activeTab === "hotel" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionHeader icon={Building2} iconColor="indigo" title="Hotel Profile" subtitle="Public information and core property settings" />

            <div>
              <Label required>Hotel Name</Label>
              <Input icon={Building2} error={errors.hotel_name}
                type="text" placeholder="Grand Plaza Hotel"
                value={hotelFields.hotel_name || ""}
                onChange={e => setHotelFields({ ...hotelFields, hotel_name: e.target.value })} />
              <FieldError msg={errors.hotel_name} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <Label required>City</Label>
                <Input icon={MapPin} error={errors.city}
                  type="text" placeholder="New York"
                  value={hotelFields.city || ""}
                  onChange={e => setHotelFields({ ...hotelFields, city: e.target.value })} />
                <FieldError msg={errors.city} />
              </div>
              <div>
                <Label required>Property Size (Rooms)</Label>
                <Input icon={Hotel} error={errors.number_of_rooms}
                  type="number" placeholder="150"
                  value={hotelFields.number_of_rooms || ""}
                  onChange={e => setHotelFields({ ...hotelFields, number_of_rooms: e.target.value })} />
                <FieldError msg={errors.number_of_rooms} />
              </div>
              <div>
                <Label>Operational Timezone</Label>
                <Select icon={Globe}
                  value={hotelFields.timezone || "IST"}
                  onChange={e => setHotelFields({ ...hotelFields, timezone: e.target.value })}>
                  <option value="IST">IST (New Delhi / Mumbai)</option>
                </Select>
              </div>
            </div>

            <div>
              <Label>Active Review Platforms</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {["Agoda", "Booking.com", "Google Hotels", "Airbnb"].map(p => (
                  <span key={p} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 14px", background: C.accentBg,
                    color: C.accentText, borderRadius: 999,
                    fontSize: 12, fontWeight: 600,
                    border: `1px solid ${C.accentBorder}`
                  }}>
                    <CheckCircle2 size={12} /> {p}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.zinc400, marginTop: 7 }}>
                Platform links are configured per-property in the Properties tab.
              </p>
            </div>

            <div style={{ paddingTop: 16, borderTop: `1px solid ${C.zinc100}` }}>
              <PrimaryBtn loading={loading} onClick={handleSaveHotel}>
                <Save size={14} /> Update Property Profile
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* ════ PROPERTIES ════ */}
        {activeTab === "properties" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionHeader
              icon={Hotel} iconColor="indigo"
              title="Properties"
              subtitle="Manage hotel properties and their review platform links"
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.zinc400 }}>
                    {(hotelFields.properties || []).length} / 3
                  </span>
                  <PrimaryBtn style={{ padding: "9px 16px", fontSize: 12 }}
                    onClick={() => {
                      const cur = hotelFields.properties || [];
                      if (cur.length >= 3) { flashError("Maximum 3 properties allowed."); return; }
                      setHotelFields({
                        ...hotelFields, properties: [
                          { _uid: genUid(), name: "", city: "", rooms: "", timezone: "IST", is_active: true, platforms: {}, urgent_sync_interval: "5hr", low_sync_interval: "10hr" },
                          ...cur.map(p => ({ ...p }))
                        ]
                      });
                    }}>
                    <Plus size={13} /> Add Property
                  </PrimaryBtn>
                </div>
              }
            />

            <BannerError msg={errors.properties} />

            {(hotelFields.properties || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: C.accentBg, display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 14px", color: C.accentText
                }}>
                  <Building2 size={24} />
                </div>
                <p style={{ fontWeight: 700, color: C.text, margin: 0 }}>No properties yet</p>
                <p style={{ color: C.zinc400, fontSize: 13, marginTop: 5 }}>Add your first property to start collecting reviews</p>
                <PrimaryBtn style={{ margin: "18px auto 0" }}
                  onClick={() => setHotelFields({
                    ...hotelFields, properties: [{
                      _uid: genUid(), name: "", city: "", rooms: "", timezone: "IST", is_active: true,
                      platforms: {}, urgent_sync_interval: "5hr", low_sync_interval: "10hr"
                    }]
                  })}>
                  <Plus size={13} /> Add Property
                </PrimaryBtn>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px,1fr))", gap: 16 }}>
                {(hotelFields.properties || []).map((prop, idx) => (
                  <div key={prop._uid || prop._id || idx} style={{
                    background: C.white, borderRadius: 16,
                    border: `1px solid ${C.border}`,
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                    transition: "border-color .15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.zinc300}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    {/* Card Header */}
                    <div style={{
                      padding: "16px 20px",
                      borderBottom: `1px solid ${C.zinc100}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: C.inputBg
                    }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: C.white, border: `1px solid ${C.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
                        }}>🏨</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{
                            padding: "2px 9px",
                            background: prop.is_active ? C.successBg : C.zinc100,
                            color: prop.is_active ? C.successText : C.zinc500,
                            border: `1px solid ${prop.is_active ? C.successBorder : C.zinc200}`,
                            borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: "uppercase"
                          }}>
                            {prop.is_active ? "● Active" : "○ Inactive"}
                          </span>
                          <span style={{
                            padding: "2px 9px", background: C.accentBg,
                            color: C.accentText, border: `1px solid ${C.accentBorder}`,
                            borderRadius: 999, fontSize: 10, fontWeight: 700
                          }}>
                            {state.reviews?.filter(r => r.hotel_name === prop.name).length || 0} reviews
                          </span>
                        </div>
                      </div>
                      <button style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                        onClick={() => updateProperty(idx, { is_active: !prop.is_active })}>
                        {prop.is_active
                          ? <ToggleRight size={28} color={C.accentText} />
                          : <ToggleLeft size={28} color={C.zinc300} />}
                      </button>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>

                      {/* Property Name */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: C.zinc500, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            Property Name
                          </label>
                          {state.reviews?.filter(r => r.hotel_name === prop.name).length > 0 && (() => {
                            const count = state.reviews.filter(r => r.hotel_name === prop.name).length;
                            return (
                              <div style={{ position: "relative", display: "inline-flex" }}
                                onMouseEnter={e => e.currentTarget.querySelector(".prop-tooltip").style.display = "block"}
                                onMouseLeave={e => e.currentTarget.querySelector(".prop-tooltip").style.display = "none"}
                              >
                                <AlertCircle size={12} color={C.warnText} style={{ cursor: "pointer" }} />
                                <div className="prop-tooltip" style={{
                                  display: "none", position: "absolute",
                                  bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                                  background: "#1E293B", color: "#fff",
                                  fontSize: 11, fontWeight: 500, lineHeight: 1.5,
                                  padding: "10px 14px", borderRadius: 10, width: 220,
                                  zIndex: 99, boxShadow: "0 4px 16px rgba(0,0,0,.18)", pointerEvents: "none"
                                }}>
                                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: C.warnText }}>⚠ {count} review{count > 1 ? "s" : ""} linked</p>
                                  <p style={{ margin: 0, color: "#CBD5E1" }}>Renaming this property may unlink existing reviews.</p>
                                  <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 10, height: 10, background: "#1E293B", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <input type="text" value={prop.name} placeholder="e.g. The Grand Palace"
                          onChange={e => updateProperty(idx, { name: e.target.value })}
                          style={propInput({ fontWeight: 600 })}
                          onFocus={e => e.target.style.borderColor = C.zinc900}
                          onBlur={e => e.target.style.borderColor = C.border} />
                      </div>

                      {/* City + Rooms */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.zinc500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>City</label>
                          <input type="text" value={prop.city} placeholder="Mumbai"
                            onChange={e => updateProperty(idx, { city: e.target.value })}
                            style={propInput()}
                            onFocus={e => e.target.style.borderColor = C.zinc900}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.zinc500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Rooms</label>
                          <input type="number" value={prop.rooms || ""} placeholder="150"
                            onChange={e => updateProperty(idx, { rooms: e.target.value ? parseInt(e.target.value) : "" })}
                            style={propInput()}
                            onFocus={e => e.target.style.borderColor = C.zinc900}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                      </div>

                      {/* Platform Links */}
                      <div style={{ paddingTop: 14, borderTop: `1px solid ${C.zinc100}` }}>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.zinc500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                          Platform Links
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {["Google", "Booking.com", "Agoda", "Airbnb"].map(platform => {
                            const url = (prop.platforms && prop.platforms[platform]) || "";
                            const isValid = url.startsWith("http");
                            const isErr = url.length > 0 && !isValid;
                            const platColors = { "Google": "#4285F4", "Booking.com": "#003580", "Agoda": "#E21B23", "Airbnb": "#FF5A5F" };
                            return (
                              <div key={platform}>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: platColors[platform] || C.zinc400, marginBottom: 3 }}>
                                  {platform}
                                </label>
                                <div style={{ position: "relative" }}>
                                  <input type="url" value={url}
                                    placeholder={`Paste ${platform} review URL…`}
                                    onChange={e => updateProperty(idx, { platforms: { ...(prop.platforms || {}), [platform]: e.target.value } })}
                                    style={{
                                      ...propInput({ paddingRight: 36 }),
                                      background: url && isValid ? "#f0fdf4" : C.inputBg,
                                      borderColor: isErr ? C.dangerBorder : url && isValid ? C.successBorder : C.border,
                                    }}
                                    onFocus={e => e.target.style.borderColor = isErr ? C.dangerBorder : C.zinc900}
                                    onBlur={e => e.target.style.borderColor = isErr ? C.dangerBorder : url && isValid ? C.successBorder : C.border} />
                                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                                    {url && isValid && <CheckCircle2 size={13} color={C.success} />}
                                    {!url && <span style={{ fontSize: 9, color: C.warnText, fontWeight: 700 }}>Not connected</span>}
                                    {url && (isValid || isErr) && (
                                      <X size={13} color={isErr ? C.dangerText : C.zinc400} style={{ cursor: "pointer", marginLeft: 4 }}
                                        onClick={() => updateProperty(idx, { platforms: { ...(prop.platforms || {}), [platform]: "" } })} />
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sync Settings */}
                      <div style={{ paddingTop: 14, borderTop: `1px solid ${C.zinc100}` }}>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.zinc500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                          Sync Settings
                        </label>
                        <div style={{ padding: "10px 14px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: C.zinc400, margin: "0 0 3px", textTransform: "uppercase" }}>Review Sync Schedule (1–5★)</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Every 6 hrs</p>
                          <p style={{ fontSize: 10, color: C.zinc400, margin: "2px 0 0" }}>🔒 Sync frequency is fixed and cannot be changed</p>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.zinc500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
                            Max Reviews per Sync <span style={{ fontWeight: 400, textTransform: "none", fontSize: 10, color: C.zinc400 }}>(per platform)</span>
                          </label>
                          <div style={{ position: "relative" }}>
                            <select value={prop.max_reviews_per_sync || 10}
                              onChange={e => updateProperty(idx, { max_reviews_per_sync: parseInt(e.target.value) })}
                              style={{ ...propInput({ paddingRight: 36 }), appearance: "none", cursor: "pointer" }}>
                              <option value={5}>5 reviews</option>
                              <option value={10}>10 reviews</option>
                              <option value={20}>20 reviews</option>
                            </select>
                            <ChevronDown size={13} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: C.zinc400, pointerEvents: "none" }} />
                          </div>
                        </div>
                      </div>

                      {/* Sync Status */}
                      <div style={{
                        padding: "11px 14px", background: C.inputBg,
                        borderRadius: 10, border: `1px solid ${C.border}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: C.zinc400, margin: "0 0 2px", textTransform: "uppercase" }}>Last Synced</p>
                          <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>
                            {getSyncTimeAgo(prop.last_sync_time)}
                            {prop.last_sync_status === "success" && <span style={{ fontSize: 10, color: C.successText, marginLeft: 6 }}>— Synced ✓</span>}
                          </p>
                        </div>
                        {(!prop.last_sync_status || prop.last_sync_status === "never") && (
                          <span style={{ padding: "3px 10px", background: C.warnBg, color: C.warnText, border: `1px solid ${C.warnBorder}`, borderRadius: 999, fontSize: 9, fontWeight: 700 }}>⚠️ Not verified</span>
                        )}
                        {prop.last_sync_status === "success" && (
                          <span style={{ padding: "3px 10px", background: C.successBg, color: C.successText, border: `1px solid ${C.successBorder}`, borderRadius: 999, fontSize: 9, fontWeight: 700 }}>✅ Connected</span>
                        )}
                        {prop.last_sync_status === "failed" && (
                          <span style={{ padding: "3px 10px", background: C.dangerBg, color: C.dangerText, border: `1px solid ${C.dangerBorder}`, borderRadius: 999, fontSize: 9, fontWeight: 700 }}>❌ Sync Failed</span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div style={{
                      padding: "14px 20px", borderTop: `1px solid ${C.zinc100}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: C.inputBg
                    }}>
                      <button
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 13px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.zinc500, transition: "all .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = C.dangerText; e.currentTarget.style.background = C.dangerBg; e.currentTarget.style.borderColor = C.dangerBorder; }}
                        onMouseLeave={e => { e.currentTarget.style.color = C.zinc500; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = C.border; }}
                        onClick={async () => {
                          if (!window.confirm("Delete this property?")) return;
                          const p = [...hotelFields.properties]; p.splice(idx, 1);
                          const updated = { ...hotelFields, properties: p };
                          setHotelFields(updated); setLoading(true);
                          try { const res = await updateHotel(updated); dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: res.data }); flashSuccess("Property deleted."); }
                          catch (err) { flashError(err.message); }
                          finally { setLoading(false); }
                        }}>
                        <Trash2 size={12} /> Delete
                      </button>
                      <PrimaryBtn
                        loading={savingIdx === idx}
                        style={{ padding: "8px 18px", fontSize: 12 }}
                        onClick={async () => { setSavingIdx(idx); await handleSaveHotel(true); setSavingIdx(null); }}>
                        <Save size={12} /> Save Property
                      </PrimaryBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ RULES / AI ════ */}
        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionHeader icon={Shield} iconColor="indigo" title="Rules & AI Settings" subtitle="Automation confidence and review controls" />

            {/* AI Confidence Card */}
            <Card style={{ border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <IconBadge icon={Zap} color="indigo" />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Insights & Proposals</p>
                  <p style={{ fontSize: 12, color: C.zinc400, margin: "2px 0 0" }}>AI automation confidence & review controls</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Confidence Threshold</p>
                  <p style={{ fontSize: 12, color: C.zinc400, margin: "3px 0 0" }}>Minimum AI confidence for auto-approval</p>
                </div>
                <div style={{ padding: "8px 18px", background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 12 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: C.accentText }}>
                    {hotelFields.aiConfig?.confidenceThreshold || 75}%
                  </span>
                </div>
              </div>

              <input type="range" min="0" max="100"
                value={hotelFields.aiConfig?.confidenceThreshold || 75}
                onChange={e => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), confidenceThreshold: e.target.value } })}
                style={{ width: "100%", accentColor: C.accentText, cursor: "pointer", height: 5 }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.zinc400, fontWeight: 600, marginTop: 5 }}>
                {["0%", "25%", "50%", "75%", "100%"].map(v => <span key={v}>{v}</span>)}
              </div>

              <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: C.warnBg, border: `1px solid ${C.warnBorder}`, display: "flex", gap: 10 }}>
                <AlertCircle size={16} color={C.warnText} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.warnText, margin: 0 }}>Threshold Impact</p>
                  <p style={{ fontSize: 12, color: "#92400E", marginTop: 3 }}>
                    Reviews below <strong>{hotelFields.aiConfig?.confidenceThreshold || 75}%</strong> confidence will be flagged for manual review and won't be auto-approved.
                  </p>
                </div>
              </div>
            </Card>

            {/* Safety Rules Card */}
            <Card style={{ border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <ShieldAlert size={18} color={C.accentText} />
                <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Automated Safety Rules</p>
              </div>
              <div style={{ padding: "14px 18px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 700, color: C.text, margin: 0, fontSize: 14 }}>Auto-Escalate Rating</p>
                  <p style={{ fontSize: 12, color: C.zinc400, marginTop: 3 }}>Automatically flag reviews at or below this rating</p>
                  <p style={{ fontSize: 11, color: C.zinc400, marginTop: 2 }}>
                    ≡ Booking.com / Agoda equivalent:{" "}
                    <strong style={{ color: C.accentText }}>≤ {((hotelFields.aiConfig?.escalationRatingThreshold || 2) * 2)} / 10</strong>
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.zinc400 }}>≤</span>
                  <input type="number" min="1" max="5"
                    value={hotelFields.aiConfig?.escalationRatingThreshold || 2}
                    onChange={e => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), escalationRatingThreshold: e.target.value } })}
                    style={{
                      width: 56, padding: "9px 0", textAlign: "center",
                      background: C.white, border: `1px solid ${C.accentBorder}`,
                      borderRadius: 10, fontWeight: 800, fontSize: 18,
                      color: C.accentText, outline: "none"
                    }} />
                </div>
              </div>
            </Card>

            {errors.sla && <FieldError msg={errors.sla} />}

            <PrimaryBtn loading={loading} onClick={handleSaveHotel} style={{ width: "100%", padding: "13px" }}>
              <Check size={15} /> Save AI & Rules
            </PrimaryBtn>
          </div>
        )}

        {/* ════ ACCOUNT ════ */}
        {activeTab === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionHeader icon={User} iconColor="indigo" title="Account Settings" subtitle="Update your display name and email address" />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Label>Display Name</Label>
                <Input type="text" value={profileFields.name}
                  onChange={e => setProfileFields({ ...profileFields, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input disabled icon={Mail} type="email" value={profileFields.email}
                  onChange={e => setProfileFields({ ...profileFields, email: e.target.value })} />
              </div>
            </div>

            <div style={{ paddingTop: 16, borderTop: `1px solid ${C.zinc100}` }}>
              <PrimaryBtn loading={loading} onClick={handleSaveProfile}>
                <Save size={14} /> Update Profile
              </PrimaryBtn>
            </div>
          </div>
        )}

        {activeTab === "import" && <Import />}

        {/* ════ STAFF (hidden but preserved) ════ */}
        {activeTab === "staff" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionHeader
              icon={Users} iconColor="indigo"
              title="Staff Management"
              subtitle="Manage team members, roles and permissions"
              right={
                <PrimaryBtn style={{ padding: "9px 16px", fontSize: 12 }}
                  onClick={() => { setEditingStaff(null); setNewStaff({ name: "", email: "", password: "", department: "Front Office", role: "staff" }); setIsModalOpen(true); }}>
                  <Plus size={13} /> Add Member
                </PrimaryBtn>
              }
            />

            {(state.staff || []).map(member => (
              <div key={member._id} style={{
                padding: 16, background: C.white,
                border: `1px solid ${C.border}`, borderRadius: 14,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                opacity: member.status === "disabled" ? 0.55 : 1,
                transition: "border-color .15s"
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.zinc300}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: member.status === "disabled" ? C.zinc100 : C.accentBg,
                    color: member.status === "disabled" ? C.zinc400 : C.accentText,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 16
                  }}>
                    {(member.avatar_initials || member.name[0])}
                  </div>
                  <div>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>{member.name}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                        background: member.role === "gm" ? "#fef9c3" : member.role === "dept_head" ? C.accentBg : C.zinc100,
                        color: member.role === "gm" ? "#854D0E" : member.role === "dept_head" ? C.accentText : C.zinc500
                      }}>
                        {member.role === "gm" ? "GM" : member.role === "dept_head" ? "Dept Head" : "Staff"}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: C.zinc400, margin: "3px 0 0" }}>
                      {member.email} · <span style={{ color: C.accentText, fontWeight: 600 }}>{member.department}</span>
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { icon: <Edit2 size={14} />, action: () => { setEditingStaff(member); setNewStaff({ name: member.name, email: member.email, password: "", department: member.department, role: member.role }); setIsModalOpen(true); } },
                    { icon: member.status === "active" ? <UserMinus size={14} /> : <UserCheck size={14} />, action: async () => { const res = await updateStaff(member._id, { status: member.status === "active" ? "disabled" : "active" }); dispatch({ type: "UPDATE_STAFF_MEMBER", payload: res.data }); } },
                    { icon: <Trash2 size={14} />, disabled: member.role === "gm", action: async () => { if (member.role === "gm") { flashError("Cannot delete GM"); return; } if (!window.confirm("Delete?")) return; await removeStaff(member._id); dispatch({ type: "REMOVE_STAFF_MEMBER", payload: member._id }); } }
                  ].map((btn, i) => (
                    <button key={i} disabled={btn.disabled} onClick={btn.action}
                      style={{ padding: 8, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, cursor: btn.disabled ? "not-allowed" : "pointer", color: C.zinc400, opacity: btn.disabled ? 0.3 : 1, display: "flex", alignItems: "center", transition: "all .15s" }}
                      onMouseEnter={e => { if (!btn.disabled) { e.currentTarget.style.background = C.zinc100; e.currentTarget.style.color = C.text; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.zinc400; }}>
                      {btn.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ════ STAFF MODAL ════ */}
      {isModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, background: "rgba(9,9,11,.4)", backdropFilter: "blur(4px)"
        }}>
          <div style={{ background: C.white, borderRadius: 20, width: "100%", maxWidth: 520, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.zinc100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</p>
                <p style={{ fontSize: 12, color: C.zinc400, margin: "2px 0 0" }}>Configure permissions and departmental access</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.zinc400, padding: 4, borderRadius: 8, display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStaffSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Label required>Full Name</Label>
                <Input type="text" required value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: editingStaff ? "1fr" : "1fr 1fr", gap: 14 }}>
                <div>
                  <Label required>Email</Label>
                  <Input icon={Mail} type="email" required value={newStaff.email}
                    onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} />
                </div>
                {!editingStaff && (
                  <div>
                    <Label required>Password</Label>
                    <Input type="password" required placeholder="••••••••"
                      value={newStaff.password || ""}
                      onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />
                  </div>
                )}
              </div>
              <div>
                <Label>Department</Label>
                <Select value={newStaff.department} onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
              <div>
                <Label>Access Level</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { role: "staff", label: "Standard Staff", desc: "Can view reviews and create tickets." },
                    { role: "dept_head", label: "Department Head", desc: "Can approve AI proposals and assign tasks." }
                  ].map(opt => (
                    <button type="button" key={opt.role}
                      onClick={() => setNewStaff({ ...newStaff, role: opt.role })}
                      style={{
                        padding: 14, borderRadius: 12, textAlign: "left",
                        border: `1.5px solid ${newStaff.role === opt.role ? C.zinc950 : C.border}`,
                        background: newStaff.role === opt.role ? C.zinc950 : C.white,
                        cursor: "pointer", transition: "all .15s"
                      }}>
                      <p style={{ fontWeight: 700, margin: 0, fontSize: 13, color: newStaff.role === opt.role ? "#fff" : C.text }}>{opt.label}</p>
                      <p style={{ fontSize: 11, color: newStaff.role === opt.role ? "rgba(255,255,255,.6)" : C.zinc400, margin: "3px 0 0" }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
                <GhostBtn type="button" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</GhostBtn>
                <PrimaryBtn loading={loading} style={{ flex: 1 }}>
                  {editingStaff ? "Update Member" : "Add Member"}
                </PrimaryBtn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;