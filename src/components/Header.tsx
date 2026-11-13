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
  isScrolled?: boolean;
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
  isScrolled = false,
  team = 'Team A',
  onSyncClick,
  onResetCart,
  onOpenSettings,
  onOpenPWAInfo,
}) => {
  let syncLabel = 'Tersinkron';
  let dotColor = 'bg-[#8E8E93]';
  const isFullySynced = isOnline && Boolean(apiUrl) && !hasSyncError && !isSyncing && queueLength === 0;

  if (!isOnline) {
    if (queueLength > 0) {
      syncLabel = `Offline (${queueLength})`;
      dotColor = 'bg-[#636366]';
    } else {
      syncLabel = 'Offline';
      dotColor = 'bg-[#8E8E93]';
    }
  } else if (!apiUrl) {
    syncLabel = queueLength > 0 ? `Atur URL (${queueLength})` : 'Atur URL';
    dotColor = 'bg-[#FF3B30]';
  } else if (hasSyncError) {
    syncLabel = `Coba Lagi (${queueLength})`;
    dotColor = 'bg-[#FF3B30]';
  } else if (isSyncing) {
    if (pendingTextCount > 0) {
      syncLabel = `Sync (${pendingTextCount})...`;
    } else if (pendingPhotoCount > 0) {
      syncLabel = `Foto (${pendingPhotoCount})...`;
    } else {
      syncLabel = 'Menyinkronkan...';
    }
    dotColor = 'bg-[#007AFF]';
  } else if (queueLength > 0) {
    if (pendingTextCount === 0 && pendingPhotoCount > 0) {
      syncLabel = `Foto (${pendingPhotoCount})`;
      dotColor = 'bg-[#8E8E93]';
    } else {
      syncLabel = `Antrean (${queueLength})`;
      dotColor = 'bg-[#007AFF]';
    }
  }

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-30 shrink-0 pt-[env(safe-area-inset-top,0px)] header-glass ${
        isScrolled ? 'header-glass--scrolled' : ''
      }`}
    >
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-14 flex items-center justify-between gap-2">
        {/* Zone 1 (Left): Brand Wordmark + Quiet Inline Division Indicator */}
        <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenPWAInfo();
            }}
            className="pressable text-left group inline-flex items-center min-h-[44px] focus:outline-none shrink-0"
            title="Ketuk untuk melihat Panduan Pasang PWA"
            aria-label="Buka Panduan Pasang PWA"
          >
            <span className="text-[16px] sm:text-[18px] font-bold tracking-[-0.02em] text-[#1C1C1E] select-none group-hover:text-[#007AFF] transition-colors whitespace-nowrap">
              AYO DANUSAN!
            </span>
          </button>

          {team && (
            <>
              <span aria-hidden="true" className="text-[#C7C7CC] text-xs font-medium select-none shrink-0">
                ·
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenSettings();
                }}
                className="pressable relative min-w-0 inline-flex items-center min-h-[44px] px-1 rounded-lg text-[#636366] hover:text-[#1C1C1E] transition-colors focus:outline-none"
                title={`Divisi: ${team}. Ketuk untuk ganti divisi atau sinkron menu.`}
                aria-label={`Divisi aktif ${team}. Buka pengaturan.`}
              >
                <span className="text-[12px] sm:text-[13px] font-medium tracking-[-0.01em] whitespace-nowrap truncate">
                  {team}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Zone 2 (Right): Grouped Sync Status, Battery Indicator & Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          {/* Sync Status */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onSyncClick();
            }}
            className="pressable relative inline-flex items-center gap-1.5 min-h-[36px] px-2 rounded-lg hover:bg-black/[0.04] transition-colors before:content-[''] before:absolute before:-inset-y-1 before:inset-x-0"
            aria-label="Status Sinkronisasi"
            title={
              queueLength > 0
                ? `Antrean: ${pendingTextCount} teks, ${pendingPhotoCount} foto. Klik untuk sinkronkan.`
                : 'Semua transaksi tersinkron'
            }
          >
            {isFullySynced ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#34C759] stroke-[2.5] shrink-0" />
                <span className="hidden sm:inline text-xs font-medium text-[#636366] tracking-[-0.01em] whitespace-nowrap">
                  {syncLabel}
                </span>
              </>
            ) : (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                <span className="text-xs font-medium text-[#636366] truncate tracking-[-0.01em] max-w-[78px] sm:max-w-none whitespace-nowrap">
                  {syncLabel}
                </span>
                {isSyncing && (
                  <RefreshCw className="w-3 h-3 text-[#007AFF] animate-spin shrink-0" />
                )}
              </>
            )}
          </button>

          {/* Battery Saver Indicator (only when active) */}
          {isBatterySaver && (
            <span
              className="inline-flex items-center justify-center w-7 h-8 text-[#FF9500] shrink-0"
              title="Mode Hemat Baterai aktif"
              aria-label="Mode Hemat Baterai aktif"
            >
              <ZapOff className="w-3.5 h-3.5 stroke-[2.2]" />
            </span>
          )}

          {/* Optional Install PWA Action */}
          {isInstallable && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenPWAInfo();
              }}
              className="pressable inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-semibold text-[#007AFF] hover:bg-[#007AFF]/[0.08] transition-colors whitespace-nowrap"
              title="Pasang aplikasi ke Layar Utama HP"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pasang</span>
            </button>
          )}

          {/* Reset Keranjang */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('warning');
              onResetCart();
            }}
            className="pressable relative w-8 h-8 rounded-lg hover:bg-black/[0.04] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center transition-colors before:content-[''] before:absolute before:-inset-1.5 before:z-10"
            title="Reset Keranjang"
            aria-label="Reset Keranjang"
          >
            <RotateCcw className="w-4 h-4 stroke-[1.9]" />
          </button>

          {/* Pengaturan & Menu */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            className="pressable relative w-8 h-8 rounded-lg hover:bg-black/[0.04] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center transition-colors before:content-[''] before:absolute before:-inset-1.5 before:z-10"
            title="Menu & Pengaturan"
            aria-label="Menu & Pengaturan"
          >
            <Menu className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>
    </header>
  );
};
