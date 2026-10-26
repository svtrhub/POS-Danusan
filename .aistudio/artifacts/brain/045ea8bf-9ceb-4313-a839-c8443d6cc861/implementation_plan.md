# POS Danusan — IndexedDB Offline Persistence & Crash Recovery Plan

Implementasi lapisan persistensi data lokal modern berbasis **IndexedDB** untuk POS Danusan guna mengamankan katalog menu, antrean transaksi tertunda (*pending sync queue*), dan foto bukti pembayaran langsung ke disk browser, menjamin nol kehilangan data transaksi (*zero data loss*) meskipun browser tertutup paksa, ponsel mati, atau halaman di-refresh saat offline.

---

> [!IMPORTANT]
> ### Hasil Konfirmasi Pengguna & Parameter Arsitektur
> Berdasarkan tanya-jawab klarifikasi:
> - **Cakupan Persistensi Terkonfirmasi**: Seluruh katalog produk (*custom menu*), antrean sinkronisasi transaksi (*pending sync queue*), dan **foto bukti pembayaran beresolusi penuh** (*base64 photo proofs*) disimpan aman di IndexedDB.
> - **Strategi Pemulihan & Sinkronisasi Terkonfirmasi**: Saat koneksi internet kembali atau aplikasi dibuka ulang setelah crash, sistem secara otomatis melakukan sinkronisasi latar belakang (*auto-sync in background*) dan memberikan konfirmasi melalui notifikasi toast.
> - **Migrasi Data Otomatis**: Data lama yang tersisa di `localStorage` akan dimigrasikan secara otomatis dan transparan ke IndexedDB pada inisialisasi pertama tanpa mengganggu riwayat penjualan yang ada.

---

## 1. Overview & Core Concept

### Masalah yang Diselesaikan
Sebelumnya, antrean sinkronisasi transaksi dan foto bukti pembayaran disimpan di `localStorage`. Karena `localStorage` memiliki batasan kuota ketat (~5MB) dan bersifat sinkron pada *main thread*, penambahan beberapa foto bukti pembayaran saat offline berisiko memicu `QuotaExceededError` atau hilangnya transaksi ketika browser di-refresh.

### Solusi yang Dihadirkan
Membangun lapisan persistensi asynchronous berbasis **IndexedDB (`POS_DATABASE_V1`)** yang:
1. Menyimpan data transaksi offline dan foto bukti pembayaran tanpa batas kuota sempit (kapasitas penyimpanan disk browser hingga gigabyte).
2. Menyimpan katalog menu aktif per divisi secara persisten sehingga saat membuka aplikasi tanpa sinyal, menu lengkap langsung siap digunakan dalam <100ms.
3. Mengembalikan antrean transaksi yang belum sempat tersinkronisasi (*recovery on launch/crash*) secara otomatis begitu aplikasi dibuka kembali, lalu mengirimkannya ke Google Sheets saat internet tersedia.

---

## 2. User Experience & Visual Design

### Alur Pengalaman Pengguna (User Flows)

```
[ Transaksi Kasir Offline ]
           │
           ▼
[ Simpan Pesanan + Foto Bukti ]
           │
           ▼
[ Write-Through ke IndexedDB ] ───► Tersimpan permanen di Disk (Crash-Proof)
           │
           ▼
  [ Ada Koneksi Internet? ]
     ├─── YA ───► Kirim ke Google Apps Script ──► Notifikasi: "Transaksi Berhasil Tersinkron!"
     └─── TIDAK ─► Tetap di IndexedDB (Antrean) ──► Notifikasi: "Tersimpan Offline di Perangkat"
                                                       │
                                        (Ponsel mati / Refresh / Crash)
                                                       │
                                                       ▼
                                            [ Aplikasi Dibuka Lagi ]
                                                       │
                                                       ▼
                                      [ Rehidrasi Otomatis dari Disk ]
                                                       │
                                      [ Auto-Sync saat Internet Pulih ]
```

1. **Kasir Berjualan Tanpa Internet**:
   - Kasir memilih produk, melampirkan foto bukti QRIS/Tunai, dan menekan **Simpan Pesanan**.
   - Data langsung tersimpan di IndexedDB dalam hitungan milidetik.
   - Muncul notifikasi toast lembut: *"Transaksi tersimpan di antrean offline (Aman di perangkat)"*.

2. **Skenario Crash atau Refresh Halaman**:
   - Jika tab browser tidak sengaja tertutup, ponsel kehabisan baterai, atau halaman di-refresh, saat aplikasi dibuka kembali:
   - Layanan sinkronisasi secara instan merehidrasi antrean dari IndexedDB.
   - Badge status offline di header menampilkan jumlah pesanan yang tersimpan aman di disk (misal: `1 pesanan tersimpan offline`).

3. **Pemulihan Koneksi Otomatis (*Auto-Sync*)**:
   - Begitu perangkat mendeteksi sinyal internet aktif kembali (`window.online` event atau saat polling berkala), antrean di IndexedDB diproses satu per satu.
   - Setelah sukses terkirim ke Google Sheets, status transaksi diperbarui menjadi `synced` di IndexedDB dan toast konfirmasi muncul: *"1 transaksi offline berhasil disinkronkan ke Google Sheets"*.

