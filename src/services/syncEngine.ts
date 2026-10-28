import { QueuedOrder, Product, SalesHistoryItem, OrderItem } from '../types';
import { markOrderSyncedLocally } from '../utils/historyStorage';
import {
  saveQueueOrder,
  removeQueueOrder,
  getAllQueueOrders,
  setConfig,
  getConfig,
  migrateFromLocalStorage,
} from './indexedDBStorage';

export interface SyncEngineState {
  queue: QueuedOrder[];
  isSyncing: boolean;
  hasSyncError: boolean;
  apiUrl: string;
  isReady: boolean;
}

type Subscriber = (state: SyncEngineState) => void;

// Network timeout constants tuned for mobile cellular & low-speed networks
const ORDER_SYNC_TIMEOUT_MS = 25000;
const FETCH_TIMEOUT_MS = 15000;

class SyncEngineService {
  private queue: QueuedOrder[] = [];
  private isSyncing = false;
  private hasSyncError = false;
  private apiUrl = '';
  private isReady = false;
  private subscribers: Set<Subscriber> = new Set();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      // 1. Run migration from legacy localStorage once if applicable
      await migrateFromLocalStorage();

      // 2. Load API URL with dual-layer bi-directional recovery (IndexedDB + localStorage)
      const idbUrl = await getConfig<string>('apiUrl');
      let localUrl = '';
      try {
        localUrl = localStorage.getItem('POS_API_URL') || '';
      } catch (_) {}

      const resolvedUrl = (idbUrl || localUrl || '').trim();
      this.apiUrl = resolvedUrl;

      // Self-heal both persistent stores if one was cleared
      if (resolvedUrl) {
        if (!idbUrl) {
          await setConfig('apiUrl', resolvedUrl).catch(() => {});
        }
        if (!localUrl) {
          try {
            localStorage.setItem('POS_API_URL', resolvedUrl);
          } catch (_) {}
        }
      }

      // 3. Rehydrate full crash-proof offline queue from IndexedDB
      const diskQueue = await getAllQueueOrders();
      this.queue = diskQueue;
      this.isReady = true;
      this.notify();

