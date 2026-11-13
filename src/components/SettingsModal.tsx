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
import { getDefaultActivationLink } from '../services/activationLinks';

interface SettingsModalProps {
  isOpen: boolean;
  apiUrl: string;
  products: Product[];
  customQrisImage?: string;
  isBatterySaver?: boolean;
  team?: TeamDivision;
  getActivationUrlForTeam?: (team: TeamDivision) => string;
  getDefaultUrlForTeam?: (team: TeamDivision) => string;
  getCachedMenuForTeam?: (team: TeamDivision) => Product[] | null;
  onClose: () => void;
  onSave: (newUrl: string, updatedProducts: Product[], targetTeam?: TeamDivision) => Promise<void>;
  onTeamChange?: (team: TeamDivision) => void;
  onFetchMenu?: (
    team: TeamDivision,
    existingProducts?: Product[],
    preserveCustom?: boolean
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
  getActivationUrlForTeam,
  getDefaultUrlForTeam,
  getCachedMenuForTeam,
  onClose,
  onSave,
  onTeamChange,
  onFetchMenu,
  onOpenHistory,
  onSaveQrisImage,
  onResetQrisImage,
  onToggleBatterySaver,
}) => {
  const [urlInput, setUrlInput] = useState(apiUrl);
  const [selectedTeam, setSelectedTeam] = useState<TeamDivision>(team);
  const [isSyncingMenu, setIsSyncingMenu] = useState(false);
  const [editorProducts, setEditorProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const wasOpenRef = React.useRef(false);
  const activeTeamRequestRef = React.useRef<TeamDivision>(team);

  const resolveTeamUrl = (targetTeam: TeamDivision) =>
    getActivationUrlForTeam ? getActivationUrlForTeam(targetTeam) : getDefaultActivationLink(targetTeam);

  const resolveDefaultTeamUrl = (targetTeam: TeamDivision) =>
    getDefaultUrlForTeam ? getDefaultUrlForTeam(targetTeam) : getDefaultActivationLink(targetTeam);

  // Initialize editor state only when modal transitions from closed -> open
  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const initialUrl = apiUrl || resolveTeamUrl(team);
      setUrlInput(initialUrl);
      setSelectedTeam(team);
      activeTeamRequestRef.current = team;
      setEditorProducts(JSON.parse(JSON.stringify(products)));
      setFeedback(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, apiUrl, team, products]);

  if (!isOpen) return null;

  const handleSelectTeam = async (newTeam: TeamDivision) => {
    triggerHaptic('light');
    activeTeamRequestRef.current = newTeam;
    setSelectedTeam(newTeam);

    // Instantly switch the activation link and cached menu for the chosen team
    const nextUrl = resolveTeamUrl(newTeam);
    setUrlInput(nextUrl);

    const cachedMenu = getCachedMenuForTeam ? getCachedMenuForTeam(newTeam) : null;
    if (cachedMenu && cachedMenu.length > 0) {
      setEditorProducts(JSON.parse(JSON.stringify(cachedMenu)));
    }

    if (onTeamChange) {
      onTeamChange(newTeam);
    }

    setFeedback({
      type: 'success',
      message: `${newTeam} aktif · Link aktivasi diperbarui`,
    });

    if (onFetchMenu) {
      setIsSyncingMenu(true);
      try {
        const fetched = await onFetchMenu(newTeam, cachedMenu || [], false);
        if (activeTeamRequestRef.current !== newTeam) return;
        if (fetched) {
          setEditorProducts(fetched);
          setFeedback({
            type: 'success',
            message:
              fetched.length > 0
                ? `${newTeam} aktif · Link & menu dimuat (${fetched.length} item)`
                : `${newTeam} aktif · Menu kosong di Sheet`,
          });
          triggerHaptic('success');
        }
      } catch (err: unknown) {
        if (activeTeamRequestRef.current !== newTeam) return;
        const msg = err instanceof Error ? err.message : 'Gagal sinkron menu dari Sheet';
        setFeedback({
          type: 'error',
          message: `Link ${newTeam} aktif, namun gagal sinkron menu: ${msg}`,
        });
        triggerHaptic('warning');
      } finally {
        if (activeTeamRequestRef.current === newTeam) {
          setIsSyncingMenu(false);
        }
      }
    }
  };

  const handleSyncMenuClick = async () => {
    triggerHaptic('medium');
    if (!onFetchMenu) return;

    const targetTeam = selectedTeam;
    activeTeamRequestRef.current = targetTeam;
    setIsSyncingMenu(true);
    setFeedback(null);
    try {
      const fetched = await onFetchMenu(targetTeam, editorProducts, true);
      if (activeTeamRequestRef.current !== targetTeam) return;
      if (fetched && fetched.length > 0) {
        setEditorProducts(fetched);
        setFeedback({
          type: 'success',
          message: `Menu ${targetTeam} tersinkron (${fetched.length} item)`,
        });
        triggerHaptic('success');
      } else {
        setFeedback({
          type: 'error',
          message: 'Sheet tidak mengembalikan item untuk divisi ini.',
        });
      }
    } catch (err: unknown) {
      if (activeTeamRequestRef.current !== targetTeam) return;
      const msg = err instanceof Error ? err.message : 'Gagal sinkron menu dari Sheet';
      setFeedback({ type: 'error', message: msg });
      triggerHaptic('warning');
    } finally {
      if (activeTeamRequestRef.current === targetTeam) {
        setIsSyncingMenu(false);
      }
    }
  };

  const handleAddCustomRow = () => {
    triggerHaptic('light');
    setEditorProducts([
      ...editorProducts,
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
          setFeedback({ type: 'success', message: 'Gambar QRIS berhasil disimpan' });
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
      await onSave(urlInput.trim(), cleaned.length > 0 ? cleaned : products, selectedTeam);
      triggerHaptic('success');
      setFeedback({ type: 'success', message: 'Pengaturan berhasil disimpan' });
      setTimeout(() => {
        onClose();
      }, 600);
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
      {/* Apple Inset-Grouped Sheet Surface */}
      <div className="w-full max-w-lg bg-[#F2F2F7] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-sheet-surface">
        {/* Translucent Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.04)] shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src={APP_LOGO_DATA}
              alt="Logo AYO DANUSAN!"
              className="w-7 h-7 rounded-lg object-contain bg-white shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            />
            <h2 className="text-[16px] font-semibold text-[#1C1C1E] tracking-[-0.015em]">
              Pengaturan &amp; Menu
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="pressable relative w-8 h-8 rounded-full bg-[#E5E5EA]/80 hover:bg-[#E5E5EA] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center transition-colors before:content-[''] before:absolute before:-inset-2 before:z-10"
            aria-label="Tutup Pengaturan"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Scrollable Body (Borderless Floating White Cards on #F2F2F7) */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3.5">
          {/* Status Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Card 1: Divisi Penjualan */}
          <div className="bg-white rounded-2xl p-3.5 space-y-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[13px] font-semibold text-[#1C1C1E] flex items-center gap-1.5 tracking-[-0.01em]">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Divisi Penjualan</span>
              </label>

              <div className="flex items-center gap-2.5">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${DEFAULT_MENU_SHEET_ID}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable inline-flex items-center gap-1 text-[11px] font-semibold text-[#8E8E93] hover:text-[#007AFF] transition-colors touch-manipulation"
                >
                  <span>Buka Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-slate-200 text-xs">|</span>
                <button
                  type="button"
                  onClick={handleSyncMenuClick}
                  disabled={isSyncingMenu}
                  className="pressable inline-flex items-center gap-1 text-[11px] font-semibold text-[#007AFF] hover:text-[#005bb5] disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingMenu ? 'animate-spin' : ''}`} />
                  <span>{isSyncingMenu ? 'Menyinkronkan...' : 'Sinkron Sheet'}</span>
                </button>
              </div>
            </div>

            {/* Apple UISegmentedControl (Zero border/ring, pure elevation) */}
            <div className="grid grid-cols-3 p-0.5 bg-[#E5E5EA]/75 rounded-[11px] gap-0.5">
              {TEAMS.map((t) => {
                const isActive = selectedTeam === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTeam(t)}
                    className={`py-1.5 px-3 rounded-[9px] text-xs font-semibold transition-[color,background-color,box-shadow] duration-150 touch-manipulation ${
                      isActive
                        ? 'bg-white text-[#1C1C1E] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                        : 'text-[#636366] hover:text-[#1C1C1E]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Grouped Actions (Riwayat & Mode Hemat Baterai) */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            {onOpenHistory && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenHistory();
                  }}
                  className="pressable w-full px-3.5 py-3 text-left flex items-center justify-between gap-3 transition hover:bg-slate-50/70 active:bg-slate-100/70"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[9px] bg-[#F2F2F7] text-[#1C1C1E] flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <span className="text-[14px] font-medium text-[#1C1C1E] truncate">
                      Riwayat Transaksi
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
                </button>
                <div className="ml-14 mr-3.5 h-px bg-slate-100" />
              </>
            )}

            <div className="px-3.5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-[9px] bg-[#F2F2F7] text-[#1C1C1E] flex items-center justify-center shrink-0">
                  <ZapOff className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-[14px] font-medium text-[#1C1C1E]">
                  Mode Hemat Baterai
                </span>
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
                className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-180 ease-[cubic-bezier(0.23,1,0.32,1)] focus:outline-none touch-manipulation ${
                  isBatterySaver ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
                }`}
                aria-label="Toggle Mode Hemat Baterai"
              >
                <span
                  className={`pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.16)] transition-transform duration-180 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    isBatterySaver ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card 3: Integrasi & Pembayaran */}
          <div className="bg-white rounded-2xl p-3.5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[13px] font-semibold text-[#1C1C1E] tracking-[-0.01em]">
                  URL Apps Script
                </label>
                {urlInput.trim() !== resolveDefaultTeamUrl(selectedTeam) && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      const defUrl = resolveDefaultTeamUrl(selectedTeam);
                      setUrlInput(defUrl);
                      setFeedback({
                        type: 'success',
                        message: `Link aktivasi ${selectedTeam} dikembalikan ke default`,
                      });
                    }}
                    className="pressable text-[11px] font-semibold text-[#007AFF] hover:text-[#005bb5] transition-colors touch-manipulation"
                  >
                    Reset Default
                  </button>
                )}
              </div>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full h-10 px-3 rounded-xl bg-[#F2F2F7] text-xs font-mono text-[#1C1C1E] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/25 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#1C1C1E] tracking-[-0.01em]">
                Gambar QRIS
              </label>

              <div className="p-2.5 rounded-xl bg-[#F2F2F7]/75 flex items-center gap-3">
                <div className="w-11 h-14 bg-white rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <img
                    src={customQrisImage || DEFAULT_QRIS_DATA}
                    alt="QRIS"
                    className="w-full h-full object-contain rounded"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="cursor-pointer select-none pressable w-full h-9 px-3 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-[#007AFF] flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors">
                    <Upload className="w-3.5 h-3.5" />
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
                      className="pressable w-full h-7 px-2 rounded-lg text-[11px] font-medium text-[#8E8E93] hover:text-[#1C1C1E] flex items-center justify-center gap-1 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Kembalikan ke Bawaan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Daftar Menu & Harga */}
          <div className="bg-white rounded-2xl p-3.5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-[#1C1C1E] tracking-[-0.01em]">
                Daftar Menu &amp; Harga
              </label>
              <span className="text-xs text-[#8E8E93] font-mono tabular-nums">
                {editorProducts.length} item
              </span>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {editorProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8E8E93] bg-[#F2F2F7] rounded-xl">
                  Belum ada menu. Ketuk Sinkron Sheet atau tambah menu custom.
                </div>
              ) : (
                editorProducts.map((item: Product, idx: number) => {
                  const isCustom = Boolean(item.is_custom);
                  return (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-[1fr_96px_30px] gap-1.5 items-center w-full"
                    >
                      {/* Name input with subtle tag */}
                      <div className="relative min-w-0 flex items-center">
                        <input
                          type="text"
                          value={item.name}
                          readOnly={!isCustom}
                          onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                          placeholder="Nama Barang"
                          className={`min-w-0 w-full h-9 pl-3 pr-14 rounded-xl text-xs font-medium text-[#1C1C1E] transition focus:outline-none ${
                            !isCustom
                              ? 'bg-[#F2F2F7] cursor-default select-none'
                              : 'bg-[#F2F2F7]/70 focus:bg-white focus:ring-2 focus:ring-[#007AFF]/25'
                          }`}
                        />
                        <span
                          className={`absolute right-2 px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider shrink-0 pointer-events-none ${
                            !isCustom
                              ? 'bg-slate-200/70 text-[#8E8E93]'
                              : 'bg-amber-100/80 text-amber-700'
                          }`}
                        >
                          {isCustom ? 'Custom' : 'Sheet'}
                        </span>
                      </div>

                      {/* Price input */}
                      <div className="relative min-w-0 w-[96px] shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8E8E93] font-medium">
                          Rp
                        </span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleFieldChange(idx, 'price', e.target.value)}
                          placeholder="Harga"
                          className="h-9 pl-7 pr-2.5 w-full rounded-xl bg-[#F2F2F7] text-xs font-medium text-right text-[#1C1C1E] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#007AFF]/25 focus:bg-white transition"
                        />
                      </div>

                      {/* Action */}
                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="pressable w-7 h-9 rounded-lg hover:bg-rose-50 text-[#8E8E93] hover:text-[#FF3B30] flex items-center justify-center shrink-0 transition-colors"
                          title="Hapus Menu Custom"
                          aria-label="Hapus Menu Custom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-7 h-9 flex items-center justify-center text-[#C7C7CC]">
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
              className="pressable w-full h-9 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA]/80 text-[#007AFF] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Tambah Menu Custom</span>
            </button>
          </div>
        </div>

        {/* Translucent Footer Actions */}
        <div className="p-3.5 sm:p-4 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] bg-white/90 backdrop-blur-md shadow-[0_-1px_0_rgba(0,0,0,0.04)] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="pressable w-full h-11 rounded-xl bg-[#007AFF] hover:bg-[#0062E0] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan & Terapkan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
