import React from 'react';
import { Tag } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface DiscountDrawerProps {
  enabled: boolean;
  discount: number;
  onToggle: (enabled: boolean) => void;
  onSelectPreset: (amount: number) => void;
  onCustomChange: (amount: number) => void;
}

export const DiscountDrawer: React.FC<DiscountDrawerProps> = ({
  enabled,
  discount,
  onToggle,
  onSelectPreset,
  onCustomChange,
}) => {
  const presets = [1000, 2000, 3000, 5000];

  return (
    <div className="bg-[#F2F2F7] border border-black/5 rounded-xl p-2 transition-all">
      {/* Header Row: Clean Toggle */}
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              triggerHaptic('selection');
              onToggle(e.target.checked);
            }}
            className="w-4 h-4 rounded text-[#007AFF] focus:ring-[#007AFF] accent-[#007AFF] cursor-pointer"
          />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Tag className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>Diskon Transaksi</span>
          </div>
        </label>

        {enabled && (
          <span className="text-xs font-bold text-[#007AFF] bg-blue-100/70 px-2 py-0.5 rounded-full num">
            -Rp {Number(discount || 0).toLocaleString('id-ID')}
          </span>
        )}
      </div>

      {/* Preset & Custom Drawer */}
      {enabled && (
        <div className="mt-2 pt-2 border-t border-black/5 grid grid-cols-5 gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onSelectPreset(preset);
              }}
              className={`pressable h-8 rounded-lg text-xs font-semibold num transition-all active:scale-95 touch-manipulation ${
                discount === preset
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-black/5 shadow-2xs'
              }`}
            >
              {preset / 1000}k
            </button>
          ))}

          <input
            type="number"
            inputMode="numeric"
            value={presets.includes(discount) ? '' : discount || ''}
            onChange={(e) => onCustomChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder="Rp..."
            className="h-7 w-full rounded-lg bg-white border border-black/8 px-2 text-xs font-medium text-right text-slate-800 num focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
          />
        </div>
      )}
    </div>
  );
};
