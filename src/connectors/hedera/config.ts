/**
 * Hedera connector config: treasury → platform map with optional env merge.
 */

import type { Platform } from "./types";

export const HEDERA_MIRROR_THROTTLE_MS = 200;

/** Default treasury account → platform (issuers). */
export const DEFAULT_TREASURY_PLATFORM_MAP: Record<string, Platform> = {
  "0.0.610168": "DOVU",
  "0.0.1357309": "DOVU",
  "0.0.6144372": "Tolam Earth",
  "0.0.6138881": "Tolam Earth",
  "0.0.4640644": "Capturiant",
  "0.0.5054978": "Capturiant",
  "0.0.4576278": "OrbexCO2",
  "0.0.3843565": "GCR",
  "0.0.1810743": "TYMLEZ",
};

const PLATFORM_VALUES = new Set<string>([
  "DOVU",
  "Tolam Earth",
  "Capturiant",
  "OrbexCO2",
  "GCR",
  "TYMLEZ",
]);

function isPlatform(v: string): v is Platform {
  return PLATFORM_VALUES.has(v);
}

/**
 * Merge `HEDERA_EXTRA_TREASURIES_JSON` onto defaults, e.g.
 * `{"0.0.123":"DOVU"}` for another treasury using an existing parser.
 */
export function getTreasuryPlatformMap(): Record<string, Platform> {
  const merged: Record<string, Platform> = { ...DEFAULT_TREASURY_PLATFORM_MAP };
  const raw = process.env.HEDERA_EXTRA_TREASURIES_JSON?.trim();
  if (!raw) return merged;

  try {
    const extra = JSON.parse(raw) as Record<string, unknown>;
    if (extra && typeof extra === "object" && !Array.isArray(extra)) {
      for (const [accountId, platformVal] of Object.entries(extra)) {
        if (typeof platformVal !== "string" || !isPlatform(platformVal)) {
          console.warn(
            `  ⚠️  HEDERA_EXTRA_TREASURIES_JSON: skip invalid entry ${accountId} → ${String(platformVal)}`
          );
          continue;
        }
        merged[accountId] = platformVal;
      }
    }
  } catch (e) {
    console.warn(`  ⚠️  HEDERA_EXTRA_TREASURIES_JSON parse failed:`, e);
  }

  return merged;
}

/** When false, skip Mirror topic + VC IPFS geography (static maps only). */
export function isHederaDynamicGeoEnabled(): boolean {
  const v = process.env.HEDERA_DYNAMIC_GEO?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return true;
}
