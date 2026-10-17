import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2, ShoppingBag } from 'lucide-react';

import { Product, QueuedOrder, DraftState, OrderItem } from './types';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { PaymentDock } from './components/PaymentDock';
import { SettingsModal } from './components/SettingsModal';
import { PhotoModal } from './components/PhotoModal';
import { PWAExplainModal } from './components/PWAExplainModal';
import { usePWAInstall } from './hooks/usePWAInstall';

const DEFAULT_MENU: Product[] = [
  { id: 'p1', name: 'Piscok', original_name: 'Piscok', price: 5000 },
  { id: 'p2', name: 'Risol', original_name: 'Risol', price: 6000 },
  { id: 'p3', name: 'Risol Bundle', original_name: 'Risol Bundle', price: 15000 },
  { id: 'p4', name: 'Es Teh', original_name: 'Es Teh', price: 5000 },
  { id: 'p5', name: 'Es Kopi', original_name: 'Es Kopi', price: 12000 },
  { id: 'p6', name: 'Tarot Reading', original_name: 'Tarot Reading', price: 10000 },
  { id: 'p7', name: 'Es Degan', original_name: 'Es Degan', price: 10000 },
  { id: 'p8', name: 'Tahu Bakso', original_name: 'Tahu Bakso', price: 5000 },
  { id: 'p9', name: 'Air Mineral', original_name: 'Air Mineral', price: 3000 },
];

function loadSafeMenu(): Product[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('POS_MENU') || 'null');
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (_) {}
  localStorage.setItem('POS_MENU', JSON.stringify(DEFAULT_MENU));
  return JSON.parse(JSON.stringify(DEFAULT_MENU));
}

function loadSafeDraft(): DraftState {
  try {
    const parsed = JSON.parse(sessionStorage.getItem('POS_DRAFT') || 'null');
    if (parsed && typeof parsed === 'object') {
      return {
        cart: parsed.cart || {},
        discountEnabled: Boolean(parsed.discountEnabled),
        discount: Number(parsed.discount) || 0,
        payment: parsed.payment === 'Cash' ? 'Cash' : 'QRIS',
        photoBase64: parsed.photoBase64 || '',
      };
    }
  } catch (_) {}
  return {
    cart: {},
    discountEnabled: false,
    discount: 0,
    payment: 'QRIS',
    photoBase64: '',
  };
}

