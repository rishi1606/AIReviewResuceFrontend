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

/* ─── Field error ────────────────────────────────────────────────────── */
const FieldError = ({ msg }) =>
  msg ? (
    <p className="text-red-600 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
      <AlertCircle size={11} /> {msg}
    </p>
  ) : null;

/* ─── Banner error ───────────────────────────────────────────────────── */
const BannerError = ({ msg }) =>
  msg ? (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-red-600 font-semibold text-[13px]">
      <AlertCircle size={15} /> {msg}
    </div>
  ) : null;

/* ─── Banner success ─────────────────────────────────────────────────── */
const BannerSuccess = ({ msg }) =>
  msg ? (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-emerald-600 font-semibold text-[13px]">
      <CheckCircle2 size={15} /> {msg}
    </div>
  ) : null;

/* ─── Input ──────────────────────────────────────────────────────────── */
const Input = ({ icon: Icon, error, ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
    )}
    <input
      {...props}
      className={`w-full ${Icon ? 'pl-9 pr-3.5' : 'px-3.5'} py-2.5 ${props.disabled ? 'bg-zinc-100' : 'bg-zinc-50 hover:bg-zinc-100 focus:bg-white'} border ${error ? 'border-red-200 focus:border-red-400' : 'border-zinc-200 focus:border-orange-500'} rounded-xl outline-none font-medium text-sm text-zinc-900 transition-colors ${props.className || ''}`}
    />
  </div>
);

/* ─── Select ─────────────────────────────────────────────────────────── */
const Select = ({ icon: Icon, children, ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
    )}
    <select
      {...props}
      className={`w-full ${Icon ? 'pl-9 pr-9' : 'pl-3.5 pr-9'} py-2.5 bg-zinc-50 border border-zinc-200 focus:border-orange-500 focus:bg-white rounded-xl outline-none font-medium text-sm text-zinc-900 appearance-none cursor-pointer transition-colors ${props.className || ''}`}
    >
      {children}
    </select>
    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
  </div>
);

