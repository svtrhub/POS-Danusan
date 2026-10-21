/**
 * High-performance, canvas-based image compressor for POS proof of payment.
 * Scales images to a maximum bounding box while preserving aspect ratio
 * and encodes to lightweight JPEG to prevent localStorage bloat.
 */
export async function compressImageToJpeg(
  file: File,
  maxDimension = 1000,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const src = event.target?.result;
      if (typeof src !== 'string') {
        return reject(new Error('Failed to read file as data URL'));
      }

      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not available'));
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image element'));
      };

      img.src = src;
    };

    reader.onerror = () => {
      reject(new Error('FileReader failed'));
    };

    reader.readAsDataURL(file);
  });
}
