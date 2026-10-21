import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  onIncrement,
  onDecrement,
}) => {
  const isActive = quantity > 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent double-increment if user tapped stepper directly
    if ((e.target as HTMLElement).closest('[data-stepper]')) {
      return;
    }
    triggerHaptic('medium');
    onIncrement(product.id);
  };

  const handleMinusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(quantity === 1 ? 'warning' : 'light');
    onDecrement(product.id);
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    onIncrement(product.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`pressable relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl cursor-pointer select-none touch-manipulation transition-all duration-150 active:scale-[0.985] min-h-[120px] sm:min-h-[124px] ${
        isActive
          ? 'bg-blue-50/80 border-2 border-[#007AFF] shadow-xs'
          : 'bg-white border border-black/8 hover:border-black/15 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
      }`}
    >
      {/* Top Details */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-1.5 min-h-[2.5rem]">
          <span className="text-[14px] sm:text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">
            {product.name}
          </span>
        </div>
        <div className="text-[13px] font-medium text-slate-500 num tracking-tight">
          Rp {Number(product.price).toLocaleString('id-ID')}
        </div>
      </div>

      {/* Apple Native Stepper Control */}
      <div
        data-stepper="true"
        className={`flex items-center justify-between mt-2.5 px-1.5 py-1 rounded-xl h-10 transition-colors select-none touch-manipulation ${
          isActive ? 'bg-blue-100/60' : 'bg-[#F2F2F7]'
        }`}
      >
        <button
          type="button"
          onClick={handleMinusClick}
          disabled={!isActive}
          className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold transition active:scale-90 before:content-[''] before:absolute before:-inset-2 before:z-10 touch-manipulation ${
            isActive
              ? 'bg-white text-rose-600 shadow-2xs hover:bg-rose-50'
              : 'opacity-20 text-slate-400 cursor-not-allowed'
          }`}
          aria-label="Kurang satu"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <span
          className={`text-[15px] font-bold num select-none px-1 ${
            isActive ? 'text-[#007AFF]' : 'text-slate-400'
          }`}
        >
          {quantity}
        </span>

        <button
          type="button"
          onClick={handlePlusClick}
          className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold transition active:scale-90 before:content-[''] before:absolute before:-inset-2 before:z-10 touch-manipulation ${
            isActive
              ? 'bg-[#007AFF] text-white shadow-2xs hover:bg-blue-600'
              : 'bg-white text-slate-800 shadow-2xs hover:bg-slate-50'
          }`}
          aria-label="Tambah satu"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
