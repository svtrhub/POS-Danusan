/**
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

    // Simpan Transaksi Baru ke Kolom A:G
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

      // Siapkan baris transaksi (1 baris per item)
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

      // Cari baris kosong pertama di Kolom A & B (selalu mulai dari Baris 2)
      const startRow = getFirstEmptySalesRow_(sheet);

      if (startRow + rows.length > sheet.getMaxRows()) {
        sheet.insertRowsAfter(sheet.getMaxRows(), Math.max(rows.length, 50));
      }

      // Tulis transaksi ke Kolom A:G
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

/**
 * Menjamin Header Kolom A:G terpasang rapi tanpa kolom samping apa pun
 */
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

/**
 * Mencari baris kosong pertama pada Kolom A & B (selalu mulai dari Baris 2)
 */
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

/**
 * Membaca data transaksi dari Kolom A:G untuk ditampilkan pada Riwayat Transaksi di App
 */
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

    const orderKey = `${timestamp}__${payment}__${photoUrl}`;

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

/**
 * Menyimpan foto bukti transaksi ke Google Drive dan mengembalikan URL publik
 */
function savePhotoToDrive_(base64Data, mimeType, paymentMethod, orderId) {
  try {
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const decoded = Utilities.base64Decode(cleanBase64);
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    const fileName = `${stamp}_${paymentMethod}_${orderId || "POS"}.jpg`;

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
}
