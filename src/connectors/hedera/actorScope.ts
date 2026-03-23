/**
 * CLI / scope labels → Hedera Platform keys (issuers under one connector).
 */

import type { Platform } from "./types";

const PLATFORMS: Platform[] = [
  "DOVU",
  "Tolam Earth",
  "Capturiant",
  "OrbexCO2",
  "GCR",
  "TYMLEZ",
];

/** Common CLI shortcuts (case-insensitive keys) */
const ALIASES: Record<string, Platform> = {
  dovu: "DOVU",
  tolam: "Tolam Earth",
  "tolam-earth": "Tolam Earth",
  "tolam earth": "Tolam Earth",
  capturiant: "Capturiant",
  orbex: "OrbexCO2",
  orbexco2: "OrbexCO2",
  gcr: "GCR",
  tymlez: "TYMLEZ",
};

export function listHederaActorLabels(): string {
  return `${PLATFORMS.join(", ")} (short: dovu, tolam, capturiant, orbex, gcr, tymlez)`;
}

export function resolveHederaActorLabel(input: string): Platform | null {
  const t = input.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const spaced = lower.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (ALIASES[lower]) return ALIASES[lower];
  if (ALIASES[spaced]) return ALIASES[spaced];
  for (const p of PLATFORMS) {
    if (p.toLowerCase() === lower) return p;
    if (p.toLowerCase().replace(/\s+/g, " ") === spaced) return p;
  }
  return null;
}

/** Dedupes and validates; throws if any label is unknown. */
export function parseHederaActorFilters(labels: string[]): Platform[] {
  const seen = new Set<Platform>();
  const out: Platform[] = [];
  for (const label of labels) {
    const p = resolveHederaActorLabel(label);
    if (!p) {
      throw new Error(
        `Unknown Hedera actor: "${label}". Valid: ${listHederaActorLabels()}`
      );
    }
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}
