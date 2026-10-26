import React from 'react';
import {
  RotateCcw,
  Menu,
  Download,
  RefreshCw,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface HeaderProps {
  queueLength: number;
  isSyncing: boolean;
  apiUrl: string;
  hasSyncError: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  onSyncClick: () => void;
  onResetCart: () => void;
  onOpenSettings: () => void;
  onOpenPWAInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  queueLength,
  isSyncing,
  apiUrl,
  hasSyncError,
  isInstallable,
  onSyncClick,
  onResetCart,
  onOpenSettings,
  onOpenPWAInfo,
}) => {
  let syncLabel = 'Tersinkron';
  let dotColor = 'bg-emerald-500';

  if (!apiUrl) {
    syncLabel = queueLength > 0 ? `Atur URL (${queueLength})` : 'Atur URL';
    dotColor = 'bg-rose-500';
  } else if (hasSyncError) {
    syncLabel = `Coba Lagi (${queueLength})`;
    dotColor = 'bg-rose-500';
  } else if (isSyncing) {
    syncLabel = 'Menyinkronkan...';
    dotColor = 'bg-amber-500 animate-pulse';
  } else if (queueLength > 0) {
    syncLabel = `Antrean (${queueLength})`;
    dotColor = 'bg-amber-500';
  }

  return (
    <header className="sticky top-0 left-0 right-0 z-30 shrink-0 bg-white border-b border-black/8 shadow-[0_1px_4px_rgba(0,0,0,0.03)] pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-16 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Clickable POS DANUSAN logotext to open PWA guide window */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenPWAInfo();
          }}
          className="pressable text-left group flex items-center gap-1 focus:outline-none shrink-0"
          title="Ketuk untuk melihat Panduan Pasang PWA"
          aria-label="Buka Panduan Pasang PWA"
        >
          <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 select-none group-hover:text-blue-600 transition">
            POS DANUSAN
          </span>
        </button>

        {/* Center: Sync Queue Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onSyncClick();
          }}
          className="pressable min-w-0 max-w-[130px] sm:max-w-none inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 text-xs font-semibold text-slate-700 transition"
          aria-label="Status Sinkronisasi"
          title="Klik untuk sinkronisasi antrean"
        >
          <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
          <span className="num font-semibold text-[11px] sm:text-xs truncate">
            {syncLabel}
          </span>
          {isSyncing && (
            <RefreshCw className="w-3 h-3 text-slate-500 animate-spin ml-0.5 shrink-0" />
          )}
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {isInstallable && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenPWAInfo();
              }}
              className="pressable inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 text-[11px] font-bold shadow-2xs hover:bg-blue-100 transition"
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
            className="pressable relative w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/60 text-slate-700 flex items-center justify-center transition active:scale-95 before:content-[''] before:absolute before:-inset-2 before:z-10 touch-manipulation"
            title="Reset Keranjang"
            aria-label="Reset Keranjang"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
          </button>

          {/* Pengaturan & Menu */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            className="pressable relative w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/60 text-slate-700 flex items-center justify-center transition active:scale-95 before:content-[''] before:absolute before:-inset-2 before:z-10 touch-manipulation"
            title="Menu & Pengaturan"
            aria-label="Menu & Pengaturan"
          >
            <Menu className="w-4 h-4 text-slate-700 stroke-[2.3]" />
          </button>
        </div>
      </div>
    </header>
  );
};
