import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { NumericQuantityInput } from './NumericQuantityInput';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  onIncrement,
  onDecrement,
  onQuantityChange,
}) => {
  const isActive = quantity > 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent double-increment if user tapped stepper directly
    if ((e.target as HTMLElement).closest('[data-stepper]')) {
      return;
    }
    triggerHaptic('cart_add');
    onIncrement(product.id);
  };

  const handleMinusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(quantity === 1 ? 'warning' : 'light');
    onDecrement(product.id);
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('cart_add');
    onIncrement(product.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`pressable relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl cursor-pointer select-none touch-manipulation transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] min-h-[120px] sm:min-h-[124px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${
        isActive
          ? 'bg-[#EAF3FF]'
          : 'bg-white hover:bg-white/95'
      }`}
    >
      {/* Top Details */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-1.5 min-h-[2.5rem]">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[#1C1C1E] leading-snug line-clamp-2 tracking-[-0.01em]">
            {product.name}
          </span>
        </div>
        <div className="text-[13px] font-medium text-[#636366] font-mono tabular-nums tracking-tight">
          Rp {Number(product.price).toLocaleString('id-ID')}
        </div>
      </div>

      {/* Apple Native Stepper Control */}
      <div
        data-stepper="true"
        className={`flex items-center justify-between mt-2.5 px-1.5 py-1 rounded-xl h-10 transition-colors duration-150 select-none touch-manipulation ${
          isActive ? 'bg-[#007AFF]/10' : 'bg-[#F2F2F7]'
        }`}
      >
        <button
          type="button"
          onClick={handleMinusClick}
          disabled={!isActive}
          className={`pressable relative w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-colors before:content-[''] before:absolute before:-inset-2 before:z-10 ${
            isActive
              ? 'bg-white text-[#FF3B30] hover:bg-rose-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
              : 'opacity-25 text-[#8E8E93] cursor-not-allowed'
          }`}
          aria-label="Kurang satu"
        >
          <Minus className="w-4 h-4 stroke-[2.3]" />
        </button>

        <NumericQuantityInput
          quantity={quantity}
          onQuantityChange={(qty) => onQuantityChange(product.id, qty)}
          ariaLabel={`Jumlah ${product.name}`}
          className={`w-12 h-8 text-center text-base sm:text-[15px] rounded-lg bg-transparent focus:bg-white focus:ring-2 focus:ring-[#007AFF]/25 outline-none transition-colors selection:bg-blue-200 font-mono tabular-nums ${
            isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'
          }`}
        />

        <button
          type="button"
          onClick={handlePlusClick}
          className={`pressable relative w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-colors before:content-[''] before:absolute before:-inset-2 before:z-10 ${
            isActive
              ? 'bg-[#007AFF] text-white hover:bg-[#0062E0] shadow-[0_1px_2px_rgba(0,122,255,0.25)]'
              : 'bg-white text-[#1C1C1E] hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
          }`}
          aria-label="Tambah satu"
        >
          <Plus className="w-4 h-4 stroke-[2.3]" />
        </button>
      </div>
    </div>
  );
};
