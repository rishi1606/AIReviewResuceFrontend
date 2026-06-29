import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Loader2, CheckCircle2, X, Trash2, Edit2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getStaffByBusiness, createStaff, updateStaff, deactivateStaff, removeStaff } from '../api/apiClient';
import apiClient from '../api/apiClient';
import StaffTable from '../components/StaffTable';
import StaffForm from '../components/StaffForm';
import { STAFF_ROLES } from '../constants/staffConstants';

const StaffManagement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // Track which action is loading
  const [showInfo, setShowInfo] = useState(false); // Show/hide info tooltip

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE VALIDATION - OPTION 2: ONLY OWNER CAN MANAGE STAFF
  // ═══════════════════════════════════════════════════════════════════════════

  const isOwner = currentUser?.role === 'owner';
  const isSuperadmin = currentUser?.role === 'superadmin';
  const isLead = currentUser?.role === 'lead';
  const isStaffRole = currentUser?.role === 'staff';

  // Redirect unauthorized users
  useEffect(() => {
    // Owner and Lead can access staff management
    if (!isOwner && currentUser?.role !== 'lead') {
      setError(`Access Denied: Only business owners and leads can manage staff. Your role: ${currentUser?.role}`);
      const redirectTimer = setTimeout(() => navigate('/dashboard'), 3000);
      return () => clearTimeout(redirectTimer);
    }
  }, [currentUser?.role, navigate, isOwner]);

  // Initialize business on mount - use currentUser data or fetch from API
  useEffect(() => {
    if ((isOwner || currentUser?.role === 'lead') && !selectedBusiness && currentUser) {
      loadBusinessData();
    }
  }, [isOwner, currentUser?.role, currentUser]);

  // Load properties when business is selected
  useEffect(() => {
    if (selectedBusiness?._id) {
      loadProperties();
    }
  }, [selectedBusiness?._id]);

  const loadProperties = async () => {
    try {
      const response = await apiClient.get('/hotel/properties');
      if (response?.data && Array.isArray(response.data)) {
        // Filter active properties
        const activeProps = response.data.filter(p => p.is_active !== false);
        setProperties(activeProps);
      }
    } catch (err) {
      console.error('Load properties error:', err);
      // Don't show error, just leave properties empty
    }
  };

  const loadBusinessData = async () => {
    try {
      setError(null);

      // Try to get business_id from currentUser first
      let businessId = currentUser?.business_id || currentUser?.hotel_id;
      let businessName = currentUser?.hotel_name || currentUser?.business_name;

      // If not found in currentUser, try to fetch from /hotel endpoint
      if (!businessId) {
        try {
          const response = await apiClient.get('/hotel');
          if (response?.data?._id) {
            businessId = response.data._id;
            businessName = response.data.hotel_name || response.data.name;
          }
        } catch (apiErr) {
          console.log('Could not fetch hotel from API:', apiErr);
        }
      }

      if (businessId) {
        const business = {
          _id: businessId,
          hotel_name: businessName || 'My Hotel'
        };
        setSelectedBusiness(business);
      } else {
        setError('No business found. Your profile may not be properly linked to a business. Please contact support.');
      }
    } catch (err) {
      console.error('Load business data error:', err);
      setError(err.message || 'Failed to load business information');
    }
  };

  // ── AUTO LOAD STAFF WHEN BUSINESS SELECTED ─────────────────────────────────
  useEffect(() => {
    if (selectedBusiness?._id && isOwner) {
      loadStaff();
    }
  }, [selectedBusiness?._id, isOwner]);

  // ── LOAD STAFF FOR BUSINESS ─────────────────────────────────────────────────
  const loadStaff = async () => {
    if (!selectedBusiness?._id) {
      setError('No business selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getStaffByBusiness(selectedBusiness._id);

      if (!response || !Array.isArray(response.data)) {
        throw new Error('Invalid response from server');
      }

      setStaff(response.data);
      setSuccessMessage(null);
    } catch (err) {
      console.error('Load staff error:', err);
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Failed to load staff. Please try again.';
      setError(errorMsg);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // ── CREATE STAFF WITH ERROR HANDLING ────────────────────────────────────────
  const handleCreateStaff = async (formData) => {
    // ── VALIDATION ──────────────────────────────────────────────────────────
    if (!formData || !formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields (Name, Email, Password)');
      return;
    }

    if (!selectedBusiness?._id) {
      setError('No business selected. Please select a business first.');
      return;
    }

    setActionLoading('create');
    setError(null);

    try {
      // Add business_id to form data
      const staffData = {
        ...formData,
        business_id: selectedBusiness._id
      };

      const res = await createStaff(staffData);

      if (!res || !res.data) {
        throw new Error('Invalid response from server');
      }

      setSuccessMessage(`✓ Staff member "${formData.name}" created successfully!`);
      await loadStaff();
      setShowForm(false);
      setEditingStaff(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Create staff error:', err);

      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Failed to create staff member. Please try again.';

      // Handle specific error cases
      if (err.response?.status === 409) {
        setError(`Email "${formData.email}" is already in use. Please use a different email.`);
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create staff members.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ── UPDATE STAFF WITH ERROR HANDLING ────────────────────────────────────────
  const handleEditStaff = async (formData) => {
    // ── VALIDATION ──────────────────────────────────────────────────────────
    if (!editingStaff?._id) {
      setError('No staff member selected for editing');
      return;
    }

    if (!formData || !formData.name || !formData.email) {
      setError('Please fill in all required fields (Name, Email)');
      return;
    }

    setActionLoading(`edit-${editingStaff._id}`);
    setError(null);

    try {
      const res = await updateStaff(editingStaff._id, formData);

      if (!res || !res.data) {
        throw new Error('Invalid response from server');
      }

      setSuccessMessage(`✓ Staff member "${formData.name}" updated successfully!`);
      await loadStaff();
      setEditingStaff(null);
      setShowForm(false);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Update staff error:', err);

      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Failed to update staff member. Please try again.';

      if (err.response?.status === 403) {
        setError('You do not have permission to update staff members.');
      } else if (err.response?.status === 404) {
        setError('Staff member not found. They may have been deleted.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ── DEACTIVATE STAFF WITH ERROR HANDLING ────────────────────────────────────
  const handleDeactivate = async (staffId, staffName) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${staffName}? They will no longer be able to access their account.`
    );
    if (!confirmed) return;

    setActionLoading(`deactivate-${staffId}`);
    setError(null);

    try {
      const res = await deactivateStaff(staffId);

      if (!res || !res.data) {
        throw new Error('Invalid response from server');
      }

      setSuccessMessage(`✓ Staff member "${staffName}" deactivated successfully!`);
      await loadStaff();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Deactivate staff error:', err);

      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Failed to deactivate staff member. Please try again.';

      if (err.response?.status === 403) {
        setError('You do not have permission to deactivate staff members.');
      } else if (err.response?.status === 404) {
        setError('Staff member not found.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ── DELETE STAFF WITH ERROR HANDLING ────────────────────────────────────────
  const handleDelete = async (staffId, staffName) => {
    const confirmed = window.confirm(
      `⚠️  PERMANENT DELETE: Are you sure you want to permanently delete ${staffName}? This cannot be undone.`
    );
    if (!confirmed) return;

    setActionLoading(`delete-${staffId}`);
    setError(null);

    try {
      const res = await removeStaff(staffId);

      if (!res) {
        throw new Error('Invalid response from server');
      }

      setSuccessMessage(`✓ Staff member "${staffName}" deleted permanently!`);
      await loadStaff();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Delete staff error:', err);

      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Failed to delete staff member. Please try again.';

      if (err.response?.status === 403) {
        setError('You do not have permission to delete staff members.');
      } else if (err.response?.status === 404) {
        setError('Staff member not found.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Determine title based on role
  const getPageTitle = () => {
    if (isOwner) return 'Property Managers';
    if (isPropertyManager) return 'Staff Members';
    return 'Staff Management';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR/SUCCESS DISPLAY COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════

  const ErrorAlert = ({ message }) => (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
      <div>
        <h3 className="font-bold text-red-900">Error</h3>
        <p className="text-sm text-red-700 mt-1">{message}</p>
      </div>
      <button
        onClick={() => setError(null)}
        className="ml-auto text-red-600 hover:text-red-900 shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  );

  const SuccessAlert = ({ message }) => (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
      <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-emerald-700 font-medium">{message}</p>
      </div>
      <button
        onClick={() => setSuccessMessage(null)}
        className="ml-auto text-emerald-600 hover:text-emerald-900 shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION ERROR
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6">
        <AlertTriangle size={40} className="text-red-500" />
        <h1 className="text-2xl font-bold text-zinc-900">Access Denied</h1>
        <p className="text-zinc-600 max-w-md text-center">
          Only business owners can manage staff members. Your role: <strong>{currentUser?.role}</strong>
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors mt-4"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN PAGE
  // ═══════════════════════════════════════════════════════════════════════════

  if (!selectedBusiness && !error) {
    return (
      <div className="p-8 text-center">
        <Loader2 size={40} className="animate-spin text-orange-500 mx-auto" />
        <p className="text-zinc-500 mt-4">Loading your business...</p>
      </div>
    );
  }

  // Show error if no business found
  if (error && !selectedBusiness) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <AlertTriangle size={40} className="text-red-500" />
        <h1 className="text-2xl font-bold text-zinc-900">Error</h1>
        <p className="text-zinc-600 max-w-md text-center">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors mt-4"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Error Alert */}
      {error && <ErrorAlert message={error} />}

      {/* Success Alert */}
      {successMessage && <SuccessAlert message={successMessage} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            Staff Management
          </h2>
          <p className="text-sm text-zinc-500">
            {selectedBusiness.hotel_name} • Create and manage your team
          </p>
          {properties.length === 0 && (
            <p className="text-xs text-red-600 mt-1">
              ⚠️ Please create a property first before adding staff
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => {
              setEditingStaff(null);
              setShowForm(true);
            }}
            disabled={properties.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-colors ${
              properties.length === 0
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-60'
                : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
            }`}
            title={properties.length === 0 ? 'Create a property first to add staff' : 'Create a new staff member'}
          >
            <Plus size={16} />
            Create Staff
          </button>

          {/* Info Icon */}
          <div className="relative">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View staff creation restrictions"
            >
              <Info size={20} />
            </button>

            {/* Tooltip */}
            {showInfo && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-blue-200 rounded-lg shadow-lg p-4 w-64 z-50">
                <div className="text-sm text-zinc-900">
                  <p className="font-semibold mb-2 text-blue-700">📋 Staff Creation Rules</p>
                  <ul className="space-y-2 text-xs text-zinc-700">
                    <li>• <strong>Only 1 Lead allowed</strong> per business</li>
                    <li>• <strong>Unlimited Staff</strong> members can be added</li>
                    <li>• Each staff member needs a department assigned</li>
                    <li>• Lead manages responses from staff</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-3"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
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
          existingStaff={staff}
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
