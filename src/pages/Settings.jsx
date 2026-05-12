import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { updateHotel, addStaff, removeStaff, updateMe } from "../api/apiClient";
import { classifyAllPending } from "../utils/aiClassifier";
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
  Loader2
} from "lucide-react";

const Settings = () => {
  const { state, dispatch, refreshData } = useAppContext();
  const { currentUser, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("hotel");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", department: "Front Office", role: "staff" });

  const [hotelFields, setHotelFields] = useState(state.hotelConfig);
  const [profileFields, setProfileFields] = useState(currentUser);

  const handleSaveHotel = async () => {
    setLoading(true);
    try {
      await updateHotel(hotelFields);
      dispatch({ type: "UPDATE_HOTEL_CONFIG", payload: hotelFields });
      alert("Hotel settings saved!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        name: newStaff.name, 
        department: newStaff.department, 
        role: "staff" 
      };
      const res = await addStaff(payload);
      dispatch({ type: "ADD_STAFF", payload: res.data });
      setIsModalOpen(false);
      setNewStaff({ name: "", department: "Front Office", role: "staff" });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    setLoading(true);
    try {
      await removeStaff(id);
      dispatch({ type: "REMOVE_STAFF", payload: id });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateMe(profileFields);
      updateUser(profileFields);
      alert("Profile updated!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runGlobalAnalysis = async () => {
    if (!window.confirm("This will re-analyse all non-approved reviews and create tickets. Continue?")) return;
    setLoading(true);
    try {
      await classifyAllPending(state.reviews, null, dispatch, currentUser, state.staff);
      alert("Analysis complete! Check the Tickets tab.");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "hotel", name: "Hotel Profile", icon: Hotel },
    { id: "staff", name: "Staff Management", icon: Users },
    { id: "ai", name: "AI & SLAs", icon: Shield },
    { id: "account", name: "Account", icon: User },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Configure your hotel, team, and AI preferences.</p>
        </div>
        {activeTab === "ai" && (
          <button 
            onClick={runGlobalAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Run Full Analysis
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <t.icon size={18} />
            {t.name}
          </button>
        ))}
      </div>

      <div className="glass-card p-8">
        {activeTab === "hotel" && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Hotel Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-slate-500">Hotel Name</label>
                <input 
                  type="text" 
                  value={hotelFields.hotel_name || ""} 
                  onChange={e => setHotelFields({...hotelFields, hotel_name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Star Category</label>
                <select 
                  value={hotelFields.star_category || "4★"} 
                  onChange={e => setHotelFields({...hotelFields, star_category: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option>3★</option><option>4★</option><option>5★</option><option>Boutique</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Number of Rooms</label>
                <input 
                  type="text" 
                  value={hotelFields.number_of_rooms || ""} 
                  onChange={e => setHotelFields({...hotelFields, number_of_rooms: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
            <button 
              onClick={handleSaveHotel}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={18} /> Save Changes
            </button>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Staff Management</h3>
              <button onClick={() => setIsModalOpen(true)} className="btn-secondary text-xs flex items-center gap-2">
                <Plus size={14} /> Add Member
              </button>
            </div>
            <div className="space-y-4">
              {state.staff.map(s => (
                <div key={s._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center group hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                      {s.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.email} • <span className="text-indigo-600 font-medium">{s.department}</span></p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveStaff(s._id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xl font-bold">SLA Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">High Urgency (h)</label>
                  <input type="number" value={hotelFields.sla_high || 4} onChange={e => setHotelFields({...hotelFields, sla_high: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Medium (h)</label>
                  <input type="number" value={hotelFields.sla_medium || 24} onChange={e => setHotelFields({...hotelFields, sla_medium: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Low (h)</label>
                  <input type="number" value={hotelFields.sla_low || 72} onChange={e => setHotelFields({...hotelFields, sla_low: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t pt-8">
              <h3 className="text-xl font-bold">AI Analysis Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Confidence Threshold (%)</label>
                  <input type="range" min="0" max="100" value={hotelFields.ai_confidence_threshold || 75} onChange={e => setHotelFields({...hotelFields, ai_confidence_threshold: e.target.value})} className="w-full" />
                  <p className="text-right text-xs font-bold text-indigo-600">{hotelFields.ai_confidence_threshold || 75}%</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Default Response Tone</label>
                  <select value={hotelFields.default_response_tone || "Formal"} onChange={e => setHotelFields({...hotelFields, default_response_tone: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl">
                    <option>Formal</option><option>Empathetic</option><option>Apologetic</option><option>Promotional</option>
                  </select>
                </div>
              </div>
            </section>
            
            <button onClick={handleSaveHotel} className="btn-primary flex items-center gap-2"><Save size={18} /> Save AI Settings</button>
          </div>
        )}

        {activeTab === "account" && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Account Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-slate-500">Display Name</label>
                <input type="text" value={profileFields.name} onChange={e => setProfileFields({...profileFields, name: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Email</label>
                <input type="email" value={profileFields.email} onChange={e => setProfileFields({...profileFields, email: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Role</label>
                <input type="text" disabled value={profileFields.role} className="w-full p-3 bg-slate-100 border rounded-xl opacity-50 cursor-not-allowed" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleSaveProfile} className="btn-primary flex items-center gap-2"><Save size={18} /> Update Profile</button>
              <button onClick={logout} className="btn-secondary text-red-500 border-red-100 hover:bg-red-50">Logout</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Add Staff Member</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStaffSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={newStaff.name}
                  onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Department</label>
                <select 
                  value={newStaff.department}
                  onChange={e => setNewStaff({...newStaff, department: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {["Front Office", "Housekeeping", "Maintenance", "F&B", "Security", "Concierge", "Spa", "Management"].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  Add Team Member
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
