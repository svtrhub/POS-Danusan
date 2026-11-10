# Rencana Peningkatan Performa & Stabilitas Mode Offline POS Danusan

Pelan teknis komprehensif, minimalis, dan berbasis prinsip *Ponytail* (YAGNI, solusi paling ringkas, memanfaatkan fitur platform bawaan, tanpa *overengineering*) untuk memperkuat stabilitas aplikasi saat digunakan tanpa koneksi internet di lapangan.

---

## 1. Keputusan Pengguna & Hasil Klarifikasi

Berdasarkan jawaban klarifikasi pengguna:
1. **Indikator Offline di Header**: Tampilkan label status **"Offline"** dan jumlah antrean lokal (`Offline (N)`) saat perangkat kehilangan koneksi internet.
2. **Manajemen Memori Foto Bukti**: **Hapus foto bukti dari memori lokal (IndexedDB & RAM cache)** setelah transaksi berhasil tersinkronisasi ke Google Drive/Sheets, sehingga penyimpanan HP tetap ringan dan bebas *memory bloat*.
3. **Pengaturan Menu saat Offline**: **Izinkan kasir mengedit menu dan harga saat offline** dengan penyimpanan lokal instan ke IndexedDB (0ms), dan tunda sinkronisasi ke Sheet hingga internet kembali online tanpa membuat aplikasi macet/menunggu timeout.

---

## 2. Analisis Masalah Alur Offline Saat Ini

1. **Header Kurang Informatif saat Offline**:
   - Saat internet putus, header tetap menampilkan status `Tersinkron` dengan titik hijau jika antrean kosong, atau `Antrean (N)` dengan titik kuning tanpa keterangan jelas bahwa perangkat sedang offline. Kasir tidak memiliki kepastian visual apakah transaksi tersimpan di memori HP.
2. **Memory Bloat dari Foto Bukti yang Sudah Tersinkron**:
   - Di `indexedDBStorage.ts`, setiap transaksi yang telah tersinkronisasi ke Google Drive tetap mempertahankan string `photo_base64` (~50KB–200KB per file) di dalam database IndexedDB lokal `sales_history_store`.
   - Pada bazar/penjualan intensif seharian dengan ratusan transaksi, data ini menumpuk hingga puluhan megabyte, memperlambat query baca/tulis IndexedDB dan berisiko mengalami *crash* di HP RAM rendah.
3. **Modal Pengaturan Menggantung (15 Detik) saat Offline**:
   - Di `App.tsx` (`handleSaveSettings`), saat kasir mengubah harga/nama menu dan menekan simpan saat offline, fungsi `saveProductsToSheet` memaksa `fetch` ke Google Apps Script dan tertahan selama 15 detik sebelum *timeout* dibatalkan.
4. **Service Worker Navigation Timeout di HP Android/iOS**:
   - Pada `public/sw.js`, permintaan navigasi halaman (`index.html`) mencoba `fetch()` jaringan terlebih dahulu. Jika radio seluler perangkat mati/sinyal hilang, peramban menunggu 3–5 detik untuk kegagalan koneksi sebelum beralih ke cache offline.
5. **Kode Mati (Dead Code)**:
   - `onPullSheet` di `SettingsModal.tsx` diarsipkan dan tidak lagi dipakai di UI, namun masih memiliki fungsi pembungkus di `App.tsx` (`handlePullSheet`), `useSyncEngine.ts` (`fetchConfigFromSheet`), dan `syncEngine.ts` (`fetchConfigFromSheet`).
   - Prop `isInstalled` di `Header.tsx` dideklarasikan namun tidak pernah digunakan.

---

## 3. Rencana Perubahan Teknis (Minimal & Presisi)

### A. Indikator Status Offline Real-Time di Header
- **Target File**: `src/components/Header.tsx` & `src/App.tsx`
- **Tindakan**:
  - Tangkap status konektivitas perangkat (`navigator.onLine`) secara reaktif menggunakan event listener native `'online'` dan `'offline'`.
  - Teruskan prop `isOnline` ke `Header.tsx`.
  - Logika status pill pada `Header.tsx`:
    - Jika `!isOnline`:
      - `queueLength > 0`: Tampilkan label `Offline (${queueLength})` dengan titik kuning/amber.
      - `queueLength === 0`: Tampilkan label `Offline (Siap)` dengan titik abu-abu/netral.
    - Jika `isOnline`: Tetap gunakan logika yang sudah ada (`Tersinkron`, `Menyinkronkan...`, atau `Antrean (N)`).
  - Hapus prop `isInstalled` yang tidak digunakan dari `Header.tsx`.

