# Rencana Peningkatan UI/UX — POS Danusan

> Dokumen ini adalah audit dan rencana implementasi untuk meningkatkan konsistensi, keterbacaan, dan kemudahan penggunaan POS Danusan. Panduan desain: Apple Design (`APPLE-DESIGN.md`) dan Emil Kowalski Design Engineering (`EMIL-DESIGN-ENG.md`).
>
> **Status:** rencana, bukan catatan perubahan yang sudah diterapkan. Implementasi harus dilakukan bertahap dan diuji terhadap alur POS yang ada.

## 1. Tujuan dan prinsip

Tujuan utama adalah membuat pengalaman kasir lebih intuitif, cepat dipahami, dan nyaman dipakai berulang kali—bukan sekadar membuat tampilannya lebih premium.

Prinsip yang harus dipertahankan:

- **Pertahankan identitas Danusan:** copywriting **“AYO DANUSAN!”**, logo maskot, dan karakter ramah aplikasi tidak boleh dihilangkan atau diganti.
- **Pertahankan palet resmi:** Apple white, gray, blue accent, dan red khusus aksi destruktif seperti hapus/reset. Jangan memperkenalkan palet baru atau memakai warna dekoratif lain yang mengganggu konsistensi.
- **Pertahankan semua fitur dan alur bisnis POS.** Perubahan yang direncanakan menyasar presentasi, hierarki, dan interaksi; bukan menghapus fungsi.
- **Utamakan keterbacaan dan kecepatan kasir.** Nama menu, harga, jumlah, total, status, dan aksi utama harus mudah dikenali.
- **Sederhanakan, bukan sekadar minimalis.** Hilangkan teks yang tidak membantu, tetapi pertahankan instruksi yang diperlukan untuk menyelesaikan tugas.
- **Motion harus punya fungsi.** Gunakan animasi untuk feedback, status, atau hubungan spasial; jangan menambah gerak hanya agar terlihat menarik.
- **Hormati preferensi aksesibilitas dan performa.** Target sentuh tetap nyaman, keyboard/fokus tetap berfungsi, battery saver tetap efektif, dan reduced motion didukung.

## 2. Cakupan audit

Komponen dan area frontend yang menjadi fokus:

- `src/index.css` — fondasi tipografi, interaksi, motion, dan reduced motion.
- `src/components/Header.tsx` — identitas app, pemilih tim, status sinkronisasi, dan aksi global.
- `src/components/ProductCard.tsx` — katalog, harga, dan kontrol kuantitas.
- `src/components/PaymentDock.tsx` — checkout mobile.
- `src/components/TabletOrderPanel.tsx` — keranjang dan checkout tablet/desktop.
- `src/components/SettingsModal.tsx` — konfigurasi kasir, tim, menu, URL Apps Script, QRIS, riwayat, dan hemat baterai.
- `src/components/QRISPullCard.tsx` — gesture untuk menampilkan QRIS.
- `src/components/CameraActionSheet.tsx` — pilihan kamera/galeri, pemrosesan, dan swipe dismiss.
- `src/components/PhotoModal.tsx`, `src/components/PWAExplainModal.tsx`, `src/components/TransactionHistoryModal.tsx` — pola modal, navigasi, dan keterbacaan.
- `src/services/syncEngine.ts` — hanya untuk memastikan ID sheet tetap fixed dan penggunaan konfigurasi lama tidak merusak sinkronisasi; bukan sasaran perubahan desain.

## 3. Temuan audit

### 3.1 Konsistensi spacing dan tipografi

- Komponen menggunakan campuran ukuran teks, padding, tinggi tombol, radius, dan jarak antar elemen. Perbedaan kecil yang berulang membuat antarmuka terasa kurang satu sistem.
- Ada teks kecil yang membawa informasi penting, terutama label dan status pada pengaturan dan checkout.
- Header, katalog, dock mobile, dan panel tablet perlu mengikuti hierarki yang sama tanpa harus dibuat identik secara kaku.
- Target sentuh pada beberapa aksi masih perlu diperiksa terhadap kenyamanan penggunaan jari. Merapatkan spacing tidak boleh berarti memperkecil area interaksi.

### 3.2 Modal pengaturan

