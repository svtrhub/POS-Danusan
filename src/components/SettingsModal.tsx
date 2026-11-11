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
  ZapOff,
} from 'lucide-react';
import { Product } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { DEFAULT_QRIS_DATA } from '../assets/defaultQrisData';
import { APP_LOGO_DATA } from '../assets/logo';

interface SettingsModalProps {
  isOpen: boolean;
  apiUrl: string;
  products: Product[];
  customQrisImage?: string;
  isBatterySaver?: boolean;
  onClose: () => void;
  onSave: (newUrl: string, updatedProducts: Product[]) => Promise<void>;
  onOpenHistory?: () => void;
  onSaveQrisImage?: (base64: string) => void;
  onResetQrisImage?: () => void;
  onToggleBatterySaver?: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  apiUrl,
  products,
  customQrisImage,
  isBatterySaver = false,
  onClose,
  onSave,
  onOpenHistory,
  onSaveQrisImage,
  onResetQrisImage,
  onToggleBatterySaver,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Modal Surface */}
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img
              src={APP_LOGO_DATA}
              alt="Logo AYO DANUSAN!"
              className="w-7 h-7 rounded-lg object-contain border border-black/[0.04] bg-white shrink-0"
            />
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
              className="pressable w-full py-3 px-1 border-b border-black/[0.06] text-left flex items-center justify-between gap-3 transition hover:bg-black/[0.02]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-900 truncate">
                  Riwayat Transaksi
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          )}

          {/* Section: Mode Hemat Baterai (NO redundant metatext, NO nested card) */}
          <div className="py-3 px-1 border-b border-black/[0.06] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <ZapOff className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-900">
                Mode Hemat Baterai
              </span>
            </div>

            {/* Apple iOS Style Switch Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(isBatterySaver)}
              onClick={() => {
                triggerHaptic('medium');
                if (onToggleBatterySaver) {
                  onToggleBatterySaver(!isBatterySaver);
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 touch-manipulation ${
                isBatterySaver ? 'bg-[#007AFF]' : 'bg-slate-200'
              }`}
              title="Mode Hemat Baterai"
              aria-label="Toggle Mode Hemat Baterai"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  isBatterySaver ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Section 1: URL Apps Script */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-slate-500">
              URL Apps Script
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-black/[0.08] text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white transition"
            />
          </div>

          {/* Section 2: QRIS Merchant */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-slate-500">
              Gambar QRIS
            </label>

            <div className="p-2.5 border border-black/[0.06] rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 bg-white border border-black/[0.06] rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1">
                  <img
                    src={customQrisImage || DEFAULT_QRIS_DATA}
                    alt="QRIS"
                    className="w-full h-full object-contain rounded"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="cursor-pointer select-none pressable w-full h-8 px-3 rounded-lg bg-white hover:bg-slate-50 border border-black/[0.08] text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition active:scale-98">
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
                      className="pressable w-full h-7 px-2 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition"
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
              <label className="text-xs font-medium text-slate-500">
                Daftar Menu &amp; Harga
              </label>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
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
                    className="min-w-0 w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-black/[0.08] text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white transition"
                  />
                  <div className="relative min-w-0 w-[96px] shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleFieldChange(idx, 'price', e.target.value)}
                      placeholder="Harga"
                      className="h-9 pl-7 pr-2 w-full rounded-lg bg-slate-50 border border-black/[0.08] text-xs font-medium text-right text-slate-800 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    className="pressable w-8 h-9 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition active:scale-90 touch-manipulation"
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
              className="pressable w-full h-9 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-[#007AFF] text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-98 touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris Menu</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-black/[0.06] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="pressable w-full h-11 rounded-xl bg-[#007AFF] hover:bg-[#0062E0] active:scale-[0.985] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition disabled:opacity-50 touch-manipulation"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan & Sinkron'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
