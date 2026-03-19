/**
 * Ecocertain connector - fetches ecocerts via Hypercerts GraphQL API
 *
 * 1) Resolve hypercert IDs from hyperboard (or env override).
 * 2) For each ID, fetch full hypercert metadata.
 * 3) Optionally fetch GeoJSON from IPFS metadata for geography centroid.
 */

import { request } from "graphql-request";
import {
  getGraphqlUrl,
  getHyperboardId,
} from "./config";
import { fetchGeojsonForHypercert } from "./geo";
import type { GeoJSONFeatureCollection } from "./geo";

const THROTTLE_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Response shape for hyperboard query */
interface HyperboardEntry {
  id: string;
}
interface HyperboardSection {
  entries?: HyperboardEntry[] | null;
}
interface HyperboardResponse {
  hyperboards: {
    data: Array<{
      sections?: { data: HyperboardSection[] } | null;
    }>;
  };
}

const HYPERBOARD_IDS_QUERY = `
  query GetHypercertIdsByHyperboardId($hyperboard_id: String!) {
    hyperboards(where: { id: { eq: $hyperboard_id } }) {
      data {
        sections {
          data {
            entries {
              id
            }
          }
        }
      }
    }
  }
`;

/** Full hypercert for parser - matches Hypercerts API response */
export interface EcocertainHypercertRaw {
  hypercert_id?: string | null;
  hypercertId: string;
  units?: string | null;
  uri?: string | null;
  creation_block_timestamp?: string | null;
  creator_address?: string | null;
  contract?: { chain_id?: string | null } | null;
  metadata?: {
    name?: string | null;
    description?: string | null;
    image?: string | null;
    work_scope?: string[] | null;
    work_timeframe_from?: string | null;
    work_timeframe_to?: string | null;
    contributors?: string[] | null;
  } | null;
  /** GeoJSON from IPFS (geoJSON property in metadata), attached when uri is present */
  geojson?: GeoJSONFeatureCollection | null;
}

interface HypercertByIdResponse {
  hypercerts: {
    data: EcocertainHypercertRaw[] | null;
  };
}

const FULL_HYPERCERT_QUERY = `
  query GetFullHypercertForConnector($hypercert_id: String!) {
    hypercerts(where: { hypercert_id: { eq: $hypercert_id } }) {
      data {
        hypercert_id
        units
        uri
        creation_block_timestamp
        creator_address
        contract {
          chain_id
        }
        metadata {
          name
          description
          image
          work_scope
          work_timeframe_from
          work_timeframe_to
          contributors
        }
      }
    }
  }
`;

export async function fetchHypercertIds(
  graphqlUrl: string,
  hyperboardId: string
): Promise<string[]> {
  const envIds = process.env.ECOCERTAIN_HYPERCERT_IDS;
  if (envIds?.trim()) {
    return envIds.split(",").map((id) => id.trim()).filter(Boolean);
  }

  const response = await request<HyperboardResponse>(graphqlUrl, HYPERBOARD_IDS_QUERY, {
    hyperboard_id: hyperboardId,
  });

  const ids: string[] = [];
  const hyperboards = response.hyperboards?.data ?? [];
  for (const board of hyperboards) {
    const sections = board.sections?.data ?? [];
    for (const section of sections) {
      const entries = section.entries ?? [];
      for (const entry of entries) {
        if (entry.id) ids.push(entry.id);
      }
    }
  }
  return ids;
}

export async function fetchHypercertById(
  graphqlUrl: string,
  hypercertId: string
): Promise<EcocertainHypercertRaw | null> {
  const response = await request<HypercertByIdResponse>(graphqlUrl, FULL_HYPERCERT_QUERY, {
    hypercert_id: hypercertId,
  });

  const data = response.hypercerts?.data;
  if (!data?.length) return null;

  const raw = data[0];
  const id = (raw as { hypercert_id?: string }).hypercert_id ?? hypercertId;
  const withId = {
    ...raw,
    hypercert_id: id,
    hypercertId: id,
  };
  if (withId.uri) {
    try {
      const geojson = await fetchGeojsonForHypercert(withId.uri);
      withId.geojson = geojson ?? undefined;
    } catch {
      // leave geojson undefined on failure
    }
  }
  return withId;
}

export async function fetchEcocertainHypercerts(
  _scope?: { chain?: string }
): Promise<EcocertainHypercertRaw[]> {
  const graphqlUrl = getGraphqlUrl();
  const hyperboardId = getHyperboardId();

  const ids = await fetchHypercertIds(graphqlUrl, hyperboardId);
  const results: EcocertainHypercertRaw[] = [];

  for (let i = 0; i < ids.length; i++) {
    const raw = await fetchHypercertById(graphqlUrl, ids[i]);
    if (raw) results.push(raw);
    if (i < ids.length - 1) {
      await sleep(THROTTLE_MS);
    }
  }

  return results;
}