- Modal memuat banyak fungsi penting dalam satu alur panjang: pemilihan tim dan sinkronisasi menu, riwayat, hemat baterai, URL Apps Script, QRIS, editor menu, dan simpan.
- Teks pengantar dan detail sheet yang redundant menambah kepadatan tanpa membantu tugas umum.
- Label dan feedback perlu lebih dekat dengan kontrol terkait agar pengguna memahami dampak tindakan.
- Sheet menu sudah seharusnya fixed. Editor ID/URL sheet tidak boleh ditampilkan atau menjadi sumber konfigurasi aktif. Link untuk membuka sheet boleh tetap tersedia.
- Perlu dibedakan secara konsisten antara item Sheet (nama terkunci) dan item custom (nama dapat diubah, bisa dihapus) tanpa helper panjang di bawah judul.

### 3.3 Motion dan gesture

- QRIS pull-card telah mendukung Pointer Events, pointer capture, drag langsung, dan buka/tutup dengan gesture. Perlu dipastikan gerak dapat dibalik dan tidak terasa seperti animasi yang selesai sendiri setelah pengguna melepas kontrol.
- Action sheet kamera menggunakan touch events untuk swipe-down. Drag dismiss perlu dibatasi pada area yang tepat supaya tidak bertabrakan dengan aksi kamera/galeri atau scroll.
- Durasi, easing, dan respons reduced-motion harus terasa konsisten antara modal, action sheet, serta QRIS card.
- Aksi yang sangat sering seperti menambah/mengurangi jumlah harus tetap cepat; hindari transisi panjang atau layout animation.

### 3.4 Wayfinding, accessibility, dan responsive layout

- Pastikan tiap modal memberi jawaban jelas atas: sedang di mana, aksi apa tersedia, dan bagaimana menutupnya.
- Perlu pemeriksaan konsistensi `Escape`, semantik dialog, accessible name, focus indicator, dan keyboard operability.
- Safe-area, scroll area, dan footer CTA harus diuji di ponsel dengan notch, layar rendah, tablet, serta desktop.
- Error dan state proses pada unggah foto atau sinkron harus dapat dibaca dan tidak hanya ditandai dengan warna.

## 4. Rekomendasi perubahan terperinci

## Tahap A — sistem visual dan spacing

### Rekomendasi

1. Tetapkan skala spacing yang kecil dan mudah diterapkan, misalnya kelipatan 4 px: `4`, `8`, `12`, `16`, `20`, `24`.
2. Tetapkan peran tipografi, bukan banyak ukuran ad hoc:
   - Judul modal: sekitar `17–18px`, bold, line-height rapat.
   - Judul bagian: sekitar `13–14px`, semibold.
   - Label/input: sekitar `12–13px`, cukup kontras.
   - Helper text: sekitar `11–12px`, hanya bila membantu tindakan.
   - Nama menu dan nilai transaksi: tetap cukup besar dan mudah dibaca.
3. Gunakan tabular numbers untuk harga, kuantitas, total, dan jumlah antrean.
4. Selaraskan tinggi input dan tombol menurut peran; tombol utama dan aksi kasir harus tetap punya target sentuh yang memadai.
5. Pertahankan palet dan tone yang sekarang. Hindari menambahkan warna kategori baru untuk dekorasi.
6. Gunakan border hairline/transparan atau shadow yang sangat halus secara konsisten; hindari menambah lapisan kartu/border tanpa tujuan.

### File utama

- `src/index.css`
- `Header.tsx`
- `ProductCard.tsx`
- `PaymentDock.tsx`
- `TabletOrderPanel.tsx`

### Kriteria selesai

- Label, harga, nama menu, dan total memiliki hierarki yang jelas.
- Spacing terasa konsisten tanpa membuat layar lebih padat atau mengurangi target sentuh.
- Nilai uang dan kuantitas tidak bergeser secara visual saat digit berubah.

## Tahap B — modal pengaturan yang lebih jelas dan ringkas

### Susunan yang direkomendasikan

Urutkan dari tugas yang paling sering dilakukan ke konfigurasi pendukung:

