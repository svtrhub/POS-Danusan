# POS Danusan - Stability, Deployment & Low-Speed Network Resilience Plan

Comprehensive architectural solution addressing deployment caching inconsistencies on GitHub Pages, dual-layer persistent storage for Google Apps Script URLs, hardened low-bandwidth offline synchronization, and responsive camera modal alignment.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed via interactive clarification:
> - **GitHub Deployments**: Service Worker will adopt a strict Network-First strategy for the HTML entry point (`index.html`) paired with background cache updates, an instant update listener, and automatic cache invalidation to prevent stale builds.
> - **Apps Script URL Persistence**: Permanent dual storage in IndexedDB (`app_config_store`) and `localStorage` (`POS_API_URL`) with bidirectional fallback recovery, preventing URL loss during browser cache wipes.
> - **Camera Action Sheet**: Responsive ergonomic alignment featuring an iOS-native bottom sheet on mobile devices (`< sm`) and an optically centered modal on tablets/desktops (`sm:` and up).

---

## 1. Overview & Core Concept

- **What It Solves**: 
  1. **Deployment Inconsistency**: GitHub Pages users frequently encounter stale application versions because aggressive Service Worker caches intercept navigation requests before new production bundles are recognized.
  2. **Config Amnesia**: Browser storage cleanup or asynchronous race conditions occasionally cause the configured Apps Script Web App URL to disappear, breaking checkout sync.
  3. **Low-Speed Network Degradation**: Intermittent 2G/3G field connections stall order submissions or cause sync engine errors without graceful backoff or clear visual feedback.
  4. **Action Sheet Presentation**: Eradicate UI misalignment by presenting camera/gallery controls as a bottom sheet with safe-area insets on mobile, and an elegant centered card on iPad/desktop.
- **Target Audience**: Student committee and community sales volunteers ("Danusan") operating POS checkout at outdoor stalls, university hallways, and events with unpredictable mobile reception.
- **Key Value**: 100% offline-first reliability, instant GitHub deployment visibility, indestructible configuration persistence, and effortless payment proof capture.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Deploy & Instant Refresh Flow**:
   - Volunteer visits the deployed GitHub Pages site.
   - If an updated build is deployed, the Service Worker detects the update immediately via Network-First HTML validation.
   - An automatic background refresh or unobtrusive toast (`Versi baru siap digunakan`) updates the app without manual cache-clearing gymnastics.

2. **Apps Script Config Self-Healing**:
   - When the user configures the Apps Script URL in Settings, it is simultaneously committed to IndexedDB (`app_config_store`) and `localStorage`.
   - On application boot, `syncEngine` inspects both stores: if either store holds the URL, it automatically rehydrates memory and repairs the missing store.

3. **Field Checkout on Low-Speed Network**:
   - Volunteer processes an order offline or under 2G network conditions.
   - The order with compressed proof JPEG (~35–45 KB) is instantly committed to IndexedDB disk and added to local sales history with a green confirmation toast.
   - The top header pill reflects `Antrean: X` without blocking user transactions.
   - When network stability returns, the sync engine fires background sync with exponential backoff and jitter.

4. **Camera & Gallery Proof Attachment**:
   - Tapping "Bukti QRIS" on a mobile device opens a sleek bottom sheet respecting the iPhone home indicator (`pb-[env(safe-area-inset-bottom)]`).
   - On iPad/Desktop, it appears as a centered modal.
   - Selecting "Ambil foto" or "Pilih Galeri" triggers the native device picker and updates the order proof cleanly.

