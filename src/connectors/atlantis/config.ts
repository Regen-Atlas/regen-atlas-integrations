/**
 * Atlantis (Impact Certificates) connector configuration
 */

export const CONTRACT_ADDRESS = "0x1c645BB4b2e1c53242EC7b8721c67dFde8C55a94";

/**
 * Maps source platform IDs (from chain configs, APIs) to database platform IDs.
 * Use when the external ID differs from platforms.id in the database.
 */
export const PLATFORM_ID_MAP: Record<string, string> = {
  optimism: "optimistic-ethereum",
  "optimism-mainnet": "optimistic-ethereum",
  arbitrum: "arbitrum-one",
  hedera: "hedera-hashgraph",
};

/** Resolve platform ID to a valid database platforms.id. */
export function resolvePlatformId(sourceId: string): string {
  const normalized = sourceId.toLowerCase().trim();
  return PLATFORM_ID_MAP[normalized] ?? sourceId;
}

export interface ChainConfig {
  name: string;
  rpc: string;
  explorer: string;
  platformId: string;
}

/** Default public RPCs - use env overrides for production (e.g. Alchemy/Infura) */
const DEFAULT_RPC: Record<string, string> = {
  arbitrum: "https://arb1.arbitrum.io/rpc",
  base: "https://base.drpc.org",
  celo: "https://forno.celo.org",
  optimism: "https://mainnet.optimism.io",
};

/** Resolve RPC URL: env override (RPC_BASE_URL, etc.) or default */
function getRpcUrl(chainKey: string): string {
  const envKey = `RPC_${chainKey.toUpperCase()}_URL`;
  const override = process.env[envKey];
  if (override) return override;
  return DEFAULT_RPC[chainKey] ?? "";
}

export const CHAINS: Record<string, ChainConfig> = {
  arbitrum: {
    name: "Arbitrum One",
    get rpc() {
      return getRpcUrl("arbitrum");
    },
    explorer: "https://arbiscan.io",
    platformId: "arbitrum-one",
  },
  base: {
    name: "Base",
    get rpc() {
      return getRpcUrl("base");
    },
    explorer: "https://basescan.org",
    platformId: "base",
  },
  celo: {
    name: "Celo",
    get rpc() {
      return getRpcUrl("celo");
    },
    explorer: "https://celoscan.io",
    platformId: "celo",
  },
  optimism: {
    name: "Optimism",
    get rpc() {
      return getRpcUrl("optimism");
    },
    explorer: "https://optimistic.etherscan.io",
    platformId: "optimism",
  },
};

export const CONTRACT_ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
];
