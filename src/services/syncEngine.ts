import { QueuedOrder, Product, SalesHistoryItem, OrderItem } from '../types';
import { markOrderSyncedLocally } from '../utils/historyStorage';

export interface SyncEngineState {
  queue: QueuedOrder[];
  isSyncing: boolean;
  hasSyncError: boolean;
  apiUrl: string;
}

type Subscriber = (state: SyncEngineState) => void;

class SyncEngineService {
  private queue: QueuedOrder[] = [];
  private isSyncing = false;
  private hasSyncError = false;
  private apiUrl = '';
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.apiUrl = localStorage.getItem('POS_API_URL') || '';
      const savedQueue = localStorage.getItem('POS_QUEUE');
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
      }
    } catch (_) {}

    // Auto-sync when device regains connectivity
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.queue.length > 0 && this.apiUrl) {
          this.processQueue();
        }
      });
    }
  }

  public getState(): SyncEngineState {
    return {
      queue: [...this.queue],
      isSyncing: this.isSyncing,
      hasSyncError: this.hasSyncError,
      apiUrl: this.apiUrl,
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

  public setApiUrl(url: string) {
    this.apiUrl = url.trim();
    try {
      localStorage.setItem('POS_API_URL', this.apiUrl);
    } catch (_) {}
    this.notify();
    if (this.apiUrl && this.queue.length > 0) {
      this.processQueue();
    }
  }

  public enqueue(order: QueuedOrder): void {
    this.queue = [...this.queue, order];
    try {
      localStorage.setItem('POS_QUEUE', JSON.stringify(this.queue));
    } catch (_) {}
    this.notify();

    // Trigger background sync
    setTimeout(() => {
      this.processQueue();
    }, 100);
  }

  public async processQueue(): Promise<boolean> {
    if (!this.apiUrl || !this.queue.length || this.isSyncing) {
      return false;
    }

    this.isSyncing = true;
    this.hasSyncError = false;
    this.notify();

    let activeQueue = [...this.queue];

    while (activeQueue.length > 0) {
      const itemToSync = activeQueue[0];
      try {
        const res = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(itemToSync),
        });
        const data = await res.json();
        if (data.status === 'ok') {
          activeQueue.shift();
          this.queue = [...activeQueue];
          try {
            localStorage.setItem('POS_QUEUE', JSON.stringify(this.queue));
          } catch (_) {}
          markOrderSyncedLocally(itemToSync.order_id);
          this.notify();
        } else {
          throw new Error('Apps Script returned non-ok status');
        }
      } catch (err) {
        console.warn('Sync queue error:', err);
        this.hasSyncError = true;
        this.isSyncing = false;
        this.notify();
        return false;
      }
    }

    this.isSyncing = false;
    this.hasSyncError = false;
    this.notify();
    return true;
  }

  public async saveProductsToSheet(url: string, products: Product[]): Promise<Product[] | null> {
    if (!url) return null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveProducts', products }),
      });
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.products) && data.products.length > 0) {
        return data.products.map((p: Product) => ({ ...p, original_name: p.name }));
      }
    } catch (err) {
      console.warn('Save products to sheet error:', err);
    }
    return null;
  }

  public async fetchConfigFromSheet(urlOverride?: string): Promise<Product[] | null> {
    const url = urlOverride || this.apiUrl;
    if (!url) return null;
    try {
      const res = await fetch(`${url}?action=getConfig`);
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        return data.products.map((p: Product) => ({ ...p, original_name: p.name }));
      }
    } catch (err) {
      console.warn('Fetch config from sheet error:', err);
    }
    return null;
  }

  public async fetchHistoryFromSheet(urlOverride?: string): Promise<SalesHistoryItem[] | null> {
    const url = urlOverride || this.apiUrl;
    if (!url) return null;
    try {
      // 1. Try ?action=getHistory first
      let rawOrders: any[] = [];
      try {
        const res = await fetch(`${url}?action=getHistory`);
        const data = await res.json();
        if (Array.isArray(data)) rawOrders = data;
        else if (Array.isArray(data.orders)) rawOrders = data.orders;
        else if (Array.isArray(data.history)) rawOrders = data.history;
        else if (Array.isArray(data.transactions)) rawOrders = data.transactions;
        else if (Array.isArray(data.records)) rawOrders = data.records;
        else if (Array.isArray(data.data)) rawOrders = data.data;
      } catch (_) {}

      // 2. Fallback to ?action=getOrders if empty
      if (!rawOrders || rawOrders.length === 0) {
        try {
          const res2 = await fetch(`${url}?action=getOrders`);
          const data2 = await res2.json();
          if (Array.isArray(data2)) rawOrders = data2;
          else if (Array.isArray(data2.orders)) rawOrders = data2.orders;
          else if (Array.isArray(data2.history)) rawOrders = data2.history;
          else if (Array.isArray(data2.transactions)) rawOrders = data2.transactions;
        } catch (_) {}
      }

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
      console.warn('Fetch history from sheet error:', err);
    }
    return null;
  }
}

export const syncEngine = new SyncEngineService();