1. Divisi/tim dan sinkronisasi menu.
2. Daftar menu dan harga.
3. Riwayat transaksi.
4. Mode hemat baterai.
5. URL Apps Script.
6. Gambar QRIS.
7. Aksi simpan yang tetap mudah dijangkau.

Susunan final dapat mempertahankan urutan implementasi yang ada jika pengujian dengan kasir menunjukkan lebih efisien; jangan mengubah alur hanya demi estetika.

### Copy yang direkomendasikan

| Teks saat ini/yang pernah muncul | Rekomendasi | Catatan |
|---|---|---|
| `Sinkronisasi menu divisi & kasir` | Hapus | Tidak menambah instruksi atau konteks penting. |
| `Divisi Penjualan (Sheet Master)` | `Divisi Penjualan` atau `Divisi` | Pilih satu istilah yang paling jelas di konteks modal. |
| `Daftar Menu & Harga (Team A)` | `Daftar Menu & Harga` atau `Menu Team A` | Team sudah terlihat di segmented control; jangan mengulang bila tidak perlu. |
| `Item Sheet terkunci namanya; item Custom bebas diubah.` | Hapus dari bawah judul; pertahankan badge `Sheet`/`Custom` dan ikon kunci | Informasi status tetap ada di titik yang relevan. |
| `Tambah Menu Mendadak (Custom)` | `Tambah Menu Custom` | Lebih langsung, tidak memberi kesan prosedur darurat. |
| `Atur ID / Link Spreadsheet Master` | Hapus | ID sheet fixed; tidak ada pengaturan yang perlu dilakukan kasir. |
| `Sembunyikan ID / Link Sheet` | Hapus | Tidak ada panel konfigurasi ID. |
| Petunjuk berbagi Sheet yang panjang | Ringkas/hapus jika tidak dibutuhkan rutin | Bila dipertahankan, gunakan instruksi singkat dekat aksi buka/sinkron. |

### Sheet tetap

- Gunakan `DEFAULT_MENU_SHEET_ID` sebagai sumber ID sheet untuk sinkronisasi dan link “Buka Sheet”.
- Tidak menampilkan field, reset, atau kontrol untuk mengganti ID sheet.
- Abaikan nilai lama yang mungkin tersimpan di localStorage/IndexedDB agar perangkat lama tetap memakai sheet tetap.
- Jangan menghapus konstanta/state API yang dipakai bagian lain tanpa menelusuri semua pemanggil. Perubahan kontrak sebaiknya dilakukan terpisah dari redesign.

### Feedback dan kontrol

- Saat sinkronisasi berjalan: tombol sinkron menunjukkan status singkat, dinonaktifkan selama request berlangsung, dan ikon boleh berputar.
- Hasil sinkron/error ditempatkan pada banner feedback yang mudah ditemukan; jangan memakai warna sebagai satu-satunya cara menyampaikan status.
- Pergantian tim tetap menjalankan tindakan yang sekarang (pergantian tim dan pemuatan menu). Jangan menggandakan request atau memicu fetch ganda dari tap berulang.
- Penambahan item custom sebaiknya membawa fokus pengguna ke kolom nama baru jika implementasi fokus dapat dilakukan dengan aman.
- Input harga tetap terhubung dengan item yang benar, termasuk saat perubahan state dan daftar diperbarui.
- Footer “Simpan & Terapkan” tetap terlihat/terjangkau saat konten modal di-scroll.

### Kriteria selesai

- Pengguna dapat menemukan pemilih tim, sinkron, menu, URL, QRIS, riwayat, dan hemat baterai tanpa membaca paragraf panjang.
- ID sheet fixed di UI dan runtime; link “Buka Sheet” mengarah ke ID tetap.
- Semua fungsi pengaturan yang saat ini tersedia tetap dapat dijalankan.

## Tahap C — motion dan gesture QRIS/action sheet

### Pedoman bersama

