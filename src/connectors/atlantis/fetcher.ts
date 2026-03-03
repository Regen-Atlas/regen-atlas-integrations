/**
 * Atlantis connector - blockchain NFT fetcher
 */

import { ethers } from "ethers";
import { CHAINS, CONTRACT_ADDRESS, CONTRACT_ABI } from "./config";
import type { NFTData } from "./types";

/** Delay between RPC calls to avoid rate limits (ms). Env: RPC_THROTTLE_MS */
const THROTTLE_MS = Number(process.env.RPC_THROTTLE_MS) || 150;

/** Max retries on rate limit. Env: RPC_MAX_RETRIES */
const MAX_RETRIES = Number(process.env.RPC_MAX_RETRIES) || 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  const e = err as { info?: { error?: { code?: number; message?: string } }; shortMessage?: string };
  const code = e?.info?.error?.code;
  const msg = (e?.info?.error?.message ?? e?.shortMessage ?? "").toLowerCase();
  return code === -32016 || msg.includes("rate limit") || msg.includes("over rate limit");
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES - 1 && isRateLimitError(err)) {
        const backoff = Math.min(1000 * 2 ** attempt, 10000);
        console.log(`  ⏳ Rate limited, retrying in ${backoff}ms (attempt ${attempt + 2}/${MAX_RETRIES})`);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

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

  const code = await withRetry(() => provider.getCode(CONTRACT_ADDRESS));
  if (code === "0x") {
    console.log(`  ℹ️  No contract deployed on ${chain.name}`);
    return [];
  }

  try {
    const [name, symbol] = await withRetry(() =>
      Promise.all([contract.name(), contract.symbol()])
    );
    console.log(`  📜 Contract: ${name} (${symbol})`);
  } catch {
    console.log(`  ⚠️  Could not fetch contract name/symbol`);
  }

  let totalSupply: bigint;
  try {
    totalSupply = await withRetry(() => contract.totalSupply());
  } catch {
    console.log(`  ⚠️  Could not fetch total supply - contract may not support enumeration`);
    return [];
  }

  console.log(`  📊 Total Supply: ${totalSupply.toString()} NFTs`);

  if (totalSupply === 0n) {
    return [];
  }

  const nfts: NFTData[] = [];

  for (let i = 0; i < totalSupply; i++) {
    if (i > 0) await sleep(THROTTLE_MS);
    try {
      const tokenId = await withRetry(() => contract.tokenByIndex(i));
      const [owner, tokenURI] = await withRetry(() =>
        Promise.all([
          contract.ownerOf(tokenId),
          contract.tokenURI(tokenId),
        ])
      );

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
