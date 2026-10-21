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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const base64 = await compressImageToJpeg(file);
      triggerHaptic('success');
      onPhotoCaptured(base64);
      onClose();
    } catch (err) {
      console.warn('Failed to process image:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm flex flex-col gap-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Action Group Card - Elegant Apple White */}
        <div className="bg-white rounded-2xl shadow-xl border border-black/8 overflow-hidden divide-y divide-black/6">
          {isProcessing ? (
            <div className="h-28 flex flex-col items-center justify-center gap-2 text-slate-600 bg-white">
              <Loader2 className="w-5 h-5 text-slate-800 animate-spin" />
              <span className="text-xs font-medium">Memproses foto...</span>
            </div>
          ) : (
            <>
              {/* Action 1: Ambil foto */}
              <label
                onClick={() => triggerHaptic('light')}
                className="pressable w-full h-14 px-4 flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition select-none text-slate-800 text-sm sm:text-[15px] font-semibold"
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <Camera className="w-5 h-5 text-slate-700 stroke-[2]" />
                <span>Ambil foto</span>
              </label>

              {/* Action 2: Pilih Galeri */}
              <label
                onClick={() => triggerHaptic('light')}
                className="pressable w-full h-14 px-4 flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition select-none text-slate-800 text-sm sm:text-[15px] font-semibold"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <ImageIcon className="w-5 h-5 text-slate-700 stroke-[2]" />
                <span>Pilih Galeri</span>
              </label>
            </>
          )}
        </div>

        {/* Action 3: Batal - Elegant Apple White */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          disabled={isProcessing}
          className="pressable w-full h-13 bg-white rounded-2xl shadow-lg border border-black/8 text-slate-800 text-sm sm:text-[15px] font-semibold flex items-center justify-center transition active:scale-[0.985] hover:bg-slate-50"
        >
          <span>Batal</span>
        </button>
      </div>
    </div>
  );
};
