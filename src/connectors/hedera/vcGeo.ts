/**
 * HCS topic messages → IPFS VerifiableCredential → coordinates (dynamic geography).
 */

import type { MirrorNodeToken, Platform } from "./types";
import { HEDERA_MIRROR_THROTTLE_MS } from "./config";
import { resolveIPFS } from "./ipfs";

/** Topic id used for DOVU / GCR dynamic VC resolution (memo or DOVU heuristic). */
export function extractTopicIdForDynamicGeo(
  token: MirrorNodeToken,
  platform: Platform
): string | null {
  if (platform === "DOVU") {
    const memoMatch = token.memo?.match(/DOVU:\w+:(\d[\d.]+)/);
    const topicId = memoMatch ? memoMatch[1] : null;
    const fallbackTopic = topicId
      ? null
      : (() => {
          const parts = token.token_id.split(".");
          const num = parseInt(parts[2] ?? "0", 10);
          return num > 2 ? `0.0.${num - 2}` : null;
        })();
    return topicId || fallbackTopic;
  }
  if (platform === "GCR") {
    if (token.memo && /^\d+\.\d+\.\d+$/.test(token.memo.trim())) {
      return token.memo.trim();
    }
  }
  return null;
}

const MIRROR_NODE = "https://mainnet-public.mirrornode.hedera.com/api/v1";

interface TopicMessagesResponse {
  messages?: Array<{
    consensus_timestamp: string;
    message: string;
  }>;
  links?: { next?: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Mirror Node ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

function parseConsensusTs(ts: string): number {
  const n = parseFloat(ts);
  return isNaN(n) ? 0 : n;
}

function pickCoordFromSubject(subject: unknown): { lat: number; lng: number } | null {
  if (!subject || typeof subject !== "object") return null;
  const s = subject as Record<string, unknown>;
  const coords = s.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return null;
  const first = coords[0];
  if (!first || typeof first !== "object") return null;
  const c = first as Record<string, unknown>;
  const latRaw = c.latitude ?? c.lat;
  const lngRaw = c.longitude ?? c.lng ?? c.lon;
  if (typeof latRaw === "number" && typeof lngRaw === "number") {
    return { lat: latRaw, lng: lngRaw };
  }
  if (typeof latRaw === "string" && typeof lngRaw === "string") {
    const lat = parseFloat(latRaw);
    const lng = parseFloat(lngRaw);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return null;
}

/**
 * Extract first lat/lng from a VC JSON document (credentialSubject array or object).
 */
export function extractCoordinatesFromVc(json: unknown): { lat: number; lng: number } | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const cs = root.credentialSubject;
  if (Array.isArray(cs)) {
    for (const item of cs) {
      const p = pickCoordFromSubject(item);
      if (p) return p;
    }
    return null;
  }
  return pickCoordFromSubject(cs);
}

function looksLikeVcDoc(o: Record<string, unknown>): boolean {
  const t = o.type;
  const action = o.action;
  const hasCs = "credentialSubject" in o;
  if (hasCs) return true;
  if (Array.isArray(t) && t.some((x) => typeof x === "string" && /vc-document/i.test(x))) {
    return true;
  }
  if (typeof t === "string" && /vc-document/i.test(t)) return true;
  if (typeof action === "string" && /vc|issue|document/i.test(action)) return true;
  return false;
}

function findCidInObject(obj: unknown, depth = 0): string | null {
  if (depth > 14) return null;
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const c = findCidInObject(x, depth + 1);
      if (c) return c;
    }
    return null;
  }
  const o = obj as Record<string, unknown>;
  const cid = o.cid;
  if (
    typeof cid === "string" &&
    (cid.startsWith("Qm") || cid.startsWith("baf") || cid.startsWith("bafk") || cid.startsWith("bafy"))
  ) {
    return cid;
  }
  const uri = o.uri;
  if (typeof uri === "string" && uri.startsWith("ipfs://")) {
    const rest = uri.slice("ipfs://".length).replace(/^\/+/, "");
    const first = rest.split("/")[0];
    if (first) return first;
  }
  for (const v of Object.values(o)) {
    const c = findCidInObject(v, depth + 1);
    if (c) return c;
  }
  return null;
}

function decodeMessagePayload(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const t = decoded.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      return JSON.parse(t) as unknown;
    }
  } catch {
    // ignore
  }
  return null;
}

interface ParsedMessageRow {
  consensus_timestamp: string;
  json: Record<string, unknown>;
  priority: number;
}

function scoreMessage(json: Record<string, unknown>): number {
  let s = 0;
  if (looksLikeVcDoc(json)) s += 100;
  if (findCidInObject(json)) s += 10;
  if ("credentialSubject" in json) s += 50;
  return s;
}

async function fetchAllTopicMessages(topicId: string): Promise<ParsedMessageRow[]> {
  const rows: ParsedMessageRow[] = [];
  let url: string | null = `${MIRROR_NODE}/topics/${encodeURIComponent(topicId)}/messages?limit=100`;

  while (url) {
    const data: TopicMessagesResponse = await fetchJSON<TopicMessagesResponse>(url);
    for (const m of data.messages ?? []) {
      if (!m.message) continue;
      const parsed = decodeMessagePayload(m.message);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      const json = parsed as Record<string, unknown>;
      rows.push({
        consensus_timestamp: m.consensus_timestamp,
        json,
        priority: scoreMessage(json),
      });
    }
    const nextPath = data.links?.next ?? null;
    if (nextPath) {
      url = nextPath.startsWith("http")
        ? nextPath
        : nextPath.startsWith("/api/")
          ? `https://mainnet-public.mirrornode.hedera.com${nextPath}`
          : `${MIRROR_NODE}${nextPath}`;
    } else {
      url = null;
    }
    if (url) await sleep(HEDERA_MIRROR_THROTTLE_MS);
  }

  rows.sort((a, b) => {
    const pr = b.priority - a.priority;
    if (pr !== 0) return pr;
    return parseConsensusTs(b.consensus_timestamp) - parseConsensusTs(a.consensus_timestamp);
  });

  return rows;
}

function toWktPoint(lng: number, lat: number): string {
  return `POINT(${lng} ${lat})`;
}

/**
 * Resolve geography from HCS topic: messages → CID → IPFS VC JSON → coordinates.
 * Returns null on any failure (caller uses static fallback).
 */
export async function fetchGeoFromTopic(topicId: string): Promise<{ wkt: string } | null> {
  try {
    const rows = await fetchAllTopicMessages(topicId);
    for (const row of rows) {
      const cid = findCidInObject(row.json);
      if (!cid) continue;
      await sleep(HEDERA_MIRROR_THROTTLE_MS);
      const vc = await resolveIPFS(cid);
      if (!vc) continue;
      const coords = extractCoordinatesFromVc(vc);
      if (coords) {
        return { wkt: toWktPoint(coords.lng, coords.lat) };
      }
    }
  } catch (e) {
    console.warn(`    ⚠️  Dynamic geo failed for topic ${topicId}:`, e);
  }
  return null;
}
