/**
 * Atlantis connector - NFT metadata parser
 */

import { SDG_NAME_TO_ID } from "../../core/sdgs";
import type { ParsedActionData } from "../../core/types";
import type { NFTAttribute, NFTMetadata, NFTData } from "./types";

function getAttributeValue(
  attributes: NFTAttribute[],
  traitType: string
): string | number | string[] | Record<string, unknown>[] | undefined {
  const attr = attributes.find(
    (a) => a.trait_type.toLowerCase() === traitType.toLowerCase()
  );
  return attr?.value;
}

export function resolveArweaveUrl(url: string): string {
  if (url.startsWith("ar://")) {
    return `https://arweave.net/${url.slice(5)}`;
  }
  if (url.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  return url;
}

export async function fetchMetadata(tokenURI: string): Promise<NFTMetadata | null> {
  const url = resolveArweaveUrl(tokenURI);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(`  ⚠️  Failed to fetch metadata from ${url}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`  ⚠️  Error fetching metadata from ${url}:`, error);
    return null;
  }
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Fall through
  }

  return null;
}

export function extractSdgIds(attrs: NFTAttribute[]): number[] {
  const sdgNumber = getAttributeValue(attrs, "sdg_number");
  if (sdgNumber !== undefined) {
    if (typeof sdgNumber === "number" && sdgNumber >= 1 && sdgNumber <= 17) {
      return [sdgNumber];
    }
    if (Array.isArray(sdgNumber)) {
      return (sdgNumber as unknown as number[]).filter((n) => n >= 1 && n <= 17);
    }
  }

  const sdgsArray = getAttributeValue(attrs, "sdgs") as string[] | undefined;
  if (Array.isArray(sdgsArray) && sdgsArray.length > 0) {
    return mapSdgNamesToIds(sdgsArray);
  }

  const sdgName = getAttributeValue(attrs, "sdg") as string | undefined;
  if (sdgName) {
    return mapSdgNamesToIds([sdgName]);
  }

  return [];
}

function mapSdgNamesToIds(sdgNames: string[]): number[] {
  const ids: number[] = [];

  for (const name of sdgNames) {
    const normalizedName = name.toLowerCase().trim();
    const id = SDG_NAME_TO_ID[normalizedName];
    if (id) {
      ids.push(id);
    } else {
      console.warn(`  ⚠️  Unknown SDG: "${name}"`);
    }
  }

  return [...new Set(ids)];
}

function sanitizeTitle(title: string | undefined | null): string {
  if (!title) {
    return "Untitled Action";
  }

  let sanitized = title.trim();

  if (sanitized.length === 0) {
    return "Untitled Action";
  }

  if (sanitized.length > 100) {
    sanitized = sanitized.slice(0, 97) + "...";
  }

  if (sanitized.length < 3) {
    sanitized = sanitized.padEnd(3, " ");
  }

  return sanitized;
}

export function parseNFTMetadata(
  nft: NFTData,
  metadata: NFTMetadata,
  protocolId: string
): ParsedActionData {
  const attrs = metadata.attributes;

  const rawTitle =
    (getAttributeValue(attrs, "project_title") as string) || metadata.name;
  const title = sanitizeTitle(rawTitle);
  const description =
    (getAttributeValue(attrs, "impact_brief") as string) || null;
  const startDate = getAttributeValue(attrs, "project_start_date") as string;
  const endDate = getAttributeValue(attrs, "estimated_project_end_date") as string;
  const sdgIds = extractSdgIds(attrs);
  const actorName = (getAttributeValue(attrs, "project_backer") as string) || null;
  const proofLink = (getAttributeValue(attrs, "impact_report_uri") as string) || null;

  return {
    title,
    description,
    main_image: metadata.image || null,
    geography: null,
    action_start_date: parseDate(startDate),
    action_end_date: parseDate(endDate),
    sdg_ids: sdgIds,
    actor_name: actorName,
    protocol_id: protocolId,
    proof_link: proofLink,
    proof_metadata_link: nft.tokenURI,
    proof_image_link: metadata.image || null,
    platform_id: nft.platformId,
    explorer_link: nft.explorer,
  };
}
