"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string; // Tailwind class, e.g. "max-w-md", "max-w-lg"
  showCloseButton?: boolean;
  ariaLabel?: string;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = "max-w-md",
  showCloseButton = true,
  ariaLabel,
  footer,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Escape key handler and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : ariaLabel || "Dialog"}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} bg-[#0B0F19] border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/90 flex flex-col max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden animate-in fade-in sm:zoom-in-95 duration-150 pb-[env(safe-area-inset-bottom)] sm:pb-0`}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#06080F]/60 shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && (
                  <h2 className="text-base font-bold text-white tracking-tight truncate">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="px-5 py-3.5 bg-[#06080F]/70 border-t border-slate-800/80 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
