/**
 * Connector registry - maps protocol id to connector instance
 */

import type { Connector } from "../core/types";
import { createAtlantisConnector } from "./atlantis/index";
import { createExampleRestConnector } from "./example-rest/index";

export function getConnector(id: string): Connector | null {
  switch (id) {
    case "atlantis": {
      const protocolId = process.env.ATLANTIS_PROTOCOL_ID;
      if (!protocolId) {
        console.error("Missing ATLANTIS_PROTOCOL_ID environment variable");
        return null;
      }
      return createAtlantisConnector(protocolId);
    }

    case "example-rest": {
      const protocolId = process.env.EXAMPLE_REST_PROTOCOL_ID;
      const apiUrl = process.env.EXAMPLE_REST_API_URL;
      if (!protocolId || !apiUrl) {
        console.error("Missing EXAMPLE_REST_PROTOCOL_ID or EXAMPLE_REST_API_URL");
        return null;
      }
      return createExampleRestConnector(protocolId, apiUrl);
    }

    default:
      console.error(`Unknown connector: ${id}`);
      return null;
  }
}
