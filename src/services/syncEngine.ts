import { QueuedOrder, Product, SalesHistoryItem, OrderItem, TeamDivision } from '../types';
import { markOrderSyncedLocally } from '../utils/historyStorage';
import {
  saveQueueOrder,
  removeQueueOrder,
  getAllQueueOrders,
  setConfig,
  getConfig,
  migrateFromLocalStorage,
} from './indexedDBStorage';

export const DEFAULT_MENU_SHEET_ID = '1r6az25v1wPH5qcKc9YyoHY9qp4ejTmAVFsgv3YfhUsI';

export interface SyncEngineState {
  queue: QueuedOrder[];
  isSyncing: boolean;
  hasSyncError: boolean;
  apiUrl: string;
  team: TeamDivision;
  menuSheetId: string;
  isReady: boolean;
  isBatterySaver: boolean;
  pendingTextCount: number;
  pendingPhotoCount: number;
}

type Subscriber = (state: SyncEngineState) => void;

// Network timeout constants tuned for mobile cellular & low-speed networks
const ORDER_SYNC_TIMEOUT_MS = 25000;
const ORDER_SYNC_TIMEOUT_FAST_MS = 10000; // Lightweight text-only payload (<1KB)
const FETCH_TIMEOUT_MS = 15000;

class SyncEngineService {
  private queue: QueuedOrder[] = [];
  private isSyncing = false;
  private hasSyncError = false;
  private apiUrl = '';
  private team: TeamDivision = 'Team A';
  private menuSheetId = DEFAULT_MENU_SHEET_ID;
  private isReady = false;
  private isBatterySaver = false;
  private periodicSyncTimer: ReturnType<typeof setInterval> | null = null;
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

      // 2. Load Battery Saver preference (Instant localStorage + fallback IndexedDB)
      try {
        const storedSaver = localStorage.getItem('POS_BATTERY_SAVER');
        if (storedSaver !== null) {
          this.isBatterySaver = storedSaver === 'true';
        } else {
          const idbSaver = await getConfig<boolean>('batterySaver');
          if (idbSaver !== null) {
            this.isBatterySaver = Boolean(idbSaver);
          }
        }
      } catch (_) {}

