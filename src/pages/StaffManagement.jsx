import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getStaffByBusiness, createStaff, updateStaff, deactivateStaff, removeStaff, getAdminBusinesses, getAdminProperties } from '../api/apiClient';
import StaffTable from '../components/StaffTable';
import StaffForm from '../components/StaffForm';
import { STAFF_ROLES } from '../constants/staffConstants';

const StaffManagement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  // Determine access level
  const isSuperadmin = currentUser?.role === 'superadmin';
  const isOwner = currentUser?.role === 'owner';
  const isPropertyManager = currentUser?.role === 'property_manager';
  const isStaff = currentUser?.role === 'staff';

  // Redirect unauthorized users
  useEffect(() => {
    if (!isSuperadmin && !isOwner && !isPropertyManager) {
      navigate('/dashboard');
    }
  }, [currentUser?.role, navigate, isSuperadmin, isOwner, isPropertyManager]);

  // Load businesses and properties
  useEffect(() => {
    loadBusinesses();
  }, []);

  // Load staff for business
  useEffect(() => {
    if (selectedBusiness?._id) {
      loadStaff();
    }
  }, [selectedBusiness]);

  const loadBusinesses = async () => {
    try {
      const [bizRes, propRes] = await Promise.all([
        getAdminBusinesses(),
        getAdminProperties()
      ]);
      const allBiz = bizRes.data || [];
      const allProps = propRes.data || [];

      setProperties(allProps);

      if (isOwner) {
        // Business Owner: find their business by ID
        const ownerBiz = allBiz.find(b => b._id === currentUser?.business_id);
        if (ownerBiz) {
          setSelectedBusiness(ownerBiz);
          setBusinesses([ownerBiz]);
        }
      } else if (isPropertyManager) {
        // Property Manager: find their business
        const pmBiz = allBiz.find(b => b._id === currentUser?.business_id);
        if (pmBiz) {
          setSelectedBusiness(pmBiz);
          setBusinesses([pmBiz]);
        }
      } else {
        setBusinesses(allBiz);
      }
    } catch (err) {
      console.error('Failed to load businesses/properties:', err.message);
    }
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const response = await getStaffByBusiness(selectedBusiness._id);
      setStaff(response.data || []);
    } catch (err) {
      console.error('Failed to load staff:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (formData) => {
    try {
      await createStaff(formData);
      await loadStaff();
      setShowForm(false);
    } catch (err) {
      alert(err.message || 'Failed to create staff');
    }
  };

  const handleEditStaff = async (formData) => {
    try {
      await updateStaff(editingStaff._id, formData);
      await loadStaff();
      setEditingStaff(null);
    } catch (err) {
      alert(err.message || 'Failed to update staff');
    }
  };

  const handleDeactivate = async (staffId) => {
    if (!confirm('Deactivate this staff member?')) return;
    try {
      await deactivateStaff(staffId);
      await loadStaff();
    } catch (err) {
      alert(err.message || 'Failed to deactivate staff');
    }
  };

  const handleDelete = async (staffId) => {
    if (!confirm('Delete this staff member permanently?')) return;
    try {
      await removeStaff(staffId);
      await loadStaff();
    } catch (err) {
      alert(err.message || 'Failed to delete staff');
    }
  };

  // Determine title based on role
  const getPageTitle = () => {
    if (isOwner) return 'Property Managers';
    if (isPropertyManager) return 'Staff Members';
    return 'Staff Management';
  };

  if (!selectedBusiness) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            {getPageTitle()}
          </h2>
          <p className="text-sm text-zinc-500">
            {selectedBusiness.hotel_name} • Manage team members
          </p>
        </div>

        <button
          onClick={() => {
            setEditingStaff(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          Create {isOwner ? 'Property Manager' : isPropertyManager ? 'Staff' : 'Member'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-zinc-900">{staff.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">
            {staff.filter(s => s.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-zinc-400">
            {staff.filter(s => !s.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 mb-1">Business</p>
          <p className="text-sm font-bold text-zinc-900">{selectedBusiness.hotel_name}</p>
        </div>
      </div>

      {/* Staff Table */}
      <StaffTable
        staff={staff}
        onEdit={(member) => {
          setEditingStaff(member);
          setShowForm(true);
        }}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Staff Form Modal */}
      {showForm && (
        <StaffForm
          staff={editingStaff}
          userRole={currentUser.role}
          currentBusinessId={selectedBusiness._id}
          businesses={businesses}
          properties={properties}
          onSubmit={editingStaff ? handleEditStaff : handleCreateStaff}
          onClose={() => {
            setShowForm(false);
            setEditingStaff(null);
          }}
        />
      )}
    </div>
  );
};

export default StaffManagement;
