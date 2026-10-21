import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Search,
  QrCode,
  Banknote,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileSpreadsheet,
  Code,
  Copy,
  ExternalLink,
  Eye,
  Filter,
} from 'lucide-react';
import { SalesHistoryItem } from '../types';
import { getLocalHistory, mergeHistory } from '../utils/historyStorage';
import { triggerHaptic } from '../utils/haptics';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  apiUrl: string;
  onClose: () => void;
  onFetchHistory: (url?: string) => Promise<SalesHistoryItem[] | null>;
  onViewPhoto?: (base64: string) => void;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  apiUrl,
  onClose,
  onFetchHistory,
  onViewPhoto,
}) => {
  const [historyItems, setHistoryItems] = useState<SalesHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'QRIS' | 'Cash'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SYNCED' | 'PENDING'>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showScriptHelper, setShowScriptHelper] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load initial local history and fetch from sheet
  const loadData = useCallback(
    async (isManualRefresh = false) => {
      const local = getLocalHistory();
      setHistoryItems((prev) => (prev.length === 0 ? local : prev));

      if (!apiUrl) {
        setHistoryItems(local);
        if (isManualRefresh) {
          setFetchError('URL Google Sheet belum diatur di Pengaturan');
        }
        return;
      }

      setIsLoading(true);
      setFetchError(null);

      try {
        const sheetOrders = await onFetchHistory(apiUrl);
        if (sheetOrders && sheetOrders.length > 0) {
          const merged = mergeHistory(sheetOrders, local);
          setHistoryItems(merged);
          triggerHaptic('success');
        } else {
          // If sheet returned empty array or wasn't configured with getHistory yet
          setHistoryItems(local);
          if (isManualRefresh) {
            setFetchError(
              'Sheet terhubung namun belum ada catatan pesanan atau skrip doGet(getHistory) belum aktif.'
            );
          }
        }
      } catch (err: unknown) {
        console.warn('Failed to fetch transaction history:', err);
        setFetchError('Gagal mengambil data dari Google Sheet. Menampilkan data lokal.');
        setHistoryItems(local);
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, onFetchHistory]
  );

  useEffect(() => {
    if (isOpen) {
      loadData(false);
      setSearchQuery('');
      setExpandedOrderId(null);
      setShowScriptHelper(false);
    }
  }, [isOpen, loadData]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return historyItems.filter((item) => {
      // Payment filter
      if (paymentFilter !== 'ALL' && item.payment_method !== paymentFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'SYNCED' && item.is_local_pending) {
        return false;
      }
      if (statusFilter === 'PENDING' && !item.is_local_pending) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = item.order_id.toLowerCase().includes(q);
        const matchesItems = item.items.some((it) => it.name.toLowerCase().includes(q));
        const matchesDate = item.timestamp.toLowerCase().includes(q);
        if (!matchesId && !matchesItems && !matchesDate) return false;
      }

      return true;
    });
  }, [historyItems, paymentFilter, statusFilter, searchQuery]);

  // Summary KPIs
  const kpiStats = useMemo(() => {
    const totalTransactions = filteredItems.length;
    const netRevenue = filteredItems.reduce((acc, item) => acc + (item.net_total || 0), 0);
    const totalDiscounts = filteredItems.reduce((acc, item) => acc + (item.discount_total || 0), 0);
    const qrisCount = filteredItems.filter((i) => i.payment_method === 'QRIS').length;
    const cashCount = filteredItems.filter((i) => i.payment_method === 'Cash').length;
    const pendingCount = filteredItems.filter((i) => i.is_local_pending).length;

    return {
      totalTransactions,
      netRevenue,
      totalDiscounts,
      qrisCount,
      cashCount,
      pendingCount,
    };
  }, [filteredItems]);

  const handleCopyScript = () => {
    const code = `/**
 * ==============================================================================
 * DANUSAN POS — ENGINE TRANSAKSI GOOGLE APPS SCRIPT (BERSIH & STABIL)
 * ==============================================================================
 * Fokus: Mencatat transaksi murni ke Kolom A:G (Waktu s/d Foto Dokumentasi)
 * - Tanpa kolom ringkasan/omset ke samping yang rawan rumus #ERROR!.
 * - Foto bukti transfer/struk tersimpan rapi di Google Drive.
 * - Transaksi selalu mengisi baris kosong pertama (mulai baris 2).
 * ==============================================================================
 */

const FOLDER_NAME = "Danusan POS - Bukti Pembayaran";

function doGet(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    ensureSheetHeader_(sheet);

    const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "";

    if (action === "getHistory" || action === "getOrders") {
      const orders = readOrdersFromSheet_(sheet);
      return jsonResponse({
        status: "ok",
        orders: orders,
        total_orders: orders.length
      });
    }

    return jsonResponse({
      status: "ok",
      division: ss.getName(),
      message: "Danusan POS Backend Aktif (Kolom A:G Transaksi Murni)"
    });
  } catch (err) {
    return jsonResponse({ status: "error", message: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);

    const contents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const payload = JSON.parse(contents);
    const action = payload.action || "submitOrder";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    ensureSheetHeader_(sheet);

    if (action === "submitOrder") {
      const cache = CacheService.getScriptCache();
      const orderId = String(payload.order_id || "");

      if (orderId && cache.get("ORD_" + orderId)) {
        return jsonResponse({ status: "ok", duplicate: true, order_id: orderId });
      }

      let photoUrl = "";
      if (payload.photo_base64) {
        photoUrl = savePhotoToDrive_(
          payload.photo_base64,
          payload.photo_mime || "image/jpeg",
          payload.payment_method || "PAY",
          orderId
        );
      }

      const timestamp = payload.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      const paymentMethod = payload.payment_method || "QRIS";
      let remainingDiscount = Math.max(0, Number(payload.discount_total || 0));
      const items = Array.isArray(payload.items) ? payload.items : [];

      if (items.length === 0) {
        throw new Error("Keranjang transaksi kosong");
      }

      const rows = items.map(item => {
        const qty = Number(item.qty || 1);
        const unitPrice = Number(item.unit_price || 0);
        let rowTotal = qty * unitPrice;

        if (remainingDiscount > 0) {
          const cut = Math.min(rowTotal, remainingDiscount);
          rowTotal -= cut;
          remainingDiscount -= cut;
        }

        return [
          timestamp,
          String(item.name || "Item").trim(),
          qty,
          unitPrice,
          rowTotal,
          paymentMethod,
          photoUrl
        ];
      });

      const startRow = getFirstEmptySalesRow_(sheet);

      if (startRow + rows.length > sheet.getMaxRows()) {
        sheet.insertRowsAfter(sheet.getMaxRows(), Math.max(rows.length, 50));
      }

      sheet.getRange(startRow, 1, rows.length, 7).setValues(rows);

      if (orderId) {
        cache.put("ORD_" + orderId, "1", 21600);
      }

      return jsonResponse({
        status: "ok",
        order_id: orderId,
        rows_written: rows.length,
        start_row: startRow,
        photo_url: photoUrl
      });
    }

    if (action === "saveProducts") {
      return jsonResponse({ status: "ok", products: payload.products || [] });
    }

    throw new Error("Action tidak dikenal: " + action);
  } catch (err) {
    return jsonResponse({ status: "error", message: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function ensureSheetHeader_(sheet) {
  const a1 = sheet.getRange(1, 1).getValue();
  if (!a1) {
    sheet.getRange(1, 1, 1, 7).setValues([[
      "Waktu",
      "Nama Barang",
      "Jumlah",
      "Harga Satuan (Rp)",
      "Total (Rp)",
      "Pembayaran",
      "Foto Dokumentasi"
    ]]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#F3F4F6");
  }
}

function getFirstEmptySalesRow_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 2;
  }

  const checkCount = lastRow - 1;
  const values = sheet.getRange(2, 1, checkCount, 2).getValues();

  for (let i = 0; i < values.length; i++) {
    const valA = String(values[i][0] || "").trim();
    const valB = String(values[i][1] || "").trim();
    if (valA === "" && valB === "") {
      return i + 2;
    }
  }

  return lastRow + 1;
}

function readOrdersFromSheet_(sheet) {
  const lastRow = getFirstEmptySalesRow_(sheet) - 1;
  if (lastRow < 2) return [];

  const raw = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const groupedOrders = [];
  let currentOrder = null;

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const timestamp = String(row[0] || "");
    const itemName = String(row[1] || "");
    const qty = Number(row[2] || 1);
    const unitPrice = Number(row[3] || 0);
    const total = Number(row[4] || 0);
    const payment = String(row[5] || "QRIS");
    const photoUrl = String(row[6] || "");

    if (!timestamp && !itemName) continue;

    const orderKey = \`\${timestamp}__\${payment}__\${photoUrl}\`;

    if (!currentOrder || currentOrder.key !== orderKey) {
      if (currentOrder) groupedOrders.unshift(currentOrder);
      currentOrder = {
        key: orderKey,
        order_id: "ORD-" + (groupedOrders.length + 1),
        timestamp: timestamp,
        payment_method: payment.toUpperCase().includes("CASH") ? "Cash" : "QRIS",
        discount_total: 0,
        gross_total: 0,
        net_total: 0,
        items_count: 0,
        items: [],
        photo_url: photoUrl
      };
    }

    currentOrder.items.push({
      name: itemName,
      qty: qty,
      unit_price: unitPrice
    });
    currentOrder.items_count += qty;
    currentOrder.gross_total += (qty * unitPrice);
    currentOrder.net_total += total;
    if (!currentOrder.photo_url && photoUrl) {
      currentOrder.photo_url = photoUrl;
    }
  }

  if (currentOrder) {
    groupedOrders.unshift(currentOrder);
  }

  groupedOrders.forEach(ord => {
    ord.discount_total = Math.max(0, ord.gross_total - ord.net_total);
  });

  return groupedOrders;
}

function savePhotoToDrive_(base64Data, mimeType, paymentMethod, orderId) {
  try {
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);

    const cleanBase64 = base64Data.replace(/^data:image\\/\\w+;base64,/, "");
    const decoded = Utilities.base64Decode(cleanBase64);
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    const fileName = \`\${stamp}_\${paymentMethod}_\${orderId || "POS"}.jpg\`;

    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return "";
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs transition-opacity animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl h-[92dvh] sm:h-[86dvh] max-h-[860px] flex flex-col border border-slate-200/90 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Riwayat Transaksi
                </h2>
                {apiUrl && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Terhubung Sheet</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                Catatan penjualan kasir &amp; arsip sinkronisasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                loadData(true);
              }}
              disabled={isLoading}
              className="pressable relative h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              title="Segarkan dari Google Sheet"
              aria-label="Segarkan Riwayat"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoading ? 'Memuat...' : 'Segarkan'}</span>
            </button>

            {/* Apps Script Code Helper Toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowScriptHelper(!showScriptHelper);
              }}
              className={`pressable relative h-9 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition active:scale-95 ${
                showScriptHelper
                  ? 'bg-blue-50 border-blue-200 text-[#007AFF]'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Panduan Kode Google Apps Script"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Skrip</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="pressable relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95"
              aria-label="Tutup Riwayat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Script Helper Accordion Drawer */}
        {showScriptHelper && (
          <div className="p-4 bg-slate-900 text-slate-100 border-b border-slate-800 text-xs shrink-0 max-h-56 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Google Apps Script Transaksi Murni (Kolom A:G)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyScript}
                className="pressable px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
              >
                {copiedCode ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                    <span>Skrip Transaksi Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin Kode Skrip</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Skrip ini hanya mencatat transaksi murni ke Kolom A:G tanpa kolom ringkasan ke samping yang rawan rumus #ERROR!. Kompatibel untuk semua sheet divisi (PDD, Danus, Konsumsi, dll).
            </p>
            <div className="text-[10px] text-slate-400 bg-black/40 p-2 rounded-lg font-mono">
              ✓ Log Transaksi: Waktu, Nama Barang, Jumlah, Harga, Total, Pembayaran, Foto (A:G)<br />
              ✓ Mulai Baris 2 tanpa melompati baris<br />
              ✓ Penyimpanan Foto Bukti ke Google Drive otomatis
            </div>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50/80 border-b border-slate-200/80 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Pesanan
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 num mt-0.5">
                {kpiStats.totalTransactions} <span className="text-xs font-medium text-slate-400">transaksi</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Metode Bayar
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs font-bold">
                <span className="text-[#007AFF] flex items-center gap-1 num">
                  <QrCode className="w-3 h-3" /> {kpiStats.qrisCount}
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-emerald-600 flex items-center gap-1 num">
                  <Banknote className="w-3 h-3" /> {kpiStats.cashCount}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Diskon
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-700 num mt-0.5 truncate">
                {kpiStats.totalDiscounts > 0
                  ? `-Rp ${kpiStats.totalDiscounts.toLocaleString('id-ID')}`
                  : 'Rp 0'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between shrink-0">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID pesanan, menu, atau tanggal..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
            {/* Payment Filters */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-black/5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setPaymentFilter('ALL');
                }}
                className={`px-2.5 py-1 rounded-[9px] text-[11px] font-bold transition ${
                  paymentFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setPaymentFilter('QRIS');
                }}
                className={`px-2.5 py-1 rounded-[9px] text-[11px] font-bold flex items-center gap-1 transition ${
                  paymentFilter === 'QRIS'
                    ? 'bg-white text-[#007AFF] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3 h-3" />
                <span>QRIS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setPaymentFilter('Cash');
                }}
                className={`px-2.5 py-1 rounded-[9px] text-[11px] font-bold flex items-center gap-1 transition ${
                  paymentFilter === 'Cash'
                    ? 'bg-white text-emerald-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-3 h-3" />
                <span>Tunai</span>
              </button>
            </div>

            {/* Sync Status Filter */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setStatusFilter((cur) =>
                  cur === 'ALL' ? 'SYNCED' : cur === 'SYNCED' ? 'PENDING' : 'ALL'
                );
              }}
              className={`h-7 px-2 rounded-lg border text-[11px] font-bold flex items-center gap-1 shrink-0 transition ${
                statusFilter !== 'ALL'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Filter status sinkronisasi"
            >
              <Filter className="w-3 h-3" />
              <span>
                {statusFilter === 'ALL'
                  ? 'Status'
                  : statusFilter === 'SYNCED'
                  ? 'Tersinkron'
                  : 'Antrean'}
              </span>
            </button>
          </div>
        </div>

        {/* Error Feedback Banner */}
        {fetchError && (
          <div className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between shrink-0">
            <span>{fetchError}</span>
            <button
              type="button"
              onClick={() => setFetchError(null)}
              className="text-amber-700 hover:text-amber-900 text-xs font-bold ml-2"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Scrollable Transaction List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-2.5">
          {isLoading && filteredItems.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#007AFF] animate-spin" />
              <p className="text-xs font-semibold text-slate-600">
                Mengambil catatan transaksi dari Google Sheet...
              </p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isExpanded = expandedOrderId === item.order_id;
              const hasPhoto = Boolean(item.photo_base64 || item.photo_url);

              return (
                <div
                  key={item.order_id}
                  className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition overflow-hidden"
                >
                  {/* Card Header Row */}
                  <div
                    onClick={() => {
                      triggerHaptic('light');
                      setExpandedOrderId(isExpanded ? null : item.order_id);
                    }}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          #{item.order_id}
                        </span>

                        {/* Payment Method Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.payment_method === 'QRIS'
                              ? 'bg-blue-50 text-[#007AFF] border border-blue-200/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}
                        >
                          {item.payment_method === 'QRIS' ? (
                            <QrCode className="w-2.5 h-2.5" />
                          ) : (
                            <Banknote className="w-2.5 h-2.5" />
                          )}
                          <span>{item.payment_method}</span>
                        </span>

                        {/* Sync Status Badge */}
                        {item.is_local_pending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            <Clock className="w-2.5 h-2.5 animate-pulse" />
                            <span>Antrean Offline</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                            <span>Google Sheet</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{item.timestamp}</span>
                        <span>•</span>
                        <span>{item.items_count || item.items.length} item</span>
                      </div>
                    </div>

                    {/* Amount & Expand Toggle */}
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900 num">
                          Rp {item.net_total.toLocaleString('id-ID')}
                        </div>
                        {item.discount_total > 0 && (
                          <div className="text-[10px] font-bold text-rose-500 num">
                            Hemat Rp {item.discount_total.toLocaleString('id-ID')}
                          </div>
                        )}
                      </div>

                      <div className="text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Item Breakdown Details */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-2 text-xs">
                      <div className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">
                        Rincian Item Pembelian:
                      </div>

                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/70">
                        {item.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-0.5"
                          >
                            <span className="text-slate-800 font-medium truncate pr-2">
                              {it.qty}× {it.name}
                            </span>
                            <span className="text-slate-600 num shrink-0 font-bold">
                              Rp {(it.qty * it.unit_price).toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))}

                        {item.discount_total > 0 && (
                          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 text-rose-600 font-semibold">
                            <span>Diskon Promosi</span>
                            <span className="num">-Rp {item.discount_total.toLocaleString('id-ID')}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200 font-extrabold text-slate-900">
                          <span>Total Pembayaran</span>
                          <span className="num">Rp {item.net_total.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      {/* Photo Proof Action / Preview */}
                      {hasPhoto && (
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-500">
                            Bukti Transfer / Kasir:
                          </span>

                          {item.photo_base64 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic('light');
                                if (onViewPhoto && item.photo_base64) {
                                  onViewPhoto(item.photo_base64);
                                }
                              }}
                              className="pressable px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Foto Bukti</span>
                            </button>
                          ) : item.photo_url ? (
                            <a
                              href={item.photo_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="pressable px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Buka Google Drive</span>
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Receipt className="w-6 h-6 stroke-[1.8]" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {searchQuery || paymentFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Tidak ada transaksi yang cocok'
                  : 'Belum Ada Riwayat Transaksi'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                {searchQuery
                  ? 'Coba ganti kata kunci pencarian atau reset filter'
                  : 'Setiap transaksi yang disimpan kasir akan otomatis tercatat di sini dan tersinkron ke Google Sheet.'}
              </p>
              {(searchQuery || paymentFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPaymentFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="mt-2 text-xs font-bold text-[#007AFF] hover:underline"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 truncate">
            Menampilkan <span className="font-bold text-slate-800 num">{filteredItems.length}</span> transaksi
          </div>

          <div className="flex items-center gap-2">
            {apiUrl && (
              <a
                href={apiUrl.replace('/exec', '/edit')}
                target="_blank"
                rel="noreferrer"
                className="pressable hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                title="Buka Spreadsheet di Google Sheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Buka Google Sheet</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="pressable px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
