/**
 * Hedera token → ParsedActionData parser
 */

import type { ParsedActionData } from "../../core/types";
import type {
  EnrichedToken,
  MirrorNodeToken,
  CapturiantIPFS,
  TolamIPFS,
  OrbexMemo,
  Platform,
} from "./types";
import {
  resolveDovuGeo,
  resolveTolamGeo,
  resolveCapturiantGeo,
  resolveOrbexGeo,
  resolveGCRGeo,
  resolveTymlezGeo,
} from "./geography";

const HASHSCAN = "https://hashscan.io/mainnet";

function parseDate(timestamp: string | undefined | null): string | null {
  if (!timestamp) return null;
  try {
    if (timestamp.includes(".") && !timestamp.includes("-")) {
      const seconds = parseFloat(timestamp);
      return new Date(seconds * 1000).toISOString();
    }
    const d = new Date(timestamp);
    return !isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

function tokenSupply(token: MirrorNodeToken): number {
  const raw = BigInt(token.total_supply);
  const decimals = parseInt(token.decimals, 10) || 0;
  if (decimals === 0) return Number(raw);
  return Number(raw) / Math.pow(10, decimals);
}

function cleanTitle(name: string): string {
  return name
    .replace(/\(Guardian Reissue\)/gi, "")
    .replace(/\(guardian-v1-reissue\)/gi, "")
    .trim();
}

function parseDOVU(enriched: EnrichedToken, protocolId: string): ParsedActionData {
  const { token } = enriched;
  const title = cleanTitle(token.name);
  const supply = tokenSupply(token);

  const memoMatch = token.memo?.match(/DOVU:\w+:(\d[\d.]+)/);
  const topicId = memoMatch ? memoMatch[1] : null;
  const fallbackTopic = topicId
    ? null
    : (() => {
        const parts = token.token_id.split(".");
        const num = parseInt(parts[2] ?? "0", 10);
        return num > 2 ? `0.0.${num - 2}` : null;
      })();

  const topic = topicId || fallbackTopic;
  const staticGeo = resolveDovuGeo(token.name);
  const geography = enriched.dynamicGeo?.wkt ?? staticGeo?.wkt ?? null;

  const topicNote = topic ? ` Guardian topic: ${topic}.` : "";
  const description = `Soil carbon credits from ${title}. ${supply} tCO2e issued. Verified under DOVU dMRV Standard.${topicNote}`;

  return {
    title,
    description,
    main_image: null,
    geography,
    action_start_date: parseDate(token.created_timestamp),
    action_end_date: null,
    sdg_ids: [13, 15],
    actor_name: "DOVU",
    protocol_id: protocolId,
    proof_link: `${HASHSCAN}/token/${token.token_id}`,
    proof_metadata_link: topic
      ? `${HASHSCAN}/topic/${topic}`
      : `${HASHSCAN}/token/${token.token_id}`,
    proof_image_link: null,
    platform_id: "hedera",
    explorer_link: `${HASHSCAN}/token/${token.token_id}`,
  };
}

function parseTolam(enriched: EnrichedToken, protocolId: string): ParsedActionData {
  const { token, nftMetadata } = enriched;
  const supply = tokenSupply(token);
  const name = token.name;

  let registry = "Unknown";
  let countryCode: string | null = null;
  let projectId: string | null = null;
  let projectName: string | null = null;
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (name.startsWith("VRA")) {
    registry = "Verra VCS";
    const ccMatch = name.match(/VER-([A-Z]{2})-/);
    countryCode = ccMatch?.[1] ?? null;
    const projMatch = name.match(/VCS(\d+)/);
    projectId = projMatch ? `VCS${projMatch[1]}` : null;
  } else if (name.startsWith("ERA")) {
    registry = "EcoRegistry";
    const cdcMatch = name.match(/CDC[_-]?(\d+)/);
    projectId = cdcMatch ? `CDC-${cdcMatch[1]}` : null;
    const ccMatch = name.match(/_XX_([A-Z]{2})_/);
    if (ccMatch) {
      countryCode = ccMatch[1];
    } else {
      const knownCCs = new Set(["MX", "US", "SG", "CO", "BR", "IN", "RW", "AU", "GB", "BG", "FR", "AR", "BO"]);
      const altCC = name.match(/_([A-Z]{2})_/g);
      if (altCC) {
        for (const m of altCC) {
          const code = m.slice(1, 3);
          if (knownCCs.has(code)) {
            countryCode = code;
            break;
          }
        }
      }
    }
  } else if (name.startsWith("GCSR")) {
    registry = "Global C-Sink";
    const projMatch = name.match(/GCSR\s*-\s*(\S+)/);
    projectId = projMatch?.[1] ?? null;
    countryCode = "IN";
  }

  if (nftMetadata && "properties" in nftMetadata) {
    const props = (nftMetadata as unknown as TolamIPFS).properties;
    if (props.registryProjectName) projectName = props.registryProjectName;
    if (props.registryProjectId) projectId = props.registryProjectId;
    if (props.registryOfOrigin) {
      const regMap: Record<string, string> = {
        verra: "Verra VCS",
        ecoregistry: "EcoRegistry",
        "global-c-sink-registry": "Global C-Sink",
      };
      registry = regMap[props.registryOfOrigin] ?? registry;
    }
    startDate = props.monitoringPeriodStartDate ?? null;
    endDate = props.monitoringPeriodEndDate ?? null;
  }

  if (!countryCode) {
    const symCC = token.symbol.match(/VER-([A-Z]{2})/);
    if (symCC) countryCode = symCC[1];
  }

  if (!countryCode && projectName) {
    const pn = projectName.toLowerCase();
    if (pn.includes("india")) countryCode = "IN";
    else if (pn.includes("brazil") || pn.includes("verde")) countryCode = "BR";
    else if (pn.includes("colombia")) countryCode = "CO";
    else if (pn.includes("mexico") || pn.includes("oaxaca") || pn.includes("wind energy")) countryCode = "MX";
    else if (pn.includes("singapore") || pn.includes("asia")) countryCode = "SG";
    else if (pn.includes("canada") || pn.includes("u.s") || pn.includes("carboncure")) countryCode = "US";
    else if (pn.includes("rwanda")) countryCode = "RW";
  }

  if (!countryCode) {
    const tn = name.toLowerCase();
    if (tn.includes("(mx)")) countryCode = "MX";
    else if (tn.includes("(us)")) countryCode = "US";
    else if (tn.includes("(sg)")) countryCode = "SG";
    else if (tn.includes("(co)")) countryCode = "CO";
    else if (tn.includes("(br)")) countryCode = "BR";
    else if (tn.includes("(in)")) countryCode = "IN";
  }

  const geo = countryCode ? resolveTolamGeo(countryCode) : null;

  const titleParts = [projectName || projectId || registry, countryCode ? `(${countryCode})` : null]
    .filter(Boolean)
    .join(" ");
  const title = titleParts.slice(0, 100) || `Tolam ${registry} Token`;

  const description = [
    `${supply} tCO2e bridged from ${registry} to Hedera.`,
    projectId ? `Registry project: ${projectId}.` : null,
    startDate && endDate ? `Monitoring: ${startDate} – ${endDate}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const topicFromMemo =
    token.memo && /^\d+\.\d+\.\d+$/.test(token.memo.trim()) ? token.memo.trim() : null;

  return {
    title,
    description,
    main_image: null,
    geography: geo?.wkt ?? null,
    action_start_date: parseDate(startDate) ?? parseDate(token.created_timestamp),
    action_end_date: parseDate(endDate),
    sdg_ids: [13],
    actor_name: "Tolam Earth",
    protocol_id: protocolId,
    proof_link: `${HASHSCAN}/token/${token.token_id}`,
    proof_metadata_link: topicFromMemo
      ? `${HASHSCAN}/topic/${topicFromMemo}`
      : `${HASHSCAN}/token/${token.token_id}`,
    proof_image_link: null,
    platform_id: "hedera",
    explorer_link: `${HASHSCAN}/token/${token.token_id}`,
  };
}

function parseCapturiant(enriched: EnrichedToken, protocolId: string): ParsedActionData {
  const { token, ipfsMetadata } = enriched;
  const supply = tokenSupply(token);
  const ipfs = ipfsMetadata as CapturiantIPFS | undefined;

  const projectName = ipfs?.projectName ?? token.name;
  const vintage = ipfs?.vintage ?? "Unknown";
  const country = ipfs?.country ?? "United States of America";
  const standard = ipfs?.standard ?? "Capturiant Standard";
  const validationDate = ipfs?.validationDate ?? null;
  const sdgs = ipfs?.sdgs ?? [13];

  const title = `${projectName} — Forward Carbon ${vintage}`.slice(0, 100);
  const description = `Forward carbon credit for ${projectName}, ${country}. Vintage ${vintage}. Standard: ${standard}.${
    validationDate ? ` Validated ${validationDate}.` : ""
  } ${supply} units issued.`;

  const geo = resolveCapturiantGeo(projectName);

  const cid = token.memo?.trim();
  const ipfsLink =
    cid && (cid.startsWith("bafk") || cid.startsWith("bafy") || cid.startsWith("Qm"))
      ? `https://${cid}.ipfs.w3s.link/`
      : null;

  return {
    title,
    description,
    main_image: null,
    geography: geo?.wkt ?? null,
    action_start_date: parseDate(validationDate) ?? parseDate(token.created_timestamp),
    action_end_date: null,
    sdg_ids: sdgs,
    actor_name: "Capturiant",
    protocol_id: protocolId,
    proof_link: `${HASHSCAN}/token/${token.token_id}`,
    proof_metadata_link: ipfsLink ?? `${HASHSCAN}/token/${token.token_id}`,
    proof_image_link: null,
    platform_id: "hedera",
    explorer_link: `${HASHSCAN}/token/${token.token_id}`,
  };
}

function parseOrbexCO2(enriched: EnrichedToken, protocolId: string): ParsedActionData {
  const { token, linkedMemo } = enriched;
  const supply = tokenSupply(token);

  let memo: OrbexMemo;
  try {
    memo = JSON.parse(token.memo) as OrbexMemo;
  } catch {
    memo = { OrbexMarket: "unknown" };
  }

  let stateCode: string | null = null;
  let materialName: string | null = null;
  if (linkedMemo) {
    try {
      const linkedParsed = JSON.parse(linkedMemo) as { OrbexMarket?: string };
      const originMatch = linkedParsed.OrbexMarket?.match(/Origin-US-(\w+)/);
      if (originMatch) stateCode = originMatch[1] ?? null;
    } catch {
      const originMatch = linkedMemo.match(/Origin-US-(\w+)/);
      if (originMatch) stateCode = originMatch[1] ?? null;
    }
  }

  if (!stateCode) {
    const originMatch = memo.OrbexMarket?.match(/Origin-US-(\w+)/);
    if (originMatch) stateCode = originMatch[1] ?? null;
  }

  const materialFromName = token.name.replace("OrbexCO2-Credit", "").replace("OrbexCO2", "").trim();

  const geo = stateCode ? resolveOrbexGeo(stateCode) : null;
  const stateLabel = stateCode || "US";

  const title = `OrbexCO2 — ${materialFromName || "Industrial"} Recycled (${stateLabel})`.slice(0, 100);
  const description = `Industrial carbon intensity measurement: ${supply} tCO2e for recycled material. Origin: ${stateLabel}, USA.${
    memo.tokenLink ? ` Linked commodity: ${memo.tokenLink}.` : ""
  }`;

  return {
    title,
    description,
    main_image: null,
    geography: geo?.wkt ?? null,
    action_start_date: parseDate(token.created_timestamp),
    action_end_date: null,
    sdg_ids: [13, 12],
    actor_name: "OrbexCO2",
    protocol_id: protocolId,
    proof_link: `${HASHSCAN}/token/${token.token_id}`,
    proof_metadata_link: memo.tokenLink
      ? `${HASHSCAN}/token/${memo.tokenLink}`
      : `${HASHSCAN}/token/${token.token_id}`,
    proof_image_link: null,
    platform_id: "hedera",
    explorer_link: `${HASHSCAN}/token/${token.token_id}`,
  };
}

function parseGCR(enriched: EnrichedToken, protocolId: string): ParsedActionData {
  const { token } = enriched;
  const supply = tokenSupply(token);

  const nameMatch = token.name.match(/GCR\s*-\s*GS\s+TPDDTEC\s+v([\d.]+)\s*-?\s*(.*)/i);
  const version = nameMatch?.[1] ?? "1";
  const projectName = nameMatch?.[2]?.trim() || null;

  const title = projectName
    ? `${projectName} (Gold Standard TPDDTEC)`
    : `GCR Gold Standard TPDDTEC v${version}`;

  const topicId =
    token.memo && /^\d+\.\d+\.\d+$/.test(token.memo.trim()) ? token.memo.trim() : null;

  const staticGeo = resolveGCRGeo(token.name);
  const geography = enriched.dynamicGeo?.wkt ?? staticGeo?.wkt ?? null;

  const sdgs = token.name.toLowerCase().includes("water") ? [13, 6] : [13];

  const description = `Gold Standard verified emission reductions under TPDDTEC v${version}. ${supply} credits.${
    topicId ? ` Guardian topic: ${topicId}.` : ""
  }`;

  return {
    title: title.slice(0, 100),
    description,
    main_image: null,
    geography,
    action_start_date: parseDate(token.created_timestamp),
    action_end_date: null,
    sdg_ids: sdgs,
    actor_name: "GCR",
    protocol_id: protocolId,
    proof_link: `${HASHSCAN}/token/${token.token_id}`,
    proof_metadata_link: topicId
      ? `${HASHSCAN}/topic/${topicId}`
      : `${HASHSCAN}/token/${token.token_id}`,
    proof_image_link: null,
    platform_id: "hedera",
    explorer_link: `${HASHSCAN}/token/${token.token_id}`,
  };
}

function parseTYMLEZ(enriched: EnrichedToken, protocolId: string): ParsedActionData {
  const { token } = enriched;
  const supply = tokenSupply(token);
  const geo = resolveTymlezGeo();

  return {
    title: "TYMLEZ — Gold Coast Health Precinct Carbon Measurement",
    description: `${supply} tCO2e accounted under GHG Corporate Standard. Behind-the-meter energy monitoring at Cohort Innovation Space, Gold Coast Health & Knowledge Precinct, QLD, Australia.`,
    main_image: null,
    geography: geo.wkt,
    action_start_date: parseDate(token.created_timestamp),
    action_end_date: null,
    sdg_ids: [13, 12],
    actor_name: "TYMLEZ",
    protocol_id: protocolId,
    proof_link: `${HASHSCAN}/token/${token.token_id}`,
    proof_metadata_link: `${HASHSCAN}/token/${token.token_id}`,
    proof_image_link: null,
    platform_id: "hedera",
    explorer_link: `${HASHSCAN}/token/${token.token_id}`,
  };
}

type PlatformParser = (enriched: EnrichedToken, protocolId: string) => ParsedActionData;

const PLATFORM_PARSERS: Record<Platform, PlatformParser> = {
  DOVU: parseDOVU,
  "Tolam Earth": parseTolam,
  Capturiant: parseCapturiant,
  OrbexCO2: parseOrbexCO2,
  GCR: parseGCR,
  TYMLEZ: parseTYMLEZ,
};

export function parseHederaToken(enriched: EnrichedToken, protocolId: string): ParsedActionData {
  const parser = PLATFORM_PARSERS[enriched.platform];
  if (!parser) {
    throw new Error(`Unknown platform: ${enriched.platform}`);
  }
  return parser(enriched, protocolId);
}
