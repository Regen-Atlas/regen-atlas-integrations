/**
 * Hedera Guardian connector — environmental tokens from Mirror Node (read-only).
 */

import type { Connector, ConnectorFetchScope, ParsedActionData, RawRecord } from "../../core/types";
import { parseHederaActorFilters } from "./actorScope";
import { fetchHederaTokens } from "./fetcher";
import { parseHederaToken } from "./parser";
import type { EnrichedToken } from "./types";

export function createHederaConnector(protocolId: string): Connector {
  return {
    id: "hedera",
    protocolId,

    async fetch(scope?: ConnectorFetchScope): Promise<RawRecord[]> {
      const platforms =
        scope?.actors?.length && scope.actors.some((a) => a.trim())
          ? parseHederaActorFilters(scope.actors)
          : undefined;
      return fetchHederaTokens({ platforms });
    },

    parse(raw: RawRecord): ParsedActionData {
      return parseHederaToken(raw as EnrichedToken, this.protocolId);
    },
  };
}
