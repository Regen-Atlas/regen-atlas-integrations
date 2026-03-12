/**
 * Example REST connector - maps API response to ParsedActionData
 */

import { SDG_NAME_TO_ID } from "../../core/sdgs";
import type { ParsedActionData } from "../../core/types";
import type { ApiRecord } from "./fetcher";

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

function mapSdgNamesToIds(sdgNames: string[]): number[] {
  const ids: number[] = [];
  for (const name of sdgNames) {
    const id = SDG_NAME_TO_ID[name.toLowerCase().trim()];
    if (id) ids.push(id);
  }
  return [...new Set(ids)];
}

export function parseApiResponse(
  raw: ApiRecord,
  protocolId: string
): ParsedActionData {
  const sdgNames: string[] = Array.isArray(raw.sdgs)
    ? (raw.sdgs as string[])
    : raw.sdg
      ? [String(raw.sdg)]
      : [];
  const sdgIds = mapSdgNamesToIds(sdgNames);

  const title = (raw.title || "Untitled Action").trim().slice(0, 100) || "Untitled Action";
  const proofMetadataLink = raw.metadata_url || raw.proof_url || raw.id || "";
  const explorerLink = raw.explorer_link || raw.proof_url || "";

  return {
    title,
    description: raw.description || null,
    main_image: raw.image || null,
    geography: null,
    action_start_date: parseDate(raw.start_date),
    action_end_date: parseDate(raw.end_date),
    sdg_ids: sdgIds,
    actor_name: raw.actor || null,
    protocol_id: protocolId,
    proof_link: raw.proof_url || null,
    proof_metadata_link: proofMetadataLink,
    proof_image_link: raw.image || null,
    platform_id: raw.platform_id || "unknown",
    explorer_link: explorerLink,
  };
}
