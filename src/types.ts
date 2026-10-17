export interface Product {
  id: string;
  name: string;
  original_name?: string;
  price: number;
}

export interface OrderItem {
  name: string;
  qty: number;
  unit_price: number;
}

export interface QueuedOrder {
  action: 'submitOrder';
  order_id: string;
  timestamp: string;
  payment_method: 'QRIS' | 'Cash';
  discount_total: number;
  items: OrderItem[];
  photo_base64: string;
  photo_mime: string;
}

export interface DraftState {
  cart: Record<string, number>;
  discountEnabled: boolean;
  discount: number;
  payment: 'QRIS' | 'Cash';
  photoBase64: string;
}

export interface SalesHistoryItem {
  order_id: string;
  timestamp: string;
  payment_method: 'QRIS' | 'Cash';
  discount_total: number;
  gross_total: number;
  net_total: number;
  items_count: number;
  items: OrderItem[];
}
