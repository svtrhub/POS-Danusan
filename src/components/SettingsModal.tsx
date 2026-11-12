import React, { useState } from 'react';
import {
  QrCode,
  Banknote,
  Camera,
  Eye,
  Trash2,
  ShoppingBag,
  Plus,
  Minus,
} from 'lucide-react';
import { Product } from '../types';
import { CameraActionSheet } from './CameraActionSheet';
import { NumericQuantityInput } from './NumericQuantityInput';
import { triggerHaptic } from '../utils/haptics';
import { BlobRegistry } from '../utils/blobRegistry';
import { APP_LOGO_DATA } from '../assets/logo';

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

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    triggerHaptic('checkout');
    onSubmit();
  };

  return (
    <aside className="hidden md:flex flex-col w-[360px] lg:w-[380px] shrink-0 h-full max-h-full overflow-hidden bg-white/90 backdrop-blur-md border-l border-slate-200 select-none shadow-[0_0_0_1px_rgba(15,23,42,0.02)]">
      <div className="h-14 px-3.5 sm:px-4 flex items-center justify-between border-b border-slate-200/80 bg-white/90 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={APP_LOGO_DATA}
            alt="Logo AYO DANUSAN!"
            className="w-6 h-6 rounded-md object-contain border border-slate-200 bg-white shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-slate-900 tracking-[-0.02em]">
              Pesanan Kasir
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {totalQty} item
          </span>
        </div>

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
          className={`pressable h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold transition-all touch-manipulation ${
            totalQty > 0 || hasPhoto
              ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-95'
              : 'opacity-40 text-slate-400 border border-transparent cursor-not-allowed pointer-events-none'
          }`}
          title={totalQty > 0 || hasPhoto ? 'Reset Semua Pesanan & Bukti' : 'Keranjang Kosong'}
          aria-label="Reset Keranjang"
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          <span>Reset</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {activeItems.length > 0 ? (
          activeItems.map(({ product, quantity, subtotal }) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-[12px] font-bold text-slate-800 truncate tracking-[-0.02em]">
                  {product.name}
                </div>
                <div className="text-[11px] text-slate-400 num">
                  @ Rp {product.price.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-0.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onDecrement(product.id);
                    }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90"
                    aria-label="Kurang satu"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <NumericQuantityInput
                    quantity={quantity}
                    onQuantityChange={(qty) => onQuantityChange(product.id, qty)}
                    ariaLabel={`Jumlah ${product.name}`}
                    className="w-7 h-6 text-center text-[11px] font-bold text-[#007AFF] num rounded bg-transparent focus:bg-blue-50 focus:ring-1 focus:ring-[#007AFF] outline-none transition selection:bg-blue-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('cart_add');
                      onIncrement(product.id);
                    }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90"
                    aria-label="Tambah satu"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-16 text-right text-[11px] font-extrabold text-slate-800 num tracking-[-0.02em]">
                  Rp {subtotal.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mb-1.5">
              <ShoppingBag className="w-5 h-5 text-slate-400 stroke-[1.7]" />
            </div>
            <p className="text-xs font-bold text-slate-600">Keranjang Kosong</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ketuk menu di sebelah kiri untuk menambah item
            </p>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50/90 border-t border-slate-200/80 space-y-2.5 shrink-0 mt-auto">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <div className="grid grid-cols-2 bg-[#E8EBF0] p-0.5 rounded-2xl h-10 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onPaymentChange('QRIS');
                window.dispatchEvent(new CustomEvent('open-qris'));
              }}
              className={`pressable flex items-center justify-center gap-1.5 rounded-[14px] text-[11px] font-bold transition-all active:scale-[0.98] ${
                paymentMethod === 'QRIS'
                  ? 'bg-white text-[#007AFF] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`pressable flex items-center justify-center gap-1.5 rounded-[14px] text-[11px] font-semibold transition-all active:scale-[0.98] ${
                paymentMethod === 'Cash'
                  ? 'bg-white text-[#007AFF] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Tunai</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {hasPhoto ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onViewPhoto();
                  }}
                  className="pressable h-10 px-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center gap-1 text-[11px] font-semibold shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:bg-slate-200/80"
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
                  className="pressable h-10 px-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition"
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
                className={`pressable h-10 px-3.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition ${
                  isPhotoRequired && totalQty > 0
                    ? 'bg-[#007AFF] text-white border-[#007AFF] hover:bg-blue-600 shadow-[0_8px_16px_rgba(0,122,255,0.18)]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={isPhotoRequired ? 'Lampirkan Bukti QRIS (Wajib)' : 'Lampirkan Bukti Tunai (Opsional)'}
              >
                <Camera className="w-4 h-4 text-slate-500" />
                <span>{paymentMethod === 'QRIS' ? 'Bukti QRIS' : 'Bukti'}</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`pressable w-full h-12 rounded-2xl font-bold flex items-center justify-between px-4 transition duration-100 select-none ${
            isSubmitDisabled
              ? 'bg-[#E5E5EA] text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-[#007AFF] hover:bg-[#0062E0] active:scale-[0.985] text-white shadow-[0_8px_16px_rgba(0,122,255,0.18)]'
          }`}
        >
          <span className="text-[14px] font-bold tracking-[-0.02em]">
            {submitButtonText}
          </span>
          <span className="text-[15px] font-extrabold num tracking-[-0.03em]">
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
    </aside>
  );
};
