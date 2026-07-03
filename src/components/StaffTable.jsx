import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Clock, Calendar, Building2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { STAFF_ROLES_LABELS, DEPARTMENT_ICONS } from '../constants/staffConstants';

const StaffTable = ({ staff, onEdit, onDelete, loading, properties = [], businessName = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Get property name from property_id
  const getPropertyName = (propertyId) => {
    if (!propertyId) return '—';
    const prop = properties.find(p => p._id === propertyId || p.id === propertyId);
    return prop?.name || prop?.hotel_name || '—';
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Time ago
  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
  };

  // Filter
  const filtered = (staff || []).filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q) ||
      getPropertyName(s.property_id)?.toLowerCase().includes(q)
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'name': aVal = a.name?.toLowerCase() || ''; bVal = b.name?.toLowerCase() || ''; break;
      case 'role': aVal = a.role || ''; bVal = b.role || ''; break;
      case 'department': aVal = a.department || ''; bVal = b.department || ''; break;
      case 'property': aVal = getPropertyName(a.property_id); bVal = getPropertyName(b.property_id); break;
      case 'status': aVal = a.is_active ? 1 : 0; bVal = b.is_active ? 1 : 0; break;
      case 'created': aVal = new Date(a.createdAt || 0).getTime(); bVal = new Date(b.createdAt || 0).getTime(); break;
      default: aVal = a.name || ''; bVal = b.name || '';
    }
    if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={12} className="opacity-0 group-hover:opacity-30 ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-orange-500 ml-1" />
      : <ChevronDown size={12} className="text-orange-500 ml-1" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 px-6 py-5 border-b border-zinc-100 animate-pulse">
            <div className="w-9 h-9 bg-zinc-200 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-zinc-200 rounded w-32" />
              <div className="h-2.5 bg-zinc-100 rounded w-44" />
            </div>
            <div className="h-6 bg-zinc-200 rounded-lg w-24" />
            <div className="h-6 bg-zinc-100 rounded w-28" />
            <div className="h-6 bg-zinc-100 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!staff || staff.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
        <div className="mb-3">
          <p className="text-lg font-semibold text-zinc-900">No staff members yet</p>
          <p className="text-sm text-zinc-500 mt-1">Create your first team member to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-[12px] rounded-xl border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all font-medium"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[1.8fr_1fr_1.2fr_1.2fr_0.8fr_1fr_120px] gap-3 px-5 py-3.5 bg-gradient-to-r from-zinc-50 to-zinc-100 border-b border-zinc-200">
          {[
            { label: 'Name & Email', field: 'name' },
            { label: 'Role', field: 'role' },
            { label: 'Property', field: 'property' },
            { label: 'Department', field: 'department' },
            { label: 'Status', field: 'status' },
            { label: 'Added', field: 'created' },
            { label: 'Actions', field: null },
          ].map(col => (
            <button
              key={col.label}
              onClick={() => col.field && handleSort(col.field)}
              className={`group flex items-center text-[11px] font-bold uppercase tracking-wider text-left ${col.field ? 'text-zinc-500 hover:text-zinc-700 cursor-pointer' : 'text-zinc-500 cursor-default'}`}
            >
              {col.label}
              {col.field && <SortIcon field={col.field} />}
            </button>
          ))}
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div className="px-6 py-10 text-center text-zinc-400 text-sm">
            No staff matching "{searchQuery}"
          </div>
        ) : (
          sorted.map((member) => (
            <div
              key={member._id}
              className="grid grid-cols-[1.8fr_1fr_1.2fr_1.2fr_0.8fr_1fr_120px] gap-3 px-5 py-3.5 border-b border-zinc-100 last:border-0 hover:bg-orange-50/40 transition-colors group"
            >
              {/* Name & Email */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${member.role === 'lead'
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-orange-100 text-orange-600'
                  }`}>
                  {member.avatar_initials || (member.name ? member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U')}
                </div>
                <div className="truncate">
                  <p className="text-[13px] font-semibold text-zinc-900 truncate">{member.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{member.email}</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center">
                <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${member.role === 'lead'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
                  }`}>
                  {STAFF_ROLES_LABELS[member.role] || member.role}
                </span>
              </div>

              {/* Property */}
              <div className="flex items-center min-w-0">
                <span className="text-[12px] font-medium text-zinc-600 truncate flex items-center gap-1.5">
                  <Building2 size={12} className="text-zinc-400 shrink-0" />
                  {getPropertyName(member.property_id)}
                </span>
              </div>

              {/* Department */}
              <div className="flex items-center">
                {member.department ? (
                  <span className="text-[12px] font-medium text-zinc-700 truncate">
                    {DEPARTMENT_ICONS[member.department]} {member.department}
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-400">—</span>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center">
                {member.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-lg">
                    <Check size={10} /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-500 text-[10px] font-semibold rounded-lg">
                    <X size={10} /> Inactive
                  </span>
                )}
              </div>

              {/* Added Date */}
              <div className="flex items-center">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <Calendar size={11} className="shrink-0" />
                  {formatDate(member.createdAt)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5">
                {confirmDelete === member._id ? (
                  <>
                    <button
                      onClick={() => { onDelete(member._id); setConfirmDelete(null); }}
                      className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onEdit(member)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-orange-100 text-zinc-600 hover:text-orange-600 text-[10px] font-bold rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    {/* <button
                      onClick={() => setConfirmDelete(member._id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-red-100 text-zinc-600 hover:text-red-600 text-[10px] font-bold rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 size={12} /> Delete
                    </button> */}
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <p className="text-[11px] text-zinc-400">
            Showing {sorted.length} of {staff.length} staff member{staff.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-400 rounded-full" /> Leads: {staff.filter(s => s.role === 'lead').length}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full" /> Staff: {staff.filter(s => s.role === 'staff').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffTable;
