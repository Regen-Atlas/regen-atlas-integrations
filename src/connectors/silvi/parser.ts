/**
 * Silvi connector - maps API project to ParsedActionData
 */

import type { ParsedActionData } from "../../core/types";
import type { SilviProject } from "./fetcher";

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

export function parseSilviProject(
  raw: SilviProject,
  protocolId: string
): ParsedActionData {
  const title =
    (raw.title || "Untitled Project").trim().slice(0, 100) || "Untitled Project";
  const proofLink = raw.silvi_url || null;

  const geography =
    raw.centroid != null && typeof raw.centroid.lat === "number" && typeof raw.centroid.lng === "number"
      ? `POINT(${raw.centroid.lng} ${raw.centroid.lat})`
      : null;

  return {
    title,
    description: raw.description?.trim() || null,
    main_image: raw.banner_photo || null,
    geography,
    action_start_date: parseDate(raw.created_at),
    action_end_date: null,
    sdg_ids: [15],
    actor_name: "Silvi", //@TODO: add actor name
    protocol_id: protocolId,
    proof_link: proofLink,
    proof_metadata_link: raw.silvi_url || String(raw.project_id),
    proof_image_link: raw.banner_photo || null,
    platform_id: "celo",
    explorer_link: raw.silvi_url || "",
  };
}
