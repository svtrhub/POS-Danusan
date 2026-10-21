import { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, QueuedOrder, OrderItem, DraftState } from '../types';

const INITIAL_DRAFT: DraftState = {
  cart: {},
  discountEnabled: false,
  discount: 0,
  payment: 'QRIS',
  photoBase64: '',
};

export interface ActiveOrderItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export function useOrderSession(products: Product[]) {
  const [draft, setDraft] = useState<DraftState>(() => {
    try {
      const saved = sessionStorage.getItem('POS_DRAFT');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return INITIAL_DRAFT;
  });

  // Sync draft to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('POS_DRAFT', JSON.stringify(draft));
    } catch (_) {}
  }, [draft]);

  // Derived metrics
  const activeItems = useMemo<ActiveOrderItem[]>(() => {
    return products
      .filter((p) => (draft.cart[p.id] || 0) > 0)
      .map((p) => ({
        product: p,
        quantity: draft.cart[p.id],
        subtotal: p.price * draft.cart[p.id],
      }));
  }, [products, draft.cart]);

  const { totalQty, grossTotal, netTotal } = useMemo(() => {
    let qty = 0;
    let gross = 0;
    activeItems.forEach((item) => {
      qty += item.quantity;
      gross += item.subtotal;
    });
    const disc = draft.discountEnabled ? draft.discount || 0 : 0;
    const net = Math.max(0, gross - disc);
    return { totalQty: qty, grossTotal: gross, netTotal: net };
  }, [activeItems, draft.discountEnabled, draft.discount]);

  const hasPhoto = Boolean(draft.photoBase64);
  const isSubmitDisabled = totalQty === 0 || !hasPhoto;

  const submitButtonText = useMemo(() => {
    if (totalQty === 0) return 'Pilih Menu';
    if (!hasPhoto) {
      return draft.payment === 'QRIS' ? 'Wajib Foto Bukti QRIS' : 'Wajib Foto Bukti Tunai';
    }
    return 'Simpan Pesanan';
  }, [totalQty, hasPhoto, draft.payment]);

  // Actions
  const increment = useCallback((productId: string) => {
    setDraft((prev) => ({
      ...prev,
      cart: {
        ...prev.cart,
        [productId]: (prev.cart[productId] || 0) + 1,
      },
    }));
  }, []);

  const decrement = useCallback((productId: string) => {
    setDraft((prev) => {
      const current = prev.cart[productId] || 0;
      const nextCart = { ...prev.cart };
      if (current <= 1) {
        delete nextCart[productId];
      } else {
        nextCart[productId] = current - 1;
      }
      return { ...prev, cart: nextCart };
    });
  }, []);

  const clearCart = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      cart: {},
      discountEnabled: false,
      discount: 0,
      photoBase64: '',
    }));
  }, []);

  const setPaymentMethod = useCallback((method: 'QRIS' | 'Cash') => {
    setDraft((prev) => ({ ...prev, payment: method }));
  }, []);

  const setPhotoBase64 = useCallback((base64: string) => {
    setDraft((prev) => ({ ...prev, photoBase64: base64 }));
  }, []);

  const toggleDiscount = useCallback((enabled: boolean) => {
    setDraft((prev) => ({
      ...prev,
      discountEnabled: enabled,
      discount: enabled ? prev.discount || 1000 : 0,
    }));
  }, []);

  const setDiscountAmount = useCallback((amount: number) => {
    setDraft((prev) => ({
      ...prev,
      discountEnabled: true,
      discount: Math.max(0, amount),
    }));
  }, []);

  // Format exact payload required by Google Sheets Apps Script
  const buildOrderPayload = useCallback((): QueuedOrder | null => {
    const items: OrderItem[] = activeItems.map((item) => ({
      name: item.product.name,
      qty: item.quantity,
      unit_price: item.product.price,
    }));

    if (!items.length || !draft.photoBase64) {
      return null;
    }

    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const orderId = `${d.getTime().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 5)
      .toUpperCase()}`;

    return {
      action: 'submitOrder',
      order_id: orderId,
      timestamp,
      payment_method: draft.payment,
      discount_total: draft.discountEnabled ? draft.discount || 0 : 0,
      items,
      photo_base64: draft.photoBase64,
      photo_mime: 'image/jpeg',
    };
  }, [activeItems, draft.photoBase64, draft.payment, draft.discountEnabled, draft.discount]);

  const resetAfterSubmit = useCallback(() => {
    setDraft((prev) => ({
      cart: {},
      discountEnabled: false,
      discount: 0,
      payment: prev.payment,
      photoBase64: '',
    }));
  }, []);

  return {
    draft,
    activeItems,
    totalQty,
    grossTotal,
    netTotal,
    hasPhoto,
    isSubmitDisabled,
    submitButtonText,
    increment,
    decrement,
    clearCart,
    setPaymentMethod,
    setPhotoBase64,
    toggleDiscount,
    setDiscountAmount,
    buildOrderPayload,
    resetAfterSubmit,
  };
}
