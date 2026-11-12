# Prompt Implementasi Sinkronisasi Menu Matriks + Custom Menu Mendadak (`@ponytail` Mode)

Salin dan tempel seluruh prompt di bawah ini ke **AI Agent Builder** kamu (AI Studio / Cursor / Windsurf / Claude Code).

## Prompt untuk AI Agent Builder

```markdown
Role & Mindset: Gunakan pendekatan @ponytail (lazy senior dev: minimal diff, zero new dependencies, reuse existing code di `SettingsModal.tsx`, utamakan fitur native platform).

### Konteks Masalah & Kebutuhan
1. Masing-masing divisi (`Team A`, `Team B`, `Team C`) memiliki **URL Google Apps Script Sheet Transaksi masing-masing** (`apiUrl`), namun semua divisi mengambil daftar menu utama dari **1 Google Sheet Master Menu Pusat** (`POS DANUSAN - LIST BARANG DANUSAN`) yang diupdate tiap malam.
2. Struktur Google Sheet Master Menu Pusat (`A1:D12`) berbentuk matriks kolom per divisi:
   - **Default Sheet ID**: `1r6az25v1wPH5qcKc9YyoHY9qp4ejTmAVFsgv3YfhUsI`
   - **URL Sheet**: `https://docs.google.com/spreadsheets/d/1r6az25v1wPH5qcKc9YyoHY9qp4ejTmAVFsgv3YfhUsI/edit`
   - **Baris 1 (`A1:D1` merged)**: `LIST BARANG DANUSAN`
   - **Baris 2 (`A2:D2` header)**: `NOMOR` | `TEAM A` | `TEAM B` | `TEAM C`
   - **Baris 3 s/d 12+ (`A3:D12`)**:
     - Kolom A (index 0): Nomor urut (`1` s/d `10`)
     - Kolom B (index 1): Daftar menu `TEAM A` (contoh: `bomboloni`, `risol`, atau opsional dengan harga `risol - 6000`)
     - Kolom C (index 2): Daftar menu `TEAM B`
     - Kolom D (index 3): Daftar menu `TEAM C`
3. **Kebutuhan Menu Custom Mendadak**:
   - Selain menu fiks dari Sheet Pusat, kasir **tetap harus bisa menambahkan menu custom secara langsung di aplikasi** (`+ Tambah Baris Menu`) jika ada barang titipan/menu mendadak di lapangan.
   - Menu yang berasal dari Sheet Pusat dikunci namanya (`readOnly`) agar tidak terjadi typo antar kasir, sedangkan menu custom (`is_custom: true`) bebas diketik namanya, diatur harganya, maupun dihapus (`Trash2`).

---

### Solusi Paling Efisien (@ponytail Architecture)
1. **Reuse Editor yang Sudah Ada di `SettingsModal.tsx`**: Jangan bongkar ulang UI editor menu. Cukup bedakan item dari Sheet (`is_custom: false`) vs item tambahan manual (`is_custom: true`).
2. **Fetch CSV Langsung Tanpa Apps Script Baru**: Tarik data Sheet Master menggunakan endpoint CSV bawaan Google Sheets (`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&t=${Date.now()}`).
3. **Smart Merge (Menu Sheet + Menu Custom)**:
   - Saat sinkronisasi dari Sheet dijalankan pada divisi yang sama, gabungkan **Menu dari Sheet** dengan **Menu Custom (`is_custom: true`)** yang sudah ditambahkan user (selama namanya belum ada di Sheet) agar menu mendadak tidak terhapus saat auto-sync.
   - Saat user **ganti divisi** (misal dari `Team A` ke `Team B`), tarik murni menu `Team B` dari Sheet dan kosongkan keranjang.

---

### Daftar Perubahan File (Minimal Diff — 5 File)

#### 1. `src/types.ts`
Tambahkan tipe `TeamDivision` dan flag opsional `is_custom` pada `Product`:
```ts
export type TeamDivision = 'Team A' | 'Team B' | 'Team C';

export interface Product {
  id: string;
  name: string;
  original_name?: string;
  price: number;
  is_custom?: boolean;
}
```

