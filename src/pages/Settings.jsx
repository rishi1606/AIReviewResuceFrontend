import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  Clock, ShieldAlert, AlertTriangle, ArrowLeft, Image, ExternalLink, Link as LinkIcon,
  MessageSquare, Tag, FileText, Copy
} from "lucide-react";
import Import from "../pages/Import";
import InfoTooltip from "../components/InfoTooltip";

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
  const [searchParams] = useSearchParams();
  const isScopedUser = currentUser?.role === "staff" || currentUser?.role === "dept_head";
  const defaultTab = isScopedUser ? "account" : (searchParams.get("tab") || "ai");
  const [activeTab, setActiveTab] = useState(defaultTab);
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
  const [selectedPropertyIdx, setSelectedPropertyIdx] = useState(null);
  const [draftProperty, setDraftProperty] = useState(null);
  const [propErrors, setPropErrors] = useState({});
  const [keywordInput, setKeywordInput] = useState("");
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "", category: "General" });
  const [editingTemplateIdx, setEditingTemplateIdx] = useState(null);

  useEffect(() => {
    if (state.hotelConfig) setHotelFields(state.hotelConfig);
  }, [state.hotelConfig]);

  useEffect(() => { document.title = "ReviewRescue — Settings"; }, []);

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
        {activeTab === "properties" && (() => {
          const properties = hotelFields.properties || [];
          const PLATFORM_META = {
            "Google": { logo: "https://www.google.com/favicon.ico", color: "#4285F4", bg: "#EBF3FF", border: "#C4DAFF", label: "Google Hotels" },
            "Booking.com": { logo: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><text x="50%" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="30" fill="#003580">B</text><circle cx="20" cy="36" r="3" fill="#003580"/></svg>')}`, color: "#003580", bg: "#E8EEF7", border: "#B8CCE8", label: "Booking.com" },
            "Agoda": { logo: "https://www.agoda.com/favicon.ico", color: "#5FC4EE", bg: "#EBF8FD", border: "#B3E5F7", label: "Agoda" },
            "Airbnb": { logo: "https://www.airbnb.com/favicon.ico", color: "#FF5A5F", bg: "#FFF0F0", border: "#FFD0D1", label: "Airbnb" },
          };

          // ── Detail View ──
          if (selectedPropertyIdx !== null) {
            const isNew = selectedPropertyIdx === "new";
            const prop = isNew ? draftProperty : properties[selectedPropertyIdx];
            if (!prop) { setSelectedPropertyIdx(null); setDraftProperty(null); return null; }
            const reviewCount = isNew ? 0 : (state.reviews?.filter(r => r.hotel_name === prop.name).length || 0);
            const connectedCount = Object.values(prop.platforms || {}).filter(u => u && u.startsWith("http")).length;

            const updateProp = (patch) => {
              // Clear errors for the changed fields
              if (Object.keys(propErrors).length > 0) {
                const clearedErrors = { ...propErrors };
                Object.keys(patch).forEach(key => delete clearedErrors[key]);
                // If platforms changed, clear the platforms error
                if (patch.platforms) delete clearedErrors.platforms;
                setPropErrors(clearedErrors);
              }
              if (isNew) setDraftProperty(prev => ({ ...prev, ...patch }));
              else updateProperty(selectedPropertyIdx, patch);
            };

            const validateProperty = () => {
              const e = {};
              if (!prop.name || !prop.name.trim()) e.name = "Property name is required";
              if (!prop.city || !prop.city.trim()) e.city = "City is required";
              if (!prop.rooms) e.rooms = "Number of rooms is required";
              else if (isNaN(prop.rooms) || parseInt(prop.rooms) <= 0) e.rooms = "Enter a valid number";
              const hasUrl = Object.values(prop.platforms || {}).some(u => u && u.startsWith("http"));
              if (!hasUrl) e.platforms = "At least one platform URL is required";
              // Check invalid URLs
              if (prop.platforms) {
                for (const [plat, url] of Object.entries(prop.platforms)) {
                  if (url && !url.startsWith("http")) {
                    e.platforms = `Invalid URL for ${plat} — must start with http`;
                    break;
                  }
                }
              }
              setPropErrors(e);
              return Object.keys(e).length === 0;
            };

            return (
              <div className="flex flex-col gap-5">
                {/* Back button */}
                <button
                  onClick={() => { setSelectedPropertyIdx(null); setDraftProperty(null); }}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer bg-transparent border-none p-0 self-start"
                >
                  <ArrowLeft size={15} /> Back to Properties
                </button>

                <BannerError msg={errors.properties} />

                {/* Property Header Card */}
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                  {/* Image Banner */}
                  <div className="relative h-[500px] bg-gradient-to-br from-purple-100 via-orange-50 to-amber-100 flex items-center justify-center overflow-hidden">
                    {prop.image ? (
                      <img src={prop.image} alt={prop.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-zinc-400">
                        <Building2 size={48} className="mb-2 text-zinc-300" />
                        <span className="text-xs font-medium">No property image</span>
                      </div>
                    )}
                    {/* Image URL input overlay */}
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      {prop.image && (
                        <button
                          onClick={() => updateProp({ image: "" })}
                          className="px-3 py-1.5 bg-red-600/90 text-white text-[11px] font-semibold rounded-lg cursor-pointer border-none hover:bg-red-700 transition-colors flex items-center gap-1.5 backdrop-blur-sm"
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="property-image-upload"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { flashError("Image must be under 5MB."); return; }
                          const reader = new FileReader();
                          reader.onload = () => updateProp({ image: reader.result });
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        onClick={() => document.getElementById("property-image-upload")?.click()}
                        className="px-3 py-1.5 bg-white/90 text-zinc-700 text-[11px] font-semibold rounded-lg cursor-pointer border border-zinc-200 hover:bg-white transition-colors flex items-center gap-1.5 backdrop-blur-sm"
                      >
                        <Image size={11} /> {prop.image ? "Change" : "Add"} Image
                      </button>
                    </div>
                    {/* Status badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm ${prop.is_active ? "bg-emerald-500/90 text-white" : "bg-zinc-600/80 text-white"}`}>
                        {prop.is_active ? "● Active" : "○ Inactive"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/90 text-purple-600 backdrop-blur-sm">
                        {reviewCount} reviews
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/90 text-blue-600 backdrop-blur-sm">
                        {connectedCount} platform{connectedCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Toggle */}
                    <button className="absolute top-3 right-3 bg-white/90 rounded-lg p-1 border-none cursor-pointer backdrop-blur-sm"
                      onClick={() => updateProp({ is_active: !prop.is_active })}>
                      {prop.is_active
                        ? <ToggleRight size={24} className="text-orange-500" />
                        : <ToggleLeft size={24} className="text-zinc-400" />}
                    </button>
                  </div>

                  {/* Property Details Form */}
                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <Label required>Property Name</Label>
                        <Input value={prop.name} placeholder="e.g. The Grand Palace" error={!!propErrors.name}
                          onChange={e => updateProp({ name: e.target.value })} />
                        {propErrors.name && <p className="text-[11px] text-red-500 font-medium mt-1 m-0">{propErrors.name}</p>}
                      </div>
                      <div>
                        <Label required>City</Label>
                        <Input icon={MapPin} value={prop.city} placeholder="Mumbai" error={!!propErrors.city}
                          onChange={e => updateProp({ city: e.target.value })} />
                        {propErrors.city && <p className="text-[11px] text-red-500 font-medium mt-1 m-0">{propErrors.city}</p>}
                      </div>
                      <div>
                        <Label required>Rooms</Label>
                        <Input icon={Building2} type="number" value={prop.rooms || ""} placeholder="150" error={!!propErrors.rooms}
                          onChange={e => updateProp({ rooms: e.target.value ? parseInt(e.target.value) : "" })} />
                        {propErrors.rooms && <p className="text-[11px] text-red-500 font-medium mt-1 m-0">{propErrors.rooms}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Timezone</Label>
                        <Select icon={Clock} value={prop.timezone || "IST"}
                          onChange={e => updateProp({ timezone: e.target.value })}>
                          <option value="IST">IST (New Delhi / Mumbai)</option>
                          <option value="EST">EST (New York)</option>
                          <option value="CST">CST (Chicago)</option>
                          <option value="PST">PST (Los Angeles)</option>
                          <option value="GMT">GMT (London)</option>
                          <option value="CET">CET (Paris / Berlin)</option>
                          <option value="JST">JST (Tokyo)</option>
                          <option value="AEST">AEST (Sydney)</option>
                          <option value="GST">GST (Dubai)</option>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <textarea
                        value={prop.description || ""}
                        placeholder="Brief description of this property..."
                        rows={3}
                        onChange={e => updateProp({ description: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-orange-500 rounded-xl outline-none font-medium text-sm text-zinc-900 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Connections */}
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                    <LinkIcon size={15} className="text-orange-500" />
                    <h3 className="text-[14px] font-bold text-zinc-900 m-0">Platform Connections</h3>
                    <span className="text-[10px] font-bold text-zinc-400 ml-auto">{connectedCount} / {Object.keys(PLATFORM_META).length} connected</span>
                  </div>
                  {propErrors.platforms && (
                    <div className="mx-5 mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-[11px] text-red-600 font-semibold m-0">⚠ {propErrors.platforms}</p>
                    </div>
                  )}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {Object.entries(PLATFORM_META).map(([platform, meta]) => {
                      const url = (prop.platforms && prop.platforms[platform]) || "";
                      const isConnected = url && url.startsWith("http");
                      return (
                        <div key={platform}
                          className={`rounded-xl border-2 p-4 transition-all ${isConnected ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300"}`}>
                          {/* Platform header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                              <img src={meta.logo} alt={platform} className="w-5 h-5" onError={e => { e.target.style.display = 'none'; }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-zinc-900 m-0">{meta.label}</p>
                              <p className="text-[10px] font-semibold m-0 mt-0.5" style={{ color: isConnected ? "#16a34a" : "#a1a1aa" }}>
                                {isConnected ? "✓ Connected" : "Not connected"}
                              </p>
                            </div>
                            {isConnected && (
                              <a href={url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                          {/* URL input */}
                          <div className="relative">
                            <input type="url" value={url}
                              placeholder={`Paste ${platform} review URL...`}
                              onChange={e => updateProp({ platforms: { ...(prop.platforms || {}), [platform]: e.target.value } })}
                              className={`w-full pl-3 pr-8 py-2 text-[12px] font-medium rounded-lg border outline-none transition-colors ${isConnected ? "bg-white border-emerald-200 text-zinc-800 focus:border-emerald-400" : "bg-white border-zinc-200 text-zinc-800 focus:border-zinc-400"}`}
                            />
                            {url && (
                              <X size={12}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 cursor-pointer transition-colors"
                                onClick={() => updateProp({ platforms: { ...(prop.platforms || {}), [platform]: "" } })}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sync Settings */}
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                    <Clock size={15} className="text-orange-500" />
                    <h3 className="text-[14px] font-bold text-zinc-900 m-0">Sync Settings</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <p className="text-[10px] font-bold text-zinc-400 m-0 mb-1 uppercase tracking-wider">Review Sync Schedule</p>
                      <p className="text-[14px] font-bold text-zinc-900 m-0">Every 6 hours</p>
                      <p className="text-[10px] text-zinc-400 m-0 mt-0.5">🔒 Sync frequency is fixed across all platforms</p>
                    </div>
                    <div>
                      <Label>Max Reviews per Sync <span className="font-normal normal-case text-zinc-400">(per platform)</span></Label>
                      <Select value={prop.max_reviews_per_sync || 10}
                        onChange={e => updateProp({ max_reviews_per_sync: parseInt(e.target.value) })}>
                        <option value={5}>5 reviews</option>
                        <option value={10}>10 reviews</option>
                        <option value={20}>20 reviews</option>
                      </Select>
                    </div>
                    {/* Sync status */}
                    <div className="px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 m-0 mb-0.5 uppercase tracking-wider">Last Synced</p>
                        <p className="text-[13px] font-bold text-zinc-900 m-0 flex items-center">
                          {getSyncTimeAgo(prop.last_sync_time)}
                          {prop.last_sync_status === "success" && <span className="text-[10px] text-emerald-600 ml-1.5 font-semibold">— Synced ✓</span>}
                        </p>
                      </div>
                      {(!prop.last_sync_status || prop.last_sync_status === "never") && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[9px] font-bold">⚠️ Not verified</span>
                      )}
                      {prop.last_sync_status === "success" && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[9px] font-bold">✅ Connected</span>
                      )}
                      {prop.last_sync_status === "failed" && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-[9px] font-bold">❌ Sync Failed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex justify-between items-center pt-2">
                  {!isNew ? (
                    <button
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-transparent border border-zinc-200 rounded-xl cursor-pointer text-[13px] font-semibold text-zinc-500 transition-colors hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                      onClick={async () => {
                        if (!window.confirm("Delete this property? This cannot be undone.")) return;
                        const p = [...hotelFields.properties]; p.splice(selectedPropertyIdx, 1);
                        const updated = { ...hotelFields, properties: p };
                        setHotelFields(updated); setLoading(true);
                        try { const res = await updateHotel(updated); dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: res.data }); flashSuccess("Property deleted."); setSelectedPropertyIdx(null); }
                        catch (err) { flashError(err.message); }
                        finally { setLoading(false); }
                      }}>
                      <Trash2 size={13} /> Delete Property
                    </button>
                  ) : (
                    <button
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-transparent border border-zinc-200 rounded-xl cursor-pointer text-[13px] font-semibold text-zinc-500 transition-colors hover:text-zinc-800 hover:bg-zinc-50"
                      onClick={() => { setSelectedPropertyIdx(null); setDraftProperty(null); }}>
                      <X size={13} /> Cancel
                    </button>
                  )}
                  <PrimaryBtn
                    loading={savingIdx === selectedPropertyIdx}
                    onClick={async () => {
                      if (!validateProperty()) return;
                      if (isNew) {
                        const newProperties = [...(hotelFields.properties || []), draftProperty];
                        const updated = { ...hotelFields, properties: newProperties };
                        setHotelFields(updated); setLoading(true);
                        try {
                          const res = await updateHotel(updated);
                          dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: res.data });
                          flashSuccess("Property added successfully!");
                          setSelectedPropertyIdx(null); setDraftProperty(null);
                        } catch (err) { flashError(err.message); }
                        finally { setLoading(false); }
                      } else {
                        setSavingIdx(selectedPropertyIdx); await handleSaveHotel(true); setSavingIdx(null);
                      }
                    }}>
                    <Save size={14} /> {isNew ? "Add Property" : "Save Property"}
                  </PrimaryBtn>
                </div>
              </div>
            );
          }

          // ── Card Grid View ──
          return (
            <div className="flex flex-col gap-5">
              <SectionHeader
                icon={Hotel} iconColor="purple"
                title="Properties"
                subtitle="Manage hotel properties and their review platform links"
                right={
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold text-zinc-400">
                      {properties.length} / 3
                    </span>
                    <PrimaryBtn className="px-4 py-2 text-xs"
                      onClick={() => {
                        if (properties.length >= 3) { flashError("Maximum 3 properties allowed."); return; }
                        setDraftProperty({ _uid: genUid(), name: "", city: "", rooms: "", timezone: "IST", is_active: true, platforms: {}, urgent_sync_interval: "5hr", low_sync_interval: "10hr", image: "", description: "" });
                        setSelectedPropertyIdx("new");
                      }}>
                      <Plus size={13} /> Add Property
                    </PrimaryBtn>
                  </div>
                }
              />

              <BannerError msg={errors.properties} />

              {properties.length === 0 ? (
                <div className="text-center py-16 px-5">
                  <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3.5 text-purple-600">
                    <Building2 size={24} />
                  </div>
                  <p className="font-bold text-zinc-900 m-0">No properties yet</p>
                  <p className="text-zinc-400 text-[13px] mt-1.5">Add your first property to start collecting reviews</p>
                  <PrimaryBtn className="mt-4 mx-auto"
                    onClick={() => {
                      setDraftProperty({ _uid: genUid(), name: "", city: "", rooms: "", timezone: "IST", is_active: true, platforms: {}, urgent_sync_interval: "5hr", low_sync_interval: "10hr", image: "", description: "" });
                      setSelectedPropertyIdx("new");
                    }}>
                    <Plus size={13} /> Add Property
                  </PrimaryBtn>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {properties.map((prop, idx) => {
                    const reviewCount = state.reviews?.filter(r => r.hotel_name === prop.name).length || 0;
                    const connectedPlatforms = Object.entries(prop.platforms || {}).filter(([, u]) => u && u.startsWith("http"));
                    return (
                      <div key={prop._uid || prop._id || idx}
                        onClick={() => setSelectedPropertyIdx(idx)}
                        className="bg-white rounded-2xl border border-zinc-200 overflow-hidden cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-lg hover:border-zinc-300 active:translate-y-0 flex flex-col"
                      >
                        {/* Card Image */}
                        <div className="relative h-36 bg-gradient-to-br from-purple-100 via-orange-50 to-amber-100 overflow-hidden">
                          {prop.image ? (
                            <img src={prop.image} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Building2 size={36} className="text-zinc-300" />
                            </div>
                          )}
                          {/* Overlays */}
                          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-sm ${prop.is_active ? "bg-emerald-500/90 text-white" : "bg-zinc-600/80 text-white"}`}>
                              {prop.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="absolute bottom-2.5 right-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/50 text-white backdrop-blur-sm">
                              {reviewCount} reviews
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 flex flex-col flex-1">
                          <h4 className="text-[14px] font-bold text-zinc-900 m-0 truncate group-hover:text-orange-600 transition-colors">
                            {prop.name || "Unnamed Property"}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin size={11} className="text-zinc-400" />
                            <span className="text-[11px] text-zinc-500 font-medium">{prop.city || "No city"}</span>
                            {prop.rooms && <span className="text-[11px] text-zinc-400">· {prop.rooms} rooms</span>}
                          </div>
                          {prop.description && (
                            <p className="text-[11px] text-zinc-400 mt-1.5 m-0 truncate leading-relaxed">{prop.description}</p>
                          )}

                          {/* Connected platforms */}
                          <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-zinc-100">
                            {connectedPlatforms.length > 0 ? (
                              <>
                                {connectedPlatforms.map(([plat]) => (
                                  <div key={plat} className="w-7 h-7 rounded-lg flex items-center justify-center border"
                                    style={{ background: PLATFORM_META[plat]?.bg || "#f4f4f5", borderColor: PLATFORM_META[plat]?.border || "#e4e4e7" }}
                                    title={plat}>
                                    <img src={PLATFORM_META[plat]?.logo} alt={plat} className="w-3.5 h-3.5" onError={e => { e.target.style.display = 'none'; }} />
                                  </div>
                                ))}
                                <span className="text-[10px] text-zinc-400 font-medium ml-auto">{connectedPlatforms.length} connected</span>
                              </>
                            ) : (
                              <span className="text-[10px] text-amber-500 font-semibold">⚠ No platforms connected</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ════ RULES / AI ════ */}
        {activeTab === "ai" && (
          <div className="flex flex-col gap-5">
            <SectionHeader icon={Shield} iconColor="purple" title="Rules & Automation" subtitle="Confidence thresholds, alerts, and response templates" />

            {/* ── Section 1: AI Confidence ── */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                <Zap size={15} className="text-orange-500" />
                <h3 className="text-[14px] font-bold text-zinc-900 m-0" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Analysis Confidence
                  <InfoTooltip text="Reviews below this confidence threshold will require manual review before a response can be posted. Higher values mean stricter AI quality control." size={13} />
                </h3>
                <span className="ml-auto px-3 py-1 bg-purple-50 border border-purple-100 rounded-lg text-lg font-black text-purple-600">
                  {hotelFields.aiConfig?.confidenceThreshold || 75}%
                </span>
              </div>
              <div className="p-6">
                <p className="text-[13px] text-zinc-500 m-0 mb-4">Minimum confidence for auto-approval. Reviews below this threshold are flagged for manual review.</p>
                <input type="range" min="0" max="100"
                  value={hotelFields.aiConfig?.confidenceThreshold || 75}
                  onChange={e => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), confidenceThreshold: parseInt(e.target.value) } })}
                  className="w-full h-1.5 cursor-pointer accent-orange-500 bg-zinc-200 rounded-lg appearance-none" />
                <div className="flex justify-between text-[10px] text-zinc-400 font-semibold mt-1.5">
                  {["0%", "25%", "50%", "75%", "100%"].map(v => <span key={v}>{v}</span>)}
                </div>
                <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex gap-2.5">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-px" />
                  <p className="text-xs text-amber-900 m-0">
                    Reviews below <strong>{hotelFields.aiConfig?.confidenceThreshold || 75}%</strong> confidence will be flagged for human review.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Section 2: Safety Rules ── */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                <ShieldAlert size={15} className="text-orange-500" />
                <h3 className="text-[14px] font-bold text-zinc-900 m-0">Safety Rules</h3>
              </div>
              <div className="p-6">
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-zinc-900 m-0 text-sm flex items-center gap-1.5">
                      Auto-Escalate Rating
                      <InfoTooltip
                        text={<>Reviews rated <strong>≤ {hotelFields.aiConfig?.escalationRatingThreshold || 2}/5</strong> (or <strong>≤ {(hotelFields.aiConfig?.escalationRatingThreshold || 2) * 2}/10</strong> on Booking.com / Agoda) are automatically escalated.</>}
                        size={14} color="#d97706" position="right" maxWidth={300}
                      />
                    </p>
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
                      onChange={e => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), escalationRatingThreshold: parseInt(e.target.value) || 1 } })}
                      className="w-14 py-2 text-center bg-white border border-orange-200 rounded-xl font-black text-lg text-orange-600 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Keyword Alerts ── */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                <Tag size={15} className="text-orange-500" />
                <h3 className="text-[14px] font-bold text-zinc-900 m-0" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Keyword Alerts
                  <InfoTooltip text="Reviews containing any of these keywords will be automatically flagged for urgent review and highlighted with a keyword alert banner on the review detail page." size={13} />
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 ml-auto">
                  {(hotelFields.keywordAlerts || []).length} keywords
                </span>
              </div>
              <div className="p-6">
                <p className="text-[13px] text-zinc-500 m-0 mb-4">Reviews containing these keywords will be automatically flagged for urgent review.</p>
                {/* Keyword input */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <input type="text" value={keywordInput}
                      placeholder="Type a keyword and press Enter..."
                      onChange={e => setKeywordInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && keywordInput.trim()) {
                          e.preventDefault();
                          const word = keywordInput.trim().toLowerCase();
                          if (!(hotelFields.keywordAlerts || []).includes(word)) {
                            setHotelFields({ ...hotelFields, keywordAlerts: [...(hotelFields.keywordAlerts || []), word] });
                          }
                          setKeywordInput("");
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-[13px] font-medium text-zinc-900 focus:border-orange-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!keywordInput.trim()) return;
                      const word = keywordInput.trim().toLowerCase();
                      if (!(hotelFields.keywordAlerts || []).includes(word)) {
                        setHotelFields({ ...hotelFields, keywordAlerts: [...(hotelFields.keywordAlerts || []), word] });
                      }
                      setKeywordInput("");
                    }}
                    className="px-4 py-2.5 bg-orange-600 text-white text-[13px] font-semibold rounded-xl border-none cursor-pointer hover:bg-orange-700 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
                {/* Keyword tags */}
                {(hotelFields.keywordAlerts || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(hotelFields.keywordAlerts || []).map((keyword, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[12px] font-semibold">
                        {keyword}
                        <X size={12} className="cursor-pointer hover:text-red-900 transition-colors"
                          onClick={() => setHotelFields({ ...hotelFields, keywordAlerts: (hotelFields.keywordAlerts || []).filter((_, j) => j !== i) })}
                        />
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-400">
                    <Tag size={24} className="mx-auto mb-2 text-zinc-300" />
                    <p className="text-[12px] m-0 font-medium">No keywords added yet</p>
                    <p className="text-[11px] m-0 mt-0.5">Try: "cockroach", "dirty", "refund", "bed bugs", "unsafe"</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 4: Response Templates ── */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                <MessageSquare size={15} className="text-orange-500" />
                <h3 className="text-[14px] font-bold text-zinc-900 m-0" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Response Templates
                  <InfoTooltip text="Changes to templates (adding, editing, or deleting) are only saved when you click 'Save Settings' at the bottom of the page." size={13} />
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 ml-auto">
                  {(hotelFields.responseTemplates || []).length} templates
                </span>
              </div>
              <div className="p-6">
                <p className="text-[13px] text-zinc-500 m-0 mb-4">Create reusable response templates for common review scenarios. These can be used when composing responses.</p>

                {/* Existing templates */}
                {(hotelFields.responseTemplates || []).length > 0 && (
                  <div className="flex flex-col gap-2.5 mb-5">
                    {(hotelFields.responseTemplates || []).map((tpl, i) => (
                      <div key={i} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl group hover:border-zinc-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-orange-500" />
                            <span className="text-[13px] font-bold text-zinc-900">{tpl.name}</span>
                            <span className="px-2 py-0.5 bg-white border border-zinc-200 rounded-md text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{tpl.category}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { navigator.clipboard.writeText(tpl.content); flashSuccess("Template copied!"); }}
                              className="p-1.5 bg-white border border-zinc-200 rounded-lg cursor-pointer text-zinc-400 hover:text-zinc-600 transition-colors" title="Copy">
                              <Copy size={12} />
                            </button>
                            <button onClick={() => { setEditingTemplateIdx(i); setNewTemplate({ name: tpl.name, content: tpl.content, category: tpl.category }); }}
                              className="p-1.5 bg-white border border-zinc-200 rounded-lg cursor-pointer text-zinc-400 hover:text-zinc-600 transition-colors" title="Edit">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => {
                              const updated = (hotelFields.responseTemplates || []).filter((_, j) => j !== i);
                              setHotelFields({ ...hotelFields, responseTemplates: updated });
                            }}
                              className="p-1.5 bg-white border border-zinc-200 rounded-lg cursor-pointer text-zinc-400 hover:text-red-500 transition-colors" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[12px] text-zinc-500 m-0 leading-relaxed line-clamp-2">{tpl.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add / Edit template form */}
                <div className="p-4 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <p className="text-[12px] font-bold text-zinc-600 m-0 mb-3">
                    {editingTemplateIdx !== null ? "✏️ Edit Template" : "➕ New Template"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Template Name</label>
                      <input type="text" value={newTemplate.name} placeholder="e.g. Thank You Response"
                        onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none text-[13px] font-medium text-zinc-900 focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Category</label>
                      <select value={newTemplate.category}
                        onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none text-[13px] font-medium text-zinc-900 appearance-none cursor-pointer focus:border-orange-500 transition-colors">
                        <option value="General">General</option>
                        <option value="Positive">Positive Review</option>
                        <option value="Negative">Negative Review</option>
                        <option value="Complaint">Complaint</option>
                        <option value="Follow-up">Follow-up</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Response Content</label>
                    <textarea value={newTemplate.content}
                      placeholder="Dear {guest_name}, thank you for staying with us..."
                      rows={4}
                      onChange={e => setNewTemplate({ ...newTemplate, content: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none text-[13px] font-medium text-zinc-900 focus:border-orange-500 transition-colors resize-none"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1 m-0">Use {"{guest_name}"} as placeholder for guest name</p>
                  </div>
                  <div className="flex gap-2">
                    {editingTemplateIdx !== null && (
                      <button onClick={() => { setEditingTemplateIdx(null); setNewTemplate({ name: "", content: "", category: "General" }); }}
                        className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-[13px] font-semibold text-zinc-500 cursor-pointer hover:bg-zinc-50 transition-colors">
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!newTemplate.name.trim() || !newTemplate.content.trim()) { flashError("Template name and content are required."); return; }
                        const templates = [...(hotelFields.responseTemplates || [])];
                        if (editingTemplateIdx !== null) {
                          templates[editingTemplateIdx] = { ...newTemplate };
                        } else {
                          templates.push({ ...newTemplate });
                        }
                        setHotelFields({ ...hotelFields, responseTemplates: templates });
                        setNewTemplate({ name: "", content: "", category: "General" });
                        setEditingTemplateIdx(null);
                      }}
                      className="px-5 py-2 bg-orange-600 text-white text-[13px] font-semibold rounded-xl border-none cursor-pointer hover:bg-orange-700 transition-colors flex items-center gap-1.5"
                    >
                      {editingTemplateIdx !== null ? <><Check size={13} /> Update Template</> : <><Plus size={13} /> Add Template</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {errors.sla && <FieldError msg={errors.sla} />}

            <div className="flex justify-end">
              <PrimaryBtn loading={loading} onClick={() => handleSaveHotel()} className="px-6 py-2.5 text-sm">
                <Check size={15} /> Save Rules & Settings
              </PrimaryBtn>
            </div>
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
                <GhostBtn type="button" className="flex-1" onClick={() => { setIsModalOpen(false); setSelectedPropertyIdx(null); setDraftProperty(null); }}>Cancel</GhostBtn>
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