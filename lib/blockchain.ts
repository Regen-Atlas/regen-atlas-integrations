/**
 * Blockchain interaction functions for fetching NFTs
 */

import { ethers } from "ethers";
import { CHAINS, CONTRACT_ADDRESS, CONTRACT_ABI } from "./config.js";
import type { NFTData } from "./types.js";

/**
 * Fetch all NFTs from a specific chain
 */
export async function fetchNFTsFromChain(chainKey: string): Promise<NFTData[]> {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`Unknown chain: ${chainKey}`);
    return [];
  }

  console.log(`\n🔍 Fetching NFTs from ${chain.name}...`);

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  // Check if contract exists
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (code === "0x") {
    console.log(`  ℹ️  No contract deployed on ${chain.name}`);
    return [];
  }

  // Get contract info
  try {
    const [name, symbol] = await Promise.all([
      contract.name(),
      contract.symbol(),
    ]);
    console.log(`  📜 Contract: ${name} (${symbol})`);
  } catch {
    console.log(`  ⚠️  Could not fetch contract name/symbol`);
  }

  // Get total supply
  let totalSupply: bigint;
  try {
    totalSupply = await contract.totalSupply();
  } catch {
    console.log(`  ⚠️  Could not fetch total supply - contract may not support enumeration`);
    return [];
  }

  console.log(`  📊 Total Supply: ${totalSupply.toString()} NFTs`);

  if (totalSupply === 0n) {
    return [];
  }

  const nfts: NFTData[] = [];

  // Fetch all NFTs
  for (let i = 0; i < totalSupply; i++) {
    try {
      const tokenId = await contract.tokenByIndex(i);
      const [owner, tokenURI] = await Promise.all([
        contract.ownerOf(tokenId),
        contract.tokenURI(tokenId),
      ]);

      nfts.push({
        tokenId: tokenId.toString(),
        owner,
        tokenURI,
        chain: chainKey,
        explorer: `${chain.explorer}/token/${CONTRACT_ADDRESS}?a=${tokenId}`,
        platformId: chain.platformId,
      });

      console.log(`  ✓ Token #${tokenId} fetched`);
    } catch (error) {
      console.error(`  ✗ Error fetching token at index ${i}:`, error);
    }
  }

  console.log(`  ✅ Fetched ${nfts.length} NFTs from ${chain.name}`);
  return nfts;
}

/**
 * Fetch NFTs from multiple chains
 */
export async function fetchNFTsFromAllChains(chainKeys: string[]): Promise<NFTData[]> {
  const allNFTs: NFTData[] = [];

  for (const chainKey of chainKeys) {
    if (!CHAINS[chainKey]) {
      console.error(`❌ Unknown chain: ${chainKey}`);
      continue;
    }

    const nfts = await fetchNFTsFromChain(chainKey);
    allNFTs.push(...nfts);
  }

  return allNFTs;
}
