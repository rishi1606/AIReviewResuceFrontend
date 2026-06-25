import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { createStaff, getStaffByBusiness, updateStaff, deactivateStaff, removeStaff, getAdminBusinesses, getAdminProperties } from '../api/apiClient';
import StaffTable from '../components/StaffTable';
import StaffForm from '../components/StaffForm';
import { STAFF_ROLES } from '../constants/staffConstants';

const AdminStaffManagement = ({ selectedBusiness, onBack }) => {
  const { state } = useAppContext();
  const [businesses, setBusinesses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Load businesses and staff
  useEffect(() => {
    loadBusinesses();
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
      setBusinesses(bizRes.data || []);
      setProperties(propRes.data || []);
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

  if (!selectedBusiness) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Select a business to manage staff
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-zinc-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              Staff Management
            </h2>
            <p className="text-sm text-zinc-500">
              {selectedBusiness.hotel_name} • Manage team members and their roles
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingStaff(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          Create Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Staff</p>
          <p className="text-2xl font-bold text-zinc-900">{staff.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 mb-1">Business Owners</p>
          <p className="text-2xl font-bold text-zinc-900">
            {staff.filter(s => s.role === STAFF_ROLES.OWNER).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 mb-1">Property Managers</p>
          <p className="text-2xl font-bold text-zinc-900">
            {staff.filter(s => s.role === STAFF_ROLES.PROPERTY_MANAGER).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">
            {staff.filter(s => s.is_active).length}
          </p>
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
          userRole={STAFF_ROLES.SUPERADMIN}
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

export default AdminStaffManagement;
