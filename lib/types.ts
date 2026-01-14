/**
 * TypeScript interfaces for the Impact Certificate sync script
 */

/** NFT attribute from metadata */
export interface NFTAttribute {
  trait_type: string;
  value: string | number | string[] | Record<string, unknown>[];
}

/** NFT metadata structure from Arweave/IPFS */
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

/** NFT data fetched from blockchain */
export interface NFTData {
  tokenId: string;
  owner: string;
  tokenURI: string;
  chain: string;
  explorer: string;
  platformId: string;
  metadata?: NFTMetadata;
}

/** Parsed action data ready for database insertion */
export interface ParsedActionData {
  title: string;
  description: string | null;
  main_image: string | null;
  action_start_date: string | null;
  action_end_date: string | null;
  sdg_ids: number[];
  actor_name: string | null;
  protocol_id: string;
  proof_link: string | null;
  proof_metadata_link: string;
  proof_image_link: string | null;
  platform_id: string;
  explorer_link: string;
  token_id: string;
}

/** Command line arguments */
export interface CLIArgs {
  dryRun: boolean;
  chains: string[];
}

/** Sync result statistics */
export interface SyncStats {
  successCount: number;
  skipCount: number;
  errorCount: number;
}
