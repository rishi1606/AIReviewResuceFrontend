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
import Import from "../pages/Import"

/* ─── Shared token palette (pastel / soft) ────────────────────────────── */
const C = {
  pageBg: "#F6F7FB",
  cardBg: "#FFFFFF",
  border: "#E8EBF4",
  borderFocus: "#A5B4FC",
  textPrimary: "#2D3A5A",
  textMuted: "#8892AA",
  textLabel: "#6B7899",
  accent: "#6366F1",
  accentSoft: "#EEF0FD",
  accentText: "#4F46E5",
  success: "#22C55E",
  successSoft: "#F0FDF4",
  successBorder: "#BBF7D0",
  warn: "#F59E0B",
  warnSoft: "#FFFBEB",
  warnBorder: "#FDE68A",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
  tabActive: "#EEF0FD",
  inputBg: "#F8F9FC",
};

/* ─── Inline field error ─────────────────────────────────────────────── */
const FieldError = ({ msg }) =>
  msg ? (
    <p style={{
      color: C.danger, fontSize: 11, fontWeight: 700,
      marginTop: 5, display: "flex", alignItems: "center", gap: 4
    }}>
      <AlertCircle size={12} /> {msg}
    </p>
  ) : null;

/* ─── Banner error ───────────────────────────────────────────────────── */
const BannerError = ({ msg }) =>
  msg ? (
    <div style={{
      background: C.dangerSoft, border: `1px solid ${C.dangerBorder}`,
      borderRadius: 14, padding: "12px 16px", display: "flex",
      alignItems: "center", gap: 10, color: C.danger,
      fontWeight: 700, fontSize: 13
    }}>
      <AlertCircle size={16} /> {msg}
    </div>
  ) : null;

/* ─── Banner success ─────────────────────────────────────────────────── */
const BannerSuccess = ({ msg }) =>
  msg ? (
    <div style={{
      background: C.successSoft, border: `1px solid ${C.successBorder}`,
      borderRadius: 14, padding: "12px 16px", display: "flex",
      alignItems: "center", gap: 10, color: "#15803D",
      fontWeight: 700, fontSize: 13
    }}>
      <CheckCircle2 size={16} /> {msg}
    </div>
  ) : null;

/* ─── Input ──────────────────────────────────────────────────────────── */
const Input = ({ icon: Icon, error, ...props }) => (
  <div style={{ position: "relative" }}>
    {Icon && (
      <Icon size={17} style={{
        position: "absolute", left: 14,
        top: "50%", transform: "translateY(-50%)", color: C.textMuted, pointerEvents: "none"
      }} />
    )}
    <input
      {...props}
      style={{
        width: "100%", padding: Icon ? "13px 14px 13px 42px" : "13px 14px",
        background: C.inputBg,
        border: `1.5px solid ${error ? C.danger : C.border}`,
        borderRadius: 14, outline: "none", fontWeight: 600,
        fontSize: 14, color: C.textPrimary, boxSizing: "border-box",
        transition: "border-color .2s",
        ...props.style
      }}
      onFocus={e => { e.target.style.borderColor = error ? C.danger : C.borderFocus }}
      onBlur={e => { e.target.style.borderColor = error ? C.danger : C.border }}
    />
  </div>
);

/* ─── Select ─────────────────────────────────────────────────────────── */
const Select = ({ icon: Icon, children, ...props }) => (
  <div style={{ position: "relative" }}>
    {Icon && (
      <Icon size={17} style={{
        position: "absolute", left: 14,
        top: "50%", transform: "translateY(-50%)", color: C.textMuted, pointerEvents: "none"
      }} />
    )}
    <select
      {...props}
      style={{
        width: "100%", padding: Icon ? "13px 42px 13px 42px" : "13px 42px 13px 14px",
        background: C.inputBg, border: `1.5px solid ${C.border}`,
        borderRadius: 14, outline: "none", fontWeight: 600,
        fontSize: 14, color: C.textPrimary, appearance: "none",
        boxSizing: "border-box", cursor: "pointer"
      }}
    >
      {children}
    </select>
    <ChevronDown size={15} style={{
      position: "absolute", right: 14,
      top: "50%", transform: "translateY(-50%)", color: C.textMuted, pointerEvents: "none"
    }} />
  </div>
);

/* ─── Label ──────────────────────────────────────────────────────────── */
const Label = ({ children, required }) => (
  <label style={{
    display: "block", fontSize: 11, fontWeight: 800,
    color: C.textLabel, textTransform: "uppercase",
    letterSpacing: "0.08em", marginBottom: 8
  }}>
    {children} {required && <span style={{ color: C.danger }}>*</span>}
  </label>
);

