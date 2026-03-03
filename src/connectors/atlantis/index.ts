/**
 * Atlantis connector - Impact Certificates (blockchain + Arweave)
 */

import type { Connector, ParsedActionData, RawRecord } from "../../core/types";
import { CHAINS } from "./config";
import { fetchNFTsFromChain } from "./fetcher";
import { fetchMetadata, parseNFTMetadata } from "./parser";
import type { NFTData } from "./types";

export { CHAINS, CONTRACT_ADDRESS } from "./config";

export function createAtlantisConnector(protocolId: string): Connector {
  return {
    id: "atlantis",
    protocolId,

    async fetch(scope?: { chain?: string }): Promise<RawRecord[]> {
      const chainKeys = scope?.chain
        ? [scope.chain]
        : Object.keys(CHAINS);

      const allNFTs: NFTData[] = [];

      for (const chainKey of chainKeys) {
        if (!CHAINS[chainKey]) {
          console.error(`❌ Unknown chain: ${chainKey}`);
          continue;
        }

        const nfts = await fetchNFTsFromChain(chainKey);

        // Fetch metadata from Arweave for each NFT
        for (const nft of nfts) {
          const metadata = await fetchMetadata(nft.tokenURI);
          if (metadata) {
            nft.metadata = metadata;
            allNFTs.push(nft);
          }
        }
      }

      return allNFTs as RawRecord[];
    },

    parse(raw: RawRecord): ParsedActionData {
      const nft = raw as NFTData;
      if (!nft.metadata) {
        throw new Error(`NFT ${nft.tokenId} has no metadata - fetch metadata first`);
      }
      return parseNFTMetadata(nft, nft.metadata, this.protocolId);
    },
  };
}