---

## 3. Key Product Decisions & Trade-Offs

### Keputusan 1: Engine IndexedDB Ringan Tanpa Dependensi Berat
- **Pilihan**: Mengimplementasikan wrapper Promise-based IndexedDB terstandarisasi yang sangat ringan (~2KB) dengan TypeScript typing lengkap, daripada menambahkan library runtime besar.
- **Alasan**: Menjaga bundle web app tetap ramping, waktu muat awal (*First Contentful Paint*) super cepat untuk operasional kasir lapangan, dan sepenuhnya kompatibel dengan standar Web API PWA modern di iOS Safari dan Android Chrome.

### Keputusan 2: Arsitektur Dual-Layer (Memory Cache + Disk Write-Through)
- **Pilihan**: Komponen UI membaca data dari cache memori instan (state React), sedangkan setiap operasi penambahan, pembaruan, atau penghapusan transaksi selalu melakukan *write-through* secara asynchronous ke IndexedDB.
- **Alasan**: Mencegah kelambatan rendering UI saat kasir mengetuk tombol pesanan cepat, sekaligus menjamin data tidak akan hilang sedetik pun jika aplikasi tiba-tiba berhenti.

### Keputusan 3: Strategi Migrasi Transparan dari `localStorage`
- **Pilihan**: Saat database pertama kali dibuka, sistem memeriksa apakah ada sisa data di `POS_QUEUE`, `POS_MENU`, atau `POS_LOCAL_HISTORY` pada `localStorage`. Jika ada, data disalin ke IndexedDB kemudian dibersihkan dari `localStorage` untuk mencegah duplikasi.
- **Alasan**: Pengguna tidak akan kehilangan riwayat transaksi terdahulu atau pengaturan menu kustom yang sudah dibuat.

---

## 4. Technical Architecture & Data Strategy

### Diagram Arsitektur Sistem

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│   [ Menu Grid ]     [ Order Panel / Dock ]     [ Transaction History ] │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT HOOKS & SESSION                           │
│     useOrderSession            useSyncEngine          useHistory       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SERVICES & DISK LAYER                           │
│                                                                        │
│   ┌──────────────────────┐          ┌──────────────────────────────┐   │
│   │   syncEngine.ts      │ ◄──────► │     indexedDBStorage.ts      │   │
│   │ (Background Queue)   │          │ (Promise-Based IDB Client)   │   │
│   └──────────┬───────────┘          └──────────────┬───────────────┘   │
└──────────────┼─────────────────────────────────────┼───────────────────┘
               │                                     │
               ▼                                     ▼
   ┌───────────────────────┐            ┌────────────────────────────┐
   │ Google Apps Script    │            │   INDEXEDDB (Browser Disk) │
   │ (Spreadsheet & Drive) │            │   • catalog_store          │
   └───────────────────────┘            │   • sync_queue_store       │
                                        │   • sales_history_store    │
                                        │   • app_config_store       │
                                        └────────────────────────────┘
```

### Struktur Database & Object Stores (`POS_DATABASE_V1`)

| Object Store | Key Path | Index | Data yang Disimpan |
| :--- | :--- | :--- | :--- |
| `catalog_store` | `id` | `category`, `name` | Daftar produk aktif, harga, dan kustomisasi menu divisi |
| `sync_queue_store` | `order_id` | `timestamp`, `status` | Antrean pesanan offline + foto bukti pembayaran beresolusi penuh |
| `sales_history_store` | `order_id` | `timestamp`, `payment_method` | Riwayat lengkap transaksi lokal (termasuk status sync) |
| `app_config_store` | `key` | - | URL Apps Script, pengaturan divisi, dan metadata sistem |

### Tahapan Implementasi Teknis

1. **Modul Penyimpanan IndexedDB (`src/services/indexedDBStorage.ts`)**:
   - Inisialisasi DB dengan skema v1 dan upgrade handler.
   - Operasi CRUD asynchronous: `saveQueueOrder`, `removeQueueOrder`, `getAllQueueOrders`, `saveCatalog`, `getCatalog`, `saveHistoryOrder`, `getAllHistoryOrders`.
   - Handler migrasi otomatis dari `localStorage`.

2. **Pembaruan Sync Engine (`src/services/syncEngine.ts`)**:
   - Ganti ketergantungan `localStorage` dengan `indexedDBStorage`.
   - Inisialisasi antrean saat aplikasi start via `indexedDBStorage.getAllQueueOrders()`.
   - Otomatis trigger proses sinkronisasi latar belakang jika ada antrean tertinggal saat koneksi pulih.

3. **Pembaruan State Menu & Riwayat**:
   - Hubungkan `App.tsx` dan `historyStorage.ts` ke IndexedDB agar penambahan foto dan kustomisasi menu tidak terbatas kuota 5MB.
   - Sediakan indikator status sinkronisasi yang elegan dan tidak mengganggu.