/* ─── PrimaryButton ──────────────────────────────────────────────────── */
const PrimaryBtn = ({ children, loading, style = {}, ...props }) => (
  <button
    {...props}
    style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "13px 28px", background: C.accent, color: "#fff",
      border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14,
      cursor: props.disabled ? "not-allowed" : "pointer",
      opacity: props.disabled ? 0.6 : 1,
      boxShadow: "0 4px 14px rgba(99,102,241,.25)",
      transition: "all .2s", ...style
    }}
    onMouseEnter={e => { if (!props.disabled) e.currentTarget.style.background = "#4F46E5" }}
    onMouseLeave={e => { e.currentTarget.style.background = C.accent }}
  >
    {loading ? <Loader2 size={16} className="animate-spin" /> : children}
  </button>
);

/* ─── GhostBtn ───────────────────────────────────────────────────────── */
const GhostBtn = ({ children, style = {}, ...props }) => (
  <button
    {...props}
    style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: "11px 20px", background: "transparent", color: C.textMuted,
      border: `1.5px solid ${C.border}`, borderRadius: 14, fontWeight: 600,
      fontSize: 13, cursor: "pointer", transition: "all .15s", ...style
    }}
    onMouseEnter={e => { e.currentTarget.style.background = C.inputBg }}
    onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
  >
    {children}
  </button>
);

