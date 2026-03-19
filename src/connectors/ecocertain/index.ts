/**
 * Ecocertain connector - GainForest hypercerts (ecocerts)
 *
 * Fetches curated ecocerts via Hypercerts GraphQL API and hyperboard.
 * Configure ECOCERTAIN_PROTOCOL_ID in env.
 */

import type { Connector, ParsedActionData, RawRecord } from "../../core/types";
import { fetchEcocertainHypercerts } from "./fetcher";
import { parseEcocertainHypercert } from "./parser";

export function createEcocertainConnector(protocolId: string): Connector {
  return {
    id: "ecocertain",
    protocolId,

    async fetch(scope?: { chain?: string }): Promise<RawRecord[]> {
      return fetchEcocertainHypercerts(scope);
    },

    parse(raw: RawRecord): ParsedActionData {
      return parseEcocertainHypercert(raw, this.protocolId);
    },
  };
}
