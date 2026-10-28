import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Upload,
  RotateCcw,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import { Product } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { DEFAULT_QRIS_DATA } from '../assets/defaultQrisData';

interface SettingsModalProps {
  isOpen: boolean;
  apiUrl: string;
  products: Product[];
  customQrisImage?: string;
  onClose: () => void;
  onSave: (newUrl: string, updatedProducts: Product[]) => Promise<void>;
  onOpenHistory?: () => void;
  onSaveQrisImage?: (base64: string) => void;
  onResetQrisImage?: () => void;
  onPullSheet?: (targetUrl?: string) => Promise<Product[] | null>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  apiUrl,
  products,
  customQrisImage,
  onClose,
  onSave,
  onOpenHistory,
  onSaveQrisImage,
  onResetQrisImage,
}) => {
  const [urlInput, setUrlInput] = useState(apiUrl);
  const [editorProducts, setEditorProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const qrisInputRef = React.useRef<HTMLInputElement | null>(null);

  // Initialize editor list when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setUrlInput(apiUrl);
      setEditorProducts(JSON.parse(JSON.stringify(products)));
      setFeedback(null);
    }
  }, [isOpen, apiUrl, products]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    triggerHaptic('light');
    setEditorProducts([
      ...editorProducts,
      {
        id: 'p' + Date.now(),
        name: '',
        original_name: '',
        price: 5000,
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    triggerHaptic('warning');
    setEditorProducts(editorProducts.filter((_: Product, i: number) => i !== idx));
  };

  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        if (onSaveQrisImage) {
          onSaveQrisImage(ev.target.result);
          triggerHaptic('success');
          setFeedback({ type: 'success', message: 'Gambar QRIS (WebP) berhasil disimpan!' });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFieldChange = (idx: number, field: 'name' | 'price', value: string | number) => {
    const next = [...editorProducts];
    if (field === 'name') {
      next[idx].name = String(value);
      if (!next[idx].original_name) next[idx].original_name = String(value);
    } else {
      next[idx].price = Math.max(0, parseInt(String(value), 10) || 0);
    }
    setEditorProducts(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    const cleaned = editorProducts
      .filter((p: Product) => p.name.trim() !== '')
      .map((p: Product) => ({
        ...p,
        name: p.name.trim(),
        original_name: p.original_name || p.name.trim(),
        price: Number(p.price) || 0,
      }));

    try {
      await onSave(urlInput.trim(), cleaned.length > 0 ? cleaned : products);
      triggerHaptic('success');
      setFeedback({ type: 'success', message: 'Pengaturan & Menu berhasil disimpan!' });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      triggerHaptic('warning');
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  /* 
   * FITUR DIARSIPKAN: handlePull
   * const handlePull = async () => { ... }
   * Fitur Tarik Sheet diarsipkan sesuai permintaan pengguna tanpa menghapus skrip backend.
   */

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Modal Surface */}
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Pengaturan &amp; Menu
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95 before:content-[''] before:absolute before:-inset-2 before:z-10 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Status Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Section 0: Open Transaction History */}
          {onOpenHistory && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenHistory();
              }}
              className="pressable w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 hover:border-blue-300 text-left flex items-center justify-between gap-3 shadow-2xs transition group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#007AFF] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                  Riwayat Transaksi
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-[#007AFF] shrink-0">
                <span>Buka</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          )}

          {/* Section 1: URL Apps Script */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              URL AKTIVASI (APPS SCRIPT)
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Section 2: QRIS Merchant */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <QrCode className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>GAMBAR QRIS</span>
            </label>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-14 h-18 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-2xs">
                  <img
                    src={customQrisImage || DEFAULT_QRIS_DATA}
                    alt="QRIS"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="cursor-pointer select-none pressable w-full h-9 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>Ganti Gambar QRIS</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrisFileChange}
                      className="sr-only"
                    />
                  </label>

                  {customQrisImage && customQrisImage !== DEFAULT_QRIS_DATA && onResetQrisImage && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('warning');
                        onResetQrisImage();
                        setFeedback({ type: 'success', message: 'Kembali ke QRIS bawaan.' });
                      }}
                      className="pressable w-full h-7 px-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Kembalikan ke Bawaan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Menu Editor */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                Daftar Menu &amp; Harga
              </label>
              <span className="text-xs text-slate-400 num">
                {editorProducts.length} item
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto px-0.5">
              {editorProducts.map((item: Product, idx: number) => (
                <div
                  key={item.id || idx}
                  className="grid grid-cols-[1fr_96px_36px] gap-1.5 items-center w-full"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                    placeholder="Nama Barang"
                    className="min-w-0 w-full h-10 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  <div className="relative min-w-0 w-[96px] shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleFieldChange(idx, 'price', e.target.value)}
                      placeholder="Harga"
                      className="h-10 pl-6 pr-2 w-full rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-right text-slate-800 num focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    className="pressable w-9 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 transition active:scale-90 touch-manipulation"
                    title="Hapus Menu"
                    aria-label="Hapus Menu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="pressable w-full h-10 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.99] touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris Menu</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-black/8 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="pressable w-full h-11 rounded-xl bg-[#007AFF] hover:bg-[#0062E0] active:scale-[0.985] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 touch-manipulation"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan & Sinkron'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
