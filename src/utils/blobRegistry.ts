/**
 * Global Blob URL Registry & Automatic Memory Cleanup Utility
 * 
 * Prevents memory leaks on long-running POS sessions by tracking all ephemeral
 * Blob URLs created for camera captures and image previews, and providing
 * automatic revocation via `BlobRegistry.clearAll()` (`URL.revokeObjectURL()`).
 */

const activeBlobUrls = new Set<string>();

/**
 * Converts a base64 / data-URI string into a lightweight binary Blob.
 */
function base64ToBlob(base64Data: string): Blob {
  try {
    const parts = base64Data.split(',');
    const match = parts[0]?.match(/:(.*?);/);
    const mime = match ? match[1] : 'image/jpeg';
    const b64 = parts[1] || parts[0];
    const byteCharacters = atob(b64);
    const byteNumbers = new Uint8Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    return new Blob([byteNumbers], { type: mime });
  } catch (err) {
    console.warn('Failed to parse base64 to Blob, creating empty Blob:', err);
    return new Blob([], { type: 'image/jpeg' });
  }
}

/**
 * Creates an Object URL from a Blob or base64 string, registers it in the
 * global tracking Set, and returns the generated URL.
 */
export function createTrackedBlobUrl(source: Blob | string): string {
  if (typeof window === 'undefined' || !window.URL || !window.URL.createObjectURL) {
    return typeof source === 'string' ? source : '';
  }

  let blob: Blob;
  if (typeof source === 'string') {
    if (source.startsWith('blob:')) {
      activeBlobUrls.add(source);
      return source;
    }
    blob = base64ToBlob(source);
  } else {
    blob = source;
  }

  const url = URL.createObjectURL(blob);
  activeBlobUrls.add(url);
  return url;
}

/**
 * Revokes a specific tracked Blob URL and removes it from the registry.
 */
export function revokeTrackedBlobUrl(url: string | null | undefined): void {
  if (!url || typeof window === 'undefined' || !window.URL || !window.URL.revokeObjectURL) {
    return;
  }

  if (activeBlobUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
    activeBlobUrls.delete(url);
  }
}

/**
 * Automatically revokes all active Blob URLs in the registry and clears the Set.
 * Returns the count of revoked URLs.
 */
export function revokeAllBlobUrls(): number {
  if (typeof window === 'undefined' || !window.URL || !window.URL.revokeObjectURL) {
    const count = activeBlobUrls.size;
    activeBlobUrls.clear();
    return count;
  }

  let revokedCount = 0;
  activeBlobUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
      revokedCount++;
    } catch (_) {}
  });

  activeBlobUrls.clear();
  return revokedCount;
}

/**
 * Returns the number of currently tracked active Blob URLs.
 */
export function getActiveBlobCount(): number {
  return activeBlobUrls.size;
}

/**
 * Unified BlobRegistry namespace matching the architectural requirements.
 */
export const BlobRegistry = {
  /**
   * Registers a Blob URL in the active tracking registry.
   */
  register(url: string): string {
    if (url && typeof url === 'string') {
      activeBlobUrls.add(url);
    }
    return url;
  },

  /**
   * Revokes all tracked Blob URLs and clears the registry.
   */
  clearAll(): number {
    return revokeAllBlobUrls();
  },

  /**
   * Revokes a specific tracked Blob URL.
   */
  revoke(url: string | null | undefined): void {
    revokeTrackedBlobUrl(url);
  },

  /**
   * Creates an Object URL from a Blob or base64 string and registers it.
   */
  create(source: Blob | string): string {
    return createTrackedBlobUrl(source);
  },

  /**
   * Returns current count of registered URLs.
   */
  count(): number {
    return activeBlobUrls.size;
  },
};

export default BlobRegistry;
