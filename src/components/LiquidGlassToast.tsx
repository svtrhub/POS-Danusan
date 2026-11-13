import React from 'react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export type ToastVariant = 'success' | 'info' | 'error';

export interface ToastNotification {
  id: number;
  message: string;
  variant: ToastVariant;
}

/**
 * Fallback semantic classifier so any legacy showToast(message) call without
 * an explicit variant still displays an appropriate icon.
 */
export function inferToastVariant(message: string): ToastVariant {
  const normalized = message.toLowerCase();
  if (/gagal|error|kesalahan|tidak dapat/.test(normalized)) {
    return 'error';
  }
  if (/direset|dihapus|nonaktif|aktif|kembali ke|mode hemat baterai/.test(normalized)) {
    return 'info';
  }
  return 'success';
}

interface LiquidGlassToastProps {
  toast: ToastNotification | null;
  onDismiss: () => void;
}

export const LiquidGlassToast: React.FC<LiquidGlassToastProps> = ({
  toast,
  onDismiss,
}) => {
  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.variant) {
      case 'error':
        return (
          <AlertCircle
            className="w-3.5 h-3.5 shrink-0 toast-icon--error stroke-[2.2]"
            aria-hidden="true"
          />
        );
      case 'info':
        return (
          <Info
            className="w-3.5 h-3.5 shrink-0 toast-icon--info stroke-[2.2]"
            aria-hidden="true"
          />
        );
      case 'success':
      default:
        return (
          <CheckCircle2
            className="w-3.5 h-3.5 shrink-0 toast-icon--success stroke-[2.2]"
            aria-hidden="true"
          />
        );
    }
  };

  return (
    <div
      key={toast.id}
      className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-24px)] pointer-events-none"
    >
      <button
        type="button"
        role="status"
        aria-live="polite"
        aria-label={`${toast.message}. Ketuk untuk menutup notifikasi.`}
        title="Ketuk untuk menutup"
        onClick={() => {
          triggerHaptic('light');
          onDismiss();
        }}
        className="pointer-events-auto cursor-pointer select-none toast-liquid-glass animate-toast-surface min-h-[38px] px-4 py-2 text-xs font-medium flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/50"
      >
        <span aria-hidden="true" className="toast-liquid-glass__scrim" />
        <span aria-hidden="true" className="toast-liquid-glass__noise" />
        <span className="toast-liquid-glass__content flex items-center gap-2 min-w-0">
          {renderIcon()}
          <span className="truncate">{toast.message}</span>
        </span>
      </button>
    </div>
  );
};
