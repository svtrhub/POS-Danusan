// Apple-standard tactile haptic feedback utility
// Combines Web Vibration API (Android / PWA) and Web Audio impulse (iOS / Desktop)

import { playTapSound, playSuccessSound } from './sound';

export type HapticType = 'light' | 'medium' | 'success' | 'warning' | 'selection';

export function triggerHaptic(type: HapticType = 'light') {
  try {
    // 1. Hardware Vibration API (Android, Chrome, Firefox, supported PWAs)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'selection':
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(18);
          break;
        case 'warning':
          navigator.vibrate([15, 30, 15]);
          break;
        case 'success':
          navigator.vibrate([25, 45, 30]);
          break;
      }
    }

    // 2. Audio-Haptic coupling (vital for iOS Safari and multimodal harmony)
    if (type === 'success') {
      playSuccessSound();
    } else {
      playTapSound();
    }
  } catch (_) {
    // Fail silently if browser blocks vibration/audio without user gesture
  }
}
