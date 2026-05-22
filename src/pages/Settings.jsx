import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { getHotel, updateHotel, getStaff, addStaff, updateStaff, removeStaff, updateMe, runFullAnalysis } from "../api/apiClient";
import { classifyAllPending } from "../utils/aiClassifier";
import { DEPARTMENTS } from "../utils/constants";
import {
  Hotel,
  Users,
  Shield,
  Bell,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Lock,
  User,
  X,
  Sparkles,
  Loader2,
  Globe,
  Mail,
  MapPin,
  Building2,
  Filter,
  Edit2,
  UserMinus,
  UserCheck,
  Search,
  ChevronDown,
  AlertCircle,
  Zap,
  Check,
  ToggleLeft,
  ToggleRight,
  Clock,
  ShieldAlert,
  AlertTriangle
} from "lucide-react";

const Settings = () => {
  const { state, dispatch, refreshData } = useAppContext();
  const { currentUser, logout, updateUser } = useAuth();
  const isScopedUser = currentUser?.role === "staff" || currentUser?.role === "dept_head";
  const [activeTab, setActiveTab] = useState(isScopedUser ? "account" : "ai"); // Default to AI, except for scoped users
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    password: "",
    department: "Front Office",
    role: "staff"
  });

  const [hotelFields, setHotelFields] = useState(state.hotelConfig || {});
  const [profileFields, setProfileFields] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || ""
  });

  const [deptFilter, setDeptFilter] = useState("ALL");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (state.hotelConfig) setHotelFields(state.hotelConfig);
  }, [state.hotelConfig]);

  const parseIntervalToMinutes = (val) => {
    if (!val) return 0;
    const matchMin = val.match(/^(\d+)min$/);
    if (matchMin) return parseInt(matchMin[1]);
    const matchHr = val.match(/^(\d+)hr$/);
    if (matchHr) return parseInt(matchHr[1]) * 60;
    return 0;
  };

  const getSyncTimeAgo = (timeString) => {
    if (!timeString) return "Never";
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now - date;
    if (isNaN(diffMs) || diffMs < 0) return "Never";

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  };

  const validateSettings = () => {
    const newErrors = {};

    // Hotel Profile Validation
    if (activeTab === "hotel") {
      if (!hotelFields.hotel_name || hotelFields.hotel_name.length < 3) {
        newErrors.hotel_name = "Hotel name must be at least 3 characters";
      }
      if (!hotelFields.number_of_rooms || isNaN(hotelFields.number_of_rooms)) {
        newErrors.number_of_rooms = "Valid number of rooms is required";
      }
      if (!hotelFields.city) {
        newErrors.city = "City is required";
      }
      if (!hotelFields.contact_email || !hotelFields.contact_email.includes("@")) {
        newErrors.contact_email = "Valid contact email is required for escalations";
      }
    }

    // AI & SLA Validation
    if (activeTab === "ai") {
      const { high, medium, low } = hotelFields.slaConfig || {};
      if (parseInt(high) >= parseInt(medium)) {
        newErrors.sla = "High urgency SLA must be less than Medium urgency SLA";
      }
      if (parseInt(medium) >= parseInt(low)) {
        newErrors.sla = "Medium urgency SLA must be less than Low urgency SLA";
      }
    }

    // Properties Validation
    if (activeTab === "properties") {
      const props = hotelFields.properties || [];
      const allUrls = [];
      for (let i = 0; i < props.length; i++) {
        const p = props[i];
        if (!p.name) newErrors.properties = `Property ${i + 1} name is required.`;
        if (!p.city) newErrors.properties = `Property ${i + 1} city is required.`;
        if (!p.rooms) newErrors.properties = `Property ${i + 1} number of rooms is required.`;

        // Validation rule: Low urgency sync must be less frequent than high urgency sync (low interval must be greater than high interval)
        const urgentMins = parseIntervalToMinutes(p.urgent_sync_interval || "5hr");
        const lowMins = parseIntervalToMinutes(p.low_sync_interval || "10hr");
        if (lowMins <= urgentMins) {
          newErrors.properties = "Low urgency sync must be less frequent than high urgency sync.";
        }

        let hasOneUrl = false;
        if (p.platforms) {
          for (const [plat, url] of Object.entries(p.platforms)) {
            if (url) {
              if (!url.startsWith("http")) {
                newErrors.properties = `Invalid URL for ${plat} in property ${p.name || i + 1}. Please paste a valid hotel page URL.`;
              } else {
                hasOneUrl = true;
                if (allUrls.includes(url)) {
                  newErrors.properties = `Duplicate URL found: ${url}. Already added in another property.`;
                }
                allUrls.push(url);
              }
            }
          }
        }
        if (!hasOneUrl) newErrors.properties = `Property ${p.name || i + 1} must have at least one platform URL.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveHotel = async () => {
    if (!validateSettings()) {
      // Small timeout to allow errors state to update
      setTimeout(() => {
        alert("Please fix the validation errors before saving.");
      }, 100);
      return;
    }
    setLoading(true);
    try {
      const res = await updateHotel(hotelFields);
      dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: res.data });
      alert("Settings saved successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
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
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!window.confirm("This will re-run AI analysis on all pending reviews. Continue?")) return;
    setLoading(true);
    try {
      await runFullAnalysis();
      alert("Background analysis started!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await updateMe(profileFields);
      updateUser(res.data);
      alert("Profile updated!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "hotel", name: "Hotel Profile", icon: Hotel },
    { id: "properties", name: "Properties", icon: Building2 },
    { id: "staff", name: "Staff Management", icon: Users },
    { id: "ai", name: "AI & SLAs", icon: Shield },
    { id: "account", name: "Account", icon: User },
  ];

  const visibleTabs = tabs.filter(t => !isScopedUser || t.id === "account");

  const departments = DEPARTMENTS;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Global configuration for ReviewRescue.</p>
        </div>
        {activeTab === "ai" && (
          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Run Full Analysis
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1.5 bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-sm">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              setErrors({});
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === t.id ? "bg-slate-900 text-white shadow-xl" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <t.icon size={18} />
            {t.name}
          </button>
        ))}
      </div>

      <div className="glass-card p-10 bg-white border border-slate-100 shadow-sm min-h-[600px] relative">
        {activeTab === "hotel" && (
          <div className="space-y-10">
            <div className="flex items-center gap-3 border-b pb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                <Building2 size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Hotel Profile</h3>
                <p className="text-sm text-slate-500">Public information and core property settings.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Hotel Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="text"
                    value={hotelFields.hotel_name || ""}
                    onChange={e => setHotelFields({ ...hotelFields, hotel_name: e.target.value })}
                    className={`w-full p-4 pl-12 bg-slate-50 border ${errors.hotel_name ? 'border-red-500' : 'border-slate-200'} rounded-[20px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all`}
                    placeholder="Grand Plaza Hotel"
                  />
                </div>
                {errors.hotel_name && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-wider">{errors.hotel_name}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">City <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="text"
                    value={hotelFields.city || ""}
                    onChange={e => setHotelFields({ ...hotelFields, city: e.target.value })}
                    className={`w-full p-4 pl-12 bg-slate-50 border ${errors.city ? 'border-red-500' : 'border-slate-200'} rounded-[20px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all`}
                    placeholder="New York"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Property Size (Rooms) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Hotel className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="number"
                    value={hotelFields.number_of_rooms || ""}
                    onChange={e => setHotelFields({ ...hotelFields, number_of_rooms: e.target.value })}
                    className={`w-full p-4 pl-12 bg-slate-50 border ${errors.number_of_rooms ? 'border-red-500' : 'border-slate-200'} rounded-[20px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all`}
                    placeholder="150"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Operational Timezone</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <select
                    value={hotelFields.timezone || "UTC"}
                    onChange={e => setHotelFields({ ...hotelFields, timezone: e.target.value })}
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 appearance-none transition-all"
                  >

                    <option value="IST">IST (New Delhi/Mumbai)</option>

                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>

              {/* <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Escalation Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="email"
                    value={hotelFields.contact_email || ""}
                    onChange={e => setHotelFields({ ...hotelFields, contact_email: e.target.value })}
                    className={`w-full p-4 pl-12 bg-slate-50 border ${errors.contact_email ? 'border-red-500' : 'border-slate-200'} rounded-[20px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all`}
                    placeholder="gm@hotel.com"
                  />
                </div>
              </div> */}

              <div className="md:col-span-2 space-y-4 pt-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Active Review Platforms</label>
                <div className="flex flex-wrap gap-3">
                  {["Google", "Booking.com", "Agoda", "Airbnb"].map(platform => {
                    const isActive = (hotelFields.platforms || []).includes(platform);
                    return (
                      <button
                        key={platform}
                        onClick={() => {
                          const current = hotelFields.platforms || [];
                          const updated = isActive
                            ? current.filter(p => p !== platform)
                            : [...current, platform];
                          setHotelFields({ ...hotelFields, platforms: updated });
                        }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                          : "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {isActive && <Check size={16} />}
                        {platform}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50">
              <button
                onClick={handleSaveHotel}
                disabled={loading}
                className="btn-primary w-full md:w-auto px-16 py-5 flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save />}
                Update Property Profile
              </button>
            </div>
          </div>
        )}

        {activeTab === "properties" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-3"><Building2 className="text-indigo-600" /> Properties</h3>
                <p className="text-sm text-slate-500">Manage your hotel properties and their review platform links.</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <span className="text-sm font-bold text-slate-400">
                  {(hotelFields.properties || []).length} / 3 properties
                </span>
                <button
                  onClick={() => {
                    const currentProps = hotelFields.properties || [];
                    if (currentProps.length >= 3) return alert("Maximum 3 properties allowed.");
                    const newProp = {
                      name: "", city: "", rooms: "", timezone: "IST", is_active: true, platforms: {},
                      urgent_sync_interval: "5hr", low_sync_interval: "10hr"
                    };
                    setHotelFields({ ...hotelFields, properties: [newProp, ...currentProps] });
                  }}
                  className="btn-primary text-xs flex items-center gap-2 whitespace-nowrap px-6 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  <Plus size={16} /> Add Property
                </button>
              </div>
            </div>

            {errors.properties && (
              <div className="p-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 flex items-center gap-3">
                <AlertCircle size={18} />
                {errors.properties}
              </div>
            )}

            {(hotelFields.properties || []).length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Building2 size={32} />
                </div>
                <p className="text-slate-900 font-bold">No properties added yet</p>
                <p className="text-slate-500 text-sm">Add your first property to start collecting reviews</p>
                <button
                  onClick={() => {
                    const newProp = {
                      name: "", city: "", rooms: "", timezone: "IST", is_active: true, platforms: {},
                      urgent_sync_interval: "5hr", low_sync_interval: "10hr"
                    };
                    setHotelFields({ ...hotelFields, properties: [newProp] });
                  }}
                  className="btn-primary mt-4"
                >
                  + Add Property
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {(hotelFields.properties || []).map((prop, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-[24px] shadow-sm relative overflow-hidden transition-all group hover:border-indigo-200">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm font-bold text-xl border border-slate-100">
                          🏨
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <input
                              type="text"
                              value={prop.name}
                              onChange={(e) => {
                                const updatedProps = [...hotelFields.properties];
                                updatedProps[idx].name = e.target.value;
                                setHotelFields({ ...hotelFields, properties: updatedProps });
                              }}
                              className={`text-xl font-bold bg-transparent border-b ${!prop.name && errors.properties ? 'border-red-500 border-dashed text-red-600' : 'border-dashed border-slate-300 focus:border-indigo-500'} outline-none pb-1 placeholder-slate-300 w-[200px] md:w-[250px]`}
                              placeholder="Property Name"
                            />
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-indigo-100 whitespace-nowrap animate-in zoom-in duration-300">
                              [{prop.review_count || 0} reviews]
                            </span>
                            {prop.is_active ? (
                              <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-green-100 whitespace-nowrap animate-in zoom-in duration-300">
                                [Active]
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-xl border border-slate-200 whitespace-nowrap animate-in zoom-in duration-300">
                                [Inactive]
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <input
                              type="text"
                              value={prop.city}
                              onChange={(e) => {
                                const updatedProps = [...hotelFields.properties];
                                updatedProps[idx].city = e.target.value;
                                setHotelFields({ ...hotelFields, properties: updatedProps });
                              }}
                              className={`w-24 bg-transparent border-b ${!prop.city && errors.properties ? 'border-red-500' : 'border-dashed border-slate-300'} focus:border-indigo-500 outline-none placeholder-slate-300`}
                              placeholder="City"
                            />
                            <span>· Rooms:</span>
                            <input
                              type="number"
                              value={prop.rooms || ""}
                              onChange={(e) => {
                                const updatedProps = [...hotelFields.properties];
                                updatedProps[idx].rooms = e.target.value ? parseInt(e.target.value) : "";
                                setHotelFields({ ...hotelFields, properties: updatedProps });
                              }}
                              className={`w-16 bg-transparent border-b ${!prop.rooms && errors.properties ? 'border-red-500' : 'border-dashed border-slate-300'} focus:border-indigo-500 outline-none placeholder-slate-300`}
                              placeholder="150"
                            />
                            <span>·</span>
                            <select
                              value={prop.timezone || "IST"}
                              onChange={(e) => {
                                const updatedProps = [...hotelFields.properties];
                                updatedProps[idx].timezone = e.target.value;
                                setHotelFields({ ...hotelFields, properties: updatedProps });
                              }}
                              className="bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none"
                            >

                              <option value="IST">IST</option>

                            </select>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updatedProps = [...hotelFields.properties];
                          updatedProps[idx].is_active = !updatedProps[idx].is_active;
                          setHotelFields({ ...hotelFields, properties: updatedProps });
                        }}
                        className="transition-transform active:scale-90"
                      >
                        {prop.is_active ? <ToggleRight className="text-indigo-600" size={36} /> : <ToggleLeft className="text-slate-300" size={36} />}
                      </button>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Platform Links</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {["Google", "Booking.com", "Agoda", "Airbnb"].map(platform => {
                          const url = (prop.platforms && prop.platforms[platform]) || "";
                          const isValid = url.startsWith("http");
                          const isError = url.length > 0 && !isValid;

                          return (
                            <div key={platform} className="flex items-center gap-3">
                              <div className={`w-24 text-xs font-bold ${url ? 'text-slate-700' : 'text-slate-400'}`}>{platform}</div>
                              <div className="flex-1 relative">
                                <input
                                  type="url"
                                  value={url}
                                  onChange={(e) => {
                                    const updatedProps = [...hotelFields.properties];
                                    if (!updatedProps[idx].platforms) updatedProps[idx].platforms = {};
                                    updatedProps[idx].platforms[platform] = e.target.value;
                                    setHotelFields({ ...hotelFields, properties: updatedProps });
                                  }}
                                  className={`w-full p-3 text-xs bg-white border ${isError ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
                                  placeholder={`Paste ${platform} URL...`}
                                />
                                {url && isValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-in zoom-in duration-300" size={16} />}
                                {!url && <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 animate-in zoom-in duration-300" size={16} />}
                                {isError && <X className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 animate-in zoom-in duration-300" size={16} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Review Sync Schedule */}
                    <div className="pt-6 border-t border-slate-200 mt-6">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Review Sync Schedule</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-slate-100">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">High Urgency (1-3★ reviews)</label>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 whitespace-nowrap">Sync every</span>
                              <div className="flex-1 p-3 text-xs bg-slate-100 border border-slate-200 rounded-xl font-black text-slate-400 text-center select-none cursor-not-allowed">
                                5 hrs
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">⚠️ Fixed frequency</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Low Urgency (4-5★ reviews)</label>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 whitespace-nowrap">Sync every</span>
                              <div className="flex-1 p-3 text-xs bg-slate-100 border border-slate-200 rounded-xl font-black text-slate-400 text-center select-none cursor-not-allowed">
                                10 hrs
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">⚠️ Fixed frequency</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Max reviews per sync</label>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 whitespace-nowrap">Limit to</span>
                            <select
                              value={prop.max_reviews_per_sync || 5}
                              onChange={(e) => {
                                const updatedProps = [...hotelFields.properties];
                                updatedProps[idx].max_reviews_per_sync = parseInt(e.target.value);
                                setHotelFields({ ...hotelFields, properties: updatedProps });
                              }}
                              className="flex-1 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                            >
                              <option value={5}>5 reviews</option>
                              <option value={10}>10 reviews</option>
                              <option value={15}>15 reviews</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sync Status Section */}
                    <div className="mt-4 p-4 rounded-xl border border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Last synced:</span>
                        <span className="text-xs font-black text-slate-700">
                          {getSyncTimeAgo(prop.last_sync_time)}
                        </span>
                      </div>

                      {/* Status Badges */}
                      {(!prop.last_sync_status || prop.last_sync_status === "never") && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-100">
                          <AlertTriangle size={12} className="text-amber-500" /> Not verified yet ⚠️
                        </div>
                      )}
                      {prop.last_sync_status === "success" && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-green-100">
                          <CheckCircle2 size={12} className="text-green-500" /> Connected & Working ✅
                        </div>
                      )}
                      {prop.last_sync_status === "failed" && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-red-100">
                          <X size={12} className="text-red-500" /> Sync Failed ❌
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
                      <button
                        onClick={async () => {
                          if (!window.confirm("Delete this property?")) return;
                          const updatedProps = [...hotelFields.properties];
                          updatedProps.splice(idx, 1);
                          const updatedHotelFields = { ...hotelFields, properties: updatedProps };
                          setHotelFields(updatedHotelFields);

                          setLoading(true);
                          try {
                            const res = await updateHotel(updatedHotelFields);
                            dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: res.data });
                            alert("Property deleted successfully!");
                          } catch (err) {
                            alert(err.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                      <button
                        onClick={handleSaveHotel}
                        disabled={loading}
                        className="btn-primary text-xs py-2 px-6 flex items-center gap-2 shadow-sm"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Property
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "staff" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-3"><Users className="text-indigo-600" /> Staff Management</h3>
                <p className="text-sm text-slate-500">Manage team members, roles, and permissions.</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
                <button
                  onClick={() => {
                    setEditingStaff(null);
                    setNewStaff({ name: "", email: "", password: "", department: "Front Office", role: "staff" });
                    setIsModalOpen(true);
                  }}
                  className="btn-primary text-xs flex items-center gap-2 whitespace-nowrap px-6"
                >
                  <Plus size={16} /> Add Member
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {state.staff.filter(s => deptFilter === "ALL" || s.department === deptFilter).length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Users size={32} />
                  </div>
                  <p className="text-slate-400 font-medium">No staff members found matching your filter.</p>
                </div>
              ) : state.staff.filter(s => deptFilter === "ALL" || s.department === deptFilter).map(s => (
                <div key={s._id} className={`p-5 bg-white border ${s.status === 'disabled' ? 'opacity-60 grayscale bg-slate-50' : 'hover:border-indigo-200 shadow-sm'} border-slate-100 rounded-[24px] flex justify-between items-center group transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${s.status === 'disabled' ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'} rounded-2xl flex items-center justify-center font-bold text-xl`}>
                      {s.avatar_initials || s.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${s.role === 'gm' ? 'bg-amber-100 text-amber-700' :
                          s.role === 'dept_head' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                          {s.role === 'gm' ? 'GM' : s.role === 'dept_head' ? 'Dept Head' : 'Staff'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${s.inviteStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                          {s.inviteStatus || 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{s.email} • <span className="text-indigo-600 font-bold">{s.department}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingStaff(s);
                        setNewStaff({ name: s.name, email: s.email, password: "", department: s.department, role: s.role });
                        setIsModalOpen(true);
                      }}
                      className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        const newStatus = s.status === "active" ? "disabled" : "active";
                        const res = await updateStaff(s._id, { status: newStatus });
                        dispatch({ type: "UPDATE_STAFF_MEMBER", payload: res.data });
                      }}
                      className={`p-2.5 rounded-xl transition-all ${s.status === 'active' ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                    >
                      {s.status === 'active' ? <UserMinus size={18} /> : <UserCheck size={18} />}
                    </button>
                    <button
                      onClick={async () => {
                        if (s.role === 'gm') return alert("Cannot delete General Manager");
                        if (!window.confirm("Delete staff member?")) return;
                        await removeStaff(s._id);
                        dispatch({ type: "REMOVE_STAFF_MEMBER", payload: s._id });
                      }}
                      disabled={s.role === 'gm'}
                      className={`p-2.5 rounded-xl transition-all ${s.role === 'gm' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-12">
            {/* Section 1: SLAs */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-3"><Clock className="text-indigo-600" /> Response SLAs</h3>
                {errors.sla && <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-3 py-1.5 rounded-full border border-red-100 animate-bounce"><AlertCircle size={14} /> {errors.sla}</div>}
              </div>

              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Urgency-Based Deadlines (Hours)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-slate-700">High Urgency</label>
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black">CRITICAL</span>
                    </div>
                    <input
                      type="number"
                      value={hotelFields.slaConfig?.high || 4}
                      onChange={e => setHotelFields({ ...hotelFields, slaConfig: { ...(hotelFields.slaConfig || {}), high: e.target.value } })}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Medium Urgency</label>
                    <input
                      type="number"
                      value={hotelFields.slaConfig?.medium || 24}
                      onChange={e => setHotelFields({ ...hotelFields, slaConfig: { ...(hotelFields.slaConfig || {}), medium: e.target.value } })}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Low Urgency</label>
                    <input
                      type="number"
                      value={hotelFields.slaConfig?.low || 72}
                      onChange={e => setHotelFields({ ...hotelFields, slaConfig: { ...(hotelFields.slaConfig || {}), low: e.target.value } })}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-8 rounded-[32px] border border-indigo-100/50">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6">Department-Specific Overrides (Hours)</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {departments.map(dept => (
                    <div key={dept} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase truncate block">{dept}</label>
                      <input
                        type="number"
                        value={hotelFields.deptSlaConfig?.[dept] || 4}
                        onChange={e => setHotelFields({
                          ...hotelFields,
                          deptSlaConfig: {
                            ...(hotelFields.deptSlaConfig || {}),
                            [dept]: e.target.value
                          }
                        })}
                        className="w-full p-3 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 2: AI Settings */}
            <section className="space-y-6 pt-6 border-t">
              <h3 className="text-xl font-bold flex items-center gap-3"><Zap className="text-indigo-600" /> AI Insights & Proposals</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-slate-700">Confidence Threshold</label>
                    <span className="text-2xl font-black text-indigo-600">{hotelFields.aiConfig?.confidenceThreshold || 75}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hotelFields.aiConfig?.confidenceThreshold || 75}
                    onChange={e => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), confidenceThreshold: e.target.value } })}
                    className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <AlertCircle className="text-amber-500 shrink-0" size={18} />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <b>Threshold Impact:</b> Reviews analysed with confidence below {hotelFields.aiConfig?.confidenceThreshold || 75}% will be flagged for human review and won't be auto-approved.
                    </p>
                  </div>
                </div>

                {/* <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Default Response Tone</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Formal", "Empathetic", "Concise"].map(tone => (
                        <button
                          key={tone}
                          onClick={() => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), defaultTone: tone } })}
                          className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${hotelFields.aiConfig?.defaultTone === tone ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                </div> */}
              </div>
            </section>

            {/* Section 3: Automations */}
            <section className="space-y-6 pt-6 border-t">
              <h3 className="text-xl font-bold flex items-center gap-3"><ShieldAlert className="text-indigo-600" /> Automated Safety Rules</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">Auto-Escalate Rating</p>
                    <p className="text-xs text-slate-500">Automatically flag reviews at or below this rating.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-400">≤</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={hotelFields.aiConfig?.escalationRatingThreshold || 2}
                      onChange={e => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), escalationRatingThreshold: e.target.value } })}
                      className="w-16 p-3 bg-white border border-slate-200 rounded-xl text-center font-black text-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">Auto-Ticket Creation</p>
                    <p className="text-xs text-slate-500">Instantly create tickets for Critical/Negative reviews.</p>
                  </div>
                  <button
                    onClick={() => setHotelFields({ ...hotelFields, aiConfig: { ...(hotelFields.aiConfig || {}), autoTicket: !hotelFields.aiConfig?.autoTicket } })}
                    className="transition-transform active:scale-90"
                  >
                    {hotelFields.aiConfig?.autoTicket ? <ToggleRight className="text-indigo-600" size={48} /> : <ToggleLeft className="text-slate-300" size={48} />}
                  </button>
                </div>
              </div>
            </section>

            <div className="pt-10 flex gap-4">
              <button
                onClick={handleSaveHotel}
                disabled={loading}
                className="btn-primary flex-1 py-5 flex items-center justify-center gap-3 text-lg"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Check />} Save AI & SLA Preferences
              </button>
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3"><User className="text-indigo-600" /> Account Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
                <input type="text" value={profileFields.name} onChange={e => setProfileFields({ ...profileFields, name: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                <input type="email" value={profileFields.email} onChange={e => setProfileFields({ ...profileFields, email: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <button onClick={handleSaveProfile} className="btn-primary px-10 py-4">Update Profile</button>
          </div>
        )}
      </div>

      {/* Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</h3>
                <p className="text-slate-400 text-sm">Configure permissions and departmental access.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleStaffSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaff.name}
                    onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  />
                </div>
                <div className={editingStaff ? "md:col-span-2" : ""}>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newStaff.email}
                    onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  />
                </div>
                {!editingStaff && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Password</label>
                    <input
                      type="password"
                      required
                      value={newStaff.password || ""}
                      onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Department</label>
                  <select
                    value={newStaff.department}
                    onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  >
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Access Level / Role</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewStaff({ ...newStaff, role: "staff" })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${newStaff.role === 'staff' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <p className={`font-bold ${newStaff.role === 'staff' ? 'text-indigo-600' : 'text-slate-700'}`}>Standard Staff</p>
                      <p className="text-[10px] text-slate-400">Can view reviews and create tickets.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStaff({ ...newStaff, role: "dept_head" })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${newStaff.role === 'dept_head' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <p className={`font-bold ${newStaff.role === 'dept_head' ? 'text-indigo-600' : 'text-slate-700'}`}>Department Head</p>
                      <p className="text-[10px] text-slate-400">Can approve AI proposals and assign tasks.</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : editingStaff ? "Update Member" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