/* ──────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────────────── */
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
  const [newStaff, setNewStaff] = useState({
    name: "", email: "", password: "", department: "Front Office", role: "staff"
  });
  const [hotelFields, setHotelFields] = useState(state.hotelConfig || {});
  const [profileFields, setProfileFields] = useState({
    name: currentUser?.name || "", email: currentUser?.email || ""
  });
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");

  useEffect(() => {
    if (state.hotelConfig) setHotelFields(state.hotelConfig);
  }, [state.hotelConfig]);

  const flashSuccess = (msg) => {
    setGlobalSuccess(msg);
    setGlobalError("");
    setTimeout(() => {
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setGlobalSuccess(""), 4000);
  };

  const flashError = (msg) => {
    setGlobalError(msg);
    setGlobalSuccess("");
    setTimeout(() => {
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setGlobalError(""), 5000);
  };

  /* ─── Unique ID generator for new properties ──────────────────────── */
  const genUid = () => "_new_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);

  /* ─── Immutable property update helper ─────────────────────────────── */
  const updateProperty = (idx, patch) => {
    const updated = hotelFields.properties.map((p, i) =>
      i === idx ? { ...p, ...patch } : p
    );
    setHotelFields({ ...hotelFields, properties: updated });
  };

  const parseIntervalToMinutes = (val) => {
    if (!val) return 0;
    const m = val.match(/^(\d+)min$/);
    if (m) return parseInt(m[1]);
    const h = val.match(/^(\d+)hr$/);
    if (h) return parseInt(h[1]) * 60;
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
      if (!hotelFields.hotel_name || hotelFields.hotel_name.length < 3)
        e.hotel_name = "Hotel name must be at least 3 characters";
      if (!hotelFields.number_of_rooms || isNaN(hotelFields.number_of_rooms))
        e.number_of_rooms = "Valid number of rooms is required";
      if (!hotelFields.city) e.city = "City is required";
    }
    if (activeTab === "ai") {
      const { high, medium, low } = hotelFields.slaConfig || {};
      if (parseInt(high) >= parseInt(medium))
        e.sla = "High SLA must be less than Medium SLA";
      if (parseInt(medium) >= parseInt(low))
        e.sla = "Medium SLA must be less than Low SLA";
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
        if (lowMins <= urgentMins) {
          e.properties = "Low urgency sync must be less frequent than high urgency sync"; break;
        }
        let hasUrl = false;
        if (p.platforms) {
          for (const [plat, url] of Object.entries(p.platforms)) {
            if (url) {
              if (!url.startsWith("http")) {
                e.properties = `Invalid URL for ${plat} in property ${p.name || i + 1}`; break;
              }
              hasUrl = true;
              if (allUrls.includes(url)) {
                e.properties = `Duplicate URL: ${url}`; break;
              }
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
    if (!validateSettings()) {
      flashError("Please fix the errors below before saving.");
      return;
    }
    if (!fromPropertyCard) setLoading(true);
    try {
      const res = await updateHotel(hotelFields);
      dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: res.data });
      flashSuccess("Settings saved successfully!");
    } catch (err) {
      flashError(err.message);
    } finally {
      if (!fromPropertyCard) setLoading(false);
    }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingStaff) {
        const res = await updateStaff(editingStaff._id, newStaff);
        dispatch({ type: "UPDATE_STAFF_MEMBER", payload: res.data });
      } else {
        const res = await addStaff(newStaff);
        dispatch({ type: "ADD_STAFF_MEMBER", payload: res.data });
      }
      setIsModalOpen(false);
      setEditingStaff(null);
      flashSuccess("Staff member saved!");
    } catch (err) {
      flashError(err.message);
    } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await updateMe(profileFields);
      updateUser(res.data);
      flashSuccess("Profile updated!");
    } catch (err) {
      flashError(err.message);
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: "hotel", name: "Hotel Profile", icon: Hotel },
    { id: "properties", name: "Properties", icon: Building2 },
    { id: "ai", name: "Rules", icon: Shield },
    { id: "account", name: "Account", icon: User },
    { id: "import", name: "Import Reviews", icon: User },
  ];
  const visibleTabs = tabs.filter(t => !isScopedUser || t.id === "account");
  const departments = DEPARTMENTS;

  if (state.isAppLoading) return <SettingsSkeleton />;

  /* ─── styles ─────────────────────────────────────── */
  const s = {
    page: {
      margin: "0 auto", padding: "36px 0 80px",
      fontFamily: "'DM Sans', system-ui, sans-serif"
    },
    heading: { fontSize: 28, fontWeight: 800, color: C.textPrimary, margin: 0 },
    subheading: { fontSize: 14, color: C.textMuted, margin: "4px 0 0" },
    tabBar: {
      display: "flex", gap: 6, padding: 6,
      background: "#fff", borderRadius: 20,
      border: `1.5px solid ${C.border}`,
      boxShadow: "0 1px 6px rgba(0,0,0,.04)",
      overflowX: "auto", marginTop: 28
    },
    tab: (active) => ({
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 20px", borderRadius: 14,
      border: "none", cursor: "pointer", fontWeight: 700,
      fontSize: 13, whiteSpace: "nowrap", transition: "all .2s",
      background: active ? C.accent : "transparent",
      color: active ? "#fff" : C.textMuted,
      boxShadow: active ? "0 3px 10px rgba(99,102,241,.2)" : "none"
    }),
    card: {
      background: "#fff", borderRadius: 24,
      border: `1.5px solid ${C.border}`,
      boxShadow: "0 2px 16px rgba(45,58,90,.06)",  // ← remove this line
      padding: 36, marginTop: 20
    },
    sectionHead: {
      display: "flex", alignItems: "center", gap: 12,
      paddingBottom: 20,
      marginBottom: 28
    },
    iconBox: (color = "#6366F1", bg = "#EEF0FD") => ({
      width: 44, height: 44, borderRadius: 14,
      background: bg, color, display: "flex",
      alignItems: "center", justifyContent: "center"
    }),
    sectionTitle: { fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0 },
    sectionSub: { fontSize: 13, color: C.textMuted, margin: "2px 0 0" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
    field: { display: "flex", flexDirection: "column" },
  };


  return (
    <div style={s.page}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={s.heading}>Settings</h1>
          <p style={s.subheading}>Global configuration for ReviewRescue</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={s.tabBar}>
        {visibleTabs.map(t => (
          <button key={t.id} style={s.tab(activeTab === t.id)}
            onClick={() => { setActiveTab(t.id); setErrors({}); setGlobalError(""); setGlobalSuccess(""); }}>
            <t.icon size={16} /> {t.name}
          </button>
        ))}
      </div>

      {(globalError || globalSuccess) && (
        <div ref={bannerRef} style={{ marginTop: 16 }}>
          <BannerError msg={globalError} />
          <BannerSuccess msg={globalSuccess} />
        </div>
      )}

      {/* ── Card ── */}
      <div style={s.card}>

        {/* ════════════ HOTEL PROFILE ════════════ */}
        {activeTab === "hotel" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={s.sectionHead}>
              <div style={s.iconBox()}>
                <Building2 size={22} />
              </div>
              <div>
                <p style={s.sectionTitle}>Hotel Profile</p>
                <p style={s.sectionSub}>Public information and core property settings</p>
              </div>
            </div>

            {/* Hotel Name */}
            <div style={{ gridColumn: "1/-1" }}>
              <Label required>Hotel Name</Label>
              <Input icon={Building2} error={errors.hotel_name}
                type="text" placeholder="Grand Plaza Hotel"
                value={hotelFields.hotel_name || ""}
                onChange={e => setHotelFields({ ...hotelFields, hotel_name: e.target.value })} />
              <FieldError msg={errors.hotel_name} />
            </div>

            <div style={s.grid2}>
              {/* City */}
              <div>
                <Label required>City</Label>
                <Input icon={MapPin} error={errors.city}
                  type="text" placeholder="New York"
                  value={hotelFields.city || ""}
                  onChange={e => setHotelFields({ ...hotelFields, city: e.target.value })} />
                <FieldError msg={errors.city} />
              </div>

              {/* Rooms */}
              <div>
                <Label required>Property Size (Rooms)</Label>
                <Input icon={Hotel} error={errors.number_of_rooms}
                  type="number" placeholder="150"
                  value={hotelFields.number_of_rooms || ""}
                  onChange={e => setHotelFields({ ...hotelFields, number_of_rooms: e.target.value })} />
                <FieldError msg={errors.number_of_rooms} />
              </div>

              {/* Timezone */}
              <div>
                <Label>Operational Timezone</Label>
                <Select icon={Globe}
                  value={hotelFields.timezone || "IST"}
                  onChange={e => setHotelFields({ ...hotelFields, timezone: e.target.value })}>
                  <option value="IST">IST (New Delhi / Mumbai)</option>
                </Select>
              </div>
            </div>

            {/* Active Platforms — static read-only chips */}
            <div>
              <Label>Active Review Platforms</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                {["Agoda", "Booking.com", "Google Hotels", "Airbnb"].map(p => (
                  <span key={p} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 16px", background: C.accentSoft,
                    color: C.accentText, borderRadius: 20,
                    fontSize: 13, fontWeight: 700,
                    border: `1px solid ${C.borderFocus}`
                  }}>
                    <CheckCircle2 size={13} /> {p}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
                Platform links are configured per-property in the Properties tab.
              </p>
            </div>

            <div style={{ paddingTop: 8, borderTop: `1.5px solid ${C.border} ` }}>
              <PrimaryBtn loading={loading} onClick={handleSaveHotel}
                style={{ minWidth: 220 }}>
                <Save size={16} /> Update Property Profile
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* ════════════ PROPERTIES ════════════ */}
        {activeTab === "properties" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...s.sectionHead, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <p style={s.sectionTitle}>Properties</p>
                <p style={s.sectionSub}>Manage hotel properties and their review platform links</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted }}>
                  {(hotelFields.properties || []).length} / 3
                </span>
                <PrimaryBtn style={{ padding: "9px 18px", fontSize: 13 }}
                  onClick={() => {
                    const cur = hotelFields.properties || [];
                    if (cur.length >= 3) { flashError("Maximum 3 properties allowed."); return; }
                    setHotelFields({
                      ...hotelFields, properties: [
                        {
                          _uid: genUid(), name: "", city: "", rooms: "", timezone: "IST", is_active: true,
                          platforms: {}, urgent_sync_interval: "5hr", low_sync_interval: "10hr"
                        },
                        ...cur.map(p => ({ ...p }))
                      ]
                    });
                  }}>
                  <Plus size={15} /> Add Property
                </PrimaryBtn>
              </div>
            </div>

            <BannerError msg={errors.properties} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {(hotelFields.properties || []).length === 0 ? (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px" }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: C.accentSoft, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px", color: C.accent
                  }}>
                    <Building2 size={28} />
                  </div>
                  <p style={{ fontWeight: 700, color: C.textPrimary, margin: 0 }}>No properties yet</p>
                  <p style={{ color: C.textMuted, fontSize: 13, marginTop: 6 }}>Add your first property to start collecting reviews</p>
                  <PrimaryBtn style={{ margin: "20px auto 0" }}
                    onClick={() => setHotelFields({
                      ...hotelFields, properties: [{
                        _uid: genUid(), name: "", city: "", rooms: "", timezone: "IST", is_active: true,
                        platforms: {}, urgent_sync_interval: "5hr", low_sync_interval: "10hr"
                      }]
                    })}>
                    <Plus size={15} /> Add Property
                  </PrimaryBtn>
                </div>
              ) : (hotelFields.properties || []).map((prop, idx) => (
                <div key={prop._uid || prop._id || idx} style={{
                  background: "#fff",
                  borderRadius: 20,
                  border: `1.5px solid ${C.border}`,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column"
                }}>

                  {/* Card Header */}
                  <div style={{
                    padding: "20px 24px",
                    background: `linear-gradient(135deg, ${C.accentSoft} 0%, #fff 100%)`,
                    borderBottom: `1.5px solid ${C.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start"
                  }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: "#fff", border: `1.5px solid ${C.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, boxShadow: "0 2px 8px rgba(99,102,241,.1)"
                      }}>🏨</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{
                            padding: "3px 10px",
                            background: prop.is_active ? C.successSoft : "#F1F5F9",
                            color: prop.is_active ? "#15803D" : C.textMuted,
                            border: `1px solid ${prop.is_active ? C.successBorder : C.border}`,
                            borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "uppercase"
                          }}>
                            {prop.is_active ? "● Active" : "○ Inactive"}
                          </span>
                          <span style={{
                            padding: "3px 10px", background: C.accentSoft,
                            color: C.accentText, borderRadius: 20, fontSize: 10, fontWeight: 800
                          }}>
                            {state.reviews?.filter(r => r.hotel_name === prop.name).length || 0} reviews
                          </span>
                        </div>
                      </div>
                    </div>
                    <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                      onClick={() => updateProperty(idx, { is_active: !prop.is_active })}>
                      {prop.is_active
                        ? <ToggleRight size={30} color={C.accent} />
                        : <ToggleLeft size={30} color={C.border} />}
                    </button>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>

                    {/* Property Name */}
                    <div>
                      <label style={{
                        display: "block", fontSize: 11, fontWeight: 800,
                        color: C.textLabel, textTransform: "uppercase",
                        letterSpacing: "0.07em", marginBottom: 6
                      }}>Property Name</label>
                      <input
                        type="text"
                        value={prop.name}
                        placeholder="e.g. The Grand Palace"
                        onChange={e => updateProperty(idx, { name: e.target.value })}
                        style={{
                          width: "100%", padding: "11px 14px",
                          background: C.inputBg,
                          border: `1.5px solid ${C.border}`,
                          borderRadius: 12, outline: "none",
                          fontSize: 14, fontWeight: 700,
                          color: C.textPrimary, boxSizing: "border-box",
                          transition: "border-color .2s"
                        }}
                        onFocus={e => e.target.style.borderColor = C.borderFocus}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                    </div>

                    {/* City + Rooms row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{
                          display: "block", fontSize: 11, fontWeight: 800,
                          color: C.textLabel, textTransform: "uppercase",
                          letterSpacing: "0.07em", marginBottom: 6
                        }}>City</label>
                        <input
                          type="text"
                          value={prop.city}
                          placeholder="Mumbai"
                          onChange={e => updateProperty(idx, { city: e.target.value })}
                          style={{
                            width: "100%", padding: "11px 14px",
                            background: C.inputBg, border: `1.5px solid ${C.border}`,
                            borderRadius: 12, outline: "none", fontSize: 13,
                            fontWeight: 600, color: C.textPrimary, boxSizing: "border-box",
                            transition: "border-color .2s"
                          }}
                          onFocus={e => e.target.style.borderColor = C.borderFocus}
                          onBlur={e => e.target.style.borderColor = C.border}
                        />
                      </div>
                      <div>
                        <label style={{
                          display: "block", fontSize: 11, fontWeight: 800,
                          color: C.textLabel, textTransform: "uppercase",
                          letterSpacing: "0.07em", marginBottom: 6
                        }}>Rooms</label>
                        <input
                          type="number"
                          value={prop.rooms || ""}
                          placeholder="150"
                          onChange={e => updateProperty(idx, { rooms: e.target.value ? parseInt(e.target.value) : "" })}
                          style={{
                            width: "100%", padding: "11px 14px",
                            background: C.inputBg, border: `1.5px solid ${C.border}`,
                            borderRadius: 12, outline: "none", fontSize: 13,
                            fontWeight: 600, color: C.textPrimary, boxSizing: "border-box",
                            transition: "border-color .2s"
                          }}
                          onFocus={e => e.target.style.borderColor = C.borderFocus}
                          onBlur={e => e.target.style.borderColor = C.border}
                        />
                      </div>
                    </div>

                    {/* Platform Links */}
                    <div style={{
                      paddingTop: 16, borderTop: `1.5px solid ${C.border}`
                    }}>
                      <label style={{
                        display: "block", fontSize: 11, fontWeight: 800,
                        color: C.textLabel, textTransform: "uppercase",
                        letterSpacing: "0.07em", marginBottom: 12
                      }}>Platform Links</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {["Google", "Booking.com", "Agoda", "Airbnb"].map(platform => {
                          const url = (prop.platforms && prop.platforms[platform]) || "";
                          const isValid = url.startsWith("http");
                          const isErr = url.length > 0 && !isValid;
                          const platformColors = {
                            "Google": "#4285F4",
                            "Booking.com": "#003580",
                            "Agoda": "#E21B23",
                            "Airbnb": "#FF5A5F"
                          };
                          return (
                            <div key={platform}>
                              <label style={{
                                display: "block", fontSize: 10, fontWeight: 700,
                                color: platformColors[platform] || C.textMuted,
                                marginBottom: 4, letterSpacing: "0.04em"
                              }}>{platform}</label>
                              <div style={{ position: "relative" }}>
                                <input
                                  type="url"
                                  value={url}
                                  placeholder={`Paste ${platform} review URL…`}
                                  onChange={e => updateProperty(idx, {
                                    platforms: { ...(prop.platforms || {}), [platform]: e.target.value }
                                  })}
                                  style={{
                                    width: "100%", padding: "10px 36px 10px 12px",
                                    background: url && isValid ? "#F0FDF4" : C.inputBg,
                                    border: `1.5px solid ${isErr ? C.danger : url && isValid ? C.successBorder : C.border}`,
                                    borderRadius: 10, outline: "none", fontSize: 12,
                                    fontWeight: 500, color: C.textPrimary, boxSizing: "border-box",
                                    transition: "all .2s"
                                  }}
                                  onFocus={e => e.target.style.borderColor = isErr ? C.danger : C.borderFocus}
                                  onBlur={e => e.target.style.borderColor = isErr ? C.danger : url && isValid ? C.successBorder : C.border}
                                />
                                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                                  {url && isValid && <CheckCircle2 size={14} color={C.success} title="Valid URL — will be synced" />}
                                  {!url && <span style={{ fontSize: 10, color: "#ebb609ff", fontWeight: 600 }}>Not connected</span>}
                                  {isErr && <X size={14} color={C.danger} />}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sync Settings */}
                    <div style={{ paddingTop: 16, borderTop: `1.5px solid ${C.border}` }}>
                      <label style={{
                        display: "block", fontSize: 11, fontWeight: 800,
                        color: C.textLabel, textTransform: "uppercase",
                        letterSpacing: "0.07em", marginBottom: 12
                      }}>Sync Settings</label>



                      <div style={{ marginBottom: 10 }}>
                        <div style={{
                          padding: "10px 14px",
                          background: C.inputBg,
                          border: `1.5px solid ${C.border}`,
                          borderRadius: 12
                        }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, margin: "0 0 4px", textTransform: "uppercase" }}>
                            Review Sync Schedule (1–5★)
                          </p>
                          <p style={{ fontSize: 12, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Every 6 hrs</p>
                          <p style={{ fontSize: 10, color: C.textMuted, margin: "3px 0 0", fontWeight: 600 }}>
                            🔒 Sync frequency is fixed and cannot be changed
                          </p>
                        </div>
                      </div>

                      {/* Max Reviews Select */}
                      <div>
                        <label style={{
                          display: "block", fontSize: 11, fontWeight: 800,
                          color: C.textLabel, textTransform: "uppercase",
                          letterSpacing: "0.07em", marginBottom: 6
                        }}>Max Reviews per Sync <span style={{ fontWeight: 500, textTransform: "none", fontSize: 10, color: C.textMuted }}>(per platform)</span></label>
                        <div style={{ position: "relative" }}>
                          <select
                            value={prop.max_reviews_per_sync || 10}
                            onChange={e => updateProperty(idx, { max_reviews_per_sync: parseInt(e.target.value) })}
                            style={{
                              width: "100%", padding: "11px 40px 11px 14px",
                              background: C.inputBg, border: `1.5px solid ${C.border}`,
                              borderRadius: 12, outline: "none", fontWeight: 700,
                              fontSize: 13, color: C.textPrimary, appearance: "none",
                              boxSizing: "border-box", cursor: "pointer"
                            }}
                          >
                            <option value={5}>5 reviews</option>
                            <option value={10}>10 reviews</option>
                            <option value={20}>20 reviews</option>

                          </select>
                          <ChevronDown size={15} style={{
                            position: "absolute", right: 12, top: "50%",
                            transform: "translateY(-50%)", color: C.textMuted, pointerEvents: "none"
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Sync Status */}
                    <div style={{
                      padding: "12px 16px",
                      background: C.inputBg, borderRadius: 12,
                      border: `1.5px solid ${C.border}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, margin: "0 0 2px", textTransform: "uppercase" }}>Last Synced</p>
                        <p style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                          {getSyncTimeAgo(prop.last_sync_time)} {prop.last_sync_status === "success" && <span style={{ fontSize: 10, color: C.success, marginLeft: 6 }}>— Selected platforms synced ✓</span>}
                        </p>
                      </div>
                      {(!prop.last_sync_status || prop.last_sync_status === "never") && (
                        <span style={{
                          padding: "5px 12px", background: C.warnSoft,
                          color: "#92400E", border: `1px solid ${C.warnBorder}`,
                          borderRadius: 20, fontSize: 10, fontWeight: 800
                        }}>⚠️ Not verified</span>
                      )}
                      {prop.last_sync_status === "success" && (
                        <span style={{
                          padding: "5px 12px", background: C.successSoft,
                          color: "#15803D", border: `1px solid ${C.successBorder}`,
                          borderRadius: 20, fontSize: 10, fontWeight: 800
                        }}>✅ Connected</span>
                      )}
                      {prop.last_sync_status === "failed" && (
                        <span style={{
                          padding: "5px 12px", background: C.dangerSoft,
                          color: "#B91C1C", border: `1px solid ${C.dangerBorder}`,
                          borderRadius: 20, fontSize: 10, fontWeight: 800
                        }}>❌ Sync Failed</span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{
                    padding: "16px 24px",
                    borderTop: `1.5px solid ${C.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: C.inputBg
                  }}>
                    <button
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 14px", background: "transparent",
                        border: `1.5px solid ${C.border}`,
                        borderRadius: 10, cursor: "pointer", fontSize: 12,
                        fontWeight: 700, color: C.textMuted, transition: "all .15s"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = C.danger;
                        e.currentTarget.style.background = C.dangerSoft;
                        e.currentTarget.style.borderColor = C.dangerBorder;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = C.textMuted;
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = C.border;
                      }}
                      onClick={async () => {
                        if (!window.confirm("Delete this property?")) return;
                        const p = [...hotelFields.properties];
                        p.splice(idx, 1);
                        const updated = { ...hotelFields, properties: p };
                        setHotelFields(updated);
                        setLoading(true);
                        try {
                          const res = await updateHotel(updated);
                          dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: res.data });
                          flashSuccess("Property deleted.");
                        } catch (err) { flashError(err.message); }
                        finally { setLoading(false); }
                      }}>
                      <Trash2 size={13} /> Delete
                    </button>
                    <PrimaryBtn
                      loading={savingIdx === idx}
                      style={{ padding: "9px 20px", fontSize: 13 }}
                      onClick={async () => {
                        const currentIdx = idx;
                        setSavingIdx(currentIdx);
                        await handleSaveHotel(true);
                        setSavingIdx(null);
                      }}
                    >
                      <Save size={14} /> Save Property
                    </PrimaryBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════ RULES / AI ════════════ */}
        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* AI Confidence */}
            <div style={{
              borderRadius: 20, border: `1.5px solid ${C.border} `,
              background: "#fff", padding: 28, position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute", top: -30, right: -30, width: 120, height: 120,
                background: "rgba(99,102,241,.07)", borderRadius: "50%", filter: "blur(20px)"
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
                <div style={{ ...s.iconBox(), background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
                  <Zap size={20} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                    Insights & Proposals
                  </p>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: "2px 0 0" }}>
                    AI automation confidence & review controls
                  </p>
                </div>
              </div>

              {/* Threshold row */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 14
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                    Confidence Threshold
                  </p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: "3px 0 0" }}>
                    Minimum AI confidence for auto-approval
                  </p>
                </div>
                <div style={{
                  padding: "10px 20px", background: C.accentSoft,
                  border: `1.5px solid ${C.borderFocus} `, borderRadius: 14
                }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>
                    {hotelFields.aiConfig?.confidenceThreshold || 75}%
                  </span>
                </div>
              </div>

              <input type="range" min="0" max="100"
                value={hotelFields.aiConfig?.confidenceThreshold || 75}
                onChange={e => setHotelFields({
                  ...hotelFields,
                  aiConfig: { ...(hotelFields.aiConfig || {}), confidenceThreshold: e.target.value }
                })}
                style={{ width: "100%", accentColor: C.accent, cursor: "pointer", height: 6 }} />
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 10, color: C.textMuted, fontWeight: 600,
                marginTop: 6, paddingInline: 2
              }}>
                {["0%", "25%", "50%", "75%", "100%"].map(v => <span key={v}>{v}</span>)}
              </div>

              {/* Info box */}
              <div style={{
                marginTop: 18, padding: 16, borderRadius: 14,
                background: C.warnSoft, border: `1.5px solid ${C.warnBorder} `,
                display: "flex", gap: 12
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: "#fff",
                  border: `1px solid ${C.warnBorder} `, display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <AlertCircle size={17} color={C.warn} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E", margin: 0 }}>
                    Threshold Impact
                  </p>
                  <p style={{ fontSize: 12, color: "#A16207", marginTop: 4 }}>
                    Reviews below <strong>{hotelFields.aiConfig?.confidenceThreshold || 75}%</strong> confidence
                    will be flagged for manual review and won't be auto-approved.
                  </p>
                </div>
              </div>
            </div>

            {/* Safety Rules */}
            <div style={{ paddingTop: 8, borderTop: `1.5px solid ${C.border} ` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <ShieldAlert size={20} color={C.accent} />
                <p style={{ fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                  Automated Safety Rules
                </p>
              </div>
              <div style={{
                background: C.inputBg, border: `1.5px solid ${C.border} `,
                borderRadius: 16, padding: 20,
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <p style={{ fontWeight: 700, color: C.textPrimary, margin: 0 }}>Auto-Escalate Rating</p>
                  <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                    Automatically flag reviews at or below this rating
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.textMuted }}>≤</span>
                  <input type="number" min="1" max="5"
                    value={hotelFields.aiConfig?.escalationRatingThreshold || 2}
                    onChange={e => setHotelFields({
                      ...hotelFields,
                      aiConfig: { ...(hotelFields.aiConfig || {}), escalationRatingThreshold: e.target.value }
                    })}
                    style={{
                      width: 60, padding: "10px 0", textAlign: "center",
                      background: "#fff", border: `1.5px solid ${C.borderFocus} `,
                      borderRadius: 12, fontWeight: 900, fontSize: 18,
                      color: C.accent, outline: "none"
                    }} />
                </div>
              </div>
            </div>

            {errors.sla && <FieldError msg={errors.sla} />}

            <PrimaryBtn loading={loading} onClick={handleSaveHotel}
              style={{ alignSelf: "stretch", padding: "14px", fontSize: 15 }}>
              <Check size={17} /> Save AI & Rules
            </PrimaryBtn>
          </div>
        )}

        {/* ════════════ ACCOUNT ════════════ */}
        {activeTab === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={s.sectionHead}>
              <div style={s.iconBox("#6366F1", "#EEF0FD")}>
                <User size={20} />
              </div>
              <div>
                <p style={s.sectionTitle}>Account Settings</p>
                <p style={s.sectionSub}>Update your display name and email address</p>
              </div>
            </div>

            <div style={{ ...s.grid2, gridTemplateColumns: "1fr" }}>
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

            <PrimaryBtn loading={loading} onClick={handleSaveProfile}
              style={{ alignSelf: "flex-start", padding: "13px 32px" }}>
              <Save size={16} /> Update Profile
            </PrimaryBtn>
          </div>
        )}

        {activeTab === "import" && (<>
          <Import />
        </>)}

        {/* ════════════ STAFF (hidden but preserved) ════════════ */}
        {activeTab === "staff" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...s.sectionHead, justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={s.iconBox()}><Users size={20} /></div>
                <div>
                  <p style={s.sectionTitle}>Staff Management</p>
                  <p style={s.sectionSub}>Manage team members, roles and permissions</p>
                </div>
              </div>
              <PrimaryBtn style={{ padding: "9px 18px", fontSize: 13 }}
                onClick={() => {
                  setEditingStaff(null);
                  setNewStaff({ name: "", email: "", password: "", department: "Front Office", role: "staff" });
                  setIsModalOpen(true);
                }}>
                <Plus size={15} /> Add Member
              </PrimaryBtn>
            </div>

            {(state.staff || []).map(s => (
              <div key={s._id} style={{
                padding: 18, background: "#fff",
                border: `1.5px solid ${C.border} `, borderRadius: 18,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                opacity: s.status === "disabled" ? 0.55 : 1
              }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: s.status === "disabled" ? C.inputBg : C.accentSoft,
                    color: s.status === "disabled" ? C.textMuted : C.accent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 18
                  }}>
                    {(s.avatar_initials || s.name[0])}
                  </div>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 700, color: C.textPrimary }}>{s.name}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: 10,
                        fontWeight: 800, textTransform: "uppercase",
                        background: s.role === "gm" ? "#FEF9C3" : s.role === "dept_head" ? C.accentSoft : C.inputBg,
                        color: s.role === "gm" ? "#854D0E" : s.role === "dept_head" ? C.accentText : C.textMuted
                      }}>
                        {s.role === "gm" ? "GM" : s.role === "dept_head" ? "Dept Head" : "Staff"}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>
                      {s.email} · <span style={{ color: C.accentText, fontWeight: 700 }}>{s.department}</span>
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { icon: <Edit2 size={16} />, action: () => { setEditingStaff(s); setNewStaff({ name: s.name, email: s.email, password: "", department: s.department, role: s.role }); setIsModalOpen(true); } },
                    {
                      icon: s.status === "active" ? <UserMinus size={16} /> : <UserCheck size={16} />,
                      action: async () => { const res = await updateStaff(s._id, { status: s.status === "active" ? "disabled" : "active" }); dispatch({ type: "UPDATE_STAFF_MEMBER", payload: res.data }); }
                    },
                    {
                      icon: <Trash2 size={16} />, disabled: s.role === "gm",
                      action: async () => { if (s.role === "gm") { flashError("Cannot delete GM"); return; } if (!window.confirm("Delete?")) return; await removeStaff(s._id); dispatch({ type: "REMOVE_STAFF_MEMBER", payload: s._id }); }
                    }
                  ].map((btn, i) => (
                    <button key={i} disabled={btn.disabled}
                      onClick={btn.action}
                      style={{
                        padding: 8, background: "transparent", border: `1.5px solid ${C.border} `,
                        borderRadius: 10, cursor: btn.disabled ? "not-allowed" : "pointer",
                        color: C.textMuted, opacity: btn.disabled ? 0.3 : 1,
                        display: "flex", alignItems: "center"
                      }}>
                      {btn.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════ STAFF MODAL ════════════ */}
      {isModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, background: "rgba(45,58,90,.35)", backdropFilter: "blur(6px)"
        }}>
          <div style={{
            background: "#fff", borderRadius: 28, width: "100%",
            maxWidth: 560, boxShadow: "0 24px 60px rgba(0,0,0,.18)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "24px 28px", background: C.accentSoft,
              borderBottom: `1.5px solid ${C.borderFocus} `,
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                  {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
                </p>
                <p style={{ fontSize: 13, color: C.textMuted, margin: "3px 0 0" }}>
                  Configure permissions and departmental access
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent", border: "none",
                  cursor: "pointer", color: C.textMuted, padding: 4
                }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleStaffSubmit} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <Label required>Full Name</Label>
                <Input type="text" required value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
              </div>
              <div style={s.grid2}>
                <div style={{ gridColumn: editingStaff ? "1/-1" : "auto" }}>
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
                <Select value={newStaff.department}
                  onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
              <div>
                <Label>Access Level</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { role: "staff", label: "Standard Staff", desc: "Can view reviews and create tickets." },
                    { role: "dept_head", label: "Department Head", desc: "Can approve AI proposals and assign tasks." }
                  ].map(opt => (
                    <button type="button" key={opt.role}
                      onClick={() => setNewStaff({ ...newStaff, role: opt.role })}
                      style={{
                        padding: 16, borderRadius: 16, textAlign: "left",
                        border: `2px solid ${newStaff.role === opt.role ? C.accent : C.border} `,
                        background: newStaff.role === opt.role ? C.accentSoft : "#fff",
                        cursor: "pointer", transition: "all .2s"
                      }}>
                      <p style={{
                        fontWeight: 700, margin: 0,
                        color: newStaff.role === opt.role ? C.accentText : C.textPrimary
                      }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: 11, color: C.textMuted, margin: "4px 0 0" }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                <GhostBtn type="button" style={{ flex: 1, padding: 13 }}
                  onClick={() => setIsModalOpen(false)}>Cancel</GhostBtn>
                <PrimaryBtn loading={loading} style={{ flex: 1, padding: 13 }}>
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