import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Trash2, Camera, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { BlobRegistry } from '../utils/blobRegistry';
import { isIOSDevice } from '../utils/device';
import { usePhotoCapture } from '../hooks/usePhotoCapture';

interface PhotoModalProps {
  isOpen: boolean;
  photoBase64: string;
  onClose: () => void;
  onRetake: () => void;
  onPhotoCaptured: (base64: string, sizeBytes?: number) => void;
  onError?: (message: string) => void;
  onDelete: () => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  photoBase64,
  onClose,
  onRetake,
  onPhotoCaptured,
  onError,
  onDelete,
}) => {
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string>('');
  const isIOS = useMemo(() => isIOSDevice(), []);

  const handleClose = useCallback(() => {
    BlobRegistry.clearAll();
    onClose();
  }, [onClose]);

  const { isProcessing, handleFileInputChange } = usePhotoCapture({
    onPhotoCaptured,
    onSuccess: handleClose,
    onError,
  });

  // Convert base64 to lightweight Blob URL on open, automatically revoke all on close/unmount
  useEffect(() => {
    if (isOpen && photoBase64) {
      const url = BlobRegistry.create(photoBase64);
      setPreviewBlobUrl(url);
    } else {
      setPreviewBlobUrl('');
      BlobRegistry.clearAll();
    }

    return () => {
      // Automatic memory cleanup on unmount or when modal closes
      BlobRegistry.clearAll();
    };
  }, [isOpen, photoBase64]);

  // Keyboard navigation escape route
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, handleClose]);

  if (!isOpen || !photoBase64) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={() => {
        if (!isProcessing) handleClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm bg-[#1C1C1E] rounded-3xl overflow-hidden shadow-2xl flex flex-col pointer-events-auto animate-modal-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#1C1C1E]">
          <span className="text-[13px] font-semibold text-white tracking-[-0.01em]">
            Pratinjau Bukti Pembayaran
          </span>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              triggerHaptic('light');
              handleClose();
            }}
            className="pressable relative w-8 h-8 rounded-full bg-white/12 hover:bg-white/20 text-white flex items-center justify-center transition-colors before:content-[''] before:absolute before:-inset-2 before:z-10 cursor-pointer disabled:opacity-50"
            title="Tutup Pratinjau"
            aria-label="Tutup Pratinjau"
          >
            <X className="w-4 h-4 stroke-[2.1]" />
          </button>
        </div>

        {/* Image Preview - rendered via transient Blob URL to prevent heap bloat */}
        <div className="p-3 bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
          <img
            src={previewBlobUrl || photoBase64}
            alt="Bukti pembayaran"
            className="max-h-[55vh] max-w-full rounded-xl object-contain shadow-md"
          />
        </div>

        {/* Actions */}
        <div className="p-3.5 grid grid-cols-2 gap-2.5 bg-[#1C1C1E]">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              triggerHaptic('warning');
              BlobRegistry.clearAll();
              onDelete();
              onClose();
            }}
            className="pressable h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Bukti</span>
          </button>

          {isIOS ? (
            <label
              onClick={() => triggerHaptic('light')}
              className={`pressable h-10 rounded-xl bg-[#007AFF] hover:bg-[#0062E0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-white/60 ${
                isProcessing ? 'opacity-80 pointer-events-none' : ''
              }`}
            >
              <input
                type="file"
                accept="image/*"
                disabled={isProcessing}
                onChange={handleFileInputChange}
                className="sr-only"
              />
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ganti Bukti</span>
                </>
              )}
            </label>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                BlobRegistry.clearAll();
                onClose();
                onRetake();
              }}
              className="pressable h-10 rounded-xl bg-[#007AFF] hover:bg-[#0062E0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Ganti Bukti</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
