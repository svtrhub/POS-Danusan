# Penanaman QRIS Default Permanen Multi-Perangkat (Offline-First)

Memastikan gambar QRIS resmi bawaan ("MANAGEMENT GATHERING 2026 - FOOD") tertanam secara permanen dan kokoh ke dalam aset *bundle* aplikasi, sehingga setiap kali aplikasi POS dibuka di perangkat atau peramban baru, QRIS langsung aktif dan siap digunakan kasir tanpa perlu input manual.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Terkonfirmasi (Fase 1 Clarification)**:
> 1. **Sumber QRIS**: Menggunakan gambar QRIS resmi yang sudah ada di sistem ("MANAGEMENT GATHERING 2026 - FOOD", NMID: ID1026614259186).
> 2. **Mekanisme Distribusi**: Ditanam langsung (*hard-bundled*) ke dalam aset aplikasi agar langsung tersedia sejak *first paint* di perangkat baru dan 100% siap digunakan secara *offline*.
> 3. **Fleksibilitas Pengguna**: Fitur kustomisasi di Pengaturan tetap dipertahankan; jika kasir mengunggah QRIS baru, sistem akan menggunakannya, dan jika menekan "Kembalikan ke Bawaan", sistem otomatis kembali ke QRIS resmi bawaan ini.

---

### 1. Overview & Core Concept

- **What It Does**: Memecahkan masalah ketergantungan `localStorage` lokal pada perangkat baru. Dengan menanamkan aset gambar QRIS bawaan sebagai import statis modul TypeScript/Vite dan fallback berlapis (*base64 in-memory data URL* + *bundled WebP/PNG assets*), perangkat baru yang belum pernah membuka POS Danusan akan langsung menampilkan QRIS resmi saat kasir menarik laci QRIS atau saat pelanggan ingin membayar.
- **Target Audience / Persona**: Panitia dan kasir danusan yang membuka aplikasi di ponsel masing-masing (HP baru, ganti perangkat, mode *incognito*, atau setelah *clear cache*).
- **Key Value**: Nol konfigurasi awal (*zero setup*) untuk kasir baru; QRIS selalu muncul instan, tidak pernah rusak/blank (*zero broken images*), dan tetap berfungsi saat sinyal internet minim.

---

### 2. User Experience & Visual Design

- **Alur Perangkat Baru (First-Time User Flow)**:
  1. Kasir membuka tautan aplikasi POS Danusan di HP baru (Chrome / Safari / PWA).
  2. Saat pelanggan hendak membayar via QRIS, kasir menggeser tab "Tarik QRIS" di bawah header atau mengetuk kartu QRIS di panel kasir.
  3. Lembar QRIS terbuka mulus menampilkan kode QRIS resmi "MANAGEMENT GATHERING 2026 - FOOD" dengan status badge "QRIS Pembayaran Resmi" berwarna hijau aktif.
  4. Tidak ada lagi layar kosong atau kewajiban masuk ke menu Pengaturan terlebih dahulu.

- **Alur Kustomisasi & Reset (Settings Flow)**:
  1. Di *SettingsModal*, pratinjau QRIS langsung menampilkan gambar default resmi.
  2. Tombol "Ganti Gambar QRIS" tetap tersedia bagi yang ingin mengganti gambar acara lain.
  3. Tombol "Kembalikan ke Bawaan" mengembalikan QRIS ke aset resmi bawaan dan membersihkan *override* lokal.

