/**
 * Hedera Mirror Node fetcher
 *
 * Enumerates tokens from known treasury accounts, fetches token details,
 * resolves IPFS metadata for Capturiant and Tolam NFTs, optional HCS→VC geography.
 */

import { getTreasuryPlatformMap, isHederaDynamicGeoEnabled, HEDERA_MIRROR_THROTTLE_MS } from "./config";
import { resolveIPFS } from "./ipfs";
import { fetchGeoFromTopic, extractTopicIdForDynamicGeo } from "./vcGeo";
import type {
  MirrorNodeToken,
  AccountTokensResponse,
  NFTResponse,
  EnrichedToken,
  Platform,
  OrbexMemo,
} from "./types";
import { DOVU_FILTER_NAMES, DOVU_FILTER_SYMBOLS } from "./types";

const MIRROR_NODE = "https://mainnet-public.mirrornode.hedera.com/api/v1";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Mirror Node ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchAccountTokens(accountId: string): Promise<string[]> {
  const tokenIds: string[] = [];
  let url: string | null = `${MIRROR_NODE}/accounts/${accountId}/tokens?limit=100`;

  while (url) {
    const data: AccountTokensResponse = await fetchJSON<AccountTokensResponse>(url);
    for (const t of data.tokens) {
      tokenIds.push(t.token_id);
    }
    const nextPath = data.links?.next ?? null;
    if (nextPath) {
      url = nextPath.startsWith("http")
        ? nextPath
        : nextPath.startsWith("/api/")
          ? `https://mainnet-public.mirrornode.hedera.com${nextPath}`
          : `${MIRROR_NODE}${nextPath}`;
    } else {
      url = null;
    }
    if (url) await sleep(HEDERA_MIRROR_THROTTLE_MS);
  }

  return tokenIds;
}

async function fetchTokenDetail(tokenId: string): Promise<MirrorNodeToken> {
  return fetchJSON<MirrorNodeToken>(`${MIRROR_NODE}/tokens/${tokenId}`);
}

