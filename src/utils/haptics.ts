// Apple-standard tactile haptic feedback utility
// Combines Web Vibration API (Android / PWA) and Web Audio impulse (iOS / Desktop)
// Respects Battery Saver mode by disabling physical vibration motors

import { playTapSound, playSuccessSound } from './sound';

export type HapticType =
  | 'light'
  | 'medium'
  | 'success'
  | 'warning'
  | 'selection'
  | 'cart_add'
  | 'checkout';

export function isBatterySaverActive(): boolean {
  try {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('battery-saver')) {
      return true;
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem('POS_BATTERY_SAVER') === 'true') {
      return true;
    }
  } catch (_) {}
  return false;
}

export function triggerHaptic(type: HapticType = 'light') {
  try {
    // 1. Hardware Vibration API (Android, Chrome, Firefox, supported PWAs)
    // Strictly disable physical vibration in battery saver mode to extend usage time
    if (!isBatterySaverActive() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'cart_add':
          // Subtle, crisp tactile pulse when an item is added to cart
          navigator.vibrate(14);
          break;
        case 'checkout':
          // Dual tactile confirmation when checkout / submit order is pressed
          navigator.vibrate([20, 35, 20]);
          break;
        case 'selection':
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(16);
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
    if (type === 'success' || type === 'checkout') {
      playSuccessSound();
    } else {
      playTapSound();
    }
  } catch (_) {
    // Fail silently if browser blocks vibration/audio without user gesture
  }
}
