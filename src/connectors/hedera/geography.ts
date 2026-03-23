/**
 * Static geography lookup for Hedera environmental tokens.
 * Returns PostGIS WKT POINT(lng lat) strings.
 */

interface GeoEntry {
  lat: number;
  lng: number;
  country: string;
}

/** DOVU farm name → location */
const DOVU_FARMS: Record<string, GeoEntry> = {
  "summerley hall fruit farm": { lat: 52.15, lng: -2.22, country: "GB" },
  "summerley hall": { lat: 52.15, lng: -2.22, country: "GB" },
  "setka gosheva farm": { lat: 42.7, lng: 25.48, country: "BG" },
  "setka gosheva": { lat: 42.7, lng: 25.48, country: "BG" },
  "omarchevo farm": { lat: 42.75, lng: 25.5, country: "BG" },
  "omarchevo": { lat: 42.75, lng: 25.5, country: "BG" },
  "briyastovo wheat farm": { lat: 42.05, lng: 24.35, country: "BG" },
  briyastovo: { lat: 42.05, lng: 24.35, country: "BG" },
  "distillerie coquerel": { lat: 48.85, lng: -1.15, country: "FR" },
  coquerel: { lat: 48.85, lng: -1.15, country: "FR" },
  "red hill farm": { lat: 52.5, lng: -1.5, country: "GB" },
  "red hill": { lat: 52.5, lng: -1.5, country: "GB" },
  ketrawe: { lat: -38.95, lng: -68.07, country: "AR" },
  "vaca diez": { lat: -11.0, lng: -65.6, country: "BO" },
  savimbo: { lat: 1.15, lng: -77.28, country: "CO" },
};

/** Country code → centroid (for Tolam tokens parsed from symbol) */
const COUNTRY_CENTROIDS: Record<string, GeoEntry> = {
  MX: { lat: 23.63, lng: -102.55, country: "MX" },
  US: { lat: 39.83, lng: -98.58, country: "US" },
  SG: { lat: 1.35, lng: 103.82, country: "SG" },
  CO: { lat: 4.57, lng: -74.3, country: "CO" },
  BR: { lat: -14.24, lng: -51.93, country: "BR" },
  IN: { lat: 20.59, lng: 78.96, country: "IN" },
  RW: { lat: -1.94, lng: 29.87, country: "RW" },
  AU: { lat: -27.96, lng: 153.38, country: "AU" },
  GB: { lat: 52.15, lng: -2.22, country: "GB" },
  BG: { lat: 42.7, lng: 25.48, country: "BG" },
  FR: { lat: 48.85, lng: -1.15, country: "FR" },
  AR: { lat: -38.95, lng: -68.07, country: "AR" },
  BO: { lat: -11.0, lng: -65.6, country: "BO" },
};

/** US state → centroid (for OrbexCO2 Origin-US-{STATE}) */
const US_STATE_CENTROIDS: Record<string, GeoEntry> = {
  TN: { lat: 35.52, lng: -86.58, country: "US" },
  KY: { lat: 37.84, lng: -84.27, country: "US" },
  AL: { lat: 32.32, lng: -86.9, country: "US" },
  CA: { lat: 36.78, lng: -119.42, country: "US" },
  IL: { lat: 40.63, lng: -89.4, country: "US" },
  IN: { lat: 40.27, lng: -86.13, country: "US" },
  GA: { lat: 32.17, lng: -82.91, country: "US" },
  TX: { lat: 31.97, lng: -99.9, country: "US" },
  AZ: { lat: 34.05, lng: -111.09, country: "US" },
  PA: { lat: 41.2, lng: -77.19, country: "US" },
  NV: { lat: 38.8, lng: -116.42, country: "US" },
  MO: { lat: 38.57, lng: -92.6, country: "US" },
  FL: { lat: 27.66, lng: -81.52, country: "US" },
  OH: { lat: 40.42, lng: -82.91, country: "US" },
  NC: { lat: 35.76, lng: -79.02, country: "US" },
  VA: { lat: 37.43, lng: -78.66, country: "US" },
};

/** Capturiant project name → location */
const CAPTURIANT_PROJECTS: Record<string, GeoEntry> = {
  "miller mountain": { lat: 37.8, lng: -79.5, country: "US" },
  warrior: { lat: 35.5, lng: -82.5, country: "US" },
};

/** GCR project locations */
const GCR_PROJECTS: Record<string, GeoEntry> = {
  "safe water": { lat: -1.94, lng: 29.87, country: "RW" },
  rwanda: { lat: -1.94, lng: 29.87, country: "RW" },
  westcom: { lat: -1.29, lng: 36.82, country: "KE" },
};

/** TYMLEZ fixed location */
const TYMLEZ_LOCATION: GeoEntry = {
  lat: -27.96,
  lng: 153.38,
  country: "AU",
};

function toWKT(geo: GeoEntry): string {
  return `POINT(${geo.lng} ${geo.lat})`;
}

function fuzzyMatch(haystack: string, needles: Record<string, GeoEntry>): GeoEntry | null {
  const lower = haystack.toLowerCase();
  for (const [key, geo] of Object.entries(needles)) {
    if (lower.includes(key)) return geo;
  }
  return null;
}

export function resolveDovuGeo(tokenName: string): { wkt: string; country: string } | null {
  const geo = fuzzyMatch(tokenName, DOVU_FARMS);
  if (geo) return { wkt: toWKT(geo), country: geo.country };
  return null;
}

export function resolveTolamGeo(countryCode: string): { wkt: string; country: string } | null {
  const upper = countryCode.toUpperCase();
  const geo = COUNTRY_CENTROIDS[upper];
  if (geo) return { wkt: toWKT(geo), country: geo.country };
  return null;
}

export function resolveCapturiantGeo(projectName: string): { wkt: string; country: string } | null {
  const geo = fuzzyMatch(projectName, CAPTURIANT_PROJECTS);
  if (geo) return { wkt: toWKT(geo), country: geo.country };
  return null;
}

export function resolveOrbexGeo(stateCode: string): { wkt: string; country: string } | null {
  const upper = stateCode.toUpperCase();
  const geo = US_STATE_CENTROIDS[upper];
  if (geo) return { wkt: toWKT(geo), country: geo.country };
  return null;
}

export function resolveGCRGeo(tokenName: string): { wkt: string; country: string } | null {
  const geo = fuzzyMatch(tokenName, GCR_PROJECTS);
  if (geo) return { wkt: toWKT(geo), country: geo.country };
  return null;
}

export function resolveTymlezGeo(): { wkt: string; country: string } {
  return { wkt: toWKT(TYMLEZ_LOCATION), country: TYMLEZ_LOCATION.country };
}
