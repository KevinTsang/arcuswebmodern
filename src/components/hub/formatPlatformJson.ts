import type { PlatformJson } from './hubAdvancedTypes';

/**
 * Render an untyped platform value as one readable line: lists are joined
 * with commas, maps become `key: value` pairs, and missing values become "-".
 */
export function formatPlatformJson(value: PlatformJson | undefined): string {
  if (value === undefined || value === null) return '-';
  if (Array.isArray(value)) {
    return value.length === 0 ? 'None' : value.map((v) => formatPlatformJson(v)).join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return 'None';
    return entries.map(([k, v]) => `${k}: ${formatPlatformJson(v)}`).join(', ');
  }
  return String(value);
}

/** Format a number as upper-case hex with a 0x prefix (Zigbee PAN ids, EUI64s). */
export function formatHex(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  return `0x${value.toString(16).toUpperCase()}`;
}
