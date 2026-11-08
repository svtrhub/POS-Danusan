import React, { useState, useEffect, useRef } from 'react';
import { triggerHaptic } from '../utils/haptics';

interface NumericQuantityInputProps {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  className?: string;
  ariaLabel?: string;
}

export const NumericQuantityInput: React.FC<NumericQuantityInputProps> = ({
  quantity,
  onQuantityChange,
  className = '',
  ariaLabel = 'Jumlah pesanan',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>(String(quantity));
  const isFirstTouchRef = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(String(quantity));
    }
  }, [quantity, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setDisplayValue(String(quantity));
    triggerHaptic('light');
    isFirstTouchRef.current = true;
    const input = e.currentTarget;
    input.select();
    setTimeout(() => {
      input.select();
    }, 25);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isFirstTouchRef.current) {
      isFirstTouchRef.current = false;
      e.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow pure digits
    const digits = e.target.value.replace(/[^0-9]/g, '');
    // Cap length to 3 digits (max 999)
    setDisplayValue(digits.slice(0, 3));
  };

  const commitValue = () => {
    setIsFocused(false);
    const parsed = parseInt(displayValue, 10);
    const nextQty = isNaN(parsed) || parsed <= 0 ? 0 : Math.min(999, parsed);

    if (nextQty !== quantity) {
      triggerHaptic(nextQty > 0 ? 'medium' : 'warning');
      onQuantityChange(nextQty);
    }
    setDisplayValue(String(nextQty));
  };

  const handleBlur = () => {
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent clicking on the input from triggering parent card click/increment
    e.stopPropagation();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      autoCorrect="off"
      spellCheck="false"
      aria-label={ariaLabel}
      value={isFocused ? displayValue : String(quantity)}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={`touch-manipulation select-all cursor-text font-bold num ${className}`}
    />
  );
};
