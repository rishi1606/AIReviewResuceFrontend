import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser, addStaff, importReviews, completeOnboarding } from "../api/apiClient";
import { ShieldCheck, Hotel, User, Users, Upload, ChevronRight, Loader2 } from "lucide-react";
import { parseCSV } from "../utils/csvParser";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Step 1: Hotel
  const [hotelData, setHotelData] = useState({
    hotel_name: "",
    address: "",
    number_of_rooms: "<50",
    star_category: "4★",
    platforms: []
  });

  // Step 2: User
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "gm",
    department: "Management"
  });

  // Step 3: Staff
  const [staffList, setStaffList] = useState([]);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "staff", department: "Front Office" });

  // Step 4: Import
  const [tempReviews, setTempReviews] = useState([]);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Register User & Create Hotel
      await register({
        ...userData,
        hotel_name: hotelData.hotel_name
      });

      // 2. Add Staff
      for (const staff of staffList) {
        await addStaff({ ...staff, password: "password123" }); // Default password
      }

      // 3. Import Reviews
      if (tempReviews.length > 0) {
        await importReviews(tempReviews);
      }

      // 4. Complete Onboarding
      await completeOnboarding();


    } catch (err) {
      alert("Setup failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addStaffMember = () => {
    setStaffList([...staffList, newStaff]);
    setNewStaff({ name: "", email: "", role: "staff", department: "Front Office" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 -z-10"></div>
          <div className={`absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 -z-10 transition-all duration-500`} style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${s <= step ? "bg-indigo-600 text-white" : "bg-white border-2 border-slate-200 text-slate-400"}`}>
              {s === 1 && <Hotel size={18} />}
              {s === 2 && <User size={18} />}
              {s === 3 && <Users size={18} />}
              {s === 4 && <Upload size={18} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-10">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Hotel Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Hotel Name</label>
                  <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" value={hotelData.hotel_name} onChange={e => setHotelData({ ...hotelData, hotel_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rooms</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl" value={hotelData.number_of_rooms} onChange={e => setHotelData({ ...hotelData, number_of_rooms: e.target.value })}>
                    <option>&lt;50</option><option>50-100</option><option>100-200</option><option>200+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Star Category</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl" value={hotelData.star_category} onChange={e => setHotelData({ ...hotelData, star_category: e.target.value })}>
                    <option>3★</option><option>4★</option><option>5★</option><option>Boutique</option>
                  </select>
                </div>
              </div>
              <button onClick={nextStep} className="btn-primary w-full flex items-center justify-center gap-2">Next <ChevronRight size={18} /></button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Your Account</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input type="email" className="w-full p-3 bg-slate-50 border rounded-xl" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl" value={userData.role} onChange={e => setUserData({ ...userData, role: e.target.value })}>
                    <option value="gm">General Manager</option><option value="dept_head">Department Head</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input type="password" placeholder="Min 8 chars" className="w-full p-3 bg-slate-50 border rounded-xl" value={userData.password} onChange={e => setUserData({ ...userData, password: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Confirm Password</label>
                  <input type="password" className="w-full p-3 bg-slate-50 border rounded-xl" value={userData.confirm_password} onChange={e => setUserData({ ...userData, confirm_password: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={prevStep} className="btn-secondary flex-1">Back</button>
                <button onClick={nextStep} className="btn-primary flex-[2]">Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Add Staff</h2>
              <div className="space-y-4">
                {staffList.map((s, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200">
                    <div>
                      <p className="font-bold">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.email} • {s.department}</p>
                    </div>
                    <button onClick={() => setStaffList(staffList.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1 rounded">Remove</button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <input type="text" placeholder="Name" className="p-3 bg-slate-50 border rounded-xl" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
                  <input type="email" placeholder="Email" className="p-3 bg-slate-50 border rounded-xl" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} />
                  <select className="p-3 bg-slate-50 border rounded-xl" value={newStaff.department} onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}>
                    <option>Front Office</option><option>Housekeeping</option><option>Maintenance</option><option>F&B</option>
                  </select>
                  <button onClick={addStaffMember} className="btn-secondary">+ Add</button>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={prevStep} className="btn-secondary flex-1">Back</button>
                <button onClick={nextStep} className="btn-primary flex-[2]">Next</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Import Reviews</h2>
              <p className="text-slate-500">Upload a CSV to see ReviewRescue in action immediately.</p>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const result = await parseCSV(file);
                    setTempReviews(result.valid);
                    alert(`${result.validCount} valid reviews found!`);
                  }
                }} />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="mx-auto mb-4 text-slate-400" size={48} />
                  <p className="font-medium">Click or drag CSV to upload</p>
                  <p className="text-xs text-slate-400 mt-2">Optional: You can skip this step</p>
                </label>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={prevStep} className="btn-secondary flex-1">Back</button>
                <button onClick={handleFinish} disabled={loading} className="btn-primary flex-[2] flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Finish Setup"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
