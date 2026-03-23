/**
 * Connector registry - maps protocol id to connector instance
 */

import type { Connector } from "../core/types";
import { createAtlantisConnector } from "./atlantis/index";
import { createEcocertainConnector } from "./ecocertain/index";
import { createExampleRestConnector } from "./example-rest/index";
import { createHederaConnector } from "./hedera/index";
import { createSilviConnector } from "./silvi/index";

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

    case "silvi": {
      const protocolId = process.env.SILVI_PROTOCOL_ID;
      const apiUrl = process.env.SILVI_API_URL;
      if (!protocolId || !apiUrl) {
        console.error("Missing SILVI_PROTOCOL_ID or SILVI_API_URL");
        return null;
      }
      return createSilviConnector(protocolId, apiUrl);
    }

    case "ecocertain": {
      const protocolId = process.env.ECOCERTAIN_PROTOCOL_ID;
      if (!protocolId) {
        console.error("Missing ECOCERTAIN_PROTOCOL_ID environment variable");
        return null;
      }
      return createEcocertainConnector(protocolId);
    }

    case "hedera": {
      const protocolId = process.env.HEDERA_PROTOCOL_ID;
      if (!protocolId) {
        console.error("Missing HEDERA_PROTOCOL_ID environment variable");
        return null;
      }
      return createHederaConnector(protocolId);
    }

    default:
      console.error(`Unknown connector: ${id}`);
      return null;
  }
}
