import React from 'react';
import {
  RotateCcw,
  Menu,
  Download,
  RefreshCw,
  ZapOff,
  Check,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { TeamDivision } from '../types';

interface HeaderProps {
  queueLength: number;
  pendingTextCount?: number;
  pendingPhotoCount?: number;
  isSyncing: boolean;
  apiUrl: string;
  hasSyncError: boolean;
  isInstallable: boolean;
  isOnline?: boolean;
  isBatterySaver?: boolean;
  team?: TeamDivision;
  onSyncClick: () => void;
  onResetCart: () => void;
  onOpenSettings: () => void;
  onOpenPWAInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  queueLength,
  pendingTextCount = 0,
  pendingPhotoCount = 0,
  isSyncing,
  apiUrl,
  hasSyncError,
  isInstallable,
  isOnline = true,
  isBatterySaver = false,
  team = 'Team A',
  onSyncClick,
  onResetCart,
  onOpenSettings,
  onOpenPWAInfo,
}) => {
  let syncLabel = 'Tersinkron';
  let dotColor = 'bg-slate-400';
  const isFullySynced = isOnline && Boolean(apiUrl) && !hasSyncError && !isSyncing && queueLength === 0;

  if (!isOnline) {
    if (queueLength > 0) {
      syncLabel = `Offline (${queueLength})`;
      dotColor = 'bg-slate-500';
    } else {
      syncLabel = 'Offline';
      dotColor = 'bg-slate-400';
    }
  } else if (!apiUrl) {
    syncLabel = queueLength > 0 ? `Atur URL (${queueLength})` : 'Atur URL';
    dotColor = 'bg-rose-500';
  } else if (hasSyncError) {
    syncLabel = `Coba Lagi (${queueLength})`;
    dotColor = 'bg-rose-500';
  } else if (isSyncing) {
    if (pendingTextCount > 0) {
      syncLabel = `Sync Teks (${pendingTextCount})...`;
    } else if (pendingPhotoCount > 0) {
      syncLabel = `Upload Foto (${pendingPhotoCount})...`;
    } else {
      syncLabel = 'Menyinkronkan...';
    }
    dotColor = 'bg-[#007AFF]';
  } else if (queueLength > 0) {
    if (pendingTextCount === 0 && pendingPhotoCount > 0) {
      syncLabel = `Upload Foto (${pendingPhotoCount})`;
      dotColor = 'bg-slate-400';
    } else {
      syncLabel = `Antrean (${queueLength})`;
      dotColor = 'bg-[#007AFF]';
    }
  }

  return (
    <header className="sticky top-0 left-0 right-0 z-30 shrink-0 bg-white border-b border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.02)] pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Clickable AYO DANUSAN! logotext + Flat-out Text Division */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenPWAInfo();
            }}
            className="pressable text-left group flex items-center min-h-[44px] focus:outline-none shrink-0 touch-manipulation"
            title="Ketuk untuk melihat Panduan Pasang PWA"
            aria-label="Buka Panduan Pasang PWA"
          >
            <span className="text-base sm:text-xl font-bold tracking-tight text-slate-900 select-none group-hover:text-[#007AFF] transition-colors whitespace-nowrap">
              AYO DANUSAN!
            </span>
          </button>

          {team && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenSettings();
              }}
              className="pressable min-w-0 inline-flex items-center gap-1.5 px-1.5 sm:px-2 py-1.5 rounded-lg hover:bg-black/[0.04] active:bg-black/[0.08] transition-colors touch-manipulation text-slate-700 hover:text-slate-900"
              title={`Divisi: ${team}. Ketuk untuk ganti divisi atau sinkron menu.`}
              aria-label={`Divisi aktif ${team}. Buka pengaturan.`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] shrink-0" />
              <span className="text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap">
                {team}
              </span>
            </button>
          )}
        </div>

        {/* Center: Sync Status & Mode Hemat Baterai (Compressed for mobile) */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onSyncClick();
            }}
            className="pressable min-w-0 inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-black/[0.04] active:bg-black/[0.08] transition-colors touch-manipulation"
            aria-label="Status Sinkronisasi"
            title={queueLength > 0 ? `Antrean: ${pendingTextCount} teks, ${pendingPhotoCount} foto. Klik untuk sinkronkan.` : 'Semua transaksi tersinkron'}
          >
            {isFullySynced ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                <span className="hidden sm:inline text-xs font-medium text-slate-600 truncate tracking-tight">
                  {syncLabel}
                </span>
              </>
            ) : (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                <span className="text-xs font-medium text-slate-600 truncate tracking-tight max-w-[85px] xs:max-w-[120px] sm:max-w-none">
                  {syncLabel}
                </span>
                {isSyncing && (
                  <RefreshCw className="w-3 h-3 text-[#007AFF] animate-spin shrink-0" />
                )}
              </>
            )}
          </button>

          {isBatterySaver && (
            <span
              className="inline-flex items-center text-amber-500 p-1 rounded-md shrink-0 transition-transform active:scale-95"
              title="Mode Hemat Baterai aktif"
              aria-label="Mode Hemat Baterai aktif"
            >
              <ZapOff className="w-3.5 h-3.5 stroke-[2.2]" />
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {isInstallable && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenPWAInfo();
              }}
              className="pressable inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#007AFF] hover:bg-blue-50/60 transition-colors touch-manipulation"
              title="Pasang aplikasi ke Layar Utama HP"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Pasang</span>
            </button>
          )}

          {/* Reset Keranjang */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('warning');
              onResetCart();
            }}
            className="pressable relative w-8 h-8 rounded-lg hover:bg-black/[0.04] active:bg-black/[0.08] text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors touch-manipulation before:content-[''] before:absolute before:-inset-2 before:z-10"
            title="Reset Keranjang"
            aria-label="Reset Keranjang"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Pengaturan & Menu */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            className="pressable relative w-8 h-8 rounded-lg hover:bg-black/[0.04] active:bg-black/[0.08] text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors touch-manipulation before:content-[''] before:absolute before:-inset-2 before:z-10"
            title="Menu & Pengaturan"
            aria-label="Menu & Pengaturan"
          >
            <Menu className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </header>
  );
};
