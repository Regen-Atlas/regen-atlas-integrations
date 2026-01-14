/**
 * Library exports for Impact Certificate sync
 */

// Configuration
export {
  CONTRACT_ADDRESS,
  CHAINS,
  CONTRACT_ABI,
  SDG_NAME_TO_ID,
  type ChainConfig,
} from "./config.js";

// Types
export type {
  NFTAttribute,
  NFTMetadata,
  NFTData,
  ParsedActionData,
  CLIArgs,
  SyncStats,
} from "./types.js";

// Utilities
export {
  parseArgs,
  parseDate,
  getAttributeValue,
  resolveArweaveUrl,
  fetchMetadata,
  parseNFTMetadata,
  extractSdgIds,
  mapSdgNamesToIds,
  sanitizeTitle,
} from "./utils.js";

// Blockchain
export {
  fetchNFTsFromChain,
  fetchNFTsFromAllChains,
} from "./blockchain.js";

// Database
export {
  getOrCreateActor,
  checkExistingProof,
  insertAction,
} from "./database.js";
