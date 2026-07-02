import React, { useState } from 'react';
import { Trash2, Edit2, Check } from 'lucide-react';
import { STAFF_ROLES_LABELS, DEPARTMENT_ICONS } from '../constants/staffConstants';

const StaffTable = ({ staff, onEdit, onDelete, loading }) => {

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">Loading staff...</div>;
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
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-[2fr_1.2fr_1.5fr_1.2fr_100px] gap-4 px-6 py-4 bg-gradient-to-r from-zinc-50 to-zinc-100 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
        <span>Name & Email</span>
        <span>Role</span>
        <span>Department</span>
        <span>Status</span>
        <span></span>
      </div>

      {/* Rows */}
      {staff.map((member) => (
        <div
          key={member._id}
          className="grid grid-cols-[2fr_1.2fr_1.5fr_1.2fr_100px] gap-4 px-6 py-4 border-b border-zinc-100 last:border-0 hover:bg-orange-50/40 transition-colors group"
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
            <span className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
              member.role === 'lead'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
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

          {/* Status */}
          <div className="flex items-center">
            {member.is_active ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg">
                <Check size={12} /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 text-zinc-600 text-[11px] font-semibold rounded-lg">
                <X size={12} /> Inactive
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onEdit(member)}
              className="p-1.5 hover:bg-zinc-200 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 size={14} className="text-zinc-500" />
            </button>
            <button
              onClick={() => onDelete(member._id)}
              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StaffTable;
