import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Product, TeamDivision } from './types';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { PaymentDock } from './components/PaymentDock';
import { SettingsModal } from './components/SettingsModal';
import { PhotoModal } from './components/PhotoModal';
import { PWAExplainModal } from './components/PWAExplainModal';
import { QRISPullCard } from './components/QRISPullCard';
import { TabletOrderPanel } from './components/TabletOrderPanel';
import { TransactionHistoryModal } from './components/TransactionHistoryModal';
import { CameraActionSheet } from './components/CameraActionSheet';
import {
  LiquidGlassToast,
  ToastNotification,
  ToastVariant,
  inferToastVariant,
} from './components/LiquidGlassToast';

import { useOrderSession } from './hooks/useOrderSession';
import { useSyncEngine } from './hooks/useSyncEngine';
import { usePWAInstall } from './hooks/usePWAInstall';
import { DEFAULT_QRIS_DATA } from './assets/defaultQrisData';
import { playSuccessSound } from './utils/sound';
import { triggerHaptic } from './utils/haptics';
import { saveOrderToLocalHistory } from './utils/historyStorage';
import { getCatalog, saveCatalog } from './services/indexedDBStorage';
import { BlobRegistry } from './utils/blobRegistry';
import { formatBytes } from './utils/media';

const DEFAULT_MENU: Product[] = [
  { id: 'teama_gabin', name: 'Gabin', original_name: 'Gabin', price: 5000, is_custom: false },
  { id: 'teama_bomboloni_premium', name: 'Bomboloni Premium', original_name: 'Bomboloni Premium', price: 5000, is_custom: false },
  { id: 'teama_jasuke', name: 'Jasuke', original_name: 'Jasuke', price: 5000, is_custom: false },
  { id: 'teama_es_teh', name: 'Es Teh', original_name: 'Es Teh', price: 5000, is_custom: false },
  { id: 'teama_thai_tea', name: 'Thai Tea', original_name: 'Thai Tea', price: 5000, is_custom: false },
];

const MENU_VERSION = 'v3_master_gabin';

