import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Building2, Plus, Trash2, Edit2, Search, X, Loader2,
  Users, MessageSquare, MapPin, Globe, Shield, ShieldCheck, ArrowLeft,
  ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Check, AlertTriangle, LogOut, Link as LinkIcon, Clock, CheckCircle2, Image, Info, Power, Filter
} from "lucide-react";
import {
  getAdminBusinesses, addAdminBusiness, updateAdminBusiness, deleteAdminBusiness,
  getAdminProperties, addAdminProperty, updateAdminProperty, deleteAdminProperty,
  toggleBusinessActive, togglePropertyActive
} from "../api/apiClient";
import { AdminPanelSkeleton } from "../components/Skeleton";
import InfoTooltip from "../components/InfoTooltip";
import { Tooltip as SharedTooltip } from "../components/ui/Tooltip";
import AdminStaffManagement from "./AdminStaffManagement";

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
const Label = ({ children, required, tooltip }) => (
  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
    <span>{children}{required && <span className="text-red-500 ml-1">*</span>}</span>
    {tooltip && <InfoTooltip text={tooltip} size={12} color="#a1a1aa" />}
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

/* ─── Field error ────────────────────────────────────────────────────── */
const FieldError = ({ msg }) =>
  msg ? (
    <p className="text-red-600 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
      <AlertTriangle size={11} /> {msg}
    </p>
  ) : null;

/* ─── Banner error ───────────────────────────────────────────────────── */
const BannerError = ({ msg }) =>
  msg ? (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-red-600 font-semibold text-[13px]">
      <AlertTriangle size={15} /> {msg}
    </div>
  ) : null;

/* ─── Status Filter Pills ────────────────────────────────────────────── */
const StatusFilterPills = ({ value, onChange }) => (
  <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
    {[
      { key: "all", label: "All" },
      { key: "active", label: "Active" },
      { key: "inactive", label: "Inactive" }
    ].map(f => (
      <button
        key={f.key}
        onClick={() => onChange(f.key)}
        className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border-none ${
          value === f.key
            ? "bg-white text-zinc-900 shadow-sm"
            : "bg-transparent text-zinc-500 hover:text-zinc-700"
        }`}
      >
        {f.label}
      </button>
    ))}
  </div>
);

/* ─── Pagination ─────────────────────────────────────────────────────── */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100">
      <span className="text-[11px] text-zinc-400 font-medium">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none bg-transparent transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((p, i, arr) => (
            <React.Fragment key={p}>
              {i > 0 && arr[i - 1] !== p - 1 && (
                <span className="text-[11px] text-zinc-300 px-1">…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer border-none ${
                  p === currentPage
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                }`}
              >
                {p}
              </button>
            </React.Fragment>
          ))}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none bg-transparent transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

/* ─── Platform Logo Helper ───────────────────────────────────────────── */
const PlatformBadge = ({ platform, meta, connected }) => (
  <SharedTooltip content={`${meta.label}: ${connected ? "Connected" : "Not connected"}`}>
    <div
      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
        connected
          ? "border-emerald-200 bg-emerald-50"
          : "border-zinc-200 bg-zinc-50 opacity-40"
      }`}
      style={connected ? { borderColor: meta.border } : {}}
    >
      <img src={meta.logo} alt={platform} className="w-4 h-4" onError={e => { e.target.style.display = 'none'; }} />
    </div>
  </SharedTooltip>
);

/* ═══════════════════════════════════════════════════════════════════════ */

const ITEMS_PER_PAGE = 10;

const AdminPanel = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("businesses");
  const [businesses, setBusinesses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bizStatusFilter, setBizStatusFilter] = useState("all");
  const [propStatusFilter, setPropStatusFilter] = useState("all");
  const [bizPage, setBizPage] = useState(1);
  const [propPage, setPropPage] = useState(1);
  const [filterBusinessId, setFilterBusinessId] = useState(null);
  const [selectedBusinessForStaff, setSelectedBusinessForStaff] = useState(null);

  const [showAddBiz, setShowAddBiz] = useState(false);
  const [bizForm, setBizForm] = useState({ hotel_name: "", city: "", number_of_rooms: "", admin_name: "", admin_email: "", admin_password: "" });
  const [bizSaving, setBizSaving] = useState(false);
  const [bizError, setBizError] = useState("");
  const [bizSuccess, setBizSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [editingBiz, setEditingBiz] = useState(null);
  const [showEditBiz, setShowEditBiz] = useState(false);
  const [deletingBiz, setDeletingBiz] = useState(null);
  const [togglingBiz, setTogglingBiz] = useState(null);

  const [showAddProp, setShowAddProp] = useState(false);
  const [propForm, setPropForm] = useState({ business_id: "", name: "", city: "", rooms: "", timezone: "IST", description: "", image: "", platforms: {}, max_reviews_per_sync: 10 });
  const [propSaving, setPropSaving] = useState(false);
  const [propErrors, setPropErrors] = useState({});
  const [propError, setPropError] = useState("");
  const [propSuccess, setPropSuccess] = useState("");
  const [showEditProp, setShowEditProp] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  const [deletingProp, setDeletingProp] = useState(null);
  const [togglingProp, setTogglingProp] = useState(null);

  const PLATFORM_META = {
    "Google": { logo: "https://www.google.com/favicon.ico", color: "#4285F4", bg: "#EBF3FF", border: "#C4DAFF", label: "Google Hotels" },
    "Booking.com": { logo: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><text x="50%" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="30" fill="#003580">B</text><circle cx="20" cy="36" r="3" fill="#003580"/></svg>')}`, color: "#003580", bg: "#E8EEF7", border: "#B8CCE8", label: "Booking.com" },
    "Agoda": { logo: "https://www.agoda.com/favicon.ico", color: "#5FC4EE", bg: "#EBF8FD", border: "#B3E5F7", label: "Agoda" },
    "Airbnb": { logo: "https://www.airbnb.com/favicon.ico", color: "#FF5A5F", bg: "#FFF0F0", border: "#FFD0D1", label: "Airbnb" },
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const bizRes = await getAdminBusinesses();
      setBusinesses(bizRes.data || []);
      const propRes = await getAdminProperties();
      setProperties(propRes.data || []);
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Reset pages when filters change
  useEffect(() => { setBizPage(1); }, [search, bizStatusFilter]);
  useEffect(() => { setPropPage(1); }, [search, propStatusFilter, filterBusinessId]);

  if (currentUser?.role !== "superadmin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-zinc-50">
        <Shield size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Access Denied</h2>
        <p className="text-zinc-500 text-sm mb-6">Only ReviewRescue super admins can access this panel.</p>
        <button onClick={() => navigate("/")} className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-zinc-800 transition-colors border-none">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const handleAddBusiness = async () => {
    setBizError("");
    setBizSuccess("");
    if (!bizForm.hotel_name.trim()) { setBizError("Business name is required"); return; }
    if (!bizForm.number_of_rooms || isNaN(bizForm.number_of_rooms)) { setBizError("Number of rooms is required"); return; }
    if (!bizForm.admin_email.trim()) { setBizError("Admin email is required"); return; }
    if (!bizForm.admin_password || bizForm.admin_password.length < 6) { setBizError("Password must be at least 6 characters"); return; }

    setBizSaving(true);
    try {
      await addAdminBusiness({
        ...bizForm,
        number_of_rooms: parseInt(bizForm.number_of_rooms)
      });
      setBizSuccess(`✓ Business "${bizForm.hotel_name}" added successfully`);
      setShowAddBiz(false);
      setBizForm({ hotel_name: "", city: "", number_of_rooms: "", admin_name: "", admin_email: "", admin_password: "" });
      setTimeout(() => setBizSuccess(""), 3000);
      await loadData();
    } catch (err) {
      setBizError(err.message);
    } finally {
      setBizSaving(false);
    }
  };

  const handleDeleteBusiness = async (biz) => {
    setBizError("");
    setBizSuccess("");
    try {
      await deleteAdminBusiness(biz._id);
      setBizSuccess(`✓ Business deleted successfully`);
      setTimeout(() => setBizSuccess(""), 3000);
      await loadData();
    } catch (err) {
      console.error(err);
      setBizError(err.message);
    }
  };

  const handleToggleBusiness = async (biz) => {
    setBizError("");
    setBizSuccess("");
    try {
      const res = await toggleBusinessActive(biz._id);
      setBizSuccess(res.message || `✓ Business status toggled`);
      
      const newStatus = !biz.is_active;
      // Visually update the business state
      setBusinesses(businesses.map(b => b._id === biz._id ? { ...b, is_active: newStatus } : b));
      // Visually update the properties state to match the business status
      setProperties(properties.map(p => p.business_id === biz._id ? { ...p, is_active: newStatus, business_is_active: newStatus } : p));

      setTogglingBiz(null);
      setTimeout(() => setBizSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setBizError(err.message);
      setTogglingBiz(null);
    }
  };

  const handleToggleProperty = async (prop) => {
    setPropError("");
    setPropSuccess("");
    try {
      const res = await togglePropertyActive(prop._id);
      setPropSuccess(res.message || `✓ Property status toggled`);
      
      const newStatus = !prop.is_active;
      setProperties(properties.map(p => p._id === prop._id ? { ...p, is_active: newStatus } : p));
      
      setTogglingProp(null);
      setTimeout(() => setPropSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setPropError(err.message);
    }
  };

  const validateProperty = () => {
    const e = {};
    if (!propForm.business_id) e.business_id = "Business is required";
    if (!propForm.name || !propForm.name.trim()) e.name = "Property name is required";
    if (!propForm.city || !propForm.city.trim()) e.city = "City is required";
    if (!propForm.rooms) e.rooms = "Number of rooms is required";
    else if (isNaN(propForm.rooms) || parseInt(propForm.rooms) <= 0) e.rooms = "Enter a valid number";

    const hasUrl = Object.values(propForm.platforms || {}).some(u => u && u.startsWith("http"));
    if (!hasUrl) e.platforms = "At least one platform URL is required";

    if (propForm.platforms) {
      for (const [plat, url] of Object.entries(propForm.platforms)) {
        if (url && !url.startsWith("http")) {
          e.platforms = `Invalid URL for ${plat} — must start with http`;
          break;
        }
      }
    }
    setPropErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddProperty = async () => {
    if (!validateProperty()) return;
    setPropSuccess("");
    setPropSaving(true);
    try {
      await addAdminProperty({
        ...propForm,
        rooms: parseInt(propForm.rooms)
      });
      setPropSuccess(`✓ Property "${propForm.name}" added successfully`);
      setShowAddProp(false);
      setPropForm({ business_id: "", name: "", city: "", rooms: "", timezone: "IST", description: "", image: "", platforms: {}, max_reviews_per_sync: 10 });
      setPropErrors({});
      setTimeout(() => setPropSuccess(""), 3000);
      await loadData();
    } catch (err) {
      setPropError(err.message);
    } finally {
      setPropSaving(false);
    }
  };

  const handleEditBusiness = async () => {
    if (!editingBiz) return;
    setBizError("");
    setBizSuccess("");
    if (!editingBiz.hotel_name?.trim()) { setBizError("Business name is required"); return; }
    if (!editingBiz.number_of_rooms || isNaN(editingBiz.number_of_rooms)) { setBizError("Number of rooms is required"); return; }

    setBizSaving(true);
    try {
      await updateAdminBusiness(editingBiz._id, {
        ...editingBiz,
        number_of_rooms: parseInt(editingBiz.number_of_rooms)
      });
      setBizSuccess(`✓ Business "${editingBiz.hotel_name}" updated successfully`);
      setShowEditBiz(false);
      setEditingBiz(null);
      setTimeout(() => setBizSuccess(""), 3000);
      await loadData();
    } catch (err) {
      setBizError(err.message);
    } finally {
      setBizSaving(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!deletingProp) return;
    setPropError("");
    setPropSuccess("");
    setPropSaving(true);
    try {
      await deleteAdminProperty(deletingProp._id);
      setPropSuccess(`✓ Property deleted successfully`);
      setDeletingProp(null);
      setTimeout(() => setPropSuccess(""), 3000);
      await loadData();
    } catch (err) {
      console.error(err);
      setPropError(err.message);
    } finally {
      setPropSaving(false);
    }
  };

  const handleEditProperty = async () => {
    if (!editingProp) return;
    setPropError("");
    setPropSuccess("");
    if (!editingProp.name?.trim()) { setPropError("Property name is required"); return; }
    if (!editingProp.city?.trim()) { setPropError("City is required"); return; }
    if (!editingProp.rooms || isNaN(editingProp.rooms)) { setPropError("Number of rooms is required"); return; }

    setPropSaving(true);
    try {
      await updateAdminProperty(editingProp._id, {
        ...editingProp,
        rooms: parseInt(editingProp.rooms)
      });
      setPropSuccess(`✓ Property "${editingProp.name}" updated successfully`);
      setShowEditProp(false);
      setEditingProp(null);
      setTimeout(() => setPropSuccess(""), 3000);
      await loadData();
    } catch (err) {
      setPropError(err.message);
    } finally {
      setPropSaving(false);
    }
  };

  // ─── Filtering + Pagination ──────────────────────────────────────────

  const filteredBiz = businesses.filter(b => {
    const matchesSearch = b.hotel_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.owner?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = bizStatusFilter === "all" ? true :
      bizStatusFilter === "active" ? b.is_active !== false :
      b.is_active === false;
    return matchesSearch && matchesStatus;
  });

  const bizTotalPages = Math.ceil(filteredBiz.length / ITEMS_PER_PAGE);
  const paginatedBiz = filteredBiz.slice((bizPage - 1) * ITEMS_PER_PAGE, bizPage * ITEMS_PER_PAGE);

  const filteredProps = properties.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = propStatusFilter === "all" ? true :
      propStatusFilter === "active" ? p.is_active !== false :
      p.is_active === false;
    const matchesBusiness = filterBusinessId ? p.business_id === filterBusinessId : true;
    return matchesSearch && matchesStatus && matchesBusiness;
  });

  const propTotalPages = Math.ceil(filteredProps.length / ITEMS_PER_PAGE);
  const paginatedProps = filteredProps.slice((propPage - 1) * ITEMS_PER_PAGE, propPage * ITEMS_PER_PAGE);

  // Helper: time ago for last synced
  const timeAgo = (date) => {
    if (!date) return "Never";
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  // Click property count to switch to properties tab filtered
  const handlePropertyCountClick = (bizId) => {
    setFilterBusinessId(bizId);
    setActiveTab("properties");
    setSearch("");
    setPropStatusFilter("all");
  };

  // Open add property with pre-selected business
  const handleAddPropertyForBusiness = (bizId) => {
    setPropForm(prev => ({ ...prev, business_id: bizId }));
    setShowAddProp(true);
  };

  return (
    <div className="flex h-screen bg-zinc-50/50 overflow-hidden">
      {/* Sidebar - Dashboard Style with Toggle */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 h-screen bg-zinc-50 border-r border-zinc-200 transition-transform duration-300 ease-in-out flex flex-col ${collapsed ? "lg:w-20" : "lg:w-64"} w-64`}>

        {/* Logo Header */}
        <div className="px-5 py-5 lg:py-6 flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
              <ShieldCheck size={24} />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg lg:text-xl tracking-tight bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent truncate">
                Admin Panel
              </span>
            )}
          </div>
          {/* Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight size={18} className="text-zinc-600" /> : <ChevronLeft size={18} className="text-zinc-600" />}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-zinc-200 mb-3" />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
          {!collapsed && (
            <div className="px-2 pt-1 pb-2">
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">Management</span>
            </div>
          )}

          {[
            { name: "Businesses", icon: Building2, count: businesses.length },
            { name: "Properties", icon: Globe, count: properties.length }
          ].map((item) => {
            const itemLower = item.name.toLowerCase();
            const isActive = activeTab === itemLower;

            return (
              <button
                key={itemLower}
                onClick={() => { setActiveTab(itemLower); setFilterBusinessId(null); setSearch(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer border-none group ${
                  isActive
                    ? "bg-orange-50 text-orange-700 shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
                } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
                title={collapsed ? item.name : ""}
              >
                <item.icon
                  size={20}
                  className={`shrink-0 ${isActive ? "text-orange-500" : "text-zinc-400"}`}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-[13px]">{item.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-orange-100 text-orange-600" : "bg-zinc-200 text-zinc-500"
                    }`}>
                      {item.count}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Back to Dashboard */}
        {!collapsed && (
          <div className="px-3 mb-3 border-t border-zinc-200 pt-3">
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-zinc-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all cursor-pointer bg-transparent border-none"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-zinc-200">
          {!collapsed && (
            <div className="px-3 py-3 bg-white rounded-xl flex items-center gap-3 border border-zinc-200 mb-3">
              <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold text-sm border border-orange-200 shrink-0">
                SA
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-[12px] font-bold text-zinc-800 truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-orange-500 font-semibold capitalize">Admin</p>
              </div>
            </div>
          )}
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer bg-transparent border-none ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
            title={collapsed ? "Logout" : ""}
          >
            <LogOut size={14} shrink-0 />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3 bg-white/95 backdrop-blur-sm border-b border-zinc-200/80">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-zinc-900 leading-tight">
              {activeTab === "businesses" ? "Businesses" : "Properties"}
            </h1>
            {filterBusinessId && activeTab === "properties" && (
              <button
                onClick={() => setFilterBusinessId(null)}
                className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-600 text-[11px] font-bold rounded-lg hover:bg-orange-100 transition-colors cursor-pointer border border-orange-200"
              >
                <X size={10} />
                Clear filter
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder={activeTab === "businesses" ? "Search businesses…" : "Search properties…"}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-9 text-[12px] bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer bg-transparent border-none">
                  <X size={12} />
                </button>
              )}
            </div>

            {activeTab === "businesses" && (
              <button
                onClick={() => setShowAddBiz(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer border-none shadow-sm"
              >
                <Plus size={13} /> Add Business
              </button>
            )}
            {activeTab === "properties" && (
              <button
                onClick={() => {
                  if (filterBusinessId) {
                    handleAddPropertyForBusiness(filterBusinessId);
                  } else {
                    setShowAddProp(true);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer border-none shadow-sm"
              >
                <Plus size={13} /> Add Property
              </button>
            )}
          </div>
        </header>

        {/* Success/Error Messages */}
        {(bizSuccess || bizError || propSuccess || propError) && (
          <div className="px-6 lg:px-8 pt-4 space-y-2">
            {bizSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-emerald-600 font-semibold text-[13px] animate-in fade-in duration-300">
                <CheckCircle2 size={16} /> {bizSuccess}
              </div>
            )}
            {bizError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-red-600 font-semibold text-[13px] animate-in fade-in duration-300">
                <AlertTriangle size={16} /> {bizError}
              </div>
            )}
            {propSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-emerald-600 font-semibold text-[13px] animate-in fade-in duration-300">
                <CheckCircle2 size={16} /> {propSuccess}
              </div>
            )}
            {propError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-red-600 font-semibold text-[13px] animate-in fade-in duration-300">
                <AlertTriangle size={16} /> {propError}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {loading ? (
            <AdminPanelSkeleton />
          ) : activeTab === "businesses" ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { title: "Total Businesses", value: businesses.length, subtitle: "Actively managed", icon: Building2, trend: `+${businesses.filter(b => b.is_active !== false).length}`, trendType: "up", themeClass: "bg-orange-50 border-orange-200 text-orange-600" },
                  { title: "Avg Rating", value: "4.5", subtitle: "Based on reviews", icon: MessageSquare, trend: "+10%", trendType: "up", themeClass: "bg-purple-50 border-purple-200 text-purple-600" },
                  { title: "Total Properties", value: businesses.reduce((s, b) => s + (b.propertyCount || 0), 0), subtitle: "Across all businesses", icon: Globe, trend: null, trendType: "warn", themeClass: "bg-blue-50 border-blue-200 text-blue-600" },
                  { title: "Total Reviews", value: businesses.reduce((s, b) => s + (b.reviewCount || 0), 0), subtitle: "All platforms", icon: MessageSquare, trend: null, trendType: "up", themeClass: "bg-emerald-50 border-emerald-200 text-emerald-600" },
                ].map((card, i) => (
                  <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-zinc-300">
                    {/* Row 1: icon + trend badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${card.themeClass} group-hover:scale-110 transition-transform duration-200`}>
                        <card.icon size={20} />
                      </div>
                      {card.trend && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          card.trendType === 'up' ? 'bg-emerald-50 text-emerald-600' :
                          card.trendType === 'warn' ? 'bg-amber-50 text-amber-600' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                          {card.trend}
                        </span>
                      )}
                    </div>

                    {/* Divider line */}
                    <div className="border-t border-zinc-100 mb-3" />

                    {/* Row 2: label + value + subtitle */}
                    <p className="text-[11px] font-semibold text-zinc-400 tracking-wide mb-1">{card.title}</p>
                    <p className="text-[28px] font-bold text-zinc-900 leading-none tracking-tight">{card.value}</p>
                    {card.subtitle && (
                      <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">{card.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Filter Bar */}
              <div className="flex items-center justify-between mb-4">
                <StatusFilterPills value={bizStatusFilter} onChange={setBizStatusFilter} />
                <span className="text-[11px] text-zinc-400 font-medium">{filteredBiz.length} result{filteredBiz.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        {["Business", "Owner", "Properties", "Reviews", "Created", "Status", "Actions"].map(h => (
                          <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBiz.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-16 text-zinc-400 text-sm">No businesses found</td></tr>
                      ) : paginatedBiz.map(biz => (
                        <tr key={biz._id} className={`border-b border-zinc-50 hover:bg-zinc-50/70 transition-colors ${biz.is_active === false ? 'opacity-50' : ''}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                                <span className="text-[12px] font-bold text-orange-600">{biz.hotel_name?.charAt(0)?.toUpperCase() || 'B'}</span>
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-zinc-900">{biz.hotel_name}</p>
                                {biz.city && <p className="text-[10px] text-zinc-400 flex items-center gap-1"><MapPin size={9} />{biz.city}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {biz.owner ? (
                              <div>
                                <p className="text-[12px] font-semibold text-zinc-700">{biz.owner.name}</p>
                                <p className="text-[10px] text-zinc-400">{biz.owner.email}</p>
                              </div>
                            ) : <span className="text-[11px] text-zinc-300">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => handlePropertyCountClick(biz._id)}
                              className="text-[14px] font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer bg-transparent border-none transition-colors"
                              title="View properties"
                            >
                              {biz.propertyCount}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[14px] font-bold text-blue-600">{biz.reviewCount?.toLocaleString()}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[11px] text-zinc-500">{new Date(biz.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              biz.is_active !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                            }`}>
                              {biz.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingBiz(biz); setShowEditBiz(true); setBizError(""); }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border-none bg-transparent"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setTogglingBiz(biz)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent ${
                                  biz.is_active !== false
                                    ? "text-zinc-400 hover:text-amber-600 hover:bg-amber-50"
                                    : "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title={biz.is_active !== false ? "Deactivate" : "Activate"}
                              >
                                <Power size={14} />
                              </button>
                              <button
                                onClick={() => setDeletingBiz(biz)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={bizPage} totalPages={bizTotalPages} onPageChange={setBizPage} />
              </div>
            </div>
          ) : activeTab === "properties" ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { title: "Total Properties", value: properties.length, subtitle: "All connected", icon: Globe, trend: `+${properties.filter(p => p.is_active !== false).length}`, trendType: "up", themeClass: "bg-emerald-50 border-emerald-200 text-emerald-600" },
                  { title: "Active", value: properties.filter(p => p.is_active !== false).length, subtitle: "Now operating", icon: Check, trend: "100%", trendType: "up", themeClass: "bg-blue-50 border-blue-200 text-blue-600" },
                  { title: "Total Rooms", value: properties.reduce((s, p) => s + (p.rooms || 0), 0), subtitle: "Across all properties", icon: Building2, trend: null, trendType: "warn", themeClass: "bg-orange-50 border-orange-200 text-orange-600" },
                  { title: "Avg Rooms", value: (properties.reduce((s, p) => s + (p.rooms || 0), 0) / properties.length || 0).toFixed(0), subtitle: "Per property", icon: Building2, trend: null, trendType: "up", themeClass: "bg-purple-50 border-purple-200 text-purple-600" },
                ].map((card, i) => (
                  <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-zinc-300">
                    {/* Row 1: icon + trend badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${card.themeClass} group-hover:scale-110 transition-transform duration-200`}>
                        <card.icon size={20} />
                      </div>
                      {card.trend && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          card.trendType === 'up' ? 'bg-emerald-50 text-emerald-600' :
                          card.trendType === 'warn' ? 'bg-amber-50 text-amber-600' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                          {card.trend}
                        </span>
                      )}
                    </div>

                    {/* Divider line */}
                    <div className="border-t border-zinc-100 mb-3" />

                    {/* Row 2: label + value + subtitle */}
                    <p className="text-[11px] font-semibold text-zinc-400 tracking-wide mb-1">{card.title}</p>
                    <p className="text-[28px] font-bold text-zinc-900 leading-none tracking-tight">{card.value}</p>
                    {card.subtitle && (
                      <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">{card.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Filter Bar */}
              <div className="flex items-center justify-between mb-4">
                <StatusFilterPills value={propStatusFilter} onChange={setPropStatusFilter} />
                <span className="text-[11px] text-zinc-400 font-medium">{filteredProps.length} result{filteredProps.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        {["Property", "Business", "City", "Rooms", "Platforms", "Reviews", "Last Synced", "Status", "Actions"].map(h => (
                          <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProps.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-16 text-zinc-400 text-sm">No properties found</td></tr>
                      ) : paginatedProps.map(prop => {
                        return (
                          <tr key={prop._id} className={`border-b border-zinc-50 hover:bg-zinc-50/70 transition-colors group ${prop.is_active === false ? 'opacity-50' : ''}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                                  <span className="text-[12px] font-bold text-orange-600">{prop.name?.charAt(0)?.toUpperCase() || 'P'}</span>
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-zinc-900">{prop.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-[12px] font-semibold text-zinc-700">{prop.business_name}</p>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1 text-[12px] text-zinc-600">
                                <MapPin size={12} />
                                {prop.city}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-bold text-zinc-700">{prop.rooms}</span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1">
                                {Object.entries(PLATFORM_META).map(([platform, meta]) => {
                                  const url = prop.platforms?.[platform];
                                  const connected = url && url.startsWith("http");
                                  return (
                                    <PlatformBadge key={platform} platform={platform} meta={meta} connected={connected} />
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-bold text-blue-600">{prop.reviewCount || 0}</span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  prop.last_sync_status === 'success' ? 'bg-emerald-500' :
                                  prop.last_sync_status === 'failed' ? 'bg-red-500' : 'bg-zinc-300'
                                }`} />
                                <span className="text-[11px] text-zinc-500 font-medium">{timeAgo(prop.last_sync_time)}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                prop.is_active !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                              }`}>
                                {prop.is_active !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setEditingProp(prop); setShowEditProp(true); setPropError(""); }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border-none bg-transparent"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => setTogglingProp(prop)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent ${
                                    prop.is_active !== false
                                      ? "text-zinc-400 hover:text-amber-600 hover:bg-amber-50"
                                      : "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                  title={prop.is_active !== false ? "Deactivate" : "Activate"}
                                >
                                  <Power size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingProp(prop)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={propPage} totalPages={propTotalPages} onPageChange={setPropPage} />
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* Add Business Modal */}
      {showAddBiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowAddBiz(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-orange-500" />
                <h3 className="text-[15px] font-bold text-zinc-900 m-0">Add Business</h3>
              </div>
              <button onClick={() => setShowAddBiz(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer bg-transparent border-none rounded-lg hover:bg-zinc-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {bizError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <span className="text-[12px] text-red-700 font-semibold">{bizError}</span>
                </div>
              )}

              <div>
                <Label required tooltip="Business is the brand; Property is a physical location">Business Name</Label>
                <Input value={bizForm.hotel_name} onChange={e => setBizForm({ ...bizForm, hotel_name: e.target.value })}
                  type="text" placeholder="e.g. Grand Hyatt Hotels" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={bizForm.city} onChange={e => setBizForm({ ...bizForm, city: e.target.value })}
                    placeholder="Mumbai" />
                </div>
                <div>
                  <Label required tooltip="Total number of rooms across this business">Rooms</Label>
                  <Input type="number" value={bizForm.number_of_rooms} onChange={e => setBizForm({ ...bizForm, number_of_rooms: e.target.value })}
                    placeholder="150" />
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-3">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Admin Account</p>
                <div className="space-y-3">
                  <div>
                    <Label>Admin Name</Label>
                    <Input value={bizForm.admin_name} onChange={e => setBizForm({ ...bizForm, admin_name: e.target.value })}
                      placeholder="John Smith" />
                  </div>
                  <div>
                    <Label required>Admin Email</Label>
                    <Input type="email" value={bizForm.admin_email} onChange={e => setBizForm({ ...bizForm, admin_email: e.target.value })}
                      placeholder="admin@hotel.com" />
                  </div>
                  <div>
                    <Label required>Password</Label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} value={bizForm.admin_password} onChange={e => setBizForm({ ...bizForm, admin_password: e.target.value })}
                        placeholder="Min 6 characters" className="pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer bg-transparent border-none">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowAddBiz(false)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer border-none">Cancel</button>
              <PrimaryBtn className="flex-1" loading={bizSaving} onClick={handleAddBusiness}>
                <Plus size={14} /> Create Business
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showAddProp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowAddProp(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-purple-500" />
                <h3 className="text-[15px] font-bold text-zinc-900 m-0">Add Property</h3>
              </div>
              <button onClick={() => setShowAddProp(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer bg-transparent border-none rounded-lg hover:bg-zinc-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <BannerError msg={propError} />

              <div>
                <Label required tooltip="Business is the brand; Property is a physical location">Business</Label>
                <Select value={propForm.business_id} onChange={e => setPropForm({ ...propForm, business_id: e.target.value })}>
                  <option value="">Select a business...</option>
                  {businesses.map(b => (
                    <option key={b._id} value={b._id}>{b.hotel_name}</option>
                  ))}
                </Select>
                <FieldError msg={propErrors.business_id} />
              </div>

              <div>
                <Label required>Property Name</Label>
                <Input value={propForm.name} onChange={e => setPropForm({ ...propForm, name: e.target.value })}
                  placeholder="e.g. Grand Tower" error={!!propErrors.name} />
                <FieldError msg={propErrors.name} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label required>City</Label>
                  <Input icon={MapPin} value={propForm.city} onChange={e => setPropForm({ ...propForm, city: e.target.value })}
                    placeholder="Mumbai" error={!!propErrors.city} />
                  <FieldError msg={propErrors.city} />
                </div>
                <div>
                  <Label required tooltip="Total number of rooms across this property">Rooms</Label>
                  <Input icon={Building2} type="number" value={propForm.rooms || ""} onChange={e => setPropForm({ ...propForm, rooms: e.target.value ? parseInt(e.target.value) : "" })}
                    placeholder="150" error={!!propErrors.rooms} />
                  <FieldError msg={propErrors.rooms} />
                </div>
                <div>
                  <Label tooltip="Used for review timestamp display">Timezone</Label>
                  <Select icon={Clock} value={propForm.timezone || "IST"} onChange={e => setPropForm({ ...propForm, timezone: e.target.value })}>
                    <option value="IST">IST (India)</option>
                    <option value="UTC">UTC</option>
                    <option value="EST">EST</option>
                    <option value="CST">CST</option>
                    <option value="PST">PST</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  value={propForm.description || ""}
                  onChange={e => {
                    if (e.target.value.length <= 500) {
                      setPropForm({ ...propForm, description: e.target.value });
                    }
                  }}
                  placeholder="Brief description of this property..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-orange-500 rounded-xl outline-none font-medium text-sm text-zinc-900 transition-colors resize-none"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-[10px] font-medium ${(propForm.description || "").length >= 450 ? "text-amber-500" : "text-zinc-400"}`}>
                    {(propForm.description || "").length}/500
                  </span>
                </div>
              </div>

              {/* Image Upload */}
              <div className="border-t border-zinc-100 pt-4">
                <Label>Property Image</Label>
                {propForm.image && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3 bg-zinc-100">
                    <img src={propForm.image} alt="Property" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPropForm({ ...propForm, image: "" })}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700 cursor-pointer border-none"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  id="prop-image-upload"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { setPropError("Image must be under 5MB."); return; }
                    const reader = new FileReader();
                    reader.onload = () => setPropForm({ ...propForm, image: reader.result });
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => document.getElementById("prop-image-upload")?.click()}
                  className="w-full py-2 text-[12px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl cursor-pointer border border-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Image size={14} /> {propForm.image ? "Change Image" : "Add Image"}
                </button>
              </div>

              {/* Platform Connections */}
              <div className="border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <LinkIcon size={14} className="text-purple-500" />
                  <h4 className="text-[13px] font-bold text-zinc-900">Platform Connections</h4>
                  <InfoTooltip text="Must be the public listing URL for scraping to work" size={12} color="#a1a1aa" />
                  <span className="text-[10px] text-zinc-400 ml-auto">Add at least one URL *</span>
                </div>
                <FieldError msg={propErrors.platforms} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(PLATFORM_META).map(([platform, meta]) => {
                    const url = (propForm.platforms && propForm.platforms[platform]) || "";
                    const isConnected = url && url.startsWith("http");
                    return (
                      <div key={platform}
                        className={`rounded-xl border-2 p-4 transition-all ${isConnected ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300"}`}>
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
                        </div>
                        <div className="relative">
                          <input type="url" value={url}
                            onChange={e => setPropForm({ ...propForm, platforms: { ...(propForm.platforms || {}), [platform]: e.target.value } })}
                            placeholder={`Paste ${platform} URL...`}
                            className={`w-full pl-3 pr-8 py-2 text-[12px] font-medium rounded-lg border outline-none transition-colors ${isConnected ? "bg-white border-emerald-200 text-zinc-800 focus:border-emerald-400" : "bg-white border-zinc-200 text-zinc-800 focus:border-zinc-400"}`}
                          />
                          {url && (
                            <X size={12}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 cursor-pointer transition-colors"
                              onClick={() => setPropForm({ ...propForm, platforms: { ...(propForm.platforms || {}), [platform]: "" } })}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sync Settings */}
              <div className="border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={14} className="text-orange-500" />
                  <h4 className="text-[13px] font-bold text-zinc-900">Sync Settings</h4>
                </div>
                <div className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl mb-4">
                  <p className="text-[10px] font-bold text-zinc-400 m-0 mb-1 uppercase tracking-wider">Review Sync Schedule</p>
                  <p className="text-[14px] font-bold text-zinc-900 m-0">Every 6 hours</p>
                  <p className="text-[10px] text-zinc-400 m-0 mt-0.5">🔒 Sync frequency is fixed across all platforms</p>
                </div>
                <div>
                  <Label>Max Reviews per Sync <span className="font-normal normal-case text-zinc-400">(per platform)</span></Label>
                  <Select value={propForm.max_reviews_per_sync}
                    onChange={e => setPropForm({ ...propForm, max_reviews_per_sync: parseInt(e.target.value) })}>
                    <option value={5}>5 reviews</option>
                    <option value={10}>10 reviews</option>
                    <option value={20}>20 reviews</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowAddProp(false)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer border-none">Cancel</button>
              <PrimaryBtn className="flex-1" loading={propSaving} onClick={handleAddProperty}>
                <Plus size={14} /> Create Property
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {/* Delete Business Confirmation Modal */}
      {deletingBiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeletingBiz(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-[15px] font-bold text-zinc-900 m-0">Delete Business?</h3>
              <p className="text-[12px] text-zinc-500 mt-1">This action cannot be undone. All associated data will be deleted.</p>
            </div>
            <div className="p-6">
              <p className="text-[13px] text-zinc-700 mb-4">
                Delete <span className="font-bold">{deletingBiz.hotel_name}</span> and all its properties, reviews, and staff?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Consider deactivating instead to preserve historical data.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
              <button onClick={() => setDeletingBiz(null)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer border-none">Cancel</button>
              <button onClick={() => { handleDeleteBusiness(deletingBiz); setDeletingBiz(null); }} disabled={bizSaving}
                className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer border-none disabled:opacity-60">
                {bizSaving ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Business Active Confirmation Modal */}
      {togglingBiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setTogglingBiz(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-[15px] font-bold text-zinc-900 m-0">
                {togglingBiz.is_active !== false ? "Deactivate" : "Activate"} Business?
              </h3>
            </div>
            <div className="p-6">
              {togglingBiz.is_active !== false ? (
                <>
                  <p className="text-[13px] text-zinc-700 mb-3">
                    Deactivating <span className="font-bold">{togglingBiz.hotel_name}</span> will:
                  </p>
                  <ul className="text-[12px] text-zinc-600 space-y-2 mb-0">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                      <span>Block all users from logging in</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                      <span>Freeze all properties — no reviews scraped</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                      <span>Hide from dashboard stats</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      <span>Historical data is preserved — can reactivate anytime</span>
                    </li>
                  </ul>
                </>
              ) : (
                <p className="text-[13px] text-zinc-700">
                  Reactivate <span className="font-bold">{togglingBiz.hotel_name}</span>? Users will be able to log in and reviews will start syncing again.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
              <button onClick={() => setTogglingBiz(null)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer border-none">Cancel</button>
              <button onClick={() => handleToggleBusiness(togglingBiz)}
                className={`flex-1 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-colors cursor-pointer border-none ${
                  togglingBiz.is_active !== false ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}>
                {togglingBiz.is_active !== false ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {showEditBiz && editingBiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-auto">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowEditBiz(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-orange-500" />
                <h3 className="text-[15px] font-bold text-zinc-900 m-0">Edit Business</h3>
              </div>
              <button onClick={() => setShowEditBiz(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer bg-transparent border-none rounded-lg hover:bg-zinc-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <BannerError msg={bizError} />

              <div>
                <Label required>Business Name</Label>
                <Input
                  value={editingBiz.hotel_name || ""}
                  onChange={e => setEditingBiz({ ...editingBiz, hotel_name: e.target.value })}
                  placeholder="e.g., Grand Hyatt"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input icon={MapPin}
                    value={editingBiz.city || ""}
                    onChange={e => setEditingBiz({ ...editingBiz, city: e.target.value })}
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <Label required tooltip="Total number of rooms across this business">Rooms</Label>
                  <Input icon={Building2}
                    type="number"
                    value={editingBiz.number_of_rooms || ""}
                    onChange={e => setEditingBiz({ ...editingBiz, number_of_rooms: e.target.value })}
                    placeholder="150"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
              <button onClick={() => setShowEditBiz(false)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer border-none">Cancel</button>
              <PrimaryBtn onClick={handleEditBusiness} loading={bizSaving} className="flex-1">
                Update Business
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditProp && editingProp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-auto">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowEditProp(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-purple-500" />
                <h3 className="text-[15px] font-bold text-zinc-900 m-0">Edit Property</h3>
              </div>
              <button onClick={() => setShowEditProp(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer bg-transparent border-none rounded-lg hover:bg-zinc-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <BannerError msg={propError} />

              <div>
                <Label required>Property Name</Label>
                <Input value={editingProp.name} onChange={e => setEditingProp({ ...editingProp, name: e.target.value })}
                  placeholder="e.g. Grand Tower" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label required>City</Label>
                  <Input icon={MapPin} value={editingProp.city} onChange={e => setEditingProp({ ...editingProp, city: e.target.value })}
                    placeholder="Mumbai" />
                </div>
                <div>
                  <Label required tooltip="Total number of rooms across this property">Rooms</Label>
                  <Input icon={Building2} type="number" value={editingProp.rooms || ""} onChange={e => setEditingProp({ ...editingProp, rooms: e.target.value ? parseInt(e.target.value) : "" })}
                    placeholder="150" />
                </div>
                <div>
                  <Label tooltip="Used for review timestamp display">Timezone</Label>
                  <Select icon={Clock} value={editingProp.timezone || "IST"} onChange={e => setEditingProp({ ...editingProp, timezone: e.target.value })}>
                    <option value="IST">IST (India)</option>
                    <option value="UTC">UTC</option>
                    <option value="EST">EST</option>
                    <option value="CST">CST</option>
                    <option value="PST">PST</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  value={editingProp.description || ""}
                  onChange={e => {
                    if (e.target.value.length <= 500) {
                      setEditingProp({ ...editingProp, description: e.target.value });
                    }
                  }}
                  placeholder="Brief description of this property..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-orange-500 rounded-xl outline-none font-medium text-sm text-zinc-900 transition-colors resize-none"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-[10px] font-medium ${(editingProp.description || "").length >= 450 ? "text-amber-500" : "text-zinc-400"}`}>
                    {(editingProp.description || "").length}/500
                  </span>
                </div>
              </div>

              {/* Image Upload */}
              <div className="border-t border-zinc-100 pt-4">
                <Label>Property Image</Label>
                {editingProp.image && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3 bg-zinc-100">
                    <img src={editingProp.image} alt="Property" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setEditingProp({ ...editingProp, image: "" })}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700 cursor-pointer border-none"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  id="prop-image-edit-upload"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { setPropError("Image must be under 5MB."); return; }
                    const reader = new FileReader();
                    reader.onload = () => setEditingProp({ ...editingProp, image: reader.result });
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => document.getElementById("prop-image-edit-upload")?.click()}
                  className="w-full py-2 text-[12px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl cursor-pointer border border-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Image size={14} /> {editingProp.image ? "Change Image" : "Add Image"}
                </button>
              </div>

              {/* Platform Connections */}
              <div className="border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <LinkIcon size={14} className="text-purple-500" />
                  <h4 className="text-[13px] font-bold text-zinc-900">Platform Connections</h4>
                  <InfoTooltip text="Must be the public listing URL for scraping to work" size={12} color="#a1a1aa" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(PLATFORM_META).map(([platform, meta]) => {
                    const url = (editingProp.platforms && editingProp.platforms[platform]) || "";
                    const isConnected = url && url.startsWith("http");
                    return (
                      <div key={platform}
                        className={`rounded-xl border-2 p-4 transition-all ${isConnected ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300"}`}>
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
                        </div>
                        <div className="relative">
                          <input type="url" value={url}
                            onChange={e => setEditingProp({ ...editingProp, platforms: { ...(editingProp.platforms || {}), [platform]: e.target.value } })}
                            placeholder={`Paste ${platform} URL...`}
                            className={`w-full pl-3 pr-8 py-2 text-[12px] font-medium rounded-lg border outline-none transition-colors ${isConnected ? "bg-white border-emerald-200 text-zinc-800 focus:border-emerald-400" : "bg-white border-zinc-200 text-zinc-800 focus:border-zinc-400"}`}
                          />
                          {url && (
                            <X size={12}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 cursor-pointer transition-colors"
                              onClick={() => setEditingProp({ ...editingProp, platforms: { ...(editingProp.platforms || {}), [platform]: "" } })}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <Label>Max Reviews Per Sync</Label>
                <Select value={editingProp.max_reviews_per_sync || 10} onChange={e => setEditingProp({ ...editingProp, max_reviews_per_sync: parseInt(e.target.value) })}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
              <button onClick={() => setShowEditProp(false)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer border-none">Cancel</button>
              <PrimaryBtn onClick={handleEditProperty} loading={propSaving} className="flex-1">
                Update Property
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {/* Delete Property Modal */}
      {deletingProp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeletingProp(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-[15px] font-bold text-zinc-900 m-0">Delete Property?</h3>
              <p className="text-[12px] text-zinc-500 mt-1">This action cannot be undone. All associated reviews will be deleted.</p>
            </div>
            <div className="p-6">
              <p className="text-[13px] text-zinc-700 mb-4">
                Delete <span className="font-bold">{deletingProp.name}</span> property?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Consider deactivating instead to preserve review history.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
              <button onClick={() => setDeletingProp(null)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer border-none">Cancel</button>
              <button onClick={handleDeleteProperty} disabled={propSaving}
                className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer border-none disabled:opacity-60">
                {propSaving ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Property Active Confirmation Modal */}
      {togglingProp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setTogglingProp(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-[15px] font-bold text-zinc-900 m-0">
                {togglingProp.is_active !== false ? "Deactivate" : "Activate"} Property?
              </h3>
            </div>
            <div className="p-6">
              <BannerError msg={propError} />
              {togglingProp.is_active !== false ? (
                <>
                  <p className="text-[13px] text-zinc-700 mb-3">
                    Deactivating <span className="font-bold">{togglingProp.name}</span> will:
                  </p>
                  <ul className="text-[12px] text-zinc-600 space-y-2 mb-0">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                      <span>Hide from the business owner's property list</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                      <span>Stop review scraping completely</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                      <span>Exclude from dashboard and filters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      <span>Review history preserved — can reactivate anytime</span>
                    </li>
                  </ul>
                </>
              ) : (
                <p className="text-[13px] text-zinc-700">
                  Reactivate <span className="font-bold">{togglingProp.name}</span>? It will appear in the owner's property list and resume review syncing.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
              <button onClick={() => setTogglingProp(null)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer border-none">Cancel</button>
              <button onClick={() => handleToggleProperty(togglingProp)}
                className={`flex-1 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-colors cursor-pointer border-none ${
                  togglingProp.is_active !== false ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}>
                {togglingProp.is_active !== false ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
