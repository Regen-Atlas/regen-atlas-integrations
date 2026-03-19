/**
 * Ecocertain connector - maps raw hypercert to ParsedActionData
 */

import type { ParsedActionData } from "../../core/types";
import { SDG_NAME_TO_ID } from "../../core/sdgs";
import type { EcocertainHypercertRaw } from "./fetcher";
import { geojsonToCentroidWkt } from "./geo";

const ECOCERTAIN_DETAIL_BASE = "https://www.ecocertain.xyz/hypercert";
const HYPERCERTS_EXPLORER_BASE = "https://app.hypercerts.org/hypercerts";
/** Ecocertain API that returns image bytes (handles base64 metadata from Hypercerts API) */
const ECOCERTAIN_IMAGE_API_BASE = "https://www.ecocertain.xyz/api/hypercert-image";

/** Seconds (string or number) to ISO date string */
function secondsToIso(seconds: string | number | null | undefined): string | null {
  if (seconds == null || seconds === "") return null;
  const n = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  if (!Number.isFinite(n)) return null;
  try {
    const date = new Date(n * 1000);
    return !isNaN(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

/** Map work_scope keywords to SDG IDs; default [15] Life on Land */
function workScopeToSdgIds(workScope: string[] | null | undefined): number[] {
  if (!workScope?.length) return [15];
  const ids = new Set<number>();
  const lower = workScope.map((s) => (s || "").toLowerCase().trim()).filter(Boolean);
  for (const phrase of lower) {
    for (const [name, id] of Object.entries(SDG_NAME_TO_ID)) {
      if (phrase.includes(name) || name.includes(phrase)) {
        ids.add(id);
      }
    }
    if (phrase.includes("climate")) ids.add(13);
    if (phrase.includes("water") || phrase.includes("sanitation")) ids.add(6);
    if (phrase.includes("land") || phrase.includes("forest") || phrase.includes("biodiversity") || phrase.includes("restoration")) ids.add(15);
    if (phrase.includes("ocean") || phrase.includes("marine")) ids.add(14);
  }
  return ids.size > 0 ? [...ids] : [15];
}

/**
 * Resolve image URL for storage. Ecocertain stores base64 data URLs in metadata;
 * their app serves images via /api/hypercert-image/[id] which fetches and decodes.
 * For base64 we use that same API URL so Regen Atlas can load the image without
 * storing huge payloads; for http(s) we use the URL as-is.
 */
function imageUrl(
  value: string | null | undefined,
  hypercertId: string
): string | null {
  if (!value?.trim()) return null;
  const v = value.trim().replace(/^['"]|['"]$/g, "");
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("data:image"))
    return `${ECOCERTAIN_IMAGE_API_BASE}/${encodeURIComponent(hypercertId)}`;
  return v;
}

export function parseEcocertainHypercert(
  raw: EcocertainHypercertRaw,
  protocolId: string
): ParsedActionData {
  const hypercertId = raw.hypercertId || (raw as { hypercert_id?: string }).hypercert_id || "";
  const meta = raw.metadata ?? {};
  const title = (meta.name || "Untitled Ecocert").trim().slice(0, 100) || "Untitled Ecocert";
  const platformId = 'celo' // Ecocertain is on Celo
  const creatorAddress = raw.creator_address?.trim();
  const actorName =
    creatorAddress && creatorAddress.length >= 2 ? creatorAddress : null;

  const image = imageUrl(meta.image, hypercertId);
  const geography = geojsonToCentroidWkt(raw.geojson) ?? null;
  return {
    title,
    description: meta.description?.trim() ?? null,
    main_image: image,
    geography,
    action_start_date: secondsToIso(meta.work_timeframe_from),
    action_end_date: secondsToIso(meta.work_timeframe_to),
    sdg_ids: workScopeToSdgIds(meta.work_scope ?? undefined),
    actor_name: actorName,
    protocol_id: protocolId,
    proof_link: `${ECOCERTAIN_DETAIL_BASE}/${hypercertId}`,
    proof_metadata_link: hypercertId,
    proof_image_link: image,
    platform_id: platformId,
    explorer_link: `${HYPERCERTS_EXPLORER_BASE}/${hypercertId}`,
  };
}
