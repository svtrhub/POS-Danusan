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

  React.useEffect(() => {
    if (isOpen) {
      setUrlInput(apiUrl);
      setSelectedTeam(team);
      setEditorProducts(JSON.parse(JSON.stringify(products)));
      setFeedback(null);
    }
  }, [isOpen, apiUrl, team, products]);

  if (!isOpen) return null;

  const syncMenu = async (targetTeam: TeamDivision, announce = true) => {
    if (!onFetchMenu) return;
    setIsSyncingMenu(true);
    if (announce) setFeedback(null);
    try {
      const fetched = await onFetchMenu(targetTeam, DEFAULT_MENU_SHEET_ID, editorProducts);
      if (fetched.length > 0) {
        setEditorProducts(fetched);
        if (announce) {
          setFeedback({ type: 'success', message: `Menu ${targetTeam} tersinkron (${fetched.length} item)` });
        }
        triggerHaptic('success');
      } else if (announce) {
        setFeedback({ type: 'error', message: 'Sheet tidak mengembalikan item untuk divisi ini.' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal sinkron menu dari Sheet';
      setFeedback({ type: 'error', message });
      triggerHaptic('warning');
    } finally {
      setIsSyncingMenu(false);
    }
  };

  const handleSelectTeam = async (newTeam: TeamDivision) => {
    triggerHaptic('light');
    setSelectedTeam(newTeam);
    onTeamChange?.(newTeam);
    await syncMenu(newTeam, false);
  };

  const handleAddCustomRow = () => {
    triggerHaptic('light');
    setEditorProducts((current) => [
      ...current,
      { id: `custom_${Date.now()}`, name: '', original_name: '', price: 5000, is_custom: true },
    ]);
  };

  const handleFieldChange = (idx: number, field: 'name' | 'price', value: string | number) => {
    setEditorProducts((current) => {
      const next = [...current];
      if (field === 'name') {
        next[idx] = { ...next[idx], name: String(value), original_name: next[idx].original_name || String(value) };
      } else {
        next[idx] = { ...next[idx], price: Math.max(0, parseInt(String(value), 10) || 0) };
      }
      return next;
    });
  };

  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onSaveQrisImage?.(event.target.result);
        triggerHaptic('success');
        setFeedback({ type: 'success', message: 'Gambar QRIS berhasil disimpan!' });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    if (selectedTeam !== team) onTeamChange?.(selectedTeam);
    const cleaned = editorProducts
      .filter((product) => product.name.trim() !== '')
      .map((product) => ({
        ...product,
        name: product.name.trim(),
        original_name: product.original_name || product.name.trim(),
        price: Number(product.price) || 0,
      }));
    try {
      await onSave(urlInput.trim(), cleaned.length > 0 ? cleaned : products);
      triggerHaptic('success');
      setFeedback({ type: 'success', message: 'Pengaturan & Menu berhasil disimpan!' });
      setTimeout(onClose, 700);
    } catch (err: unknown) {
      triggerHaptic('warning');
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden border border-slate-200/80">
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src={APP_LOGO_DATA} alt="Logo AYO DANUSAN!" className="w-9 h-9 rounded-xl object-contain border border-slate-100 bg-white" />
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Pengaturan &amp; Menu</h2>
          </div>
          <button type="button" onClick={() => { triggerHaptic('light'); onClose(); }} aria-label="Tutup pengaturan" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {feedback && (
            <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm shadow-slate-900/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#007AFF]" />
                Divisi Penjualan
              </h3>
              <div className="flex items-center gap-3 shrink-0">
                <a href={`https://docs.google.com/spreadsheets/d/${DEFAULT_MENU_SHEET_ID}/edit`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#007AFF] transition-colors" title="Buka spreadsheet di Google Sheets">
                  Buka Sheet <ExternalLink className="w-3 h-3" />
                </a>
                <button type="button" onClick={() => syncMenu(selectedTeam)} disabled={isSyncingMenu} className="inline-flex items-center gap-1 text-xs font-semibold text-[#007AFF] hover:text-blue-700 disabled:opacity-50" title="Sinkronkan menu">
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMenu ? 'animate-spin' : ''}`} />
                  {isSyncingMenu ? 'Menyinkronkan' : 'Sinkron'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
              {TEAMS.map((currentTeam) => {
                const active = selectedTeam === currentTeam;
                return (
                  <button key={currentTeam} type="button" onClick={() => handleSelectTeam(currentTeam)} className={`rounded-lg py-2.5 text-sm font-semibold transition-all ${active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-800'}`}>
                    {currentTeam}
                  </button>
                );
              })}
            </div>
          </section>

          {onOpenHistory && (
            <button type="button" onClick={() => { triggerHaptic('light'); onOpenHistory(); }} className="w-full rounded-2xl border border-slate-200 p-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition">
              <span className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Receipt className="w-4 h-4" /></span><span className="text-sm font-medium text-slate-900">Riwayat Transaksi</span></span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          <div className="rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><ZapOff className="w-4 h-4" /></span><span className="text-sm font-medium text-slate-900">Mode Hemat Baterai</span></div>
            <button type="button" role="switch" aria-checked={Boolean(isBatterySaver)} onClick={() => { triggerHaptic('medium'); onToggleBatterySaver?.(!isBatterySaver); }} aria-label="Toggle Mode Hemat Baterai" className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${isBatterySaver ? 'bg-[#007AFF]' : 'bg-slate-200'}`}>
              <span className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isBatterySaver ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <section className="space-y-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="apps-script-url">URL Apps Script <span className="font-normal text-slate-400">(Tujuan Transaksi)</span></label>
            <input id="apps-script-url" type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#007AFF] focus:bg-white transition" />
          </section>

          <section className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Gambar QRIS</label>
            <div className="p-3 border border-slate-200 rounded-2xl bg-slate-50/70 flex items-center gap-3">
              <div className="w-14 h-16 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1"><img src={customQrisImage || DEFAULT_QRIS_DATA} alt="QRIS" className="w-full h-full object-contain rounded" /></div>
              <div className="flex-1 space-y-2">
                <label className="cursor-pointer w-full h-9 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center justify-center gap-2 transition"><Upload className="w-3.5 h-3.5 text-[#007AFF]" /><span>Ganti Gambar QRIS</span><input type="file" accept="image/*" onChange={handleQrisFileChange} className="sr-only" /></label>
                {customQrisImage && customQrisImage !== DEFAULT_QRIS_DATA && onResetQrisImage && <button type="button" onClick={() => { triggerHaptic('warning'); onResetQrisImage(); setFeedback({ type: 'success', message: 'Kembali ke QRIS bawaan.' }); }} className="w-full h-8 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition"><RotateCcw className="w-3 h-3" />Kembalikan ke Bawaan</button>}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Daftar Menu &amp; Harga</h3>
              <span className="text-xs text-slate-400 font-mono tabular-nums">{editorProducts.length} item</span>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto px-0.5">
              {editorProducts.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada menu. Sinkronkan dari Sheet atau tambahkan menu custom.</div>
              ) : editorProducts.map((item, idx) => {
                const isCustom = Boolean(item.is_custom);
                return (
                  <div key={item.id || idx} className="grid grid-cols-[1fr_100px_36px] gap-2 items-center">
                    <div className="relative min-w-0 flex items-center">
                      <input type="text" value={item.name} readOnly={!isCustom} onChange={(e) => handleFieldChange(idx, 'name', e.target.value)} placeholder="Nama Barang" className={`min-w-0 w-full h-10 pl-3 pr-14 rounded-xl border text-xs font-medium text-slate-800 focus:outline-none ${!isCustom ? 'bg-slate-100 border-slate-200 cursor-default select-none' : 'bg-white border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-[#007AFF]'}`} />
                      <span className={`absolute right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide pointer-events-none ${!isCustom ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{isCustom ? 'Custom' : 'Sheet'}</span>
                    </div>
                    <div className="relative min-w-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">Rp</span>
                      <input type="number" value={item.price} onChange={(e) => handleFieldChange(idx, 'price', e.target.value)} placeholder="Harga" className="h-10 pl-7 pr-2 w-full rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-right text-slate-800 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#007AFF] focus:bg-white" />
                    </div>
                    {isCustom ? (
                      <button type="button" onClick={() => { triggerHaptic('warning'); setEditorProducts((current) => current.filter((_, i) => i !== idx)); }} className="w-9 h-10 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition" title="Hapus Menu Custom" aria-label="Hapus Menu Custom"><Trash2 className="w-4 h-4" /></button>
                    ) : <div className="w-9 h-10 flex items-center justify-center text-slate-300" title="Menu bawaan Sheet"><Lock className="w-3.5 h-3.5" /></div>}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={handleAddCustomRow} className="w-full h-10 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-[#007AFF] text-xs font-semibold flex items-center justify-center gap-2 transition"><Plus className="w-4 h-4" /><span>Tambah Menu Custom</span></button>
          </section>
        </div>

        <footer className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-slate-100 shrink-0">
          <button type="button" onClick={handleSave} disabled={isSaving} className="w-full h-11 rounded-xl bg-[#007AFF] hover:bg-blue-600 active:scale-[0.985] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50">
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan & Terapkan'}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
