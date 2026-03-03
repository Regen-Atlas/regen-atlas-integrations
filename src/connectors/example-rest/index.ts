/**
 * Example REST connector - template for REST API protocols
 *
 * This is a stub that demonstrates the pattern for future REST-based protocols.
 * Configure EXAMPLE_REST_PROTOCOL_ID and EXAMPLE_REST_API_URL in env.
 */

import type { Connector, ParsedActionData, RawRecord } from "../../core/types";
import { fetchFromApi } from "./fetcher";
import { parseApiResponse } from "./parser";

export function createExampleRestConnector(
  protocolId: string,
  apiUrl: string
): Connector {
  return {
    id: "example-rest",
    protocolId,

    async fetch(scope?: { chain?: string }): Promise<RawRecord[]> {
      // scope can filter by API params if the REST API supports it
      return fetchFromApi(apiUrl, scope);
    },

    parse(raw: RawRecord): ParsedActionData {
      return parseApiResponse(raw, this.protocolId);
    },
  };
}