### Visual Identity & Theme
- **Color Palette**: Apple System Gray background (`#F2F2F7`), crisp white cards (`#FFFFFF`), primary iOS Blue (`#007AFF`), emerald success accents (`#34C759`), and subtle hairline borders (`border-black/5` to `border-black/8`).
- **Typography**: Clean system typeface pairing with tabular numbers (`tabular-nums font-mono`) for currency calculations, quantities, and timestamps.
- **Layout Rhythm**: Dynamic viewport-bounded container (`100dvh`), zero horizontal scroll, and touch targets exceeding $44 \times 44\text{px}$.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Service Worker Caching Strategy
- **Chosen Approach**: Network-First for navigation requests (`mode: 'navigate'`) with a fast 1.2-second network timeout fallback to cache, combined with `skipWaiting()` and `clients.claim()` on activation.
- **Why**: Eliminates GitHub Pages stale build lock-in while preserving instant offline launching if the user is completely disconnected.
- **Alternative Rejected**: Cache-First for `index.html` (causes users to remain trapped on old versions until they manually purge browser site data).

### Decision 2: Dual Storage Redundancy for Apps Script URL
- **Chosen Approach**: Write-through to both IndexedDB and `localStorage`, with automated bi-directional recovery during app initialization.
- **Why**: Safari iOS aggressively purges IndexedDB under low disk space, whereas `localStorage` can be affected by browser cleaning tools. Maintaining both guarantees 99.99% survival across iOS/Android sessions.
- **Alternative Rejected**: Storing solely in memory or relying only on single-key `localStorage`.

### Decision 3: Low-Speed Network Sync Resilience
- **Chosen Approach**: Exponential backoff with random jitter (2s, 4s, 8s, 16s, capped at 30s) + 25s HTTP request timeout + payload safety (~45 KB JPEG).
- **Why**: Prevents request pile-ups and server connection exhaustion on spotty 3G/2G connections while ensuring batches never drop out of the queue.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        POS DANUSAN ARCHITECTURE                        │
└────────────────────────────────────────────────────────────────────────┘

 [ USER INTERACTION ]
       │
       ▼
 ┌───────────────┐         ┌────────────────────┐
 │  PaymentDock  │ ──────► │ CameraActionSheet  │ (Mobile: Bottom Sheet)
 │ TabletPanel   │         │ (Ambil / Galeri)   │ (Tablet: Centered)
 └───────┬───────┘         └─────────┬──────────┘
         │                           │ (Compressed ~45KB Base64)
         ▼                           ▼
 ┌──────────────────────────────────────────────┐
 │          OrderSession Hook (React)           │
 └──────────────────────┬───────────────────────┘
                        │
                        ▼ (Submit Order)
 ┌──────────────────────────────────────────────┐
 │         SyncEngine Service (Singleton)       │
 └──────────────┬───────────────────┬───────────┘
                │                   │
   (Dual-Layer Disk Write)    (Background Sync)
                ▼                   ▼
    ┌──────────────────┐    ┌───────────────────────────────┐
    │ IndexedDB Store  │    │  Google Apps Script Endpoint  │
    │  - sync_queue    │    │  - Action: submitOrder        │
    │  - app_config    │    │  - Exponential Backoff        │
    │  - catalog       │    │  - 25s Cellular Timeout       │
    │ LocalStorage     │    └───────────────────────────────┘
    │  - POS_API_URL   │
    └──────────────────┘
```

### Components to Update
1. **`public/sw.js` & `index.html`**:
   - Cache version bump to `danusan-pos-v6`.
   - Network-First navigation with quick fallback.
   - PWA update notification and client reload sync.
2. **`src/services/syncEngine.ts`**:
   - Bi-directional sync recovery for `apiUrl` between IndexedDB and `localStorage`.
   - Exponential backoff retry loop with network status detection.
3. **`src/components/CameraActionSheet.tsx`**:
   - Responsive styling: `items-end pb-[calc(10px+env(safe-area-inset-bottom,0px))] sm:items-center sm:pb-0`.
   - Centered card presentation on tablet/desktop, smooth bottom sheet on mobile.
4. **`src/services/indexedDBStorage.ts`**:
   - Strengthen `getConfig` and `setConfig` reliability with error-resilient fallbacks.
