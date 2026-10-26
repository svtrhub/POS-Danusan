import React, { useState, useRef } from 'react';
import { Camera, QrCode, Banknote, Eye } from 'lucide-react';
import { DiscountDrawer } from './DiscountDrawer';
import { CameraActionSheet } from './CameraActionSheet';
import { triggerHaptic } from '../utils/haptics';
import { compressImageToJpeg } from '../utils/media';

interface PaymentDockProps {
  totalQty: number;
  netTotal: number;
  paymentMethod: 'QRIS' | 'Cash';
  photoBase64: string;
  discountEnabled: boolean;
  discount: number;
  onPaymentChange: (method: 'QRIS' | 'Cash') => void;
  onPhotoCaptured: (base64: string) => void;
  onViewPhoto: () => void;
  onToggleDiscount: (enabled: boolean) => void;
  onSelectDiscountPreset: (amount: number) => void;
  onCustomDiscountChange: (amount: number) => void;
  onSubmit: () => void;
}

export const PaymentDock: React.FC<PaymentDockProps> = ({
  totalQty,
  netTotal,
  paymentMethod,
  photoBase64,
  discountEnabled,
  discount,
  onPaymentChange,
  onPhotoCaptured,
  onViewPhoto,
  onToggleDiscount,
  onSelectDiscountPreset,
  onCustomDiscountChange,
  onSubmit,
}) => {
  const [isCameraActionOpen, setIsCameraActionOpen] = useState(false);

  const hasPhoto = Boolean(photoBase64);
  const isSubmitDisabled = totalQty === 0 || !hasPhoto;

  let submitButtonText = 'Pilih Menu';
  if (totalQty > 0) {
    if (!hasPhoto) {
      submitButtonText = `${totalQty} barang · Lampirkan Bukti`;
    } else {
      submitButtonText = `${totalQty} barang · Simpan Pesanan`;
    }
  }

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    triggerHaptic('success');
    onSubmit();
  };

  return (
    <section className="md:hidden fixed left-0 right-0 bottom-0 z-40 bg-white border-t border-black/8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[calc(10px+env(safe-area-inset-bottom,10px))] pt-2.5 px-3.5">
      <div className="max-w-xl mx-auto flex flex-col gap-2">
        {/* Discount Disclosure Row */}
        <DiscountDrawer
          enabled={discountEnabled}
          discount={discount}
          onToggle={onToggleDiscount}
          onSelectPreset={onSelectDiscountPreset}
          onCustomChange={onCustomDiscountChange}
        />

        {/* Controls Row: Apple Inset Segmented Payment & Camera */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          {/* iOS UISegmentedControl for Payment */}
          <div className="grid grid-cols-2 bg-[#E5E5EA] p-0.5 rounded-xl h-10 border border-black/5 select-none touch-manipulation">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onPaymentChange('QRIS');
              }}
              className={`pressable flex items-center justify-center gap-1.5 rounded-[10px] text-xs font-bold transition-all active:scale-[0.98] ${
                paymentMethod === 'QRIS'
                  ? 'bg-white text-[#007AFF] shadow-xs'
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
              className={`pressable flex items-center justify-center gap-1.5 rounded-[10px] text-xs font-bold transition-all active:scale-[0.98] ${
                paymentMethod === 'Cash'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Tunai</span>
            </button>
          </div>

          {/* Native Media Selector (Camera & Gallery Action Sheet) */}
          <div className="flex items-center gap-1.5 shrink-0 select-none touch-manipulation">
            {hasPhoto ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onViewPhoto();
                  }}
                  className="pressable h-10 px-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1 text-xs font-bold shadow-2xs hover:bg-emerald-100 transition active:scale-95"
                  title="Lihat Bukti Pembayaran"
                >
                  <img
                    src={photoBase64}
                    alt="Bukti pembayaran"
                    className="w-6 h-6 rounded-md object-cover border border-emerald-300"
                  />
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsCameraActionOpen(true);
                  }}
                  className="pressable h-10 px-2.5 rounded-xl bg-[#F2F2F7] hover:bg-slate-200/80 border border-black/5 text-slate-700 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
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
                className={`pressable h-10 px-3 sm:px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition active:scale-[0.98] shadow-2xs ${
                  totalQty > 0
                    ? 'bg-[#007AFF] text-white border-[#007AFF] hover:bg-blue-600 animate-pulse'
                    : 'bg-blue-50/90 text-[#007AFF] border-blue-200/80 hover:bg-blue-100'
                }`}
                title="Lampirkan Bukti (Kamera / Galeri)"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{paymentMethod === 'QRIS' ? 'Bukti QRIS' : 'Bukti Tunai'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Apple Native Standard Minimalist Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`pressable w-full h-12 rounded-xl font-bold flex items-center justify-between px-3.5 sm:px-4 transition duration-100 select-none touch-manipulation ${
            isSubmitDisabled
              ? 'bg-[#E5E5EA] text-slate-400 cursor-not-allowed border border-black/5'
              : 'bg-[#007AFF] hover:bg-[#0062E0] active:scale-[0.985] text-white shadow-sm'
          }`}
        >
          <span className="text-[13px] sm:text-[14px] font-bold tracking-tight truncate min-w-0 pr-2">
            {submitButtonText}
          </span>
          <span className="text-[14px] sm:text-[15px] font-extrabold num tracking-tight shrink-0 whitespace-nowrap">
            Rp {Number(netTotal || 0).toLocaleString('id-ID')}
          </span>
        </button>
      </div>

      {/* Camera & Gallery Action Sheet */}
      <CameraActionSheet
        isOpen={isCameraActionOpen}
        onClose={() => setIsCameraActionOpen(false)}
        onPhotoCaptured={onPhotoCaptured}
        title={paymentMethod === 'QRIS' ? 'Bukti Pembayaran QRIS' : 'Bukti Pembayaran Tunai'}
      />
    </section>
  );
};
