/**
 * Configuration constants for the Impact Certificate sync script
 */

/** The NFT contract address - same across all chains */
export const CONTRACT_ADDRESS = "0x1c645BB4b2e1c53242EC7b8721c67dFde8C55a94";

/** Chain configuration type */
export interface ChainConfig {
  name: string;
  rpc: string;
  explorer: string;
  platformId: string;
}

/** Supported chains with their RPC endpoints */
export const CHAINS: Record<string, ChainConfig> = {
  arbitrum: {
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    platformId: "arbitrum-one", // Must match platforms.id in database
  },
  base: {
    name: "Base",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    platformId: "base",
  },
  celo: {
    name: "Celo",
    rpc: "https://forno.celo.org",
    explorer: "https://celoscan.io",
    platformId: "celo",
  },
  optimism: {
    name: "Optimism",
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    platformId: "optimism",
  },
};

/** Minimal ABI for ERC721Enumerable + ERC721URIStorage */
export const CONTRACT_ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
];

/** SDG name to ID mapping - based on standard UN SDG numbering */
export const SDG_NAME_TO_ID: Record<string, number> = {
  "no poverty": 1,
  "zero hunger": 2,
  "good health and well-being": 3,
  "good health & well-being": 3,
  "quality education": 4,
  "gender equality": 5,
  "clean water and sanitation": 6,
  "clean water & sanitation": 6,
  "affordable and clean energy": 7,
  "affordable & clean energy": 7,
  "decent work and economic growth": 8,
  "decent work & economic growth": 8,
  "industry, innovation and infrastructure": 9,
  "industry, innovation & infrastructure": 9,
  "reduced inequalities": 10,
  "sustainable cities and communities": 11,
  "sustainable cities & communities": 11,
  "responsible consumption and production": 12,
  "responsible consumption & production": 12,
  "climate action": 13,
  "life below water": 14,
  "life on land": 15,
  "peace, justice and strong institutions": 16,
  "peace, justice & strong institutions": 16,
  "partnerships for the goals": 17,
};