### B. Pembersihan Otomatis Foto Bukti Setelah Sinkronisasi Sukses
- **Target File**: `src/services/indexedDBStorage.ts` & `src/utils/historyStorage.ts`
- **Tindakan**:
  - Pada `markHistoryOrderSynced(orderId)` di `indexedDBStorage.ts`:
    - Setel `item.is_local_pending = false`.
    - Hapus data gambar: `item.photo_base64 = ''`.
    - Simpan kembali record yang sudah ringan ke `STORES.SALES_HISTORY`.
  - Pada `markOrderSyncedLocally(orderId)` di `historyStorage.ts`:
    - Perbarui cache memori lokal dengan menghapus `photo_base64` untuk pesanan tersebut.
  - Hasil: Pesanan offline yang belum tersinkron tetap memiliki foto untuk pratinjau kasir. Begitu terkirim ke Google Sheets & Drive, memori disk langsung dibersihkan, sedangkan tautan Google Drive (`photo_url`) tetap dapat dibuka kapan saja.

### C. Simpan Menu Offline Instan Tanpa Delay Timeout
- **Target File**: `src/App.tsx` (`handleSaveSettings`)
- **Tindakan**:
  - Cek `navigator.onLine` sebelum memicu sinkronisasi menu ke cloud:
    - Jika offline (`!navigator.onLine`): Simpan perubahan menu langsung ke IndexedDB (`saveCatalog`) dan `localStorage` (0ms), tampilkan notifikasi toast `"✓ Menu tersimpan di perangkat (Mode Offline)"`, dan lewati pemanggilan jaringan.
    - Jika online: Lanjutkan sinkronisasi normal ke Google Sheets.
  - Saat perangkat kembali online (`'online'` event), jika URL API tersedia, otomatis sinkronkan antrean dan menu tanpa perlu campur tangan kasir.

### D. Optimasi Service Worker untuk Buka Aplikasi Instan Saat Offline
- **Target File**: `public/sw.js`
- **Tindakan**:
  - Pada event `fetch` untuk `event.request.mode === 'navigate'`:
    - Jika `!navigator.onLine`, langsung sajikan `./index.html` dari `caches.match()` secara instan (0ms) tanpa menunggu kegagalan stack jaringan radio seluler.
    - Jika online, pertahankan alur *network-first* dengan pembaharuan cache di latar belakang.

### E. Penghapusan Kode Mati (Dead Code Elimination)
- **Target File**:
  - `src/components/SettingsModal.tsx`: Hapus deklarasi prop `onPullSheet` yang tidak pernah dipanggil.
  - `src/App.tsx`: Hapus fungsi `handlePullSheet` dan prop `onPullSheet` yang diteruskan ke `SettingsModal`.
  - `src/hooks/useSyncEngine.ts` & `src/services/syncEngine.ts`: Hapus method `fetchConfigFromSheet` yang tidak lagi digunakan.

---

## 4. Verifikasi & Status Implementasi

- [x] **Indikator Offline Real-Time**: `Header.tsx` merespons status `isOnline`, menampilkan `Offline (Siap)` atau `Offline (N)` dengan dot visual yang jelas saat perangkat kehilangan sinyal.
- [x] **Pembersihan Otomatis Foto Bukti**: `markHistoryOrderSynced` di `indexedDBStorage.ts` dan `markOrderSyncedLocally` di `historyStorage.ts` otomatis membersihkan `photo_base64` setelah pesanan sukses tersinkron ke cloud, mencegah memory bloat.
- [x] **Penyimpanan Menu Offline Instan**: `handleSaveSettings` di `App.tsx` mengecek status koneksi; saat offline, langsung simpan ke IndexedDB dan localStorage tanpa delay timeout 15 detik.
- [x] **Fast Service Worker Navigation**: `sw.js` langsung menyajikan cache `index.html` seketika saat offline (`!navigator.onLine`).
- [x] **Pembersihan Kode Mati**: Menghapus `onPullSheet`, `handlePullSheet`, dan `fetchConfigFromSheet` dari `SettingsModal`, `App`, `useSyncEngine`, dan `syncEngine`.
- [x] **TypeScript & Linting**: `tsc --noEmit` lolos 100% dengan 0 error.
- [x] **Production Bundle**: `vite build` berhasil mentransformasikan 1684 modul dalam 884ms.
- [x] **Server Development**: Port 3000 aktif dan merespons `HTTP 200 OK`.
