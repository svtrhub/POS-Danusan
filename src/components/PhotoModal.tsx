import React from 'react';
import { X, Trash2, Camera } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface PhotoModalProps {
  isOpen: boolean;
  photoBase64: string;
  onClose: () => void;
  onRetake: () => void;
  onDelete: () => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  photoBase64,
  onClose,
  onRetake,
  onDelete,
}) => {
  if (!isOpen || !photoBase64) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-xs font-bold text-white tracking-wide">
            Pratinjau Bukti Pembayaran
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="relative w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 before:content-[''] before:absolute before:-inset-2 before:z-10 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Preview */}
        <div className="p-3 bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
          <img
            src={photoBase64}
            alt="Bukti pembayaran"
            className="max-h-[55vh] max-w-full rounded-xl object-contain shadow-md"
          />
        </div>

        {/* Actions */}
        <div className="p-4 grid grid-cols-2 gap-2.5 bg-slate-900/90 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('warning');
              onDelete();
              onClose();
            }}
            className="pressable h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Bukti</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
              onRetake();
            }}
            className="pressable h-10 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Ganti Bukti</span>
          </button>
        </div>
      </div>
    </div>
  );
};
