"use client";

import React, { useEffect } from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  showCancel = true,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />,
          iconBg: "bg-red-950/60 border-red-800/60",
          confirmBtn:
            "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/40",
        };
      case "warning":
        return {
          icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
          iconBg: "bg-amber-950/60 border-amber-800/60",
          confirmBtn:
            "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-amber-950/40",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
          iconBg: "bg-sky-950/60 border-sky-800/60",
          confirmBtn:
            "bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-950/40",
        };
    }
  };

  const { icon, iconBg, confirmBtn } = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-[#0B0F19] border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800/80 flex items-center justify-between bg-[#06080F]/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center ${iconBg}`}
            >
              {icon}
            </div>
            <h2
              id="confirm-modal-title"
              className="text-base font-bold text-white tracking-tight"
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition touch-manipulation"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#06080F]/60 border-t border-slate-800/80 flex items-center justify-end gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 text-sm font-medium transition touch-manipulation"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition touch-manipulation active:scale-98 ${confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
