import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { compressImageToJpeg } from '../utils/media';
import { triggerHaptic } from '../utils/haptics';

interface CameraActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (base64: string) => void;
  title?: string;
}

export const CameraActionSheet: React.FC<CameraActionSheetProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
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
    return () => window.removeEventListener('keydown', handleKeyDown);
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
      onClose();
    }
    setDragY(0);
  };

  const handleProcessFile = async (file: File | undefined | null) => {
    if (!file) return;

    try {
      setIsProcessing(true);
      const base64 = await compressImageToJpeg(file);

      if (base64) {
        triggerHaptic('success');
        onPhotoCaptured(base64);
        onClose();
      }
    } catch (err) {
      console.warn('Failed to process image:', err);
    } finally {
      setIsProcessing(false);
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
              <div className="h-24 flex flex-col items-center justify-center gap-2 text-slate-600 bg-white">
                <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
                <span className="text-xs font-semibold text-slate-700">Memproses foto...</span>
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
