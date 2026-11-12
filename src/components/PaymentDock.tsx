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
      className={`pressable relative flex flex-col justify-between p-3 sm:p-3.5 rounded-[20px] cursor-pointer select-none touch-manipulation transition-all duration-150 active:scale-[0.985] min-h-[146px] border ${
        isActive
          ? 'bg-[#EEF5FF] border-[#CFE2FF] shadow-[0_8px_20px_rgba(0,122,255,0.08)]'
          : 'bg-white/90 border-slate-200/80 hover:border-slate-300 hover:bg-white shadow-[0_4px_12px_rgba(15,23,42,0.03)]'
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-1.5 min-h-[2.6rem]">
          <span className="text-[14px] sm:text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2 tracking-[-0.02em]">
            {product.name}
          </span>
        </div>
        <div className="text-[12.5px] sm:text-[13px] font-semibold text-slate-500 font-mono tabular-nums tracking-[-0.02em]">
          Rp {Number(product.price).toLocaleString('id-ID')}
        </div>
      </div>

      <div
        data-stepper="true"
        className={`flex items-center justify-between mt-2.5 px-1.5 py-1 rounded-xl h-10 transition-colors select-none touch-manipulation ${
          isActive ? 'bg-white/80 border border-[#D7E8FF]' : 'bg-[#F5F5F7] border border-transparent'
        }`}
      >
        <button
          type="button"
          onClick={handleMinusClick}
          disabled={!isActive}
          className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold transition active:scale-90 before:content-[''] before:absolute before:-inset-2 before:z-10 touch-manipulation ${
            isActive
              ? 'bg-white text-rose-600 hover:bg-rose-50 shadow-sm'
              : 'opacity-20 text-slate-400 cursor-not-allowed'
          }`}
          aria-label="Kurang satu"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <NumericQuantityInput
          quantity={quantity}
          onQuantityChange={(qty) => onQuantityChange(product.id, qty)}
          ariaLabel={`Jumlah ${product.name}`}
          className={`w-12 h-8 text-center text-base sm:text-[15px] rounded-lg bg-transparent focus:bg-white focus:ring-1 focus:ring-[#007AFF] outline-none transition selection:bg-blue-200 font-mono tabular-nums ${
            isActive ? 'text-[#007AFF]' : 'text-slate-400'
          }`}
        />

        <button
          type="button"
          onClick={handlePlusClick}
          className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold transition active:scale-90 before:content-[''] before:absolute before:-inset-2 before:z-10 touch-manipulation ${
            isActive
              ? 'bg-[#007AFF] text-white hover:bg-blue-600 shadow-sm shadow-blue-200'
              : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
          aria-label="Tambah satu"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
