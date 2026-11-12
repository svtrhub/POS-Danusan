import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  RotateCcw,
  Receipt,
  ChevronRight,
  ZapOff,
  RefreshCw,
  FileSpreadsheet,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Product, TeamDivision } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { DEFAULT_QRIS_DATA } from '../assets/defaultQrisData';
import { APP_LOGO_DATA } from '../assets/logo';
import { DEFAULT_MENU_SHEET_ID } from '../services/syncEngine';

interface SettingsModalProps {
  isOpen: boolean;
  apiUrl: string;
  products: Product[];
  customQrisImage?: string;
  isBatterySaver?: boolean;
  team?: TeamDivision;
  menuSheetId?: string;
  onClose: () => void;
  onSave: (newUrl: string, updatedProducts: Product[]) => Promise<void>;
  onTeamChange?: (team: TeamDivision) => void;
  onMenuSheetIdChange?: (sheetInput: string) => void;
  onFetchMenu?: (
    team: TeamDivision,
    sheetId?: string,
    existingProducts?: Product[]
  ) => Promise<Product[]>;
  onOpenHistory?: () => void;
  onSaveQrisImage?: (base64: string) => void;
  onResetQrisImage?: () => void;
  onToggleBatterySaver?: (enabled: boolean) => void;
}

const TEAMS: TeamDivision[] = ['Team A', 'Team B', 'Team C'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  apiUrl,
  products,
  customQrisImage,
  isBatterySaver = false,
  team = 'Team A',
  menuSheetId = DEFAULT_MENU_SHEET_ID,
  onClose,
  onSave,
  onTeamChange,
  onMenuSheetIdChange,
  onFetchMenu,
  onOpenHistory,
  onSaveQrisImage,
  onResetQrisImage,
  onToggleBatterySaver,
}) => {
  const [urlInput, setUrlInput] = useState(apiUrl);
  const [selectedTeam, setSelectedTeam] = useState<TeamDivision>(team);
  const [sheetIdInput, setSheetIdInput] = useState<string>(menuSheetId || DEFAULT_MENU_SHEET_ID);
  const [isSyncingMenu, setIsSyncingMenu] = useState(false);
  const [editorProducts, setEditorProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setUrlInput(apiUrl);
      setSelectedTeam(team);
      setSheetIdInput(menuSheetId || DEFAULT_MENU_SHEET_ID);
      setEditorProducts(JSON.parse(JSON.stringify(products)));
      setFeedback(null);
    }
  }, [isOpen, apiUrl, team, menuSheetId, products]);

  if (!isOpen) return null;

  const handleSelectTeam = async (newTeam: TeamDivision) => {
    triggerHaptic('light');
    setSelectedTeam(newTeam);
    if (onTeamChange) {
      onTeamChange(newTeam);
    }

    if (onFetchMenu) {
      setIsSyncingMenu(true);
      try {
        const fetched = await onFetchMenu(newTeam, sheetIdInput.trim(), editorProducts);
        if (fetched && fetched.length > 0) {
          setEditorProducts(fetched);
          setFeedback({
            type: 'success',
            message: `✓ Menu ${newTeam} berhasil dimuat (${fetched.length} item)`,
          });
          triggerHaptic('success');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal sinkron menu dari Sheet';
        setFeedback({ type: 'error', message: msg });
        triggerHaptic('warning');
      } finally {
        setIsSyncingMenu(false);
      }
    }
  };

  const handleSyncMenuClick = async () => {
    triggerHaptic('medium');
    if (!onFetchMenu) return;

    setIsSyncingMenu(true);
    setFeedback(null);
    try {
      const fetched = await onFetchMenu(selectedTeam, sheetIdInput.trim(), editorProducts);
      if (fetched && fetched.length > 0) {
        setEditorProducts(fetched);
        setFeedback({
          type: 'success',
          message: `✓ Menu ${selectedTeam} tersinkron (${fetched.length} item)`,
        });
        triggerHaptic('success');
      } else {
        setFeedback({
          type: 'error',
          message: 'Sheet tidak mengembalikan item untuk divisi ini.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal sinkron menu dari Sheet';
      setFeedback({ type: 'error', message: msg });
      triggerHaptic('warning');
    } finally {
      setIsSyncingMenu(false);
    }
  };

  const handleAddCustomRow = () => {
    triggerHaptic('light');
    setEditorProducts((current) => [
      ...current,
      {
        id: 'custom_' + Date.now(),
        name: '',
        original_name: '',
        price: 5000,
        is_custom: true,
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    triggerHaptic('warning');
    setEditorProducts((current) => current.filter((_: Product, i: number) => i !== idx));
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

    if (sheetIdInput.trim() !== menuSheetId && onMenuSheetIdChange) {
      onMenuSheetIdChange(sheetIdInput.trim());
    }

    if (selectedTeam !== team && onTeamChange) {
      onTeamChange(selectedTeam);
    }

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/35 backdrop-blur-sm transition-opacity animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-[28px] shadow-[0_26px_80px_rgba(15,23,42,0.18)] max-h-[92dvh] flex flex-col border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100 bg-white/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={APP_LOGO_DATA}
              alt="Logo AYO DANUSAN!"
              className="w-9 h-9 rounded-xl object-contain border border-slate-200 bg-white shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 leading-tight tracking-[-0.03em]">
                Pengaturan &amp; Menu
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95 touch-manipulation"
            aria-label="Tutup pengaturan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
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

          <div className="space-y-2 pb-3 border-b border-black/[0.06]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 tracking-[-0.02em]">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Divisi Penjualan</span>
              </label>

              <div className="flex items-center gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetIdInput}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-[#007AFF] transition-colors touch-manipulation"
                  title="Buka Spreadsheet Master di Google Sheets"
                >
                  <span>Buka Sheet</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <span className="text-slate-200">|</span>
                <button
                  type="button"
                  onClick={handleSyncMenuClick}
                  disabled={isSyncingMenu}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#007AFF] hover:text-[#005bb5] active:scale-95 disabled:opacity-50 touch-manipulation"
                  title="Tarik daftar menu terbaru dari Google Sheet Master"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingMenu ? 'animate-spin' : ''}`} />
                  <span>{isSyncingMenu ? 'Menyinkronkan...' : 'Sinkron Sheet'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl gap-1">
              {TEAMS.map((t) => {
                const isActive = selectedTeam === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTeam(t)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 touch-manipulation ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

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
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
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

          <div className="py-3 px-1 border-b border-black/[0.06] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <ZapOff className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-900">Mode Hemat Baterai</span>
            </div>

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
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isBatterySaver ? 'bg-[#007AFF]' : 'bg-slate-200'
              }`}
              title="Mode Hemat Baterai"
              aria-label="Toggle Mode Hemat Baterai"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition duration-200 ease-in-out ${
                  isBatterySaver ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-slate-500">
              URL Apps Script (Tujuan Transaksi)
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-black/[0.08] text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white transition"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-slate-500">Gambar QRIS</label>
            <div className="p-2.5 border border-black/[0.06] rounded-2xl bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 bg-white border border-black/[0.06] rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1">
                  <img
                    src={customQrisImage || DEFAULT_QRIS_DATA}
                    alt="QRIS"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="cursor-pointer select-none pressable w-full h-8 px-3 rounded-xl bg-white hover:bg-slate-50 border border-black/[0.08] text-xs font-medium text-slate-700 flex items-center justify-center gap-2">
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
                      className="pressable w-full h-7 px-2 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Kembalikan ke Bawaan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 tracking-[-0.02em]">
                  Daftar Menu &amp; Harga
                </label>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {editorProducts.length} item
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto px-0.5">
              {editorProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Belum ada menu untuk divisi ini. Klik tombol <strong>Sinkron Sheet</strong> di atas atau tambah menu custom di bawah.
                </div>
              ) : (
                editorProducts.map((item: Product, idx: number) => {
                  const isCustom = Boolean(item.is_custom);
                  return (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-[1fr_96px_36px] gap-1.5 items-center w-full"
                    >
                      <div className="relative min-w-0 flex items-center">
                        <input
                          type="text"
                          value={item.name}
                          readOnly={!isCustom}
                          onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                          placeholder="Nama Barang"
                          className={`min-w-0 w-full h-9 pl-2.5 pr-14 rounded-xl border text-xs font-medium text-slate-800 transition focus:outline-none ${
                            !isCustom
                              ? 'bg-slate-100/70 border-slate-200 cursor-default select-none'
                              : 'bg-white border-black/[0.08] focus:ring-1 focus:ring-[#007AFF]'
                          }`}
                        />
                        <span
                          className={`absolute right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 pointer-events-none ${
                            !isCustom ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isCustom ? 'Custom' : 'Sheet'}
                        </span>
                      </div>

                      <div className="relative min-w-0 w-[96px] shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">
                          Rp
                        </span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleFieldChange(idx, 'price', e.target.value)}
                          placeholder="Harga"
                          className="h-9 pl-7 pr-2 w-full rounded-xl bg-slate-50 border border-black/[0.08] text-xs font-medium text-right text-slate-800 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white transition"
                        />
                      </div>

                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="pressable w-8 h-9 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition active:scale-90"
                          title="Hapus Menu Custom"
                          aria-label="Hapus Menu Custom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div
                          className="w-8 h-9 flex items-center justify-center text-slate-300"
                          title="Menu bawaan Sheet Master (tidak dapat dihapus satuan, nama dikunci)"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={handleAddCustomRow}
              className="pressable w-full h-9 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-[#007AFF] text-xs font-medium flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Menu Custom</span>
            </button>
          </div>
        </div>

        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-black/[0.06] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="pressable w-full h-11 rounded-2xl bg-[#007AFF] hover:bg-[#0062E0] active:scale-[0.985] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,122,255,0.2)] transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan & Terapkan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};





























































































































































































































































































































































































































































































n