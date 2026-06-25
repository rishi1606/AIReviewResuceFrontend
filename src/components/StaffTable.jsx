import React, { useState } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { STAFF_ROLES_LABELS, DEPARTMENT_ICONS } from '../constants/staffConstants';

const StaffTable = ({ staff, onEdit, onDeactivate, onDelete, loading }) => {
  const [hoveredId, setHoveredId] = useState(null);

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">Loading staff...</div>;
  }

  if (!staff || staff.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p>No staff members yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_100px] gap-4 px-6 py-3 bg-zinc-50 border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
        <span>Name</span>
        <span>Role</span>
        <span>Department</span>
        <span>Property</span>
        <span>Status</span>
        <span></span>
      </div>

      {/* Rows */}
      {staff.map((member) => (
        <div
          key={member._id}
          onMouseEnter={() => setHoveredId(member._id)}
          onMouseLeave={() => setHoveredId(null)}
          className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_100px] gap-4 px-6 py-3.5 border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors group"
        >
          {/* Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-xs">
              {member.avatar_initials || member.name[0]}
            </div>
            <div className="truncate">
              <p className="text-[13px] font-semibold text-zinc-900">{member.name}</p>
              <p className="text-[11px] text-zinc-400">{member.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center">
            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 text-[11px] font-semibold">
              {STAFF_ROLES_LABELS[member.role] || member.role}
            </span>
          </div>

          {/* Department */}
          <div className="flex items-center">
            {member.department ? (
              <span className="text-[13px] font-medium text-zinc-700">
                {DEPARTMENT_ICONS[member.department]} {member.department}
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400">—</span>
            )}
          </div>

          {/* Property */}
          <div className="flex items-center">
            <span className="text-[13px] font-medium text-zinc-700">
              {member.property_id || '—'}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center">
            {member.is_active ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <Check size={12} /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
                <X size={12} /> Inactive
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1">
            {hoveredId === member._id && (
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(member)}
                  className="p-1.5 hover:bg-zinc-200 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 size={14} className="text-zinc-600" />
                </button>
                <button
                  onClick={() => onDeactivate(member._id)}
                  className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                  title={member.is_active ? 'Deactivate' : 'Activate'}
                >
                  {member.is_active ? (
                    <X size={14} className="text-amber-600" />
                  ) : (
                    <Check size={14} className="text-emerald-600" />
                  )}
                </button>
                <button
                  onClick={() => onDelete(member._id)}
                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} className="text-red-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StaffTable;