#### 2. `src/services/syncEngine.ts`
- Tambahkan konstanta default:
  ```ts
  export const DEFAULT_MENU_SHEET_ID = '1r6az25v1wPH5qcKc9YyoHY9qp4ejTmAVFsgv3YfhUsI';
  ```
- Tambahkan properti state di `SyncEngineState` & `SyncEngineService`:
  - `team: TeamDivision` (default `'Team A'`)
  - `menuSheetId: string` (default `DEFAULT_MENU_SHEET_ID`)
- Pada `init()`, rehydrate `team` dari `localStorage.getItem('POS_TEAM')` / `getConfig('team')` dan `menuSheetId` dari `localStorage.getItem('POS_MENU_SHEET')` / `getConfig('menuSheet')`.
- Tambahkan setter `setTeam(team: TeamDivision)` dan `setMenuSheetId(input: string)` yang menyimpan ke `localStorage` dan `setConfig(...)`.
- Tambahkan method `fetchMenuFromCentralSheet`:
  ```ts
  public async fetchMenuFromCentralSheet(
    teamOverride?: TeamDivision,
    sheetInputOverride?: string,
    existingProducts: Product[] = [],
    preserveCustom = true
  ): Promise<Product[]> {
    const targetTeam = teamOverride || this.team;
    const rawSheet = (sheetInputOverride ?? this.menuSheetId).trim() || DEFAULT_MENU_SHEET_ID;
    const match = rawSheet.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : rawSheet;

    const colIndexMap: Record<TeamDivision, number> = {
      'Team A': 1,
      'Team B': 2,
      'Team C': 3,
    };
    const colIdx = colIndexMap[targetTeam] ?? 1;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&t=${Date.now()}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Gagal mengakses Sheet Menu Pusat');

      const csvText = await res.text();
      const rows = csvText
        .split(/\r?\n/)
        .map((line) =>
          line
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
        );

      const headerRowIdx = rows.findIndex((r) =>
        r.some((c) => c.toUpperCase().includes('TEAM A'))
      );
      const dataRows = rows.slice(headerRowIdx >= 0 ? headerRowIdx + 1 : 2);

      // Simpan memori harga sebelumnya agar harga yang sudah diatur di HP tidak ter-reset ke 5000
      const priceMemory = new Map<string, number>();
      existingProducts.forEach((p) => {
        priceMemory.set(p.name.toLowerCase().trim(), p.price);
      });

      const toTitleCase = (str: string) =>
        str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

      const sheetProducts: Product[] = [];
      const seenNames = new Set<string>();

      for (const row of dataRows) {
        const rawCell = (row[colIdx] || '').trim();
        if (!rawCell) continue;

        // Dukung format "bomboloni" maupun "risol - 6000" / "risol: 6000"
        const priceMatch = rawCell.match(/^(.*?)\s*[:\-]\s*(?:rp\.?\s*)?(\d+)\s*$/i);
        const rawName = priceMatch ? priceMatch[1].trim() : rawCell;
        if (!rawName) continue;

        const cleanName = toTitleCase(rawName);
        const lowerName = cleanName.toLowerCase();
        if (seenNames.has(lowerName)) continue;
        seenNames.add(lowerName);

        const slug = lowerName.replace(/[^a-z0-9]+/g, '_');
        const id = `${targetTeam.toLowerCase().replace(/\s+/g, '')}_${slug}`;

        const inlinePrice = priceMatch ? Number(priceMatch[2]) : 0;
        const rememberedPrice = priceMemory.get(lowerName) || 5000;

        sheetProducts.push({
          id,
          name: cleanName,
          original_name: cleanName,
          price: inlinePrice > 0 ? inlinePrice : rememberedPrice,
          is_custom: false,
        });
      }

      // Pertahankan menu custom mendadak jika masih di divisi yang sama
      if (preserveCustom) {
        const customProducts = existingProducts.filter(
          (p) => p.is_custom && p.name.trim() !== '' && !seenNames.has(p.name.toLowerCase().trim())
        );
        return [...sheetProducts, ...customProducts];
      }

      return sheetProducts;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
  ```

