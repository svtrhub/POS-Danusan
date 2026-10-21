import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, QrCode } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { defaultQrisWebp, defaultQrisPng, DEFAULT_QRIS_DATA } from '../assets/defaultQris';

interface QRISPullCardProps {
  customQrisImage?: string;
  onSaveQrisImage?: (base64: string) => void;
}

const OPEN_DISTANCE_THRESHOLD = 70;
const CLOSE_DISTANCE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 0.45;

export const QRISPullCard: React.FC<QRISPullCardProps> = ({
  customQrisImage,
  onSaveQrisImage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [, setImageError] = useState(false);

  const isDraggingRef = useRef(false);
  const isOpenRef = useRef(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Listen for global open-qris event
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-qris', handleOpen);
    return () => window.removeEventListener('open-qris', handleOpen);
  }, []);

  const fallbackSources = useMemo(() => {
    return [
      customQrisImage,
      DEFAULT_QRIS_DATA,
      defaultQrisWebp,
      defaultQrisPng,
      './qris-default.webp',
      '/qris-default.webp',
    ].filter(Boolean) as string[];
  }, [customQrisImage]);

  useEffect(() => {
    setSourceIndex(0);
  }, [customQrisImage]);

  const activeSrc = fallbackSources[sourceIndex] || DEFAULT_QRIS_DATA || defaultQrisWebp;

  const handleImageError = () => {
    if (sourceIndex < fallbackSources.length - 1) {
      setSourceIndex((prev) => prev + 1);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button, input, label, a')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    startYRef.current = e.clientY;
    currentYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current);
    const dy = e.clientY - currentYRef.current;

    velocityRef.current = dy / dt;
    lastTimeRef.current = now;
    currentYRef.current = e.clientY;

    const totalDelta = e.clientY - startYRef.current;

    if (!isOpenRef.current) {
      if (totalDelta > 0) {
        const dampened = totalDelta < 140 ? totalDelta : 140 + (totalDelta - 140) * 0.4;
        setDragY(dampened);
      } else {
        setDragY(0);
      }
    } else {
      if (totalDelta < 0) {
        setDragY(totalDelta);
      } else {
        setDragY(totalDelta * 0.2);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    const totalDelta = currentYRef.current - startYRef.current;
    const v = velocityRef.current;

    if (!isOpenRef.current) {
      const shouldOpen = totalDelta >= OPEN_DISTANCE_THRESHOLD || v > VELOCITY_THRESHOLD;
      if (shouldOpen) {
        setIsOpen(true);
        triggerHaptic('medium');
      }
      setDragY(0);
    } else {
      const shouldClose = totalDelta <= -CLOSE_DISTANCE_THRESHOLD || v < -VELOCITY_THRESHOLD;
      if (shouldClose) {
        setIsOpen(false);
        triggerHaptic('light');
      }
      setDragY(0);
    }
  };

  const handleClose = () => {
    triggerHaptic('light');
    setIsOpen(false);
    setDragY(0);
  };

  const handleDirectWebpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        if (onSaveQrisImage) {
          onSaveQrisImage(ev.target.result);
          setImageError(false);
          triggerHaptic('success');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const pullProgress = !isOpen
    ? Math.min(1, Math.max(0, dragY / OPEN_DISTANCE_THRESHOLD))
    : Math.max(0, 1 - Math.abs(dragY) / 100);

  return (
    <>
      {/* Dimmed Scrim Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity ${
          isDragging ? 'duration-0' : 'duration-250 ease-out'
        } ${
          isOpen
            ? 'bg-black/60 backdrop-blur-xs opacity-100 pointer-events-auto'
            : dragY > 0
            ? 'bg-black/50 pointer-events-none'
            : 'opacity-0 pointer-events-none'
        }`}
        style={
          !isOpen && dragY > 0
            ? { opacity: Math.min(0.6, (dragY / 120) * 0.6) }
            : undefined
        }
        onClick={handleClose}
      />

      {/* PEEKING TAB: Seamless extension of Header */}
      {!isOpen && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="fixed top-16 left-0 right-0 z-35 flex justify-center select-none touch-none cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate3d(0, ${dragY}px, 0)`,
            transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            className="flex flex-col items-center px-4 pt-0.5 pb-1.5 bg-white/95 backdrop-blur-md rounded-b-2xl border-x border-b border-black/8 shadow-2xs hover:bg-white active:bg-slate-50 transition-colors"
            style={{
              boxShadow:
                dragY > 0
                  ? '0 6px 18px -2px rgba(0,0,0,0.12)'
                  : '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <div className="w-8 h-1 rounded-full bg-slate-300 mb-1" />
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 tracking-tight leading-none">
              <QrCode className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Tarik QRIS</span>
              <ChevronDown
                className="w-3.5 h-3.5 text-[#007AFF] transition-transform duration-100"
                style={{
                  transform: `translateY(${pullProgress * 3}px)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* FULL QRIS CARD OVERLAY */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none touch-none ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          transform: isOpen
            ? `translate3d(0, ${Math.min(0, dragY)}px, 0)`
            : 'translate3d(0, -115%, 0)',
          opacity: isOpen
            ? dragY < 0
              ? Math.max(0.4, 1 - Math.abs(dragY) / 160)
              : 1
            : 0,
          transition: isDragging
            ? 'none'
            : isOpen
            ? 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out'
            : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.18s ease-in',
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full max-w-xs sm:max-w-sm max-h-[min(540px,88vh)] bg-white rounded-3xl shadow-2xl border border-black/10 flex flex-col overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            boxShadow:
              '0 24px 48px -12px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Card Top: Status & Close Button */}
          <div className="relative pt-3 pb-2 px-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                QRIS Pembayaran Resmi
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="relative w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95 before:content-[''] before:absolute before:-inset-2.5 before:z-10"
              title="Tutup QRIS (Geser ke atas)"
              aria-label="Tutup QRIS"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* QRIS Image Surface */}
          <div className="p-3 bg-slate-50 flex items-center justify-center overflow-hidden flex-1 min-h-0">
            <div className="w-full max-w-[340px] bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/80 flex items-center justify-center">
              <img
                src={activeSrc}
                alt="QRIS Pembayaran Resmi"
                className="w-full h-auto max-h-[min(340px,46vh)] object-contain rounded-xl select-none pointer-events-none"
                loading="eager"
                onError={handleImageError}
              />
            </div>
          </div>

          {/* Bottom Swipe-Up Return Bar */}
          <div className="pt-2.5 pb-3 px-4 bg-white border-t border-slate-100 flex flex-col items-center justify-center text-slate-500">
            <div className="w-10 h-1.5 rounded-full bg-slate-300 mb-1" />
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <ChevronUp className="w-3.5 h-3.5 text-[#007AFF] animate-bounce" />
              <span>Geser ke atas untuk kembali</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
