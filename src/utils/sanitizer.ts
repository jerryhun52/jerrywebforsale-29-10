/**
 * Mobile Input Sanitizer & Tolerant Credential Engine
 */

export function cleanMobileInput(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    // Strip Byte-Order-Marks and Zero-Width characters
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
    // Replace non-breaking spaces with standard space
    .replace(/[\u00A0\u202F\u3000]/g, ' ')
    // Strip carriage returns
    .replace(/\r/g, '')
    // Normalize smart/curly quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Trim extraneous whitespace
    .trim();
}

/**
 * Tolerant credential comparison for mobile users
 * Solves mobile auto-capitalization and keyboard auto-spacing issues
 */
export function isPasswordEquivalent(entered: string | undefined | null, stored: string | undefined | null): boolean {
  if (!entered || !stored) return false;
  const cleanEntered = cleanMobileInput(entered);
  const cleanStored = cleanMobileInput(stored);
  
  // 1. Direct match
  if (cleanEntered === cleanStored) return true;
  
  // 2. Case-insensitive match (for mobile auto-capitalization e.g. Jerry@786 == jerry@786)
  if (cleanEntered.toLowerCase() === cleanStored.toLowerCase()) return true;

  // 3. Auto-capitalized first letter only comparison (e.g. Jerry@786 vs jerry@786)
  if (cleanEntered.length === cleanStored.length) {
    const firstLower = cleanEntered.charAt(0).toLowerCase() + cleanEntered.slice(1);
    const storedFirstLower = cleanStored.charAt(0).toLowerCase() + cleanStored.slice(1);
    if (firstLower === storedFirstLower) return true;
  }

  return false;
}

export function detectDeviceType(userAgent: string | undefined): 'iPhone' | 'Android' | 'Windows PC' | 'Mac Desktop' | 'Linux' | 'Tablet' {
  if (!userAgent) return 'Windows PC';
  const ua = userAgent.toLowerCase();
  if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('phone'))) {
    return 'Tablet';
  }
  if (ua.includes('iphone') || ua.includes('ipod')) {
    return 'iPhone';
  }
  if (ua.includes('android')) {
    return 'Android';
  }
  if (ua.includes('macintosh') || ua.includes('mac os')) {
    return 'Mac Desktop';
  }
  if (ua.includes('linux')) {
    return 'Linux';
  }
  return 'Windows PC';
}
