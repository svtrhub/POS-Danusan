import React, { useMemo, useState } from 'react';
import {
  QrCode,
  Banknote,
  Camera,
  Eye,
  Trash2,
  ShoppingBag,
  Plus,
  Minus,
  Loader2,
} from 'lucide-react';
import { Product } from '../types';
import { CameraActionSheet } from './CameraActionSheet';
import { NumericQuantityInput } from './NumericQuantityInput';
import { triggerHaptic } from '../utils/haptics';
import { BlobRegistry } from '../utils/blobRegistry';
import { isIOSDevice } from '../utils/device';
import { usePhotoCapture } from '../hooks/usePhotoCapture';

interface TabletOrderPanelProps {
  products: Product[];
  cart: { [productId: string]: number };
  totalQty: number;
  netTotal: number;
  paymentMethod: 'QRIS' | 'Cash';
  photoBase64: string;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onPaymentChange: (method: 'QRIS' | 'Cash') => void;
  onPhotoCaptured: (base64: string, sizeBytes?: number) => void;
  onPhotoError?: (message: string) => void;
  onViewPhoto: () => void;
  onSubmit: () => void;
}

export const TabletOrderPanel: React.FC<TabletOrderPanelProps> = ({
  products,
  cart,
  totalQty,
  netTotal,
  paymentMethod,
  photoBase64,
  onIncrement,
  onDecrement,
  onQuantityChange,
  onClearCart,
  onPaymentChange,
  onPhotoCaptured,
  onPhotoError,
  onViewPhoto,
  onSubmit,
}) => {
  const activeItems = products
    .filter((p) => (cart[p.id] || 0) > 0)
    .map((p) => ({
      product: p,
      quantity: cart[p.id],
      subtotal: p.price * cart[p.id],
    }));

  const isPhotoRequired = paymentMethod === 'QRIS';
  const hasPhoto = Boolean(photoBase64);
  const isSubmitDisabled = totalQty === 0 || (isPhotoRequired && !hasPhoto);

  let submitButtonText = 'Simpan Pesanan';
  if (totalQty === 0) {
    submitButtonText = 'Pilih Menu';
  } else if (isPhotoRequired && !hasPhoto) {
    submitButtonText = 'Wajib Foto Bukti QRIS';
  }

  const [isCameraActionOpen, setIsCameraActionOpen] = useState(false);
  const isIOS = useMemo(() => isIOSDevice(), []);

  const { isProcessing, handleFileInputChange } = usePhotoCapture({
    onPhotoCaptured,
    onError: onPhotoError,
  });

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    triggerHaptic('checkout');
    onSubmit();
  };

  return (
    <aside className="hidden md:flex flex-col w-[360px] lg:w-[380px] shrink-0 h-full max-h-full overflow-hidden bg-white shadow-[-1px_0_0_rgba(0,0,0,0.04)] select-none">
      {/* Top Header of Sidebar (Clean typography without duplicate logo) */}
      <div className="h-12 px-4 flex items-center justify-between bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] shrink-0 select-none">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <h2 className="text-[14px] font-semibold text-[#1C1C1E] tracking-[-0.01em] whitespace-nowrap">
            Pesanan Kasir
          </h2>
          <span aria-hidden="true" className="text-[#C7C7CC] text-xs">
            ·
          </span>
          <span className="text-xs text-[#636366] font-mono tabular-nums whitespace-nowrap">
            {totalQty} item
          </span>
        </div>

        {/* Clean Destructive Text Reset Action */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (totalQty === 0 && !hasPhoto) return;
            triggerHaptic('warning');
            onClearCart();
          }}
          disabled={totalQty === 0 && !hasPhoto}
          className={`pressable h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            totalQty > 0 || hasPhoto
              ? 'text-[#FF3B30] hover:bg-rose-50'
              : 'opacity-40 text-[#8E8E93] cursor-not-allowed pointer-events-none'
          }`}
          title={totalQty > 0 || hasPhoto ? 'Reset Semua Pesanan & Bukti' : 'Keranjang Kosong'}
          aria-label="Reset Keranjang"
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          <span>Reset</span>
        </button>
      </div>

      {/* Itemized Order List (Borderless soft-fill rows) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {activeItems.length > 0 ? (
          activeItems.map(({ product, quantity, subtotal }) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F2F7]/80"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-[13px] font-semibold text-[#1C1C1E] truncate tracking-[-0.01em]">
                  {product.name}
                </div>
                <div className="text-[11px] text-[#636366] num">
                  @ Rp {product.price.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onDecrement(product.id);
                    }}
                    className="pressable w-6 h-6 rounded flex items-center justify-center text-[#636366] hover:text-[#1C1C1E] hover:bg-[#F2F2F7]"
                    aria-label="Kurang satu"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <NumericQuantityInput
                    quantity={quantity}
                    onQuantityChange={(qty) => onQuantityChange(product.id, qty)}
                    ariaLabel={`Jumlah ${product.name}`}
                    className="w-7 h-6 text-center text-xs font-bold text-[#007AFF] num rounded bg-transparent focus:bg-[#EAF3FF] focus:ring-2 focus:ring-[#007AFF]/25 outline-none transition-colors selection:bg-blue-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('cart_add');
                      onIncrement(product.id);
                    }}
                    className="pressable w-6 h-6 rounded flex items-center justify-center text-[#636366] hover:text-[#1C1C1E] hover:bg-[#F2F2F7]"
                    aria-label="Tambah satu"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-16 text-right text-xs font-bold text-[#1C1C1E] num">
                  Rp {subtotal.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center p-4 text-[#8E8E93]">
            <div className="w-10 h-10 rounded-2xl bg-[#F2F2F7] flex items-center justify-center mb-2">
              <ShoppingBag className="w-5 h-5 text-[#8E8E93] stroke-[1.7]" />
            </div>
            <p className="text-xs font-semibold text-[#1C1C1E]">Keranjang Kosong</p>
            <p className="text-[11px] text-[#636366] mt-0.5">
              Ketuk menu di sebelah kiri untuk menambah item
            </p>
          </div>
        )}
      </div>

      {/* Pinned Bottom Payment Section */}
      <div className="p-3.5 bg-[#F2F2F7]/75 shadow-[0_-1px_0_rgba(0,0,0,0.04)] space-y-2.5 shrink-0 mt-auto">
        {/* Payment Method Switch & Proof Camera */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <div className="grid grid-cols-2 bg-[#E5E5EA]/80 p-0.5 rounded-xl h-10">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onPaymentChange('QRIS');
                window.dispatchEvent(new CustomEvent('open-qris'));
              }}
              className={`pressable flex items-center justify-center gap-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
                paymentMethod === 'QRIS'
                  ? 'bg-white text-[#007AFF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#636366] hover:text-[#1C1C1E]'
              }`}
              title="Pilih QRIS (Tampilkan Barcode QRIS)"
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

          {/* Camera Proof Selector (1-tap native sheet on iPadOS/iOS, Action Sheet on Android/Desktop) */}
          <div className="flex items-center gap-1.5">
            {hasPhoto ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onViewPhoto();
                  }}
                  className="pressable h-10 px-2 rounded-xl bg-white text-[#1C1C1E] flex items-center gap-1.5 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-slate-50 transition-colors"
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
                    className={`pressable h-10 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#1C1C1E] text-xs font-medium flex items-center gap-1 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer focus-within:ring-2 focus-within:ring-[#007AFF]/40 ${
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
                    className="pressable h-10 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#1C1C1E] text-xs font-medium flex items-center gap-1 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
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
                className={`pressable h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus-within:ring-2 focus-within:ring-[#007AFF]/40 ${
                  isPhotoRequired && totalQty > 0
                    ? 'bg-[#007AFF] text-white hover:bg-[#0062E0] shadow-[0_2px_8px_rgba(0,122,255,0.22)]'
                    : 'bg-white text-[#1C1C1E] hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className={`w-4 h-4 ${isPhotoRequired && totalQty > 0 ? 'text-white' : 'text-[#636366]'}`} />
                )}
                <span>
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
                className={`pressable h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isPhotoRequired && totalQty > 0
                    ? 'bg-[#007AFF] text-white hover:bg-[#0062E0] shadow-[0_2px_8px_rgba(0,122,255,0.22)]'
                    : 'bg-white text-[#1C1C1E] hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                }`}
                title={isPhotoRequired ? 'Lampirkan Bukti QRIS (Wajib)' : 'Lampirkan Bukti Tunai (Opsional)'}
              >
                <Camera className={`w-4 h-4 ${isPhotoRequired && totalQty > 0 ? 'text-white' : 'text-[#636366]'}`} />
                <span>{paymentMethod === 'QRIS' ? 'Bukti QRIS' : 'Bukti (Opsional)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Submit Order Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`pressable w-full h-12 rounded-xl font-semibold flex items-center justify-between px-4 transition-colors select-none ${
            isSubmitDisabled
              ? 'bg-[#E5E5EA] text-[#8E8E93] cursor-not-allowed'
              : 'bg-[#007AFF] hover:bg-[#0062E0] text-white shadow-[0_2px_10px_rgba(0,122,255,0.2)]'
          }`}
        >
          <span className="text-[14px] font-semibold tracking-[-0.01em]">
            {submitButtonText}
          </span>
          <span className="text-[15px] font-bold num tracking-tight">
            Rp {Number(netTotal || 0).toLocaleString('id-ID')}
          </span>
        </button>
      </div>

      {/* Camera & Gallery Action Sheet (Android & Desktop only) */}
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
    </aside>
  );
};
