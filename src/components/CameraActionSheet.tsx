import React, { useState, useRef } from 'react';
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
  title = 'Lampirkan Bukti Pembayaran',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File | undefined | null) => {
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
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    handleProcessFile(file);
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    handleProcessFile(file);
  };

  const triggerCameraInput = () => {
    triggerHaptic('light');
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  const triggerGalleryInput = () => {
    triggerHaptic('light');
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Hidden file inputs: separated to guarantee native camera trigger vs gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryChange}
        className="hidden"
        aria-hidden="true"
      />

      <div
        className="w-full max-w-sm flex flex-col gap-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Action Group Card - Apple ActionSheet styling */}
        <div className="bg-white rounded-2xl shadow-2xl border border-black/8 overflow-hidden divide-y divide-black/6">
          {/* Header Title */}
          <div className="py-2.5 px-4 text-center bg-slate-50/70 border-b border-black/5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
              {title}
            </span>
          </div>

          {isProcessing ? (
            <div className="h-28 flex flex-col items-center justify-center gap-2 text-slate-600 bg-white">
              <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
              <span className="text-xs font-semibold text-slate-700">Mengompres & memproses foto...</span>
            </div>
          ) : (
            <>
              {/* Action 1: Ambil Foto Langsung (Bypasses Gallery directly to Native Camera UI) */}
              <button
                type="button"
                onClick={triggerCameraInput}
                className="pressable w-full h-14 px-4 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 transition select-none text-slate-900 text-sm sm:text-[15px] font-semibold touch-manipulation"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-slate-900">Ambil foto</span>
                  <span className="text-[11px] text-slate-500 font-normal">Nyalakan kamera langsung</span>
                </div>
              </button>

              {/* Action 2: Pilih Galeri */}
              <button
                type="button"
                onClick={triggerGalleryInput}
                className="pressable w-full h-14 px-4 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 transition select-none text-slate-900 text-sm sm:text-[15px] font-semibold touch-manipulation"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-slate-900">Pilih Galeri</span>
                  <span className="text-[11px] text-slate-500 font-normal">Pilih screenshot / foto struk</span>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Action 3: Batal - Separate Apple Card */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          disabled={isProcessing}
          className="pressable w-full h-12 bg-white rounded-2xl shadow-lg border border-black/8 text-[#007AFF] text-sm sm:text-[15px] font-bold flex items-center justify-center transition active:scale-[0.985] hover:bg-slate-50 touch-manipulation"
        >
          <span>Batal</span>
        </button>
      </div>
    </div>
  );
};