function loadSafeMenu(): Product[] {
  try {
    const version = localStorage.getItem('POS_MENU_VER');
    if (version !== MENU_VERSION) {
      localStorage.setItem('POS_MENU_VER', MENU_VERSION);
      localStorage.setItem('POS_MENU', JSON.stringify(DEFAULT_MENU));
      return JSON.parse(JSON.stringify(DEFAULT_MENU));
    }
    const parsed = JSON.parse(localStorage.getItem('POS_MENU') || 'null');
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (_) {}
  localStorage.setItem('POS_MENU', JSON.stringify(DEFAULT_MENU));
  return JSON.parse(JSON.stringify(DEFAULT_MENU));
}

export default function App() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Menu catalog state
  const [products, setProducts] = useState<Product[]>(loadSafeMenu);

  // Connectivity state for real-time offline awareness
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Deep architectural modules: OrderSession & SyncEngine
  const orderSession = useOrderSession(products);
  const sync = useSyncEngine();

  // Modals & Scroll State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isRetakeActionOpen, setIsRetakeActionOpen] = useState(false);
  const [isPWAExplainOpen, setIsPWAExplainOpen] = useState(false);
  const [isCatalogScrolled, setIsCatalogScrolled] = useState(false);

  // Custom QRIS image state (Baked-in official default on any new device)
  const [customQrisImage, setCustomQrisImage] = useState<string>(
    () => localStorage.getItem('POS_QRIS_IMAGE') || DEFAULT_QRIS_DATA
  );

  // Toast feedback (with safe timeout cancellation & semantic variants)
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((msg: string, variant?: ToastVariant) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    const id = ++toastIdRef.current;
    setToast({
      id,
      message: msg,
      variant: variant ?? inferToastVariant(msg),
    });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
      toastTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleSaveQrisImage = (base64: string) => {
    setCustomQrisImage(base64);
    localStorage.setItem('POS_QRIS_IMAGE', base64);
    showToast('Gambar QRIS kustom tersimpan', 'success');
  };

  const handleResetQrisImage = () => {
    localStorage.removeItem('POS_QRIS_IMAGE');
    setCustomQrisImage(DEFAULT_QRIS_DATA);
    showToast('Kembali ke QRIS bawaan', 'info');
  };

  const handleToggleBatterySaver = (enabled: boolean) => {
    sync.setBatterySaver(enabled);
    showToast(
      enabled
        ? 'Mode Hemat Baterai aktif (animasi & auto-sync dijeda)'
        : 'Mode Hemat Baterai nonaktif',
      'info'
    );
  };

  // Rehydrate catalog from IndexedDB disk on mount and background-sync with sheet if online
  useEffect(() => {
    let isMounted = true;
    getCatalog()
      .then(async (dbCatalog) => {
        if (!isMounted) return;
        const initialMenu = dbCatalog && dbCatalog.length > 0 ? dbCatalog : loadSafeMenu();
        setProducts(initialMenu);

        // Auto background sync from central sheet matrix if connected
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            const synced = await sync.fetchMenuFromCentralSheet(
              sync.team,
              initialMenu,
              true
            );
            if (isMounted && synced && synced.length > 0) {
              setProducts(synced);
              localStorage.setItem('POS_MENU', JSON.stringify(synced));
              saveCatalog(synced).catch(() => {});
            }
          } catch (err) {
            console.warn('Initial central sheet sync silent fallback:', err);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load catalog from IndexedDB:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Team change with automatic cart wipe, instant activation URL switch, and cached menu swap
  const handleTeamChange = useCallback((newTeam: TeamDivision) => {
    orderSession.clearCart();
    sync.setTeam(newTeam);
    const cachedMenu = sync.getCachedMenuForTeam(newTeam);
    if (cachedMenu && cachedMenu.length > 0) {
      setProducts(cachedMenu);
      localStorage.setItem('POS_MENU', JSON.stringify(cachedMenu));
      saveCatalog(cachedMenu).catch(() => {});
    }
    showToast(`${newTeam} aktif · Link aktivasi diperbarui`, 'info');
  }, [orderSession, sync, showToast]);

  const handleFetchMenu = useCallback(
    async (
      teamToFetch: TeamDivision,
      existingProducts?: Product[],
      preserveCustom = true
    ): Promise<Product[]> => {
      const baseProducts =
        existingProducts && existingProducts.length > 0
          ? existingProducts
          : sync.getCachedMenuForTeam(teamToFetch) || products;
      const fetched = await sync.fetchMenuFromCentralSheet(
        teamToFetch,
        baseProducts,
        preserveCustom
      );
      if (fetched && fetched.length > 0) {
        setProducts(fetched);
        localStorage.setItem('POS_MENU', JSON.stringify(fetched));
        saveCatalog(fetched).catch(() => {});
        sync.saveCachedMenuForTeam(teamToFetch, fetched);
      }
      return fetched;
    },
    [sync, products]
  );

  // Listen for background auto-sync completion events
  useEffect(() => {
    const handleSyncSuccess = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      const count = customEvent.detail?.count || 1;
      showToast(`✓ ${count} pesanan offline berhasil disinkronkan ke Sheet!`);
    };

    window.addEventListener('pos-sync-success', handleSyncSuccess);
    return () => {
      window.removeEventListener('pos-sync-success', handleSyncSuccess);
    };
  }, [showToast]);

  // Submit order handler
  const handleSubmitOrder = () => {
    const orderPayload = orderSession.buildOrderPayload();
    if (!orderPayload) return;

    triggerHaptic('checkout');
    saveOrderToLocalHistory(orderPayload);
    sync.enqueue(orderPayload);
    orderSession.resetAfterSubmit();
    BlobRegistry.clearAll();
    showToast(
      sync.apiUrl ? '✓ Pesanan Berhasil Disimpan!' : '✓ Masuk Antrean (Atur URL di Menu)',
      sync.apiUrl ? 'success' : 'info'
    );
  };

  // Settings Save Handler (Instant offline save to IndexedDB, online sync when connected)
  const handleSaveSettings = async (
    newUrl: string,
    updatedProducts: Product[],
    targetTeam?: TeamDivision
  ) => {
    const activeTeam = targetTeam || sync.team;
    sync.setApiUrl(newUrl, activeTeam);
    setProducts(updatedProducts);
    localStorage.setItem('POS_MENU', JSON.stringify(updatedProducts));
    saveCatalog(updatedProducts).catch(() => {});
    sync.saveCachedMenuForTeam(activeTeam, updatedProducts);

    if (!navigator.onLine) {
      showToast('✓ Menu tersimpan di perangkat (Mode Offline)', 'info');
      return;
    }

    const resolvedUrl = newUrl || sync.getActivationUrlForTeam(activeTeam);
    if (resolvedUrl) {
      const synced = await sync.saveProductsToSheet(resolvedUrl, updatedProducts);
      if (synced && synced.length > 0) {
        setProducts(synced);
        localStorage.setItem('POS_MENU', JSON.stringify(synced));
        saveCatalog(synced).catch(() => {});
        sync.saveCachedMenuForTeam(activeTeam, synced);
        showToast('✓ Menu Berhasil Disinkronkan ke Sheet', 'success');
      }
      sync.processQueue();
    }
  };

  const handleSyncPillClick = () => {
    if (!sync.apiUrl) {
      setIsSettingsOpen(true);
    } else {
      sync.processQueue();
    }
  };

  const handlePhotoCaptured = (photo: string, sizeBytes?: number) => {
    if (photo && photo.startsWith('blob:')) {
      BlobRegistry.register(photo);
    }
    const isReplacing = Boolean(orderSession.draft.photoBase64);
    orderSession.setPhotoBase64(photo);
    const sizeNote = sizeBytes ? ` (${formatBytes(sizeBytes)})` : '';
    showToast(isReplacing ? `Foto bukti diperbarui${sizeNote}` : `Foto bukti disimpan${sizeNote}`);
  };

  const handlePhotoError = useCallback(
    (msg: string) => {
      showToast(msg, 'error');
    },
    [showToast]
  );

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#F5F5F7] flex flex-col font-sans select-none overflow-hidden overscroll-none">
      {/* Liquid Glass Pill Notification */}
      <LiquidGlassToast toast={toast} onDismiss={dismissToast} />

      {/* Header (Compact 56px translucent bar) */}
      <Header
        queueLength={sync.queueLength}
        pendingTextCount={sync.pendingTextCount}
        pendingPhotoCount={sync.pendingPhotoCount}
        isSyncing={sync.isSyncing}
        apiUrl={sync.apiUrl}
        hasSyncError={sync.hasSyncError}
        isInstallable={isInstallable}
        isOnline={isOnline}
        isBatterySaver={sync.isBatterySaver}
        isScrolled={isCatalogScrolled}
        team={sync.team}
        onSyncClick={handleSyncPillClick}
        onResetCart={() => {
          orderSession.clearCart();
          showToast('Keranjang direset', 'info');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPWAInfo={() => setIsPWAExplainOpen(true)}
      />

      {/* Pull-down QRIS Payment Card */}
      <QRISPullCard
        customQrisImage={customQrisImage}
        onSaveQrisImage={handleSaveQrisImage}
      />

      {/* Content Area: Dynamic viewport height constraint */}
      <div className="flex-1 min-h-0 h-[calc(100dvh-56px)] max-h-[calc(100dvh-56px)] w-full max-w-7xl mx-auto flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Product Catalog (Scrollable grid taking remaining space) */}
        <main
          onScroll={(e) => {
            const scrolled = e.currentTarget.scrollTop > 8;
            setIsCatalogScrolled((prev) => (prev === scrolled ? prev : scrolled));
          }}
          className="flex-1 grow min-w-0 w-full h-full overflow-y-auto overscroll-contain px-3 sm:px-4 md:px-6 pt-2.5 sm:pt-3 md:pt-4 pb-60 md:pb-6 min-h-0"
        >
          <div className="w-full max-w-xl md:max-w-none mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3.5">
              {products.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  quantity={orderSession.draft.cart[prod.id] || 0}
                  onIncrement={orderSession.increment}
                  onDecrement={orderSession.decrement}
                  onQuantityChange={orderSession.setQuantity}
                />
              ))}
            </div>
          </div>
        </main>

        {/* Right Side: iPad / Tablet / Desktop Split Checkout Panel (w-[380px] h-full overflow-y-auto) */}
        <TabletOrderPanel
          products={products}
          cart={orderSession.draft.cart}
          totalQty={orderSession.totalQty}
          netTotal={orderSession.netTotal}
          paymentMethod={orderSession.draft.payment}
          photoBase64={orderSession.draft.photoBase64}
          onIncrement={orderSession.increment}
          onDecrement={orderSession.decrement}
          onQuantityChange={orderSession.setQuantity}
          onClearCart={() => {
            orderSession.clearCart();
            showToast('Keranjang direset', 'info');
          }}
          onPaymentChange={orderSession.setPaymentMethod}
          onPhotoCaptured={handlePhotoCaptured}
          onPhotoError={handlePhotoError}
          onViewPhoto={() => setIsPhotoOpen(true)}
          onSubmit={handleSubmitOrder}
        />
      </div>

      {/* Bottom Sticky Payment Dock (Mobile-only: md:hidden) */}
      <PaymentDock
        totalQty={orderSession.totalQty}
        netTotal={orderSession.netTotal}
        paymentMethod={orderSession.draft.payment}
        photoBase64={orderSession.draft.photoBase64}
        onPaymentChange={orderSession.setPaymentMethod}
        onPhotoCaptured={handlePhotoCaptured}
        onPhotoError={handlePhotoError}
        onViewPhoto={() => setIsPhotoOpen(true)}
        onSubmit={handleSubmitOrder}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        apiUrl={sync.apiUrl}
        products={products}
        customQrisImage={customQrisImage}
        isBatterySaver={sync.isBatterySaver}
        team={sync.team}
        getActivationUrlForTeam={sync.getActivationUrlForTeam}
        getDefaultUrlForTeam={sync.getDefaultUrlForTeam}
        getCachedMenuForTeam={sync.getCachedMenuForTeam}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onTeamChange={handleTeamChange}
        onFetchMenu={handleFetchMenu}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onSaveQrisImage={handleSaveQrisImage}
        onResetQrisImage={handleResetQrisImage}
        onToggleBatterySaver={handleToggleBatterySaver}
      />

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        isOpen={isHistoryOpen}
        apiUrl={sync.apiUrl}
        onClose={() => {
          BlobRegistry.clearAll();
          setIsHistoryOpen(false);
        }}
        onFetchHistory={sync.fetchHistoryFromSheet}
        onViewPhoto={(photo) => {
          orderSession.setPhotoBase64(photo);
          setIsPhotoOpen(true);
        }}
      />

      {/* Photo Preview Modal */}
      <PhotoModal
        isOpen={isPhotoOpen}
        photoBase64={orderSession.draft.photoBase64}
        onClose={() => {
          BlobRegistry.clearAll();
          setIsPhotoOpen(false);
        }}
        onRetake={() => {
          BlobRegistry.clearAll();
          setIsPhotoOpen(false);
          setIsRetakeActionOpen(true);
        }}
        onPhotoCaptured={handlePhotoCaptured}
        onError={handlePhotoError}
        onDelete={() => {
          BlobRegistry.clearAll();
          orderSession.setPhotoBase64('');
          setIsPhotoOpen(false);
          showToast('Foto bukti dihapus', 'info');
        }}
      />

      {/* Retake Camera & Gallery Action Sheet */}
      <CameraActionSheet
        isOpen={isRetakeActionOpen}
        onClose={() => {
          BlobRegistry.clearAll();
          setIsRetakeActionOpen(false);
        }}
        onPhotoCaptured={handlePhotoCaptured}
        onError={handlePhotoError}
        title="Ganti Bukti Pembayaran"
      />

      {/* PWA Information Modal */}
      <PWAExplainModal
        isOpen={isPWAExplainOpen}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        onInstall={install}
        onClose={() => setIsPWAExplainOpen(false)}
      />
    </div>
  );
}
