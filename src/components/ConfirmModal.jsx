import React from "react";
import { createPortal } from "react-dom";

/**
 * ConfirmModal — reusable confirmation dialog matching the app's design language.
 *
 * Props:
 *   open       — boolean to show/hide
 *   onClose    — called on Cancel / backdrop click
 *   onConfirm  — called on confirm button click
 *   icon       — Lucide icon component to render in the header circle
 *   iconColor  — tailwind text color class for the icon (default: "text-red-500")
 *   iconBg     — tailwind bg color class for the icon circle (default: "bg-red-50")
 *   title      — modal heading
 *   message    — body text (string or JSX)
 *   confirmText — label for confirm button (default: "Confirm")
 *   cancelText  — label for cancel button (default: "Cancel")
 *   confirmClass — extra class for confirm button (default: red theme)
 *   loading    — if true, confirm button shows loading state
 */
const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  icon: Icon,
  iconColor = "text-red-500",
  iconBg = "bg-red-50",
  title = "Are you sure?",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmClass = "bg-red-500 hover:bg-red-600 shadow-red-500/20",
  loading = false
}) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "shScaleUp 200ms ease forwards" }}
      >
        <div className="px-6 py-5 text-center">
          {Icon && (
            <div className={`w-11 h-11 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
              <Icon size={20} className={iconColor} />
            </div>
          )}
          <h3 className="text-base font-bold text-zinc-900 mb-0.5">{title}</h3>
          <p className="text-[13px] text-zinc-500 mb-5">{message}</p>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-colors shadow-md cursor-pointer ${confirmClass}`}
            >
              {loading ? "Please wait…" : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