- **Visual Identity & Theme**:
  - Mengikuti Apple Minimalist White & iOS System Palette (`#007AFF`, `#F2F2F7`, `#1C1C1E`).
  - Laci QRIS bersih dengan bayangan halus, batas hairline tipis, dan *card overlay* berbingkai membulat 24px (`rounded-3xl`).

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Format & Strategi Penanaman Aset**:
  - *Pendekatan*: Menyatukan referensi QRIS bawaan melalui file data konstan TypeScript (`src/assets/defaultQrisData.ts` dan `src/assets/defaultQris.ts`) yang diimpor langsung oleh React komponen, dilengkapi dengan aset statis di direktori `public/` sebagai cadangan URL web.
  - *Alasan*: Import modul TypeScript di-bundle langsung oleh Vite ke dalam file JavaScript klien. Artinya, gambar QRIS akan terunduh bersama kode utama aplikasi; browser tidak perlu melakukan request HTTP tambahan yang rentan gagal atau lambat di jaringan seluler lemah.
  - *Alternatif yang Ditinggalkan*: Hanya mengandalkan request API `/api/save-default-qris` (ditinggalkan karena aplikasi adalah SPA statis tanpa backend server Express aktif di mode dev/preview).

- **Keputusan 2: Pembersihan MIME-Type & Header Gambar**:
  - *Pendekatan*: Memperbaiki ketidaksesuaian MIME-type pada `public/qris-default.webp` (yang sebelumnya berisi format JPEG) menjadi WebP valid dan JPEG valid terpisah, serta memastikan data URL memiliki header `data:image/jpeg;base64,...` yang kompatibel dengan WebKit Safari dan Chromium Android.
  - *Alasan*: Mencegah decode error pada browser Safari iOS saat membuka gambar statis.

- **Keputusan 3: Hierarchy Fallback Multi-Lapisan**:
  - *Pendekatan*: Mengatur urutan *fallback* di `App.tsx`, `QRISPullCard.tsx`, dan `SettingsModal.tsx`:
    1. Kustom QRIS pengguna dari `localStorage` (jika ada).
    2. Data URL statis bawaan `DEFAULT_QRIS_DATA` (tersedia seketika di memori, zero HTTP request).
    3. Import aset bawaan bundler (`defaultQrisWebp` / `defaultQrisPng`).
    4. Path statis `/qris-default.webp` dari folder publik.
  - *Alasan*: Menjamin keandalan 100% tanpa celah gambar blank di semua kondisi jaringan dan tipe peramban.

---

### 4. Technical Architecture & Data Strategy

#### Diagram Arsitektur Distribusi QRIS

```
┌─────────────────────────────────────────────────────────────┐
│                    Aplikasi POS Danusan                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     Perangkat Lama    │             │    Perangkat Baru     │
│   (Ada LocalStorage)  │             │ (LocalStorage Kosong) │
└───────────┬───────────┘             └───────────┬───────────┘
            │                                     │
            │ POS_QRIS_IMAGE                      │ Fallback Otomatis
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│   QRIS Kustom Kasir   │             │  DEFAULT_QRIS_DATA    │
│  (Jika Pernah Diubah) │             │ (Embedded Base64 TS)  │
└───────────────────────┘             └───────────┬───────────┘
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
            ┌─────────────────────────────────────┐
            │         Tampilan QRIS Aktif         │
            │      - Laci Tarik (QRISPullCard)    │
            │      - Pratinjau di SettingsModal   │
            │      - Panel Split iPad             │
            └─────────────────────────────────────┘
```

#### Komponen yang Akan Diperbarui:
1. `src/assets/defaultQrisData.ts`: Memastikan string base64 QRIS resmi bersih, valid, dan langsung di-export.
2. `src/assets/defaultQris.ts`: Menyatukan ekspor modul statis sebagai sumber kebenaran tunggal (*single source of truth*).
3. `src/App.tsx`: Menginisialisasi state `customQrisImage` dengan prioritas bawaan yang aman sehingga saat pertama kali dibuka di perangkat baru, state langsung terisi `DEFAULT_QRIS_DATA` tanpa nilai kosong.
4. `src/components/QRISPullCard.tsx`: Menyempurnakan fallback sources dan event handler agar selalu merender gambar default jika pengguna belum mengunggah gambar kustom.
5. `src/components/SettingsModal.tsx`: Menjamin pratinjau QRIS di pengaturan selalu menampilkan gambar resmi bawaan jika belum ada gambar kustom.