#### 3. `src/hooks/useSyncEngine.ts`
- Ekspos `team`, `menuSheetId`, `setTeam`, `setMenuSheetId`, dan `fetchMenuFromCentralSheet`.

#### 4. `src/components/SettingsModal.tsx`
Pertahankan mekanisme tambah/edit baris yang sudah ada di `SettingsModal.tsx` dengan penyesuaian minimal berikut:
- Tambahkan **Segmented Control Divisi (`Team A` | `Team B` | `Team C`)** dan tombol **"Sinkron Sheet"** (ikon `RefreshCw`) di bagian atas Daftar Menu.
  - Saat user memilih tab divisi berbeda (`Team A` / `Team B` / `Team C`), panggil `fetchMenuFromCentralSheet(newTeam, menuSheetInput, editorProducts, false)` agar langsung memuat daftar menu Sheet untuk divisi tersebut.
  - Saat user menekan tombol **"Sinkron Sheet"**, panggil `fetchMenuFromCentralSheet(selectedTeam, menuSheetInput, editorProducts, true)` agar menu Sheet ter-update tanpa menghapus menu custom mendadak yang sudah ditambahkan.
- Pada daftar baris menu (`editorProducts.map`):
  - **Jika `!item.is_custom` (Menu dari Sheet Pusat)**:
    - Input `Nama Barang` dibuat `readOnly` (beri style `bg-slate-100 text-slate-600 cursor-default` dan badge kecil `Sheet` di kanan dalam input) agar nama menu resmi dari Sheet tidak bisa salah ketik.
    - Input `Rp Harga` tetap bisa diedit kasir.
    - Tombol hapus (`Trash2`) disembunyikan atau di-disable (digantikan indikator lock/sheet) karena item tersebut dikontrol dari Sheet Pusat.
  - **Jika `item.is_custom` (Menu Custom Mendadak)**:
    - Input `Nama Barang` dan `Rp Harga` bebas diketik seperti biasa.
    - Tombol hapus (`Trash2`) aktif untuk menghapus baris custom tersebut.
- Pada `handleAddRow` (tombol **`+ Tambah Menu Mendadak (Custom)`**):
  - Tambahkan item baru dengan flag `is_custom: true`:
    ```ts
    {
      id: 'custom_' + Date.now(),
      name: '',
      original_name: '',
      price: 5000,
      is_custom: true,
    }
    ```
- Pada `handleSave`:
  - Untuk setiap item `is_custom`, rapikan `name` dengan `.trim()` (dan format *Title Case* jika perlu) sebelum disimpan ke `localStorage` & `IndexedDB` (`saveCatalog`).

#### 5. `src/App.tsx` & `src/components/Header.tsx`
- Di `App.tsx`:
  - Saat aplikasi dibuka (`useEffect` mount) dan `navigator.onLine === true`, panggil `sync.fetchMenuFromCentralSheet(undefined, undefined, currentCatalog, true)` di background agar menu malam terbaru dari Sheet langsung masuk sambil tetap menjaga menu custom yang pernah dibuat di divisi tersebut.
  - Jika user mengganti divisi (`Team A` <-> `Team B` <-> `Team C`), panggil `orderSession.clearCart()` agar keranjang dari divisi sebelumnya bersih.
- Di `Header.tsx`:
  - Tampilkan badge kecil divisi aktif (`Team A` / `Team B` / `Team C`) yang jika diklik akan membuka `SettingsModal`.

### Guardrails (@ponytail Rules)
1. **Zero new dependencies**: Jangan tambah library npm apa pun.
2. **Jangan ubah kontrak `submitOrder` & `getHistory`**: Biarkan URL Apps Script transaksi tiap tim tetap bekerja seperti semula tanpa perlu redeploy ulang script transaksi.
3. **Pastikan `npm run build` dan `npm run lint` (`tsc --noEmit`) lulus tanpa error.**
```