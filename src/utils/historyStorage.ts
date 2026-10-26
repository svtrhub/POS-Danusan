import { QueuedOrder, SalesHistoryItem } from '../types';
import {
  saveHistoryOrder,
  getAllHistoryOrders,
  markHistoryOrderSynced,
} from '../services/indexedDBStorage';

const STORAGE_KEY = 'POS_LOCAL_HISTORY';
const MAX_LOCAL_ITEMS = 500;

// In-memory cache for synchronous render performance
let memoryHistoryCache: SalesHistoryItem[] | null = null;

// Initialize memory cache from IndexedDB and localStorage
if (typeof window !== 'undefined') {
  getAllHistoryOrders()
    .then((dbItems) => {
      if (dbItems && dbItems.length > 0) {
        memoryHistoryCache = dbItems;
      } else {
        // Fallback to localStorage if IndexedDB is still empty
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) memoryHistoryCache = parsed;
          }
        } catch (_) {}
      }
    })
    .catch(() => {});
}

export function getLocalHistory(): SalesHistoryItem[] {
  if (memoryHistoryCache !== null) {
    return [...memoryHistoryCache];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    memoryHistoryCache = list;
    return list;
  } catch (err) {
    console.warn('Failed to read local history:', err);
    return [];
  }
}

export function saveOrderToLocalHistory(order: QueuedOrder): SalesHistoryItem {
  const current = getLocalHistory();
  const gross = order.items.reduce((acc, item) => acc + item.qty * item.unit_price, 0);
  const net = Math.max(0, gross - (order.discount_total || 0));
  const itemsCount = order.items.reduce((acc, item) => acc + item.qty, 0);

  const historyItem: SalesHistoryItem = {
    order_id: order.order_id,
    timestamp: order.timestamp,
    payment_method: order.payment_method,
    discount_total: order.discount_total || 0,
    gross_total: gross,
    net_total: net,
    items_count: itemsCount,
    items: order.items,
    photo_base64: order.photo_base64 || '',
    is_local_pending: true,
  };

  // Avoid duplicates
  const filtered = current.filter((item) => item.order_id !== order.order_id);
  const updated = [historyItem, ...filtered].slice(0, MAX_LOCAL_ITEMS);
  memoryHistoryCache = updated;

  // 1. Asynchronously persist full item (including photo proof) to IndexedDB
  saveHistoryOrder(historyItem).catch((err) => {
    console.warn('Failed to save history to IndexedDB:', err);
  });

  // 2. Mirror lightweight data to localStorage for instant synchronous boot
  try {
    const lightweight = updated.map((it) => ({
      ...it,
      photo_base64: '', // strip photo to stay well below 5MB localStorage limit
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
  } catch (_) {}

  return historyItem;
}

export function markOrderSyncedLocally(orderId: string): void {
  const current = getLocalHistory();
  const updated = current.map((item) =>
    item.order_id === orderId ? { ...item, is_local_pending: false } : item
  );
  memoryHistoryCache = updated;

  // Update in IndexedDB
  markHistoryOrderSynced(orderId).catch(() => {});

  // Update localStorage mirror
  try {
    const lightweight = updated.map((it) => ({ ...it, photo_base64: '' }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
  } catch (_) {}
}

export function mergeHistory(
  sheetOrders: SalesHistoryItem[],
  localOrders: SalesHistoryItem[]
): SalesHistoryItem[] {
  const map = new Map<string, SalesHistoryItem>();

  // 1. Add sheet orders as source of truth (confirmed synced)
  for (const item of sheetOrders) {
    map.set(item.order_id, {
      ...item,
      is_local_pending: false,
    });
  }

  // 2. Add local orders if not already in sheet orders
  for (const item of localOrders) {
    if (map.has(item.order_id)) {
      // If photo was only captured locally, preserve it
      const existing = map.get(item.order_id)!;
      if (!existing.photo_base64 && item.photo_base64) {
        existing.photo_base64 = item.photo_base64;
      }
    } else {
      map.set(item.order_id, item);
    }
  }

  // 3. Sort newest first
  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });
}
