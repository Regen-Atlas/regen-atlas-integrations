/**
 * Ecocertain connector configuration
 *
 * Hypercerts GraphQL API and Ecocertain hyperboard (curated ecocert list).
 */

export const DEFAULT_GRAPHQL_URL = "https://api.hypercerts.org/v2/graphql";

/** Production hyperboard ID (GainForest Ecocertain curated list) */
export const PROD_HYPERBOARD_ID = "3b781a5b-0783-4632-8f8f-8fdf67ed4454";
/** Development hyperboard ID */
export const DEV_HYPERBOARD_ID = "3e42687a-ceeb-48f7-b8ab-99533ff0a81c";

export const ECOCERTAIN_DETAIL_URL = "https://ecocertain.vercel.app/hypercert";
export const HYPERCERTS_EXPLORER_URL = "https://app.hypercerts.org/hypercerts";

/** Chain ID (from hypercert) to Regen Atlas platform_id */
export const CHAIN_ID_TO_PLATFORM: Record<string, string> = {
  "42220": "celo",
  "11155111": "sepolia",
};

export function getGraphqlUrl(): string {
  return process.env.ECOCERTAIN_GRAPHQL_URL ?? DEFAULT_GRAPHQL_URL;
}

export function getHyperboardId(): string {
  return (
    process.env.ECOCERTAIN_HYPERBOARD_ID ?? PROD_HYPERBOARD_ID
  );
}

export function resolvePlatformId(chainId: string | undefined): string {
  if (!chainId) return "ethereum";
  const normalized = String(chainId).toLowerCase().trim();
  return CHAIN_ID_TO_PLATFORM[normalized] ?? "ethereum";
}