      // Apply initial battery saver class to DOM document element
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('battery-saver', this.isBatterySaver);
      }

      // 3. Load API URL with dual-layer bi-directional recovery (IndexedDB + localStorage)
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

      // 4. Load Team Division preference (Team A / Team B / Team C)
      try {
        const storedTeam = localStorage.getItem('POS_TEAM') as TeamDivision | null;
        if (storedTeam === 'Team A' || storedTeam === 'Team B' || storedTeam === 'Team C') {
          this.team = storedTeam;
        } else {
          const idbTeam = await getConfig<TeamDivision>('team');
          if (idbTeam === 'Team A' || idbTeam === 'Team B' || idbTeam === 'Team C') {
            this.team = idbTeam;
          }
        }
      } catch (_) {}

      // 5. Load Menu Sheet ID / URL
      try {
        const storedSheet = localStorage.getItem('POS_MENU_SHEET');
        if (storedSheet) {
          this.menuSheetId = storedSheet;
        } else {
          const idbSheet = await getConfig<string>('menuSheet');
          if (idbSheet) {
            this.menuSheetId = idbSheet;
          }
        }
      } catch (_) {}

      // 6. Rehydrate full crash-proof offline queue from IndexedDB with Priority Sorting
      const diskQueue = await getAllQueueOrders();
      this.queue = this.sortQueueByPriority(diskQueue);
      this.isReady = true;
      this.notify();

      // 7. Periodic background sync management (disabled when Battery Saver is active)
      if (!this.isBatterySaver) {
        this.startPeriodicSync();
        if (this.queue.length > 0 && this.apiUrl && navigator.onLine) {
          setTimeout(() => {
            this.processQueue();
          }, 1200);
        }
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

        // In battery saver mode, avoid unrequested radio wakeups on network flap
        if (this.isBatterySaver) return;

        setTimeout(() => {
          if (this.queue.length > 0 && this.apiUrl && navigator.onLine) {
            this.processQueue();
          }
        }, 1500);
      });
    }
  }

  /**
   * Sorts queue items prioritizing text-only transactions before photo uploads
   */
  public sortQueueByPriority(queue: QueuedOrder[]): QueuedOrder[] {
    const textOrders: QueuedOrder[] = [];
    const photoOrders: QueuedOrder[] = [];

    for (const item of queue) {
      if (!item.photo_base64) {
        textOrders.push(item);
      } else {
        photoOrders.push(item);
      }
    }

    return [...textOrders, ...photoOrders];
  }

  public getState(): SyncEngineState {
    const pendingTextCount = this.queue.filter((q) => !q.photo_base64).length;
    const pendingPhotoCount = this.queue.filter((q) => Boolean(q.photo_base64)).length;

    return {
      queue: [...this.queue],
      isSyncing: this.isSyncing,
      hasSyncError: this.hasSyncError,
      apiUrl: this.apiUrl,
      team: this.team,
      menuSheetId: this.menuSheetId,
      isReady: this.isReady,
      isBatterySaver: this.isBatterySaver,
      pendingTextCount,
      pendingPhotoCount,
    };
  }

  public startPeriodicSync() {
    this.stopPeriodicSync();
    if (this.isBatterySaver) return;

    // Periodic 60s background sync to flush pending queue when online without user interaction
    this.periodicSyncTimer = setInterval(() => {
      if (this.queue.length > 0 && this.apiUrl && navigator.onLine && !this.isSyncing) {
        this.processQueue();
      }
    }, 60000);
  }

  public stopPeriodicSync() {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.periodicSyncTimer = null;
    }
  }

  public async setBatterySaver(enabled: boolean) {
    this.isBatterySaver = enabled;

    try {
      localStorage.setItem('POS_BATTERY_SAVER', String(enabled));
      await setConfig('batterySaver', enabled);
    } catch (_) {}

    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('battery-saver', enabled);
    }

    if (enabled) {
      this.stopPeriodicSync();
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
    } else {
      this.startPeriodicSync();
      if (this.queue.length > 0 && navigator.onLine) {
        this.processQueue();
      }
    }

    this.notify();
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

  public setTeam(team: TeamDivision) {
    this.team = team;
    try {
      localStorage.setItem('POS_TEAM', team);
    } catch (_) {}
    setConfig('team', team).catch(() => {});
    this.notify();
  }

  public setMenuSheetId(sheetInput: string) {
    const clean = sheetInput.trim() || DEFAULT_MENU_SHEET_ID;
    this.menuSheetId = clean;
    try {
      localStorage.setItem('POS_MENU_SHEET', clean);
    } catch (_) {}
    setConfig('menuSheet', clean).catch(() => {});
    this.notify();
  }

  public async enqueue(order: QueuedOrder): Promise<void> {
    // 1. Priority Insertion: Text-only transactions (!order.photo_base64) are placed
    // ahead of any pending photo-bearing transactions in the queue.
    if (!order.photo_base64) {
      const lastTextIdx = this.queue.reduce(
        (lastIdx, item, idx) => (!item.photo_base64 ? idx : lastIdx),
        -1
      );
      if (lastTextIdx === -1) {
        // Place text order at the front ahead of photo orders
        this.queue = [order, ...this.queue];
      } else {
        // Insert right after last text order, ahead of photo orders
        this.queue = [
          ...this.queue.slice(0, lastTextIdx + 1),
          order,
          ...this.queue.slice(lastTextIdx + 1),
        ];
      }
    } else {
      // Photo orders are queued after text orders
      this.queue = [...this.queue, order];
    }
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

    // 3. Trigger immediate sync (faster 10ms dispatch for high-priority text orders)
    if (!this.isBatterySaver) {
      const delay = !order.photo_base64 ? 10 : 100;
      setTimeout(() => {
        this.processQueue();
      }, delay);
    }
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

    let syncedCount = 0;

    // Process all queue items with priority execution:
    // Text-only transactions are always prioritized first before photo uploads
    while (this.queue.length > 0) {
      // Priority Selection: find first text-only transaction in queue
      const textItemIdx = this.queue.findIndex((item) => !item.photo_base64);
      const targetIdx = textItemIdx !== -1 ? textItemIdx : 0;
      const itemToSync = this.queue[targetIdx];

      const isTextOnly = !itemToSync.photo_base64;
      const controller = new AbortController();
      const timeoutMs = isTextOnly ? ORDER_SYNC_TIMEOUT_FAST_MS : ORDER_SYNC_TIMEOUT_MS;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
          // Remove synced item from queue by order_id
          this.queue = this.queue.filter((q) => q.order_id !== itemToSync.order_id);
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
        console.warn('Sync queue error (item:', itemToSync.order_id, 'isText:', isTextOnly, '):', err);
        this.hasSyncError = true;
        this.isSyncing = false;
        this.notify();

        // Priority Resilience: If a photo upload encounters an error/timeout and there are still text-only orders pending,
        // move the failed photo item to the end of the queue so it doesn't block remaining text orders!
        if (!isTextOnly && this.queue.some((q) => !q.photo_base64)) {
          console.info('Photo upload delayed, prioritizing remaining text transactions...');
          this.queue = [
            ...this.queue.filter((q) => q.order_id !== itemToSync.order_id),
            itemToSync,
          ];
          this.notify();
          // Resume processing remaining text items immediately
          setTimeout(() => {
            this.processQueue();
          }, 50);
          return false;
        }

        // Calculate exponential backoff with jitter for low-speed connections
        this.retryAttempt = Math.min(this.retryAttempt + 1, 5);
        const backoffMs = Math.min(30000, Math.round(Math.pow(1.8, this.retryAttempt) * 1500 + Math.random() * 1000));

        // If still online and NOT in battery saver mode, schedule gentle auto-retry
        if (navigator.onLine && !this.isBatterySaver && !this.retryTimer && this.queue.length > 0) {
          this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            if (this.queue.length > 0 && navigator.onLine && !this.isBatterySaver) {
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

  /**
   * Parses CSV text exported from Google Sheets matrix format into structured Product list
   */
  public parseMenuFromCsv(
    csvText: string,
    targetTeam: TeamDivision,
    existingProducts: Product[] = [],
    preserveCustom = true
  ): Product[] {
    const defaultColMap: Record<TeamDivision, number> = {
      'Team A': 1,
      'Team B': 2,
      'Team C': 3,
    };
    let colIdx = defaultColMap[targetTeam] ?? 1;

    const rows = csvText
      .split(/\r?\n/)
      .map((line) =>
        line
          .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
      );

    // Dynamically detect column index from the header row containing team names
    const headerRowIdx = rows.findIndex((r) => {
      const matchIdx = r.findIndex(
        (cell) => cell.toUpperCase().replace(/\s+/g, '') === targetTeam.toUpperCase().replace(/\s+/g, '')
      );
      if (matchIdx !== -1) {
        colIdx = matchIdx;
        return true;
      }
      return r.some((cell) => cell.toUpperCase().includes('TEAM A'));
    });

    const dataRows = rows.slice(headerRowIdx >= 0 ? headerRowIdx + 1 : 2);

    // Preserve previously customized prices in phone memory so they are not reset to 5000
    const priceMemory = new Map<string, number>();
    existingProducts.forEach((p) => {
      priceMemory.set(p.name.toLowerCase().trim(), p.price);
    });

    const toTitleCase = (str: string) =>
      str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

    const sheetProducts: Product[] = [];
    const seenNames = new Set<string>();

    for (const row of dataRows) {
      const rawCell = (row[colIdx] || '').trim();
      if (!rawCell) continue;

      // Support formats like "bomboloni" or "risol - 6000" / "risol: 6000"
      const priceMatch = rawCell.match(/^(.*?)\s*[:\-]\s*(?:rp\.?\s*)?(\d+)\s*$/i);
      const rawName = priceMatch ? priceMatch[1].trim() : rawCell;
      if (!rawName) continue;

      const cleanName = toTitleCase(rawName);
      const lowerName = cleanName.toLowerCase();
      if (seenNames.has(lowerName)) continue;
      seenNames.add(lowerName);

      const slug = lowerName.replace(/[^a-z0-9]+/g, '_');
      const id = `${targetTeam.toLowerCase().replace(/\s+/g, '')}_${slug}`;

      const inlinePrice = priceMatch ? Number(priceMatch[2]) : 0;
      const rememberedPrice = priceMemory.get(lowerName) || 5000;

      sheetProducts.push({
        id,
        name: cleanName,
        original_name: cleanName,
        price: inlinePrice > 0 ? inlinePrice : rememberedPrice,
        is_custom: false,
      });
    }

    // Preserve on-the-fly custom menu items if on the same division
    if (preserveCustom) {
      const customProducts = existingProducts.filter(
        (p) => p.is_custom && p.name.trim() !== '' && !seenNames.has(p.name.toLowerCase().trim())
      );
      return [...sheetProducts, ...customProducts];
    }

    return sheetProducts;
  }

  /**
   * Fetches the central matrix menu from Google Sheet via CSV gviz endpoint
   * with secondary export fallback and smartly merges sheet items with active custom items.
   */
  public async fetchMenuFromCentralSheet(
    teamOverride?: TeamDivision,
    sheetInputOverride?: string,
    existingProducts: Product[] = [],
    preserveCustom = true
  ): Promise<Product[]> {
    const targetTeam = teamOverride || this.team;
    const rawSheet = (sheetInputOverride ?? this.menuSheetId).trim() || DEFAULT_MENU_SHEET_ID;
    const match = rawSheet.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : rawSheet;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      // Primary: Google Visualization CSV endpoint (fast, zero quota)
      let csvText = '';
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&t=${Date.now()}`;
        const res = await fetch(gvizUrl, { signal: controller.signal });
        if (res.ok) {
          csvText = await res.text();
        }
      } catch (_) {}

      // Secondary fallback: Direct Google Sheets export CSV endpoint
      if (!csvText) {
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${Date.now()}`;
        const res = await fetch(exportUrl, { signal: controller.signal });
        if (!res.ok) throw new Error('Gagal mengakses Google Sheet Menu Pusat');
        csvText = await res.text();
      }

      clearTimeout(timeoutId);
      return this.parseMenuFromCsv(csvText, targetTeam, existingProducts, preserveCustom);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}

export const syncEngine = new SyncEngineService();