/* ─── Label ──────────────────────────────────────────────────────────── */
const Label = ({ children, required }) => (
  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
    {children}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

/* ─── Primary button ─────────────────────────────────────────────────── */
const PrimaryBtn = ({ children, loading, ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 ${props.disabled ? 'bg-zinc-300 text-white cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_14px_0_rgba(234,88,12,0.39)] hover:shadow-[0_6px_20px_rgba(234,88,12,0.23)] hover:-translate-y-0.5'} rounded-xl font-semibold text-[13px] transition-all ${props.className || ''}`}
  >
    {loading ? <Loader2 size={14} className="animate-spin" /> : children}
  </button>
);

/* ─── Ghost button ───────────────────────────────────────────────────── */
const GhostBtn = ({ children, ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 hover:border-zinc-300 rounded-xl font-medium text-[13px] cursor-pointer transition-all ${props.className || ''}`}
  >
    {children}
  </button>
);

/* ─── Icon badge ─────────────────────────────────────────────────────── */
const IconBadge = ({ icon: Icon, color = "indigo" }) => {
  const themes = {
    indigo: "bg-purple-50 text-purple-600 border-purple-100", // mapped indigo to purple to match new theme
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-zinc-100 text-zinc-600 border-zinc-200",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };
  const t = themes[color] || themes.indigo;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${t}`}>
      <Icon size={18} />
    </div>
  );
};

/* ─── Section header ─────────────────────────────────────────────────── */
const SectionHeader = ({ icon, iconColor, title, subtitle, right }) => (
  <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 border-b border-zinc-100 gap-4">
    <div className="flex gap-3 items-center">
      <IconBadge icon={icon} color={iconColor} />
      <div>
        <p className="text-[15px] font-bold text-zinc-900 m-0">{title}</p>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {right && <div>{right}</div>}
  </div>
);

/* ─── Card wrapper ───────────────────────────────────────────────────── */
const Card = ({ children, className = "" }) => (
  <div className={`glass-card p-6 ${className}`}>
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

  return (
    <div className="flex flex-col gap-4 pb-20">

      {/* ── Tab Bar ── */}
      <div className="flex flex-wrap gap-1 p-1 bg-white rounded-xl border border-zinc-200 w-fit">
        {visibleTabs.map(t => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setErrors({}); setGlobalError(""); setGlobalSuccess(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-none cursor-pointer text-[13px] whitespace-nowrap transition-all ${active ? 'font-bold bg-zinc-950 text-white' : 'font-medium bg-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
            >
              <t.icon size={14} /> {t.name}
            </button>
          );
        })}
      </div>

      {/* ── Banners ── */}
      {(globalError || globalSuccess) && (
        <div ref={bannerRef} className="flex flex-col gap-2">
          <BannerError msg={globalError} />
          <BannerSuccess msg={globalSuccess} />
        </div>
      )}

      {/* ── Main Card ── */}
      <Card>

        {/* ════ HOTEL PROFILE ════ */}
        {activeTab === "hotel" && (
          <div className="flex flex-col gap-5">
            <SectionHeader icon={Building2} iconColor="purple" title="Hotel Profile" subtitle="Public information and core property settings" />

            <div>
              <Label required>Hotel Name</Label>
              <Input icon={Building2} error={errors.hotel_name}
                type="text" placeholder="Grand Plaza Hotel"
                value={hotelFields.hotel_name || ""}
                onChange={e => setHotelFields({ ...hotelFields, hotel_name: e.target.value })} />
              <FieldError msg={errors.hotel_name} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="flex flex-wrap gap-2 mt-1">
                {["Agoda", "Booking.com", "Google Hotels", "Airbnb"].map(p => (
                  <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-xs font-semibold border border-purple-100">
                    <CheckCircle2 size={12} /> {p}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">
                Platform links are configured per-property in the Properties tab.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <PrimaryBtn loading={loading} onClick={() => handleSaveHotel()}>
                <Save size={14} /> Update Property Profile
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* ════ PROPERTIES ════ */}
        {activeTab === "properties" && (
          <div className="flex flex-col gap-5">
            <SectionHeader
              icon={Hotel} iconColor="purple"
              title="Properties"
              subtitle="Manage hotel properties and their review platform links"
              right={
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-bold text-zinc-400">
                    {(hotelFields.properties || []).length} / 3
                  </span>
                  <PrimaryBtn className="px-4 py-2 text-xs"
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
              <div className="text-center py-16 px-5">
                <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3.5 text-purple-600">
                  <Building2 size={24} />
                </div>
                <p className="font-bold text-zinc-900 m-0">No properties yet</p>
                <p className="text-zinc-400 text-[13px] mt-1.5">Add your first property to start collecting reviews</p>
                <PrimaryBtn className="mt-4 mx-auto"
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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {(hotelFields.properties || []).map((prop, idx) => (
                  <div key={prop._uid || prop._id || idx} className="bg-white rounded-2xl border border-zinc-200 flex flex-col overflow-hidden transition-colors hover:border-zinc-300">
                    
                    {/* Card Header */}
                    <div className="px-5 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                      <div className="flex gap-2.5 items-center">
                        <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-lg">🏨</div>
                        <div className="flex gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 ${prop.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'} border rounded-full text-[10px] font-bold uppercase tracking-wider`}>
                            {prop.is_active ? "● Active" : "○ Inactive"}
                          </span>
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-full text-[10px] font-bold">
                            {state.reviews?.filter(r => r.hotel_name === prop.name).length || 0} reviews
                          </span>
                        </div>
                      </div>
                      <button className="bg-transparent border-none cursor-pointer p-0.5 transition-colors hover:text-zinc-600 text-zinc-400"
                        onClick={() => updateProperty(idx, { is_active: !prop.is_active })}>
                        {prop.is_active
                          ? <ToggleRight size={28} className="text-orange-500" />
                          : <ToggleLeft size={28} className="text-zinc-300" />}
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex flex-col gap-3.5 flex-1">
                      {/* Property Name */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Property Name
                          </label>
                          {state.reviews?.filter(r => r.hotel_name === prop.name).length > 0 && (() => {
                            const count = state.reviews.filter(r => r.hotel_name === prop.name).length;
                            return (
                              <div className="relative inline-flex group">
                                <AlertCircle size={12} className="text-amber-500 cursor-pointer" />
                                <div className="hidden group-hover:block absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] font-medium leading-relaxed px-3.5 py-2.5 rounded-xl w-56 z-50 shadow-lg pointer-events-none">
                                  <p className="m-0 mb-1 font-bold text-amber-400">⚠ {count} review{count > 1 ? "s" : ""} linked</p>
                                  <p className="m-0 text-slate-300">Renaming this property may unlink existing reviews.</p>
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-800 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <input type="text" value={prop.name} placeholder="e.g. The Grand Palace"
                          onChange={e => updateProperty(idx, { name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-[13px] font-semibold text-zinc-900 focus:border-zinc-900 focus:bg-white transition-colors" />
                      </div>

                      {/* City + Rooms */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">City</label>
                          <input type="text" value={prop.city} placeholder="Mumbai"
                            onChange={e => updateProperty(idx, { city: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-[13px] font-medium text-zinc-900 focus:border-zinc-900 focus:bg-white transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Rooms</label>
                          <input type="number" value={prop.rooms || ""} placeholder="150"
                            onChange={e => updateProperty(idx, { rooms: e.target.value ? parseInt(e.target.value) : "" })}
                            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-[13px] font-medium text-zinc-900 focus:border-zinc-900 focus:bg-white transition-colors" />
                        </div>
                      </div>

                      {/* Platform Links */}
                      <div className="pt-3.5 border-t border-zinc-100">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5">
                          Platform Links
                        </label>
                        <div className="flex flex-col gap-2">
                          {["Google", "Booking.com", "Agoda", "Airbnb"].map(platform => {
                            const url = (prop.platforms && prop.platforms[platform]) || "";
                            const isValid = url.startsWith("http");
                            const isErr = url.length > 0 && !isValid;
                            const platColorClasses = {
                              "Google": "text-blue-500", "Booking.com": "text-blue-900",
                              "Agoda": "text-red-600", "Airbnb": "text-rose-500"
                            };
                            return (
                              <div key={platform}>
                                <label className={`block text-[10px] font-bold mb-1 ${platColorClasses[platform] || 'text-zinc-400'}`}>
                                  {platform}
                                </label>
                                <div className="relative">
                                  <input type="url" value={url}
                                    placeholder={`Paste ${platform} review URL…`}
                                    onChange={e => updateProperty(idx, { platforms: { ...(prop.platforms || {}), [platform]: e.target.value } })}
                                    className={`w-full pl-3.5 pr-9 py-2.5 ${url && isValid ? 'bg-emerald-50' : 'bg-zinc-50'} border ${isErr ? 'border-red-200 focus:border-red-500' : url && isValid ? 'border-emerald-200 focus:border-emerald-500' : 'border-zinc-200 focus:border-zinc-900'} rounded-xl outline-none text-[13px] font-medium text-zinc-900 transition-colors focus:bg-white`} />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                                    {url && isValid && <CheckCircle2 size={13} className="text-emerald-500" />}
                                    {!url && <span className="text-[9px] text-amber-600 font-bold">Not connected</span>}
                                    {url && (isValid || isErr) && (
                                      <X size={13} className={`cursor-pointer ml-1 ${isErr ? 'text-red-600' : 'text-zinc-400 hover:text-zinc-600'}`}
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
                      <div className="pt-3.5 border-t border-zinc-100">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5">
                          Sync Settings
                        </label>
                        <div className="px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl mb-2.5">
                          <p className="text-[10px] font-bold text-zinc-400 m-0 mb-1 uppercase tracking-wider">Review Sync Schedule (1–5★)</p>
                          <p className="text-[13px] font-bold text-zinc-900 m-0">Every 6 hrs</p>
                          <p className="text-[10px] text-zinc-400 m-0 mt-0.5">🔒 Sync frequency is fixed and cannot be changed</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                            Max Reviews per Sync <span className="font-normal normal-case text-zinc-400">(per platform)</span>
                          </label>
                          <div className="relative">
                            <select value={prop.max_reviews_per_sync || 10}
                              onChange={e => updateProperty(idx, { max_reviews_per_sync: parseInt(e.target.value) })}
                              className="w-full pl-3.5 pr-9 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-[13px] font-medium text-zinc-900 appearance-none cursor-pointer focus:border-zinc-900 focus:bg-white transition-colors">
                              <option value={5}>5 reviews</option>
                              <option value={10}>10 reviews</option>
                              <option value={20}>20 reviews</option>
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Sync Status */}
                      <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center mt-auto">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 m-0 mb-0.5 uppercase tracking-wider">Last Synced</p>
                          <p className="text-xs font-bold text-zinc-900 m-0 flex items-center">
                            {getSyncTimeAgo(prop.last_sync_time)}
                            {prop.last_sync_status === "success" && <span className="text-[10px] text-emerald-600 ml-1.5 font-semibold">— Synced ✓</span>}
                          </p>
                        </div>
                        {(!prop.last_sync_status || prop.last_sync_status === "never") && (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[9px] font-bold">⚠️ Not verified</span>
                        )}
                        {prop.last_sync_status === "success" && (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[9px] font-bold">✅ Connected</span>
                        )}
                        {prop.last_sync_status === "failed" && (
                          <span className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[9px] font-bold">❌ Sync Failed</span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-3.5 border-t border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                      <button
                        className="flex items-center gap-1.5 px-3 py-2 bg-transparent border border-zinc-200 rounded-lg cursor-pointer text-xs font-semibold text-zinc-500 transition-colors hover:text-red-600 hover:bg-red-50 hover:border-red-200"
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
                        className="px-4 py-2 text-xs"
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
          <div className="flex flex-col gap-5">
            <SectionHeader icon={Shield} iconColor="purple" title="Rules & AI Settings" subtitle="Automation confidence and review controls" />

            {/* AI Confidence Card */}
            <Card className="border border-zinc-200">
              <div className="flex items-center gap-3 mb-5">
                <IconBadge icon={Zap} color="orange" />
                <div>
                  <p className="text-sm font-bold text-zinc-900 m-0">Insights & Proposals</p>
                  <p className="text-xs text-zinc-400 mt-0.5">AI automation confidence & review controls</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-3.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 m-0">Confidence Threshold</p>
                  <p className="text-xs text-zinc-400 mt-1">Minimum AI confidence for auto-approval</p>
                </div>
                <div className="px-4 py-2 bg-purple-50 border border-purple-100 rounded-xl">
                  <span className="text-2xl font-black text-purple-600">
                    {hotelFields.aiConfig?.confidenceThreshold || 75}%
                  </span>
                </div>
              </div>

              <input type="range" min="0" max="100"
                value={hotelFields.aiConfig?.confidenceThreshold || 75}
                onChange={e => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), confidenceThreshold: e.target.value } })}
                className="w-full h-1.5 cursor-pointer accent-orange-500 bg-zinc-200 rounded-lg appearance-none" />
              <div className="flex justify-between text-[10px] text-zinc-400 font-semibold mt-1.5">
                {["0%", "25%", "50%", "75%", "100%"].map(v => <span key={v}>{v}</span>)}
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-px" />
                <div>
                  <p className="text-[13px] font-bold text-amber-700 m-0">Threshold Impact</p>
                  <p className="text-xs text-amber-900 mt-1 opacity-90">
                    Reviews below <strong>{hotelFields.aiConfig?.confidenceThreshold || 75}%</strong> confidence will be flagged for manual review and won't be auto-approved.
                  </p>
                </div>
              </div>
            </Card>

            {/* Safety Rules Card */}
            <Card className="border border-zinc-200">
              <div className="flex items-center gap-2.5 mb-4.5">
                <ShieldAlert size={18} className="text-orange-500" />
                <p className="text-[15px] font-bold text-zinc-900 m-0">Automated Safety Rules</p>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-zinc-900 m-0 text-sm">Auto-Escalate Rating</p>
                  <p className="text-xs text-zinc-400 mt-1">Automatically flag reviews at or below this rating</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    ≡ Booking.com / Agoda equivalent:{" "}
                    <strong className="text-orange-600">≤ {((hotelFields.aiConfig?.escalationRatingThreshold || 2) * 2)} / 10</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">≤</span>
                  <input type="number" min="1" max="5"
                    value={hotelFields.aiConfig?.escalationRatingThreshold || 2}
                    onChange={e => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), escalationRatingThreshold: e.target.value } })}
                    className="w-14 py-2 text-center bg-white border border-orange-200 rounded-xl font-black text-lg text-orange-600 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all" />
                </div>
              </div>
            </Card>

            {errors.sla && <FieldError msg={errors.sla} />}

            <PrimaryBtn loading={loading} onClick={() => handleSaveHotel()} className="w-full py-3.5 text-sm">
              <Check size={15} /> Save AI & Rules
            </PrimaryBtn>
          </div>
        )}

        {/* ════ ACCOUNT ════ */}
        {activeTab === "account" && (
          <div className="flex flex-col gap-5">
            <SectionHeader icon={User} iconColor="purple" title="Account Settings" subtitle="Update your display name and email address" />

            <div className="flex flex-col gap-4">
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

            <div className="pt-4 border-t border-zinc-100">
              <PrimaryBtn loading={loading} onClick={() => handleSaveProfile()}>
                <Save size={14} /> Update Profile
              </PrimaryBtn>
            </div>
          </div>
        )}

        {activeTab === "import" && <Import />}

        {/* ════ STAFF (hidden but preserved) ════ */}
        {activeTab === "staff" && (
          <div className="flex flex-col gap-4">
            <SectionHeader
              icon={Users} iconColor="purple"
              title="Staff Management"
              subtitle="Manage team members, roles and permissions"
              right={
                <PrimaryBtn className="px-4 py-2 text-xs"
                  onClick={() => { setEditingStaff(null); setNewStaff({ name: "", email: "", password: "", department: "Front Office", role: "staff" }); setIsModalOpen(true); }}>
                  <Plus size={13} /> Add Member
                </PrimaryBtn>
              }
            />

            {(state.staff || []).map(member => (
              <div key={member._id} className={`p-4 bg-white border border-zinc-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-zinc-300 ${member.status === 'disabled' ? 'opacity-60 grayscale' : ''}`}>
                <div className="flex gap-3 items-center">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${member.status === 'disabled' ? 'bg-zinc-100 text-zinc-400' : 'bg-orange-50 text-orange-600'}`}>
                    {(member.avatar_initials || member.name[0])}
                  </div>
                  <div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="font-semibold text-zinc-900 text-sm">{member.name}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${member.role === 'gm' ? 'bg-amber-100 text-amber-800' : member.role === 'dept_head' ? 'bg-orange-50 text-orange-600' : 'bg-zinc-100 text-zinc-500'}`}>
                        {member.role === "gm" ? "GM" : member.role === "dept_head" ? "Dept Head" : "Staff"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {member.email} <span className="mx-1.5">•</span> <span className="text-purple-600 font-semibold">{member.department}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 self-end md:self-center">
                  {[
                    { icon: <Edit2 size={14} />, action: () => { setEditingStaff(member); setNewStaff({ name: member.name, email: member.email, password: "", department: member.department, role: member.role }); setIsModalOpen(true); } },
                    { icon: member.status === "active" ? <UserMinus size={14} /> : <UserCheck size={14} />, action: async () => { const res = await updateStaff(member._id, { status: member.status === "active" ? "disabled" : "active" }); dispatch({ type: "UPDATE_STAFF_MEMBER", payload: res.data }); } },
                    { icon: <Trash2 size={14} />, disabled: member.role === "gm", action: async () => { if (member.role === "gm") { flashError("Cannot delete GM"); return; } if (!window.confirm("Delete?")) return; await removeStaff(member._id); dispatch({ type: "REMOVE_STAFF_MEMBER", payload: member._id }); } }
                  ].map((btn, i) => (
                    <button key={i} disabled={btn.disabled} onClick={btn.action}
                      className={`p-2 bg-transparent border border-zinc-200 rounded-lg flex items-center justify-center transition-colors ${btn.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-100 hover:text-zinc-900 text-zinc-400'}`}>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] w-full max-w-lg border border-zinc-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <p className="text-base font-bold text-zinc-900 m-0">{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</p>
                <p className="text-xs text-zinc-400 mt-0.5 m-0">Configure permissions and departmental access</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-transparent border-none cursor-pointer text-zinc-400 p-1 hover:bg-zinc-100 rounded-lg flex items-center justify-center transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStaffSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <Label required>Full Name</Label>
                <Input type="text" required value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
              </div>
              <div className={`grid ${editingStaff ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3.5`}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { role: "staff", label: "Standard Staff", desc: "Can view reviews and create tickets." },
                    { role: "dept_head", label: "Department Head", desc: "Can approve AI proposals and assign tasks." }
                  ].map(opt => (
                    <button type="button" key={opt.role}
                      onClick={() => setNewStaff({ ...newStaff, role: opt.role })}
                      className={`p-3.5 rounded-xl text-left border-[1.5px] cursor-pointer transition-all ${newStaff.role === opt.role ? 'border-orange-500 bg-orange-50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
                      <p className={`font-bold m-0 text-[13px] ${newStaff.role === opt.role ? 'text-orange-700' : 'text-zinc-900'}`}>{opt.label}</p>
                      <p className={`text-[11px] mt-1 m-0 ${newStaff.role === opt.role ? 'text-orange-600/80' : 'text-zinc-400'}`}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <GhostBtn type="button" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</GhostBtn>
                <PrimaryBtn loading={loading} className="flex-1">
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