- Tombol: feedback tekan segera, ringan, sekitar `100–140ms`; gunakan skala kecil sekitar `0.97–0.98`.
- Popover/sheet: sekitar `180–240ms`, kurva ease-out yang responsif; hindari `ease-in` untuk elemen yang masuk.
- Modal: sekitar `200–300ms` bila memang membantu orientasi; masuk/keluar mengikuti jalur yang sama.
- Animasi hanya pada `transform` dan `opacity` bila memungkinkan.
- Hindari `transition: all` untuk interaksi kompleks.
- State animasi harus dapat dibalik tanpa mengunci input.
- Hormati `prefers-reduced-motion`: kurangi translasi/skala, namun pertahankan perubahan opacity/state yang membantu pemahaman.
- Battery saver tetap mematikan atau mengurangi motion seperti perilaku sekarang.

### QRIS pull-card

- Pertahankan drag 1:1, pointer capture, scrim, fallback sumber gambar, dan tombol tutup.
- Tinjau kecepatan berbasis beberapa sampel pointer, bukan hanya delta dari satu event, agar gesture cepat tidak terlalu sensitif terhadap noise.
- Bedakan drag untuk membuka dari interaksi tombol/konten; input dan link tetap tidak memulai drag.
- Terapkan rubber-banding ringan di batas, bukan gerakan tanpa batas.
- Saat dilepas, gunakan kombinasi jarak dan arah/kecepatan untuk menentukan snap; jangan membuka/menutup hanya karena sedikit gerakan acak.
- Uji drag ke arah berlawanan ketika card sedang terbuka, close button, scrim tap, dan pembukaan dari event `open-qris`.
- Hindari animasi `animate-bounce` yang berulang pada petunjuk gesture. Gunakan petunjuk statis atau feedback singkat ketika diperlukan.

### Camera action sheet

- Pertahankan kamera, galeri, kompresi foto, status proses, callback hasil, dan cleanup BlobRegistry.
- Jadikan drag handle sebagai area utama untuk swipe-dismiss; tap/klik pada kamera/galeri tidak boleh memulai drag.
- Pertimbangkan Pointer Events dengan pointer capture untuk konsistensi input mouse/touch/pen, atau pertahankan touch events dengan ambang dan cancel yang jelas—pilih satu implementasi setelah pengujian perangkat.
- Terapkan ambang drag dismiss yang cukup jelas dan batas translasi agar sheet tidak mengikuti drag tanpa batas.
- Saat drag dibatalkan, kembalikan sheet dengan transisi transform singkat; saat ditutup, lakukan callback sekali saja.
- Ketika `isProcessing`, nonaktifkan dismiss gesture hanya jika penutupan akan membuat proses/cleanup tidak konsisten; jika dismiss tetap diizinkan, kelola pembatalan dan lifecycle eksplisit.
- Pastikan state error pemrosesan foto dapat diberitahukan ke pengguna; saat ini kegagalan hanya tercatat di console.

### Kriteria selesai

- Gesture terasa langsung dan dapat dibatalkan; tidak ada gerakan yang membuat pengguna kehilangan kontrol.
- Tombol kamera/galeri tetap berfungsi dan tidak bentrok dengan swipe.
- Foto tetap dikompresi, hasil diteruskan ke callback, dan blob dibersihkan dengan benar.
- Reduced-motion dan battery saver mengurangi gerak tanpa menghilangkan status penting.

## Tahap D — polish komponen lain dan aksesibilitas

### Header

- Pertahankan “AYO DANUSAN!” dan akses ke logo/brand.
- Pada layar sempit, hindari status sinkron mengambil lebar dari identitas atau aksi utama; gunakan truncation yang tetap menyediakan nama lengkap lewat accessible label/title.
- Pastikan tombol pengaturan, reset, install, tim, dan sinkron punya target sentuh dan focus ring yang jelas.
- Jangan mengubah arti warna status tanpa alasan. Red dipakai untuk error/destruktif; status normal menggunakan warna netral/brand sesuai sistem saat ini.

### Katalog dan checkout

- Jangan hilangkan perilaku tap kartu untuk menambah produk.
- Pertahankan stepper dan input kuantitas, tetapi audit konflik bubbling dan aksesibilitas keyboard.
- Pastikan control stepper tidak memicu penambahan ganda dan input angka tetap dapat diketik.
- Mobile dan tablet harus konsisten pada pilihan QRIS/Tunai, syarat foto QRIS, foto yang sudah terpasang, total, dan checkout.
- Jangan menyamarkan alasan checkout nonaktif: status “Pilih Menu” atau kewajiban bukti QRIS tetap terlihat.

