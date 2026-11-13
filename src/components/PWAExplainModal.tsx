import React from 'react';
import { X, Download } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { APP_LOGO_DATA } from '../assets/logo';

interface PWAExplainModalProps {
  isOpen: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export const PWAExplainModal: React.FC<PWAExplainModalProps> = ({
  isOpen,
  isInstallable,
  isInstalled,
  onClose,
  onInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden animate-sheet-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <img
              src={APP_LOGO_DATA}
              alt="Logo AYO DANUSAN!"
              className="w-9 h-9 rounded-xl object-contain bg-white shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            />
            <div>
              <h2 className="text-[16px] font-semibold text-[#1C1C1E] tracking-[-0.015em] leading-tight">
                AYO DANUSAN!
              </h2>
              <p className="text-xs text-[#636366] mt-0.5">
                Panduan Pasang Aplikasi (PWA) di HP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="pressable relative w-8 h-8 rounded-full bg-[#E5E5EA]/80 hover:bg-[#E5E5EA] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center transition-colors before:content-[''] before:absolute before:-inset-2 before:z-10"
            aria-label="Tutup Panduan"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Content - Pure text in white window, zero colorful cards */}
        <div className="p-5 overflow-y-auto space-y-6 text-[#1C1C1E]">
          {/* Petunjuk Google Chrome */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#1C1C1E]">
              1. Google Chrome (Android &amp; Desktop)
            </h3>
            <ol className="text-xs text-[#636366] space-y-2 list-decimal pl-4 leading-relaxed">
              <li>Buka tautan aplikasi ini di browser <strong>Google Chrome</strong>.</li>
              <li>
                Ketuk tombol <strong>"Pasang Aplikasi Sekarang"</strong> di bawah ini, atau ketuk menu titik tiga (⋮) di pojok kanan atas browser Chrome.
              </li>
              <li>
                Pilih menu <strong>"Pasang aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
              </li>
              <li>
                Konfirmasi dengan menekan <strong>"Pasang"</strong>. Aplikasi akan muncul di layar utama ponsel dan dapat dibuka layaknya aplikasi native tanpa browser bar.
              </li>
            </ol>

            {isInstallable && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('success');
                    onInstall();
                    onClose();
                  }}
                  className="pressable w-full h-10 rounded-xl bg-[#007AFF] hover:bg-[#0062E0] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Pasang Aplikasi Sekarang</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          {/* Petunjuk Safari di iPhone */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#1C1C1E]">
              2. Safari (iPhone &amp; iPad)
            </h3>
            <ol className="text-xs text-[#636366] space-y-2 list-decimal pl-4 leading-relaxed">
              <li>
                Buka tautan aplikasi ini langsung melalui browser resmi <strong>Safari</strong> (bukan di dalam browser Instagram, WhatsApp, atau TikTok).
              </li>
              <li>
                Ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah mengarah ke atas di bagian bawah layar).
              </li>
              <li>
                Gulir ke bawah pada lembar menu yang muncul, lalu pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
              </li>
              <li>
                Ketuk tombol <strong>"Tambah" (Add)</strong> di pojok kanan atas layar.
              </li>
              <li>
                Ikon <strong>AYO DANUSAN!</strong> akan terpasang di layar utama iPhone Anda dan siap dibuka dalam mode layar penuh (layar berdiri/portrait).
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white/90 backdrop-blur-md shadow-[0_-1px_0_rgba(0,0,0,0.04)] flex justify-end">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="pressable h-10 px-6 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA]/80 text-[#1C1C1E] text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
