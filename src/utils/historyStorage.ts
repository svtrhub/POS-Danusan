import { QueuedOrder, SalesHistoryItem } from '../types';

const STORAGE_KEY = 'POS_LOCAL_HISTORY';
const MAX_LOCAL_ITEMS = 500;

export function getLocalHistory(): SalesHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save order to local history:', err);
  }

  return historyItem;
}

export function markOrderSyncedLocally(orderId: string): void {
  const current = getLocalHistory();
  const updated = current.map((item) =>
    item.order_id === orderId ? { ...item, is_local_pending: false } : item
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
