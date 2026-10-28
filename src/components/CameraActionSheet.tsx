import React, { useState } from 'react';
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

  if (!isOpen) return null;

  const handleProcessFile = async (file: File | undefined | null) => {
    if (!file) return;

    try {
      setIsProcessing(true);
      let base64 = '';
      try {
        base64 = await compressImageToJpeg(file);
      } catch (compressErr) {
        console.warn('Compression failed, using direct reader fallback:', compressErr);
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xs sm:max-w-sm mx-auto pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Action Group Card - Ultra Clean with exactly two action labels */}
        <div className="bg-white rounded-2xl shadow-2xl border border-black/8 overflow-hidden divide-y divide-black/6">
          {isProcessing ? (
            <div className="h-24 flex flex-col items-center justify-center gap-2 text-slate-600 bg-white">
              <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
              <span className="text-xs font-semibold text-slate-700">Memproses foto...</span>
            </div>
          ) : (
            <>
              {/* Action 1: Ambil foto via native label (Focused Element - Centered) */}
              <label
                className="pressable w-full h-14 px-4 flex items-center justify-center gap-2.5 text-center bg-white hover:bg-slate-50 active:bg-slate-100 transition select-none text-slate-800 text-sm sm:text-[15px] font-semibold touch-manipulation cursor-pointer"
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
                className="pressable w-full h-14 px-4 flex items-center justify-center gap-2.5 text-center bg-white hover:bg-slate-50 active:bg-slate-100 transition select-none text-slate-800 text-sm sm:text-[15px] font-semibold touch-manipulation cursor-pointer"
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
  );
};