      // 4. Auto-sync if there are leftover pending orders from previous session / crash
      if (this.queue.length > 0 && this.apiUrl && navigator.onLine) {
        setTimeout(() => {
          this.processQueue();
        }, 1200);
      }
    } catch (err) {
      console.warn('SyncEngine init note:', err);
      this.isReady = true;
      this.notify();
    }

    // Auto-sync when device regains connectivity with 1.5s cellular radio warmup
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.retryAttempt = 0;
        if (this.retryTimer) {
          clearTimeout(this.retryTimer);
          this.retryTimer = null;
        }
        setTimeout(() => {
          if (this.queue.length > 0 && this.apiUrl && navigator.onLine) {
            this.processQueue();
          }
        }, 1500);
      });
    }
  }

  public getState(): SyncEngineState {
    return {
      queue: [...this.queue],
      isSyncing: this.isSyncing,
      hasSyncError: this.hasSyncError,
      apiUrl: this.apiUrl,
      isReady: this.isReady,
    };
  }

  public subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    fn(this.getState());
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notify() {
    const state = this.getState();
    this.subscribers.forEach((fn) => fn(state));
  }

  public async setApiUrl(url: string) {
    this.apiUrl = url.trim();
    try {
      localStorage.setItem('POS_API_URL', this.apiUrl);
      await setConfig('apiUrl', this.apiUrl);
    } catch (_) {}
    this.notify();
    if (this.apiUrl && this.queue.length > 0 && navigator.onLine) {
      this.processQueue();
    }
  }

  public async enqueue(order: QueuedOrder): Promise<void> {
    // 1. In-memory queue update (instant reactivity)
    this.queue = [...this.queue, order];
    this.notify();

    // 2. Asynchronous write-through to IndexedDB disk (Crash-Proof)
    try {
      await saveQueueOrder(order);
      try {
        localStorage.setItem(
          'POS_QUEUE_META',
          JSON.stringify(this.queue.map((q) => ({ id: q.order_id, ts: q.timestamp })))
        );
      } catch (_) {}
    } catch (err) {
      console.warn('Failed to persist queued order to IndexedDB:', err);
    }

    // 3. Trigger background auto-sync
    setTimeout(() => {
      this.processQueue();
    }, 100);
  }

  public async processQueue(): Promise<boolean> {
    if (!this.apiUrl || !this.queue.length || this.isSyncing) {
      return false;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.isSyncing = true;
    this.hasSyncError = false;
    this.notify();

    let activeQueue = [...this.queue];
    let syncedCount = 0;

    while (activeQueue.length > 0) {
      const itemToSync = activeQueue[0];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ORDER_SYNC_TIMEOUT_MS);

      try {
        const res = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(itemToSync),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (data.status === 'ok') {
          activeQueue.shift();
          this.queue = [...activeQueue];
          syncedCount++;
          this.retryAttempt = 0; // Reset backoff on successful transfer

          // Remove from persistent IndexedDB store
          await removeQueueOrder(itemToSync.order_id);
          markOrderSyncedLocally(itemToSync.order_id);
          this.notify();
        } else {
          throw new Error('Apps Script returned non-ok status');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('Sync queue error (low speed / timeout / network drop):', err);
        this.hasSyncError = true;
        this.isSyncing = false;
        this.notify();

        // Calculate exponential backoff with jitter for low-speed connections
        this.retryAttempt = Math.min(this.retryAttempt + 1, 5);
        const backoffMs = Math.min(30000, Math.round(Math.pow(1.8, this.retryAttempt) * 1500 + Math.random() * 1000));

        // If still online, schedule gentle auto-retry
        if (navigator.onLine && !this.retryTimer && this.queue.length > 0) {
          this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            if (this.queue.length > 0 && navigator.onLine) {
              this.processQueue();
            }
          }, backoffMs);
        }
        return false;
      }
    }

    this.isSyncing = false;
    this.hasSyncError = false;
    this.retryAttempt = 0;
    this.notify();

    // Dispatch custom event for user-facing toast notification
    if (syncedCount > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pos-sync-success', {
          detail: { count: syncedCount },
        })
      );
    }

    return true;
  }

  public async saveProductsToSheet(url: string, products: Product[]): Promise<Product[] | null> {
    if (!url) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveProducts', products }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.products) && data.products.length > 0) {
        return data.products.map((p: Product) => ({ ...p, original_name: p.name }));
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('Save products to sheet error:', err);
    }
    return null;
  }

  public async fetchConfigFromSheet(urlOverride?: string): Promise<Product[] | null> {
    const url = urlOverride || this.apiUrl;
    if (!url) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(`${url}?action=getConfig`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        return data.products.map((p: Product) => ({ ...p, original_name: p.name }));
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('Fetch config from sheet error:', err);
    }
    return null;
  }

  public async fetchHistoryFromSheet(urlOverride?: string): Promise<SalesHistoryItem[] | null> {
    const url = urlOverride || this.apiUrl;
    if (!url) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      let rawOrders: any[] = [];
      try {
        const res = await fetch(`${url}?action=getHistory`, { signal: controller.signal });
        const data = await res.json();
        if (Array.isArray(data)) rawOrders = data;
        else if (Array.isArray(data.orders)) rawOrders = data.orders;
        else if (Array.isArray(data.history)) rawOrders = data.history;
        else if (Array.isArray(data.transactions)) rawOrders = data.transactions;
        else if (Array.isArray(data.records)) rawOrders = data.records;
        else if (Array.isArray(data.data)) rawOrders = data.data;
      } catch (_) {}

      if (!rawOrders || rawOrders.length === 0) {
        try {
          const res2 = await fetch(`${url}?action=getOrders`, { signal: controller.signal });
          const data2 = await res2.json();
          if (Array.isArray(data2)) rawOrders = data2;
          else if (Array.isArray(data2.orders)) rawOrders = data2.orders;
          else if (Array.isArray(data2.history)) rawOrders = data2.history;
          else if (Array.isArray(data2.transactions)) rawOrders = data2.transactions;
        } catch (_) {}
      }

      clearTimeout(timeoutId);

      if (rawOrders && rawOrders.length > 0) {
        return rawOrders.map((row: any, idx: number) => {
          const order_id = String(row.order_id || row.orderId || row.id || `ORD-${idx + 1}`);
          const timestamp = String(row.timestamp || row.date || row.waktu || new Date().toISOString());
          const payment_method: 'QRIS' | 'Cash' =
            String(row.payment_method || row.paymentMethod || row.metode || 'QRIS').toUpperCase().includes('CASH') ||
            String(row.payment_method || '').toUpperCase().includes('TUNAI')
              ? 'Cash'
              : 'QRIS';
          const discount_total = Number(row.discount_total || row.discount || row.diskon || 0);

          let items: OrderItem[] = [];
          if (Array.isArray(row.items)) {
            items = row.items.map((it: any) => ({
              name: String(it.name || it.nama || ''),
              qty: Number(it.qty || it.quantity || it.jumlah || 1),
              unit_price: Number(it.unit_price || it.price || it.harga || 0),
            }));
          } else if (typeof row.items === 'string') {
            try {
              const parsed = JSON.parse(row.items);
              if (Array.isArray(parsed)) {
                items = parsed.map((it: any) => ({
                  name: String(it.name || it.nama || ''),
                  qty: Number(it.qty || it.quantity || it.jumlah || 1),
                  unit_price: Number(it.unit_price || it.price || it.harga || 0),
                }));
              }
            } catch (_) {
              items = [{ name: row.items, qty: 1, unit_price: Number(row.gross_total || row.total || 0) }];
            }
          }

          const gross_total = Number(
            row.gross_total || row.subtotal || items.reduce((sum, it) => sum + it.qty * it.unit_price, 0)
          );
          const net_total = Number(row.net_total || row.total || Math.max(0, gross_total - discount_total));
          const items_count = Number(row.items_count || items.reduce((sum, it) => sum + it.qty, 0));

          return {
            order_id,
            timestamp,
            payment_method,
            discount_total,
            gross_total,
            net_total,
            items_count,
            items,
            photo_url: row.photo_url || row.photoUrl || row.drive_url || '',
            photo_base64: row.photo_base64 || row.photoBase64 || '',
            is_local_pending: false,
          };
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('Fetch history from sheet error:', err);
    }
    return null;
  }
}

export const syncEngine = new SyncEngineService();
