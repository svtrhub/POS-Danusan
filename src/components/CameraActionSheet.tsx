import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { compressWithAutoThreshold, formatBytes, PHOTO_MAX_BYTES_THRESHOLD } from '../utils/media';
import { triggerHaptic } from '../utils/haptics';
import { BlobRegistry } from '../utils/blobRegistry';

interface CameraActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (base64: string, sizeBytes?: number) => void;
  title?: string;
}

export const CameraActionSheet: React.FC<CameraActionSheetProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Memproses foto...');
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    setDragY(0);
    setIsDragging(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      BlobRegistry.clearAll();
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 70) {
      triggerHaptic('light');
      BlobRegistry.clearAll();
      onClose();
    }
    setDragY(0);
  };

  const handleProcessFile = async (file: File | undefined | null) => {
    if (!file) return;

    try {
      setIsProcessing(true);

      // Automatic file size inspection (>200KB detection)
      const isOver200Kb = file.size > PHOTO_MAX_BYTES_THRESHOLD;
      if (isOver200Kb) {
        setProcessingStatus(`Mengompresi (${formatBytes(file.size)} → <200KB)...`);
      } else {
        setProcessingStatus('Memproses foto...');
      }

      // Allow browser UI thread to paint the spinner smoothly before heavy compression
      await new Promise((resolve) => setTimeout(resolve, 35));

      // 1. Direct 750px downscaling via createImageBitmap applied first BEFORE any blob is registered
      const result = await compressWithAutoThreshold(file);

      // 2. Register ephemeral blob URL strictly for the downscaled <200KB payload (zero uncompressed bloat)
      if (result.base64) {
        const compressedBlobUrl = BlobRegistry.create(result.base64);

        console.info(
          `[CameraActionSheet] ✅ Photo downscaled to ${result.width}x${result.height} in ${result.processingTimeMs}ms | Original: ${formatBytes(file.size)} → Memory: ${formatBytes(result.sizeBytes)} (Blob: ${compressedBlobUrl.slice(0, 30)}...)`
        );

        triggerHaptic('success');
        onPhotoCaptured(result.base64, result.sizeBytes);
        onClose();
      }
    } catch (err) {
      console.warn('Failed to process image:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('Memproses foto...');
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xs sm:max-w-sm mx-auto pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:pb-0 pointer-events-none">
        {/* Main Action Group Card - With Native iOS Swipe-Down to Dismiss */}
        <div
          className={`bg-white rounded-2xl shadow-2xl border border-black/8 overflow-hidden pointer-events-auto touch-pan-y ${
            isDragging ? '' : 'transition-transform duration-200 ease-out'
          }`}
          style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : 'none' }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Subtle Pull Indicator Bar */}
          <div className="w-full pt-2 pb-1 flex justify-center bg-white cursor-grab">
            <div className="w-9 h-1 rounded-full bg-slate-300" />
          </div>

          <div className="divide-y divide-black/6">
            {isProcessing ? (
              <div className="h-28 flex flex-col items-center justify-center gap-1.5 text-slate-600 bg-white px-4 text-center">
                <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
                <span className="text-xs font-semibold text-slate-800">
                  {processingStatus}
                </span>
                <span className="text-[10px] text-slate-400">
                  Kompresi otomatis hemat RAM &amp; kuota sinkronisasi
                </span>
              </div>
            ) : (
              <>
                {/* Action 1: Ambil foto via native label (Focused Element - Centered) */}
                <label
                  className="pressable w-full h-13 px-4 flex items-center justify-center gap-2.5 text-center bg-white hover:bg-slate-50 active:bg-slate-100 transition select-none text-slate-800 text-sm sm:text-[15px] font-semibold touch-manipulation cursor-pointer"
                  onClick={() => triggerHaptic('light')}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={handleCameraChange}
                    className="sr-only"
                  />
                  <Camera className="w-5 h-5 text-slate-700 stroke-[2] shrink-0" />
                  <span className="text-center">Ambil foto</span>
                </label>

                {/* Action 2: Pilih Galeri via native label (Centered) */}
                <label
                  className="pressable w-full h-13 px-4 flex items-center justify-center gap-2.5 text-center bg-white hover:bg-slate-50 active:bg-slate-100 transition select-none text-slate-800 text-sm sm:text-[15px] font-semibold touch-manipulation cursor-pointer"
                  onClick={() => triggerHaptic('light')}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={handleGalleryChange}
                    className="sr-only"
                  />
                  <ImageIcon className="w-5 h-5 text-slate-700 stroke-[2] shrink-0" />
                  <span className="text-center">Pilih Galeri</span>
                </label>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
