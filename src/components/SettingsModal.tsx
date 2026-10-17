import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Product } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface SettingsModalProps {
  isOpen: boolean;
  apiUrl: string;
  products: Product[];
  onClose: () => void;
  onSave: (newUrl: string, updatedProducts: Product[]) => Promise<void>;
  onPullSheet?: (targetUrl?: string) => Promise<Product[] | null>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  apiUrl,
  products,
  onClose,
  onSave,
}) => {
  const [urlInput, setUrlInput] = useState(apiUrl);
  const [editorProducts, setEditorProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    setEditorProducts(editorProducts.filter((_, i) => i !== idx));
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
      .filter((p) => p.name.trim() !== '')
      .map((p) => ({
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

          {/* Section 1: URL Apps Script */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                URL Web App (Apps Script)
              </label>
              <span className="text-[11px] text-blue-600 font-medium">Kolom I:M Sinkron</span>
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pastikan deployment Apps Script disetel dengan akses <strong>"Anyone"</strong> agar kasir dapat menyimpan pesanan tanpa login Google.
            </p>
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
              {editorProducts.map((item, idx) => (
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
                    className="w-9 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 transition"
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
              className="pressable w-full h-10 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris Menu</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-black/8 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="pressable w-full h-11 rounded-xl bg-[#007AFF] hover:bg-[#0062E0] active:scale-[0.985] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan & Sinkron'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
