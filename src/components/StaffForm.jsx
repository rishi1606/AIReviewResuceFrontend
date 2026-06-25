import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { STAFF_ROLES, DEPARTMENTS, STAFF_ROLES_LABELS } from '../constants/staffConstants';

const StaffForm = ({ onSubmit, onClose, staff, userRole, currentBusinessId, businesses = [], properties = [] }) => {
  const [formData, setFormData] = useState(staff || {
    name: '',
    email: '',
    password: '',
    role: STAFF_ROLES.STAFF,
    department: null,
    business_id: '',
    property_id: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Filter properties by selected business
  const filteredProperties = formData.business_id
    ? properties.filter(p => p.business_id === formData.business_id)
    : [];

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name required';
    if (!formData.email) newErrors.email = 'Email required';
    if (!staff && !formData.password) newErrors.password = 'Password required';
    if (!formData.role) newErrors.role = 'Role required';

    // Business and property requirements
    if (formData.role === STAFF_ROLES.OWNER || formData.role === STAFF_ROLES.PROPERTY_MANAGER || formData.role === STAFF_ROLES.STAFF) {
      if (!formData.business_id) newErrors.business_id = 'Business required';
      if (!formData.property_id) newErrors.property_id = 'Property required';
    }

    if (formData.role === STAFF_ROLES.STAFF && !formData.department) {
      newErrors.department = 'Department required for staff';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Role hierarchy for who can create whom
  const availableRoles =
    userRole === STAFF_ROLES.SUPERADMIN ? [STAFF_ROLES.OWNER] :
    userRole === STAFF_ROLES.OWNER ? [STAFF_ROLES.PROPERTY_MANAGER] :
    userRole === STAFF_ROLES.PROPERTY_MANAGER ? [STAFF_ROLES.STAFF] :
    [];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">
            {staff ? 'Edit Staff' : 'Create Staff Member'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                errors.name
                  ? 'border-red-300 bg-red-50'
                  : 'border-zinc-200 focus:border-orange-400'
              }`}
              placeholder="e.g., Rahul Singh"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!staff}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                errors.email
                  ? 'border-red-300 bg-red-50'
                  : 'border-zinc-200 focus:border-orange-400'
              } ${staff ? 'bg-zinc-100 cursor-not-allowed' : ''}`}
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          {!staff && (
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  errors.password
                    ? 'border-red-300 bg-red-50'
                    : 'border-zinc-200 focus:border-orange-400'
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                errors.role
                  ? 'border-red-300 bg-red-50'
                  : 'border-zinc-200 focus:border-orange-400'
              }`}
            >
              <option value="">Select role</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {STAFF_ROLES_LABELS[role]}
                </option>
              ))}
            </select>
            {errors.role && <p className="text-red-600 text-xs mt-1">{errors.role}</p>}
          </div>

          {/* Business (for Business Owner, Property Manager, Staff) */}
          {(formData.role === STAFF_ROLES.OWNER || formData.role === STAFF_ROLES.PROPERTY_MANAGER || formData.role === STAFF_ROLES.STAFF) && (
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Business
              </label>
              <select
                value={formData.business_id || ''}
                onChange={(e) => setFormData({ ...formData, business_id: e.target.value, property_id: '' })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-orange-400 transition-colors"
              >
                <option value="">Select business</option>
                {businesses.map((biz) => (
                  <option key={biz._id} value={biz._id}>
                    {biz.hotel_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Property (for Business Owner, Property Manager and Staff) */}
          {(formData.role === STAFF_ROLES.OWNER || formData.role === STAFF_ROLES.PROPERTY_MANAGER || formData.role === STAFF_ROLES.STAFF) && formData.business_id && (
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Property {formData.role === STAFF_ROLES.OWNER && '(Required for Owner)'}
              </label>
              <select
                value={formData.property_id || ''}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-orange-400 transition-colors"
              >
                <option value="">Select property</option>
                {filteredProperties.map((prop) => (
                  <option key={prop._id} value={prop.name}>
                    {prop.name}
                  </option>
                ))}
              </select>
              {filteredProperties.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  No properties available for this business
                </p>
              )}
            </div>
          )}

          {/* Department (only for staff) */}
          {formData.role === STAFF_ROLES.STAFF && (
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Department
              </label>
              <select
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value || null })}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  errors.department
                    ? 'border-red-300 bg-red-50'
                    : 'border-zinc-200 focus:border-orange-400'
                }`}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && <p className="text-red-600 text-xs mt-1">{errors.department}</p>}
            </div>
          )}


          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Staff Member'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffForm;
