import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { BlobRegistry } from '../utils/blobRegistry';
import { usePhotoCapture } from '../hooks/usePhotoCapture';

interface CameraActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (base64: string, sizeBytes?: number) => void;
  onError?: (message: string) => void;
  title?: string;
}

export const CameraActionSheet: React.FC<CameraActionSheetProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  onError,
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  const { isProcessing, processingStatus, handleFileInputChange } = usePhotoCapture({
    onPhotoCaptured,
    onSuccess: onClose,
    onError,
  });

  useEffect(() => {
    if (!isOpen) return;
    setDragY(0);
    setIsDragging(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      BlobRegistry.clearAll();
    };
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isProcessing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    // Apply drag threshold so normal taps on <label> never trigger state re-renders mid-tap
    if (diff > 6) {
      if (!isDragging) setIsDragging(true);
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 70 && !isProcessing) {
      triggerHaptic('light');
      BlobRegistry.clearAll();
      onClose();
    }
    setIsDragging(false);
    setDragY(0);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs animate-fade-in select-none"
      onClick={() => {
        if (!isProcessing) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xs sm:max-w-sm mx-auto pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:pb-0 pointer-events-none animate-sheet-surface">
        {/* Main Action Group Card - With Swipe-Down to Dismiss */}
        <div
          className={`bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto touch-pan-y ${
            isDragging ? '' : 'transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]'
          }`}
          style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : 'none' }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Subtle Pull Indicator Bar */}
          <div className="w-full pt-2.5 pb-1 flex justify-center bg-white cursor-grab">
            <div className="w-9 h-1 rounded-full bg-slate-300/80" />
          </div>

          <div>
            {isProcessing ? (
              <div className="h-28 flex flex-col items-center justify-center gap-2 text-[#636366] bg-white px-4 text-center">
                <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
                <span className="text-xs font-semibold text-[#1C1C1E]">
                  {processingStatus}
                </span>
              </div>
            ) : (
              <>
                {/* Action 1: Direct Rear Camera (Android / supported devices) */}
                <label
                  className="pressable w-full h-13 px-4 flex items-center justify-center gap-2.5 text-center bg-white hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors select-none text-[#1C1C1E] text-sm sm:text-[15px] font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-[#007AFF]/30"
                  onClick={() => triggerHaptic('light')}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileInputChange}
                    className="sr-only"
                  />
                  <Camera className="w-5 h-5 text-[#1C1C1E] stroke-[1.9] shrink-0" />
                  <span className="text-center">Ambil foto</span>
                </label>

                <div className="mx-4 h-px bg-slate-100" />

                {/* Action 2: Direct Gallery / File Picker */}
                <label
                  className="pressable w-full h-13 px-4 flex items-center justify-center gap-2.5 text-center bg-white hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors select-none text-[#1C1C1E] text-sm sm:text-[15px] font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-[#007AFF]/30"
                  onClick={() => triggerHaptic('light')}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="sr-only"
                  />
                  <ImageIcon className="w-5 h-5 text-[#1C1C1E] stroke-[1.9] shrink-0" />
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
