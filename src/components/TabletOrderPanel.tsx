import React, { useState } from 'react';
import { Camera, QrCode, Banknote, Eye } from 'lucide-react';
import { CameraActionSheet } from './CameraActionSheet';
import { triggerHaptic } from '../utils/haptics';
import { BlobRegistry } from '../utils/blobRegistry';

interface PaymentDockProps {
  totalQty: number;
  netTotal: number;
  paymentMethod: 'QRIS' | 'Cash';
  photoBase64: string;
  onPaymentChange: (method: 'QRIS' | 'Cash') => void;
  onPhotoCaptured: (base64: string, sizeBytes?: number) => void;
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
  onViewPhoto,
  onSubmit,
}) => {
  const [isCameraActionOpen, setIsCameraActionOpen] = useState(false);

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
    <section className="md:hidden fixed left-0 right-0 bottom-0 z-40 bg-white/85 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-12px_28px_rgba(15,23,42,0.06)] pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-xl mx-auto flex flex-col gap-2.5 px-3 pt-3 pb-1">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <div className="grid grid-cols-2 bg-[#E8EBF0] p-0.5 rounded-2xl h-11 border border-slate-200/80 select-none touch-manipulation">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onPaymentChange('QRIS');
              }}
              className={`pressable flex items-center justify-center gap-1.5 rounded-[14px] text-xs font-bold transition-all active:scale-[0.98] ${
                paymentMethod === 'QRIS'
                  ? 'bg-white text-[#007AFF] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`pressable flex items-center justify-center gap-1.5 rounded-[14px] text-xs font-semibold transition-all active:scale-[0.98] ${
                paymentMethod === 'Cash'
                  ? 'bg-white text-[#007AFF] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Tunai</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 select-none touch-manipulation">
            {hasPhoto ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onViewPhoto();
                  }}
                  className="pressable h-11 px-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center gap-1.5 text-[11px] font-semibold shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:bg-slate-200/80"
                  title="Lihat Bukti Pembayaran"
                >
                  <img
                    src={photoBase64}
                    alt="Bukti pembayaran"
                    className="w-6 h-6 rounded-md object-cover border border-slate-200"
                  />
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsCameraActionOpen(true);
                  }}
                  className="pressable h-11 px-2.5 rounded-xl bg-[#F5F5F7] hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition"
                  title="Ganti Bukti (Kamera / Galeri)"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ganti</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsCameraActionOpen(true);
                }}
                className={`pressable h-11 px-3 sm:px-3.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition active:scale-[0.98] ${
                  isPhotoRequired && totalQty > 0
                    ? 'bg-[#007AFF] text-white border-[#007AFF] hover:bg-blue-600 shadow-[0_8px_16px_rgba(0,122,255,0.18)]'
                    : 'bg-[#F5F5F7] text-slate-700 border-slate-200 hover:bg-slate-200/80'
                }`}
                title={isPhotoRequired ? 'Lampirkan Bukti QRIS (Wajib)' : 'Lampirkan Bukti Tunai (Opsional)'}
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{paymentMethod === 'QRIS' ? 'Bukti QRIS' : 'Bukti'}</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`pressable w-full h-12 rounded-2xl font-bold flex items-center justify-between px-3.5 sm:px-4 transition duration-100 select-none touch-manipulation ${
            isSubmitDisabled
              ? 'bg-[#E5E5EA] text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-[#007AFF] hover:bg-[#0062E0] active:scale-[0.985] text-white shadow-[0_8px_16px_rgba(0,122,255,0.18)]'
          }`}
        >
          <span className="text-[13px] sm:text-[14px] font-bold tracking-[-0.02em] truncate min-w-0 pr-2">
            {submitButtonText}
          </span>
          <span className="text-[14px] sm:text-[15px] font-extrabold num tracking-[-0.03em] shrink-0 whitespace-nowrap">
            Rp {Number(netTotal || 0).toLocaleString('id-ID')}
          </span>
        </button>
      </div>

      <CameraActionSheet
        isOpen={isCameraActionOpen}
        onClose={() => {
          BlobRegistry.clearAll();
          setIsCameraActionOpen(false);
        }}
        onPhotoCaptured={onPhotoCaptured}
        title={paymentMethod === 'QRIS' ? 'Bukti Pembayaran QRIS' : 'Bukti Pembayaran Tunai'}
      />
    </section>
  );
};
