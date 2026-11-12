"use client";

import React from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Modal } from "./Modal";

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
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: (
            <div className="w-8 h-8 rounded-xl border flex items-center justify-center bg-red-950/60 border-red-800/60">
              <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0" />
            </div>
          ),
          confirmBtn:
            "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/40",
        };
      case "warning":
        return {
          icon: (
            <div className="w-8 h-8 rounded-xl border flex items-center justify-center bg-amber-950/60 border-amber-800/60">
              <AlertCircle className="w-4.5 h-4.5 text-amber-400 shrink-0" />
            </div>
          ),
          confirmBtn:
            "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-amber-950/40",
        };
      case "info":
      default:
        return {
          icon: (
            <div className="w-8 h-8 rounded-xl border flex items-center justify-center bg-sky-950/60 border-sky-800/60">
              <Info className="w-4.5 h-4.5 text-sky-400 shrink-0" />
            </div>
          ),
          confirmBtn:
            "bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-950/40",
        };
    }
  };

  const { icon, confirmBtn } = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      icon={icon}
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 text-sm font-medium transition touch-manipulation"
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
      }
    >
      <div className="p-5 sm:p-6">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {message}
        </p>
      </div>
    </Modal>
  );
};
