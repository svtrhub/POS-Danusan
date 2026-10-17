import React from 'react';
import { X, Download } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[88dvh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Panduan Pasang Aplikasi (PWA)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cara memasang POS DANUSAN di Layar Utama HP
            </p>
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

        {/* Content - Pure text in white window, zero colorful cards */}
        <div className="p-5 overflow-y-auto space-y-6 text-slate-800">
          {/* Petunjuk Google Chrome */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">
              1. Google Chrome (Android &amp; Desktop)
            </h3>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4 leading-relaxed">
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
                  className="pressable w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Pasang Aplikasi Sekarang</span>
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* Petunjuk Safari di iPhone */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">
              2. Safari (iPhone &amp; iPad)
            </h3>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4 leading-relaxed">
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
                Ikon <strong>POS DANUSAN</strong> akan terpasang di layar utama iPhone Anda dan siap dibuka dalam mode layar penuh (layar berdiri/portrait).
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="pressable h-10 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
