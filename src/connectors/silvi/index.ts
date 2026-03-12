/**
 * Silvi connector - REST API for regenerative projects
 *
 * Fetches projects via simple GET (no auth).
 * Configure SILVI_PROTOCOL_ID and SILVI_API_URL in env.
 */

import type { Connector, ParsedActionData, RawRecord } from "../../core/types";
import { fetchSilviProjects } from "./fetcher";
import { parseSilviProject } from "./parser";

export function createSilviConnector(
  protocolId: string,
  apiUrl: string
): Connector {
  return {
    id: "silvi",
    protocolId,

    async fetch(scope?: { chain?: string }): Promise<RawRecord[]> {
      return fetchSilviProjects(apiUrl, scope);
    },

    parse(raw: RawRecord): ParsedActionData {
      return parseSilviProject(raw, this.protocolId);
    },
  };
}