### Modal lain

- Audit `TransactionHistoryModal`, `PhotoModal`, dan `PWAExplainModal` untuk pola close, `Escape`, focus, label, safe area, dan scroll.
- Jangan meringkas instruksi PWA hingga langkah pemasangan kehilangan kejelasan.
- Pertahankan aksi lihat, hapus, dan ganti bukti pembayaran.

### Kriteria selesai

- Dialog dapat ditutup dengan cara yang jelas, fokus keyboard tidak hilang, kontrol punya accessible name, dan area konten tidak tertutup safe area.

## 5. Peta file implementasi

| File | Rencana kerja |
|---|---|
| `src/index.css` | Standarisasi token/typography, feedback tekan yang ringkas, focus-visible, reduced motion; pertahankan palette dan battery saver. |
| `src/components/SettingsModal.tsx` | Rapikan grouping dan copy, fixed ID, feedback sinkron yang jelas, menu editor dan footer yang mudah dicapai; semua fitur settings tetap ada. |
| `src/services/syncEngine.ts` | Pastikan migrasi/pemuatan konfigurasi selalu memakai ID fixed dan nilai sheet lama tidak mengambil alih; jaga kompatibilitas API yang digunakan komponen lain. |
| `src/hooks/useSyncEngine.ts` | Hapus wrapper setter ID hanya bila pencarian pemanggil membuktikan tidak dipakai; jangan lakukan pembersihan API sebagai bagian redesign bila berisiko. |
| `src/App.tsx` | Hapus prop/callback pengubahan ID hanya setelah semua pemanggilan ditelusuri; pertahankan fetch menu dengan fixed ID. |
| `src/components/Header.tsx` | Audit layout narrow screen, hit target, label, status sync, dan focus. |
| `src/components/ProductCard.tsx` | Audit spacing, harga/kuantitas, keyboard/focus, dan event bubbling tanpa mengubah aksi add. |
| `src/components/PaymentDock.tsx` | Konsistensi control dan safe area; pertahankan checkout mobile serta validasi foto. |
| `src/components/TabletOrderPanel.tsx` | Samakan hierarki checkout dengan mobile; pertahankan keranjang, reset, dan payment flow. |
| `src/components/QRISPullCard.tsx` | Motion gesture, snap, scrim, reduced motion, dan kontrol tutup; pertahankan event buka QRIS. |
| `src/components/CameraActionSheet.tsx` | Drag handle, dismissal, state error/proses, cleanup, dan akses kamera/galeri. |
| `src/components/PhotoModal.tsx` | Audit focus, Escape, close, dan aksi lihat/hapus/ganti. |
| `src/components/PWAExplainModal.tsx` | Audit readability, pemasangan, close, dan instruksi platform. |
| `src/components/TransactionHistoryModal.tsx` | Audit density, filter, close, dan aksesibilitas tanpa mengubah fungsi riwayat. |

## 6. Rencana QA dan pencegahan regresi

### Pemeriksaan teknis

- Jalankan `npm run lint` (TypeScript `tsc --noEmit`).
- Jalankan `npm run build`.
- Periksa perubahan agar tidak menyentuh data transaksi, model pesanan, queue offline, URL Apps Script, atau parsing CSV selain kebutuhan fixed sheet yang sudah disepakati.

### Alur manual yang wajib diuji

1. Memilih Team A, Team B, dan Team C; pastikan pergantian team tetap mengosongkan keranjang sesuai perilaku yang sudah ada.
2. Sinkron menu manual dan auto-fetch saat team berganti; cek loading, hasil kosong, dan error.
3. Mengubah harga, menambah menu custom, menghapus menu custom, dan menyimpan.
4. Membuka link sheet; memastikan ID yang digunakan tetap ID default.
5. Memastikan konfigurasi sheet lama di browser tidak mengubah tujuan sinkron.
6. Menyimpan/mengubah URL Apps Script.
7. Mengganti dan mengembalikan gambar QRIS.
8. Mode hemat baterai aktif/nonaktif.
9. Riwayat transaksi dapat dibuka dan ditutup.
10. Checkout Tunai tanpa foto dan checkout QRIS dengan bukti wajib.
11. Ambil foto kamera, pilih galeri, kompresi, preview, ganti/hapus bukti.
12. Pemrosesan foto gagal, dibatalkan, atau sheet ditutup berulang.
13. QRIS dibuka dari drag, event/tombol, ditutup lewat tombol, scrim, dan swipe-up.
14. Kondisi offline, antrean transaksi, error sinkron, dan pemulihan saat online.
15. PWA install/help, termasuk copywriting dan maskot tetap tampil.
16. Reduced motion, battery saver, keyboard, screen reader labels, safe-area, orientasi, dan ukuran layar sempit.