async function fetchFirstNFTMetadata(
  tokenId: string
): Promise<Record<string, unknown> | undefined> {
  try {
    const data = await fetchJSON<NFTResponse>(`${MIRROR_NODE}/tokens/${tokenId}/nfts?limit=1`);
    if (data.nfts.length === 0) return undefined;

    const raw = data.nfts[0].metadata;
    if (!raw) return undefined;

    const decoded = Buffer.from(raw, "base64").toString("utf-8");

    if (decoded.startsWith("{")) {
      return JSON.parse(decoded) as Record<string, unknown>;
    }

    if (decoded.startsWith("Qm") || decoded.startsWith("bafy") || decoded.startsWith("bafk")) {
      return resolveIPFS(decoded);
    }

    return { rawMetadata: decoded } as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function shouldFilter(token: MirrorNodeToken, platform: Platform): boolean {
  const name = token.name.trim();
  const symbol = token.symbol.trim();
  const supply = BigInt(token.total_supply);

  if (supply === 0n) return true;

  if (platform === "DOVU") {
    if (DOVU_FILTER_NAMES.has(name)) return true;
    if (DOVU_FILTER_SYMBOLS.has(symbol)) return true;
    if (name.includes("elonDOV")) return true;
    if (name.includes("TEMPLATE")) return true;
    const lower = name.toLowerCase();
    if (/^test/i.test(name)) return true;
    if (/^e2e/i.test(name)) return true;
    if (name.length <= 5 && !/farm|elv|gcr/i.test(name)) return true;
    if (lower.includes("send token")) return true;
    if (lower.includes("bequest")) return true;
    if (lower === "sft - guardian") return true;
    if (lower.includes("green bond")) return true;
    if (lower.includes("[otc]")) return true;
    if (lower.includes("elv asset certificate")) return true;
    if (lower === "hello there") return true;
    if (lower === "final test") return true;
    if (/^[a-z]{3,8}$/i.test(name) && !lower.includes("farm")) return true;
    if (lower.startsWith("testdov")) return true;
    if (lower === "redhill" || lower === "summerley" || lower === "briyastovo") return true;
    if (lower === "big grey farm") return true;
  }

  if (platform === "Tolam Earth") {
    if (name.toUpperCase().startsWith("TOLAM SMOKE TEST")) return true;
    if (name === "EcoRegistry Asset" && supply === 0n) return true;
  }

  if (platform === "OrbexCO2") {
    if (/^test/i.test(name)) return true;
  }

  if (platform === "OrbexCO2") {
    try {
      const memo: OrbexMemo = JSON.parse(token.memo) as OrbexMemo;
      if (!memo.tokenLink) return true;
    } catch {
      return true;
    }
  }

  if (platform === "TYMLEZ") {
    if (!symbol.includes("CET")) return true;
  }

  return false;
}

export interface HederaFetchOptions {
  /** If set, only treasuries for these issuers are scanned */
  platforms?: Platform[];
}

export async function fetchHederaTokens(options?: HederaFetchOptions): Promise<EnrichedToken[]> {
  const enriched: EnrichedToken[] = [];
  const seenTokenIds = new Set<string>();
  const TREASURY_PLATFORM_MAP = getTreasuryPlatformMap();
  const allowed = options?.platforms?.length ? new Set(options.platforms) : null;
  const treasuryEntries = Object.entries(TREASURY_PLATFORM_MAP).filter(([, platform]) =>
    !allowed || allowed.has(platform)
  );

  for (const [treasuryId, platform] of treasuryEntries) {
    console.log(`  📋 Fetching tokens from ${platform} treasury ${treasuryId}...`);

    let tokenIds: string[];
    try {
      tokenIds = await fetchAccountTokens(treasuryId);
    } catch (err) {
      console.error(`    ✗ Failed to fetch tokens for ${treasuryId}:`, err);
      continue;
    }

    console.log(`    Found ${tokenIds.length} tokens`);

    for (const tokenId of tokenIds) {
      if (seenTokenIds.has(tokenId)) continue;
      seenTokenIds.add(tokenId);

      await sleep(HEDERA_MIRROR_THROTTLE_MS);

      let token: MirrorNodeToken;
      try {
        token = await fetchTokenDetail(tokenId);
      } catch (err) {
        console.error(`    ✗ Failed to fetch token ${tokenId}:`, err);
        continue;
      }

      if (shouldFilter(token, platform)) {
        continue;
      }

      let ipfsMetadata: Record<string, unknown> | undefined;
      if (
        platform === "Capturiant" &&
        token.memo &&
        (token.memo.startsWith("bafk") || token.memo.startsWith("bafy") || token.memo.startsWith("Qm"))
      ) {
        await sleep(HEDERA_MIRROR_THROTTLE_MS);
        ipfsMetadata = await resolveIPFS(token.memo);
      }

      let nftMetadata: Record<string, unknown> | undefined;
      if (
        (platform === "Tolam Earth" || platform === "GCR") &&
        token.type === "NON_FUNGIBLE_UNIQUE"
      ) {
        await sleep(HEDERA_MIRROR_THROTTLE_MS);
        nftMetadata = await fetchFirstNFTMetadata(tokenId);
      }

      let linkedMemo: string | undefined;
      if (platform === "OrbexCO2") {
        try {
          const memo: OrbexMemo = JSON.parse(token.memo) as OrbexMemo;
          if (memo.tokenLink) {
            await sleep(HEDERA_MIRROR_THROTTLE_MS);
            const linkedToken = await fetchTokenDetail(memo.tokenLink);
            linkedMemo = linkedToken.memo;
          }
        } catch {
          // skip
        }
      }

      let dynamicGeo: { wkt: string } | undefined;
      if (isHederaDynamicGeoEnabled()) {
        const topicId = extractTopicIdForDynamicGeo(token, platform);
        if (topicId && (platform === "DOVU" || platform === "GCR")) {
          await sleep(HEDERA_MIRROR_THROTTLE_MS);
          const g = await fetchGeoFromTopic(topicId);
          if (g) dynamicGeo = g;
        }
      }

      enriched.push({
        token,
        platform,
        ipfsMetadata,
        nftMetadata,
        linkedMemo,
        dynamicGeo,
      });
    }
  }

  console.log(`\n  📊 Total enriched tokens: ${enriched.length}`);
  return enriched;
}
