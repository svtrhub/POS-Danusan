import React, { useMemo, useState } from 'react';
import { Camera, QrCode, Banknote, Eye, Loader2 } from 'lucide-react';
import { CameraActionSheet } from './CameraActionSheet';
import { triggerHaptic } from '../utils/haptics';
import { BlobRegistry } from '../utils/blobRegistry';
import { isIOSDevice } from '../utils/device';
import { usePhotoCapture } from '../hooks/usePhotoCapture';

interface PaymentDockProps {
  totalQty: number;
  netTotal: number;
  paymentMethod: 'QRIS' | 'Cash';
  photoBase64: string;
  onPaymentChange: (method: 'QRIS' | 'Cash') => void;
  onPhotoCaptured: (base64: string, sizeBytes?: number) => void;
  onPhotoError?: (message: string) => void;
  onViewPhoto: () => void;
  onSubmit: () => void;
}

export const PaymentDock: React.FC<PaymentDockProps> = ({
  totalQty,
  netTotal,
  paymentMethod,
  photoBase64,
  onPaymentChange,
  onPhotoCaptured,
  onPhotoError,
  onViewPhoto,
  onSubmit,
}) => {
  const [isCameraActionOpen, setIsCameraActionOpen] = useState(false);
  const isIOS = useMemo(() => isIOSDevice(), []);

  const { isProcessing, handleFileInputChange } = usePhotoCapture({
    onPhotoCaptured,
    onError: onPhotoError,
  });

  const isPhotoRequired = paymentMethod === 'QRIS';
  const hasPhoto = Boolean(photoBase64);
  const isSubmitDisabled = totalQty === 0 || (isPhotoRequired && !hasPhoto);

  let submitButtonText = 'Pilih Menu';
  if (totalQty > 0) {
    if (isPhotoRequired && !hasPhoto) {
      submitButtonText = `${totalQty} barang · Bukti QRIS`;
    } else {
      submitButtonText = `${totalQty} barang · Simpan Pesanan`;
    }
  }

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    triggerHaptic('checkout');
    onSubmit();
  };

  return (
    <section className="md:hidden fixed left-0 right-0 bottom-0 z-40 bg-white/90 backdrop-blur-md shadow-[0_-1px_0_rgba(0,0,0,0.05)] pb-[calc(10px+env(safe-area-inset-bottom,10px))] pt-2.5 px-3.5">
      <div className="max-w-xl mx-auto flex flex-col gap-2">
        {/* Controls Row: Apple Inset Segmented Payment & Camera */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          {/* iOS UISegmentedControl for Payment */}
          <div className="grid grid-cols-2 bg-[#E5E5EA]/80 p-0.5 rounded-xl h-10 select-none touch-manipulation">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onPaymentChange('QRIS');
              }}
              className={`pressable flex items-center justify-center gap-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
                paymentMethod === 'QRIS'
                  ? 'bg-white text-[#007AFF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#636366] hover:text-[#1C1C1E]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QRIS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onPaymentChange('Cash');
              }}
              className={`pressable flex items-center justify-center gap-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
                paymentMethod === 'Cash'
                  ? 'bg-white text-[#007AFF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#636366] hover:text-[#1C1C1E]'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Tunai</span>
            </button>
          </div>

          {/* Native Media Selector: 1-tap native sheet on iOS/iPadOS, custom Camera/Gallery split on Android/Desktop */}
          <div className="flex items-center gap-1.5 shrink-0 select-none touch-manipulation">
            {hasPhoto ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onViewPhoto();
                  }}
                  className="pressable h-10 px-2 rounded-xl bg-[#F2F2F7] text-[#1C1C1E] flex items-center gap-1.5 text-xs font-semibold hover:bg-[#E5E5EA]/70 transition-colors"
                  title="Lihat Bukti Pembayaran"
                >
                  <img
                    src={photoBase64}
                    alt="Bukti pembayaran"
                    className="w-6 h-6 rounded-md object-cover shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  />
                  <Eye className="w-3.5 h-3.5 text-[#636366]" />
                </button>

                {isIOS ? (
                  <label
                    onClick={() => triggerHaptic('light')}
                    className={`pressable h-10 px-2.5 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA]/70 text-[#1C1C1E] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-[#007AFF]/40 ${
                      isProcessing ? 'opacity-75 pointer-events-none' : ''
                    }`}
                    title="Ganti Bukti (Kamera / Galeri)"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isProcessing}
                      onChange={handleFileInputChange}
                      className="sr-only"
                    />
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#007AFF] animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-[#636366]" />
                    )}
                    <span>{isProcessing ? 'Proses' : 'Ganti'}</span>
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsCameraActionOpen(true);
                    }}
                    className="pressable h-10 px-2.5 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA]/70 text-[#1C1C1E] text-xs font-medium flex items-center gap-1 transition-colors"
                    title="Ganti Bukti (Kamera / Galeri)"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#636366]" />
                    <span>Ganti</span>
                  </button>
                )}
              </div>
            ) : isIOS ? (
              <label
                onClick={() => triggerHaptic('light')}
                className={`pressable h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-[#007AFF]/40 ${
                  isPhotoRequired && totalQty > 0
                    ? 'bg-[#007AFF] text-white hover:bg-[#0062E0] shadow-[0_2px_8px_rgba(0,122,255,0.22)]'
                    : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]/70'
                } ${isProcessing ? 'opacity-80 pointer-events-none' : ''}`}
                title={isPhotoRequired ? 'Lampirkan Bukti QRIS (Wajib)' : 'Lampirkan Bukti Tunai (Opsional)'}
              >
                <input
                  type="file"
                  accept="image/*"
                  disabled={isProcessing}
                  onChange={handleFileInputChange}
                  className="sr-only"
                />
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 shrink-0" />
                )}
                <span className="whitespace-nowrap">
                  {isProcessing
                    ? 'Memproses...'
                    : paymentMethod === 'QRIS'
                      ? 'Bukti QRIS'
                      : 'Bukti (Opsional)'}
                </span>
              </label>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsCameraActionOpen(true);
                }}
                className={`pressable h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                  isPhotoRequired && totalQty > 0
                    ? 'bg-[#007AFF] text-white hover:bg-[#0062E0] shadow-[0_2px_8px_rgba(0,122,255,0.22)]'
                    : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]/70'
                }`}
                title={isPhotoRequired ? 'Lampirkan Bukti QRIS (Wajib)' : 'Lampirkan Bukti Tunai (Opsional)'}
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{paymentMethod === 'QRIS' ? 'Bukti QRIS' : 'Bukti (Opsional)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Apple Native Standard Minimalist Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`pressable w-full h-12 rounded-xl font-bold flex items-center justify-between px-3.5 sm:px-4 transition-colors select-none ${
            isSubmitDisabled
              ? 'bg-[#E5E5EA] text-[#8E8E93] cursor-not-allowed'
              : 'bg-[#007AFF] hover:bg-[#0062E0] text-white shadow-[0_2px_10px_rgba(0,122,255,0.2)]'
          }`}
        >
          <span className="text-[13px] sm:text-[14px] font-semibold tracking-[-0.01em] truncate min-w-0 pr-2">
            {submitButtonText}
          </span>
          <span className="text-[14px] sm:text-[15px] font-bold num tracking-tight shrink-0 whitespace-nowrap">
            Rp {Number(netTotal || 0).toLocaleString('id-ID')}
          </span>
        </button>
      </div>

      {/* Camera & Gallery Action Sheet (Android & Desktop only; iOS uses native single-tap sheet) */}
      {!isIOS && (
        <CameraActionSheet
          isOpen={isCameraActionOpen}
          onClose={() => {
            BlobRegistry.clearAll();
            setIsCameraActionOpen(false);
          }}
          onPhotoCaptured={onPhotoCaptured}
          onError={onPhotoError}
          title={paymentMethod === 'QRIS' ? 'Bukti Pembayaran QRIS' : 'Bukti Pembayaran Tunai'}
        />
      )}
    </section>
  );
};
