# Rencana Implementasi: Lembar Pemilih Native OS (Kamera & Galeri)

Penerapan alur pemilihan bukti pembayaran melalui **Lembar Pemilih Native OS** (*Native System Media Picker*) agar kasir leluasa memilih antara memotret langsung dengan kamera atau mengunggah tangkapan layar (*screenshot*) / foto dari galeri HP, tanpa menambah *clutter* dan tanpa mengganggu backend Google Apps Script.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Terkonfirmasi dari Pengguna:**
> - **Alur Pilihan**: **Lembar Pemilih Native OS** (otomatis memunculkan opsi Kamera & Galeri/Pustaka Foto bawaan sistem operasi Android & iOS).
> - **Integritas Backend**: Seluruh mekanisme kompresi kanvas (max 1000px, 0.65 JPEG), format payload `submitOrder`, dan antrean lokal `POS_QUEUE` tetap berjalan 100% normal.

---

## 1. Analisis & Rincian Perubahan

### A. Penghapusan Atribut `capture="environment"`
- **Sebelum**:  
  `<input type="file" accept="image/*" capture="environment" />`  
  Atribut `capture="environment"` mematikan dialog pemilih file dan memaksa browser langsung meluncurkan aplikasi kamera belakang ponsel.
- **Sesudah**:  
  `<input type="file" accept="image/*" />`  
  Dengan hanya menggunakan `accept="image/*"` standar:
  - **Di Android**: Browser otomatis membuka lembar sistem dengan pilihan **Kamera** (foto langsung) dan **File / Media Picker / Galeri** (unggah foto/tangkapan layar).
  - **Di iOS Safari**: Browser otomatis menampilkan Action Sheet native dengan pilihan **"Ambil Foto" (Take Photo)**, **"Pustaka Foto" (Photo Library)**, dan **"Pilih File" (Choose File)**.

### B. Penyelarasan Label Tombol (*Clarity & Microcopy*)
- Tombol aksi di dock disesuaikan microcopy-nya:
  - Sebelum: `Foto QRIS` / `Foto Tunai` (mengindikasikan hanya bisa foto kamera).
  - Sesudah: `Bukti QRIS` / `Bukti Tunai` (secara psikologis mengindikasikan kasir dapat melampirkan foto struk fisik maupun tangkapan layar dari galeri).

### C. Jaminan Kompresi Gambar Galeri
- Gambar yang diunggah dari galeri (misalnya foto resolusi tinggi 12MP atau screenshot layar berukuran besar) tetap diproses melalui fungsi kanvas HTML5:
  - Otomatis di-downscale ke lebar maksimum 1000px.
  - Otomatis dikompresi ke JPEG kualitas 0.65.
  - Ukuran payload tetap ringan (<150KB) sehingga pengiriman ke Google Apps Script tetap instan dan tidak membebani kuota Sheet.

---

## 2. File yang Terlibat

1. `src/components/PaymentDock.tsx`:
   - Hapus atribut `capture="environment"` pada input file utama.
   - Perbarui label tombol menjadi `Bukti QRIS` / `Bukti Tunai`.
2. `src/components/PhotoModal.tsx`:
   - Pastikan alur foto ulang (*retake*) juga membuka lembar pemilih native yang sama.

---

## 3. Verification & Testing Plan

1. **Verifikasi Lembar Native**: Memastikan saat tombol bukti diketuk, browser memunculkan pilihan kamera dan galeri secara bersamaan.
2. **Verifikasi Upload Tangkapan Layar**: Memilih gambar dari album/galeri dan memastikan gambar tampil di thumbnail pratinjau serta dapat dibuka di modal pratinjau.
3. **Verifikasi Kompresi & Payload**: Memastikan `photo_base64` ter-generate valid dan pesanan berhasil masuk ke antrean `POS_QUEUE`.
4. **Verifikasi Build**: Menjalankan `compile_applet` dan `lint_applet` untuk menjamin 0 error.
