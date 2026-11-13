/**
 * Reliable device/OS detection helpers.
 * Handles standard iPhone/iPad/iPod user agents as well as iPadOS 13+ desktop Safari mode
 * (where navigator.platform reports 'MacIntel' with maxTouchPoints > 1).
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';
  const hasMSStream = Boolean((window as unknown as { MSStream?: unknown }).MSStream);
  if (hasMSStream) {
    return false;
  }

  const isLegacyIOS = /iphone|ipad|ipod/i.test(ua);
  const isIPadOS =
    navigator.platform === 'MacIntel' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1;

  return isLegacyIOS || isIPadOS;
}