### Matriks perangkat minimum

- Ponsel sempit: sekitar 320–360 CSS px.
- Ponsel modern dengan safe area/notch.
- Tablet portrait dan landscape.
- Desktop lebar dengan pointer/keyboard.
- Browser touch dan browser non-touch.

## 7. Risiko dan mitigasi

- **Risiko:** menghapus callback sheet ID dari satu file tetapi masih dipakai di tempat lain.  
  **Mitigasi:** telusuri semua reference sebelum mengubah kontrak props/hook/service; lakukan fixed-ID sebagai behavior terlebih dahulu.
- **Risiko:** pergantian team memicu dua sinkronisasi atau hasil request lama menimpa team baru.  
  **Mitigasi:** uji tap cepat lintas team dan pertimbangkan request sequence/cancel guard tanpa mengubah alur utama.
- **Risiko:** swipe dismiss mengambil alih tap kamera/galeri atau scroll.  
  **Mitigasi:** drag handle khusus, pointer capture dan movement threshold; uji perangkat nyata.
- **Risiko:** perubahan spacing mengecilkan target sentuh atau menyembunyikan footer.  
  **Mitigasi:** tetapkan batas minimum target sentuh dan uji viewport rendah serta safe-area.
- **Risiko:** reduced-motion menghentikan animasi yang ternyata menjadi sinyal status.  
  **Mitigasi:** pertahankan perubahan visual state/opacity yang informatif.
- **Risiko:** redesign membuat brand terasa generik.  
  **Mitigasi:** pertahankan logo maskot, “AYO DANUSAN!”, istilah lokal yang familiar, dan palet yang telah disetujui.

## 8. Urutan pelaksanaan

1. Telusuri pemanggil sheet ID dan event/component dependencies; tetapkan invariants yang tidak boleh berubah.
2. Rapikan SettingsModal dan copy, dengan fixed sheet ID sebagai sumber tunggal.
3. Terapkan aturan spacing/type dan focus feedback bersama.
4. Selaraskan Header, katalog, dock mobile, dan panel tablet.
5. Tingkatkan gesture QRIS dan action sheet, termasuk reduced motion dan error state.
6. Audit modal history/photo/PWA dan aksesibilitas.
7. Jalankan lint/build dan seluruh regression checklist.
8. Tinjau hasil pada perangkat nyata sebelum merge.

## 9. Di luar cakupan

- Mengganti palette resmi atau menambah warna dekoratif.
- Menghapus “AYO DANUSAN!” atau logo maskot.
- Menghapus fungsi kasir, menu, transaksi, riwayat, offline queue, sinkronisasi, foto, QRIS, baterai, atau PWA.
- Mengubah model transaksi atau aturan QRIS/Tunai.
- Mengganti sheet master dengan sumber lain.
- Menambahkan animasi dekoratif atau efek yang membuat aksi kasir terasa lambat.

## 10. Definition of Done

Pekerjaan dianggap selesai jika:

- Visual tetap menggunakan palette putih/abu/aksen biru dan merah destruktif saja.
- “AYO DANUSAN!” dan logo maskot tetap ada.
- Copy lebih ringkas tanpa membuang instruksi yang benar-benar diperlukan.
- Penggantian ID sheet tidak tersedia dan runtime konsisten memakai ID fixed.
- Semua fitur dan invariants dalam QA tetap berfungsi.
- UI bekerja pada mobile/tablet/desktop, safe area, keyboard, dan reduced motion.
- `npm run lint` dan `npm run build` lulus.
- Tidak ada perubahan perilaku bisnis POS yang tidak diminta.
