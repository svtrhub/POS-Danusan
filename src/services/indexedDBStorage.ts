/**
 * High-performance, Promise-based IndexedDB Persistence Layer for Danusan POS.
 * Stores product catalog, pending offline sync queue, and full-resolution photo proofs
 * directly on device disk without the 5MB quota constraints of localStorage.
 */

import { Product, QueuedOrder, SalesHistoryItem } from '../types';

const DB_NAME = 'POS_DANUSAN_DB';
const DB_VERSION = 1;

// Object store names
export const STORES = {
  CATALOG: 'catalog_store',
  SYNC_QUEUE: 'sync_queue_store',
  SALES_HISTORY: 'sales_history_store',
  APP_CONFIG: 'app_config_store',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or upgrade the IndexedDB instance.
 */
export function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Catalog Store (Key: id)
        if (!db.objectStoreNames.contains(STORES.CATALOG)) {
          const catalogStore = db.createObjectStore(STORES.CATALOG, { keyPath: 'id' });
          catalogStore.createIndex('name', 'name', { unique: false });
        }

        // 2. Sync Queue Store (Key: order_id)
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'order_id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 3. Sales History Store (Key: order_id)
        if (!db.objectStoreNames.contains(STORES.SALES_HISTORY)) {
          const historyStore = db.createObjectStore(STORES.SALES_HISTORY, { keyPath: 'order_id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 4. App Config Store (Key: key)
        if (!db.objectStoreNames.contains(STORES.APP_CONFIG)) {
          db.createObjectStore(STORES.APP_CONFIG, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });
  }

  return dbPromise;
}

// ---------------------------------------------------------------------------
// SYNC QUEUE OPERATIONS (Crash-proof offline persistence)
// ---------------------------------------------------------------------------

export async function saveQueueOrder(order: QueuedOrder): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.put(order);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeQueueOrder(orderId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(orderId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllQueueOrders(): Promise<QueuedOrder[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();

      request.onsuccess = () => {
        const orders = (request.result as QueuedOrder[]) || [];
        resolve(orders);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get queue from IndexedDB:', err);
    return [];
  }
}

export async function clearAllQueueOrders(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// CATALOG OPERATIONS (Custom menu persistence per division)
// ---------------------------------------------------------------------------

export async function saveCatalog(products: Product[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CATALOG, 'readwrite');
    const store = tx.objectStore(STORES.CATALOG);

    // Clear old items and write current list
    store.clear();
    products.forEach((p) => store.put(p));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCatalog(): Promise<Product[] | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATALOG, 'readonly');
      const store = tx.objectStore(STORES.CATALOG);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result as Product[];
        if (result && result.length > 0) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get catalog from IndexedDB:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// SALES HISTORY OPERATIONS (Local transactions with photo proofs)
// ---------------------------------------------------------------------------

export async function saveHistoryOrder(item: SalesHistoryItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SALES_HISTORY, 'readwrite');
    const store = tx.objectStore(STORES.SALES_HISTORY);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveMultipleHistoryOrders(items: SalesHistoryItem[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SALES_HISTORY, 'readwrite');
    const store = tx.objectStore(STORES.SALES_HISTORY);

    items.forEach((item) => store.put(item));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllHistoryOrders(): Promise<SalesHistoryItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SALES_HISTORY, 'readonly');
      const store = tx.objectStore(STORES.SALES_HISTORY);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = (request.result as SalesHistoryItem[]) || [];
        // Sort descending by timestamp
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get history from IndexedDB:', err);
    return [];
  }
}

export async function markHistoryOrderSynced(orderId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SALES_HISTORY, 'readwrite');
    const store = tx.objectStore(STORES.SALES_HISTORY);
    const getRequest = store.get(orderId);

    getRequest.onsuccess = () => {
      const item = getRequest.result as SalesHistoryItem | undefined;
      if (item) {
        item.is_local_pending = false;
        store.put(item);
      }
      resolve();
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ---------------------------------------------------------------------------
// APP CONFIG & METADATA (URL, Divisi, Settings)
// ---------------------------------------------------------------------------

export async function setConfig<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.APP_CONFIG, 'readwrite');
    const store = tx.objectStore(STORES.APP_CONFIG);
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getConfig<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.APP_CONFIG, 'readonly');
      const store = tx.objectStore(STORES.APP_CONFIG);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && 'value' in request.result) {
          resolve(request.result.value as T);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// AUTOMATIC MIGRATION FROM LEGACY LOCALSTORAGE
// ---------------------------------------------------------------------------

export async function migrateFromLocalStorage(): Promise<{ migratedQueue: number; migratedHistory: number }> {
  let migratedQueue = 0;
  let migratedHistory = 0;

  try {
    // 1. Migrate Queue
    const rawQueue = localStorage.getItem('POS_QUEUE');
    if (rawQueue) {
      const parsedQueue = JSON.parse(rawQueue);
      if (Array.isArray(parsedQueue) && parsedQueue.length > 0) {
        for (const order of parsedQueue) {
          await saveQueueOrder(order);
          migratedQueue++;
        }
      }
    }

    // 2. Migrate Menu
    const rawMenu = localStorage.getItem('POS_MENU');
    if (rawMenu) {
      const parsedMenu = JSON.parse(rawMenu);
      if (Array.isArray(parsedMenu) && parsedMenu.length > 0) {
        const existing = await getCatalog();
        if (!existing) {
          await saveCatalog(parsedMenu);
        }
      }
    }

    // 3. Migrate Local History
    const rawHistory = localStorage.getItem('POS_LOCAL_HISTORY');
    if (rawHistory) {
      const parsedHistory = JSON.parse(rawHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        await saveMultipleHistoryOrders(parsedHistory);
        migratedHistory = parsedHistory.length;
      }
    }

    // 4. Migrate API URL
    const rawUrl = localStorage.getItem('POS_API_URL');
    if (rawUrl) {
      await setConfig('apiUrl', rawUrl);
    }
  } catch (err) {
    console.warn('Note on localStorage migration:', err);
  }

  return { migratedQueue, migratedHistory };
}
