/**
 * Atlantis-specific types (NFT metadata from Arweave/IPFS)
 */

export interface NFTAttribute {
  trait_type: string;
  value: string | number | string[] | Record<string, unknown>[];
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: NFTAttribute[];
  properties?: {
    files?: { uri: string; type: string }[];
    category?: string;
  };
}

export interface NFTData {
  tokenId: string;
  owner: string;
  tokenURI: string;
  chain: string;
  explorer: string;
  platformId: string;
  metadata?: NFTMetadata;
}
