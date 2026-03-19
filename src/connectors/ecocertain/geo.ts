/**
 * Ecocertain geo: fetch GeoJSON from hypercert IPFS metadata and compute centroid.
 * Mirrors logic from external ecocertain app site-boundaries (metadata + geoJSON property).
 */

/** Minimal GeoJSON types for centroid computation */
interface GeoJSONPosition {
  0: number;
  1: number;
  2?: number;
}

interface GeoJSONGeometry {
  type: string;
  coordinates: GeoJSONPosition[] | GeoJSONPosition[][] | GeoJSONPosition[][][];
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties?: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

const METADATA_IPFS_BASE = "https://ipfs.io/ipfs";
/** W3S gateway: metadata is at https://<cid>.ipfs.w3s.link (same as Ecocertain app) */
function metadataUrl(cid: string): string {
  return `https://${cid}.ipfs.w3s.link`;
}

/** Fetch hypercert metadata from IPFS (by metadata CID), then fetch GeoJSON from geoJSON property. */
export async function fetchGeojsonForHypercert(
  metadataCid: string | null | undefined
): Promise<GeoJSONFeatureCollection | null> {
  if (!metadataCid?.trim()) return null;
  const cid = metadataCid.trim().replace(/^ipfs:\/\//, "");

  try {
    const metaRes = await fetch(metadataUrl(cid));
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { properties?: Array<{ trait_type?: string; src?: string }> };
    const properties = meta?.properties;
    if (!Array.isArray(properties)) return null;

    const geoProp = properties.find((p) => p?.trait_type === "geoJSON");
    const src = geoProp?.src;
    if (!src || typeof src !== "string") return null;

    const ipfsMatch = src.match(/^ipfs:\/\/(.+)$/);
    const geojsonCid = ipfsMatch?.[1];
    if (!geojsonCid) return null;

    const geojsonUrl = `${METADATA_IPFS_BASE}/${geojsonCid}`;
    const geoRes = await fetch(geojsonUrl);
    if (!geoRes.ok) return null;
    const geojson = (await geoRes.json()) as GeoJSONFeatureCollection;
    if (geojson?.type !== "FeatureCollection" || !Array.isArray(geojson.features)) return null;
    return geojson;
  } catch {
    return null;
  }
}

/** Get centroid of a single position (for Point). */
function positionToLngLat(c: GeoJSONPosition): [number, number] {
  return [Number(c[0]), Number(c[1])];
}

/** Centroid of a ring (first ring for polygon) - use bounding box center for simplicity. */
function ringCentroid(ring: GeoJSONPosition[]): [number, number] {
  if (!ring?.length) return [0, 0];
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const p of ring) {
    const lng = Number(p[0]);
    const lat = Number(p[1]);
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

/** Centroid of one geometry. */
function geometryCentroid(geom: GeoJSONGeometry): [number, number] | null {
  const coords = geom.coordinates;
  if (!coords) return null;

  switch (geom.type) {
    case "Point": {
      const c = coords as unknown as GeoJSONPosition;
      return positionToLngLat(c);
    }
    case "MultiPoint": {
      const points = coords as GeoJSONPosition[];
      if (!points.length) return null;
      let sumLng = 0, sumLat = 0;
      for (const p of points) {
        sumLng += Number(p[0]);
        sumLat += Number(p[1]);
      }
      return [sumLng / points.length, sumLat / points.length];
    }
    case "LineString": {
      const line = coords as GeoJSONPosition[];
      if (!line.length) return null;
      return ringCentroid(line);
    }
    case "MultiLineString": {
      const lines = coords as GeoJSONPosition[][];
      const centroids = lines.map((l) => ringCentroid(l)).filter(Boolean);
      if (!centroids.length) return null;
      const sumLng = centroids.reduce((a, [lng]) => a + lng, 0);
      const sumLat = centroids.reduce((a, [, lat]) => a + lat, 0);
      return [sumLng / centroids.length, sumLat / centroids.length];
    }
    case "Polygon": {
      const rings = coords as GeoJSONPosition[][];
      const outer = rings[0];
      if (!outer?.length) return null;
      return ringCentroid(outer);
    }
    case "MultiPolygon": {
      const polys = coords as GeoJSONPosition[][][];
      const centroids = polys
        .map((rings) => rings[0] && ringCentroid(rings[0]))
        .filter((c): c is [number, number] => c != null);
      if (!centroids.length) return null;
      const sumLng = centroids.reduce((a, [lng]) => a + lng, 0);
      const sumLat = centroids.reduce((a, [, lat]) => a + lat, 0);
      return [sumLng / centroids.length, sumLat / centroids.length];
    }
    default:
      return null;
  }
}

/**
 * Compute an approximate center point for all features (e.g. multiple project sites).
 * Returns PostGIS WKT: POINT(lng lat), or null if no valid geometry.
 */
export function geojsonToCentroidWkt(geojson: GeoJSONFeatureCollection | null | undefined): string | null {
  if (!geojson?.features?.length) return null;

  const centroids: [number, number][] = [];
  for (const f of geojson.features) {
    if (!f?.geometry) continue;
    const c = geometryCentroid(f.geometry);
    if (c) centroids.push(c);
  }
  if (!centroids.length) return null;

  const lng = centroids.reduce((a, [x]) => a + x, 0) / centroids.length;
  const lat = centroids.reduce((a, [, y]) => a + y, 0) / centroids.length;
  return `POINT(${lng} ${lat})`;
}