export default function App() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Core application states
  const [products, setProducts] = useState<Product[]>(loadSafeMenu);
  const [apiUrl, setApiUrl] = useState<string>(() => localStorage.getItem('POS_API_URL') || '');
  const [queue, setQueue] = useState<QueuedOrder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('POS_QUEUE') || '[]');
    } catch (_) {
      return [];
    }
  });
  const [draft, setDraft] = useState<DraftState>(loadSafeDraft);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasSyncError, setHasSyncError] = useState<boolean>(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isPWAExplainOpen, setIsPWAExplainOpen] = useState(false);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2000);
  }, []);

  // Sync draft to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('POS_DRAFT', JSON.stringify(draft));
    } catch (_) {}
  }, [draft]);

  // Sync queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('POS_QUEUE', JSON.stringify(queue));
    } catch (_) {}
  }, [queue]);

  // Background queue sync process
  const processQueue = useCallback(async () => {
    const currentQueue: QueuedOrder[] = JSON.parse(localStorage.getItem('POS_QUEUE') || '[]');
    const currentUrl = localStorage.getItem('POS_API_URL') || '';

    if (!currentUrl || !currentQueue.length || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setHasSyncError(false);

    let activeQueue: QueuedOrder[] = [...currentQueue];

    while (activeQueue.length > 0) {
      const itemToSync = activeQueue[0];
      try {
        const res = await fetch(currentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(itemToSync),
        });
        const data = await res.json();
        if (data.status === 'ok') {
          activeQueue.shift();
          setQueue([...activeQueue]);
          localStorage.setItem('POS_QUEUE', JSON.stringify(activeQueue));
        } else {
          throw new Error('Google Apps Script status not ok');
        }
      } catch (err) {
        console.warn('Queue sync error:', err);
        setHasSyncError(true);
        setIsSyncing(false);
        return;
      }
    }

    setIsSyncing(false);
    setHasSyncError(false);
    showToast('✓ Semua transaksi tersinkron ke Sheet');
  }, [isSyncing, showToast]);

  // Auto-sync on mount if queue exists
  useEffect(() => {
    if (queue.length > 0 && apiUrl) {
      processQueue();
    }
  }, []);

  // Totals calculations
  const { totalQty, grossTotal, netTotal } = useMemo(() => {
    let qty = 0;
    let gross = 0;
    products.forEach((p) => {
      const count = draft.cart[p.id] || 0;
      if (count > 0) {
        qty += count;
        gross += count * p.price;
      }
    });
    const disc = draft.discountEnabled ? draft.discount || 0 : 0;
    const net = Math.max(0, gross - disc);
    return { totalQty: qty, grossTotal: gross, netTotal: net };
  }, [products, draft.cart, draft.discountEnabled, draft.discount]);

  // Cart operations
  const handleIncrement = (productId: string) => {
    setDraft((prev) => ({
      ...prev,
      cart: {
        ...prev.cart,
        [productId]: (prev.cart[productId] || 0) + 1,
      },
    }));
  };

  const handleDecrement = (productId: string) => {
    setDraft((prev) => {
      const cur = prev.cart[productId] || 0;
      const nextCart = { ...prev.cart };
      if (cur <= 1) {
        delete nextCart[productId];
      } else {
        nextCart[productId] = cur - 1;
      }
      return { ...prev, cart: nextCart };
    });
  };

  const handleResetCart = () => {
    setDraft((prev) => ({
      cart: {},
      discountEnabled: false,
      discount: 0,
      payment: prev.payment,
      photoBase64: '',
    }));
    showToast('Keranjang direset');
  };

  // Submit order handler (EXACT backend format)
  const handleSubmitOrder = () => {
    const items: OrderItem[] = [];
    products.forEach((p) => {
      const q = draft.cart[p.id] || 0;
      if (q > 0) {
        items.push({ name: p.name, qty: q, unit_price: p.price });
      }
    });

    if (!items.length || !draft.photoBase64) {
      return;
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

    const newOrder: QueuedOrder = {
      action: 'submitOrder',
      order_id: orderId,
      timestamp,
      payment_method: draft.payment,
      discount_total: draft.discountEnabled ? draft.discount || 0 : 0,
      items,
      photo_base64: draft.photoBase64,
      photo_mime: 'image/jpeg',
    };

    // Add to queue
    const updatedQueue = [...queue, newOrder];
    setQueue(updatedQueue);
    localStorage.setItem('POS_QUEUE', JSON.stringify(updatedQueue));

    // Clear cart
    setDraft({
      cart: {},
      discountEnabled: false,
      discount: 0,
      payment: draft.payment,
      photoBase64: '',
    });

    showToast(apiUrl ? '✓ Pesanan Berhasil Disimpan!' : '✓ Masuk Antrean (Atur URL di ⚙️)');

    // Trigger queue sync
    setTimeout(() => {
      processQueue();
    }, 100);
  };

  // Settings Save Handler (EXACT saveProducts format)
  const handleSaveSettings = async (newUrl: string, updatedProducts: Product[]) => {
    setApiUrl(newUrl);
    localStorage.setItem('POS_API_URL', newUrl);
    setProducts(updatedProducts);
    localStorage.setItem('POS_MENU', JSON.stringify(updatedProducts));

    if (newUrl) {
      try {
        const res = await fetch(newUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveProducts', products: updatedProducts }),
        });
        const data = await res.json();
        if (data.status === 'ok' && Array.isArray(data.products) && data.products.length > 0) {
          const formatted = data.products.map((p: Product) => ({ ...p, original_name: p.name }));
          setProducts(formatted);
          localStorage.setItem('POS_MENU', JSON.stringify(formatted));
          showToast('✓ Menu Berhasil Disinkronkan ke Sheet');
        }
      } catch (err) {
        console.warn('Sync products error:', err);
      }
      processQueue();
    }
  };

  // Pull Sheet Handler (EXACT getConfig format)
  const handlePullSheet = async (targetUrl?: string): Promise<Product[] | null> => {
    const url = targetUrl || apiUrl;
    if (!url) return null;
    const res = await fetch(`${url}?action=getConfig`);
    const data = await res.json();
    if (Array.isArray(data.products) && data.products.length > 0) {
      const formatted = data.products.map((p: Product) => ({ ...p, original_name: p.name }));
      setProducts(formatted);
      localStorage.setItem('POS_MENU', JSON.stringify(formatted));
      return formatted;
    }
    return null;
  };

  const handleSyncPillClick = () => {
    if (!apiUrl) {
      setIsSettingsOpen(true);
    } else {
      processQueue();
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pt-16 pb-60 font-sans select-none overscroll-none">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-white/10 flex items-center gap-1.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <Header
        queueLength={queue.length}
        isSyncing={isSyncing}
        apiUrl={apiUrl}
        hasSyncError={hasSyncError}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onSyncClick={handleSyncPillClick}
        onResetCart={handleResetCart}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPWAInfo={() => setIsPWAExplainOpen(true)}
      />

      {/* Minimalist Product Grid */}
      <main className="w-full max-w-xl mx-auto px-3.5 pt-1">
        <div className="grid grid-cols-2 gap-2.5">
          {products.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              quantity={draft.cart[prod.id] || 0}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
            />
          ))}
        </div>
      </main>

      {/* Bottom Sticky Payment Dock */}
      <PaymentDock
        totalQty={totalQty}
        netTotal={netTotal}
        paymentMethod={draft.payment}
        photoBase64={draft.photoBase64}
        discountEnabled={draft.discountEnabled}
        discount={draft.discount}
        onPaymentChange={(method) => setDraft((p) => ({ ...p, payment: method }))}
        onPhotoCaptured={(base64) => setDraft((p) => ({ ...p, photoBase64: base64 }))}
        onViewPhoto={() => setIsPhotoOpen(true)}
        onToggleDiscount={(enabled) =>
          setDraft((p) => ({
            ...p,
            discountEnabled: enabled,
            discount: enabled ? p.discount || 1000 : 0,
          }))
        }
        onSelectDiscountPreset={(preset) =>
          setDraft((p) => ({ ...p, discountEnabled: true, discount: preset }))
        }
        onCustomDiscountChange={(custom) =>
          setDraft((p) => ({ ...p, discountEnabled: true, discount: custom }))
        }
        onSubmit={handleSubmitOrder}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        apiUrl={apiUrl}
        products={products}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* Photo Preview Modal */}
      <PhotoModal
        isOpen={isPhotoOpen}
        photoBase64={draft.photoBase64}
        onClose={() => setIsPhotoOpen(false)}
        onRetake={() => {
          setDraft((p) => ({ ...p, photoBase64: '' }));
          setTimeout(() => {
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.click();
          }, 100);
        }}
        onDelete={() => {
          setDraft((p) => ({ ...p, photoBase64: '' }));
          showToast('Foto dihapus');
        }}
      />

      {/* PWA Explanation & Guide Modal */}
      <PWAExplainModal
        isOpen={isPWAExplainOpen}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        onClose={() => setIsPWAExplainOpen(false)}
        onInstall={install}
      />
    </div>
  );
}
