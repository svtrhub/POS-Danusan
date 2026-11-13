import { useState, useCallback, useRef } from 'react';
import {
  compressWithAutoThreshold,
  formatBytes,
  PHOTO_MAX_BYTES_THRESHOLD,
} from '../utils/media';
import { triggerHaptic } from '../utils/haptics';
import { BlobRegistry } from '../utils/blobRegistry';

interface UsePhotoCaptureOptions {
  onPhotoCaptured: (base64: string, sizeBytes?: number) => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

/**
 * Shared image capture & compression hook used by both direct iOS native pickers
 * and the Android/Desktop CameraActionSheet.
 */
export function usePhotoCapture({
  onPhotoCaptured,
  onSuccess,
  onError,
}: UsePhotoCaptureOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Memproses foto...');
  const isProcessingRef = useRef(false);

  const processFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setIsProcessing(true);

      try {
        const isOver200Kb = file.size > PHOTO_MAX_BYTES_THRESHOLD;
        setProcessingStatus(
          isOver200Kb
            ? `Mengompresi (${formatBytes(file.size)} → <200KB)...`
            : 'Memproses foto...'
        );

        // Allow UI thread to paint loading state before heavy bitmap decode/compression
        await new Promise((resolve) => setTimeout(resolve, 35));

        const result = await compressWithAutoThreshold(file);

        if (!result.base64) {
          throw new Error('Hasil kompresi foto kosong');
        }

        const compressedBlobUrl = BlobRegistry.create(result.base64);
        console.info(
          `[PhotoCapture] ✅ Downscaled ${result.width}x${result.height} in ${result.processingTimeMs}ms | Original: ${formatBytes(
            file.size
          )} → Memory: ${formatBytes(result.sizeBytes)} (${compressedBlobUrl.slice(0, 28)}...)`
        );

        triggerHaptic('success');
        onPhotoCaptured(result.base64, result.sizeBytes);
        onSuccess?.();
      } catch (err) {
        console.warn('Failed to process image:', err);
        triggerHaptic('warning');
        onError?.('Gagal memproses foto. Coba pilih foto lain.');
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
        setProcessingStatus('Memproses foto...');
      }
    },
    [onPhotoCaptured, onSuccess, onError]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const file = input.files?.[0];
      // Reset after grabbing File reference so picking the same image twice still fires onChange
      input.value = '';
      if (file) {
        void processFile(file);
      }
    },
    [processFile]
  );

  return {
    isProcessing,
    processingStatus,
    processFile,
    handleFileInputChange,
  };
}
