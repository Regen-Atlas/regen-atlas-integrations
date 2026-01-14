/**
 * Sync Impact Certificates NFTs to the database
 *
 * This script fetches NFTs from Impact Certificate collections across multiple chains,
 * downloads their metadata from Arweave, and inserts the data into the actions tables.
 *
 * Usage:
 *   npm run sync-nfts                    # Run full sync
 *   npm run sync-nfts:dry-run            # Preview without database changes
 *   npx tsx sync-impact-certificates.ts --chain arbitrum  # Single chain
 *
 * Environment variables (create .env file):
 *   SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 *   ATLANTIS_PROTOCOL_ID=uuid-of-atlantis-protocol
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

import {
  CONTRACT_ADDRESS,
  CHAINS,
  parseArgs,
  fetchMetadata,
  parseNFTMetadata,
  fetchNFTsFromAllChains,
  insertAction,
  type NFTData,
  type SyncStats,
} from "./lib/index.js";

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       Impact Certificate NFT Sync Script                      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const { dryRun, chains } = parseArgs();

  if (dryRun) {
    console.log("\n🔶 DRY RUN MODE - No database changes will be made\n");
  }

  // Validate environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const atlantisProtocolId = process.env.ATLANTIS_PROTOCOL_ID;

  if (!supabaseUrl || !supabaseKey || !atlantisProtocolId) {
    console.error("❌ Missing environment variables!");
    console.error("   Please create a .env file with:");
    console.error("   SUPABASE_URL=https://your-project.supabase.co");
    console.error("   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
    console.error("   ATLANTIS_PROTOCOL_ID=uuid-of-atlantis-protocol");
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log(`📡 Connected to Supabase: ${supabaseUrl}`);
  console.log(`🔗 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🏛️  Protocol ID: ${atlantisProtocolId}`);
  console.log(`🌐 Chains to sync: ${chains.join(", ")}`);

  // Fetch all NFTs from all chains
  const allNFTs: NFTData[] = await fetchNFTsFromAllChains(chains);

  console.log(`\n📦 Total NFTs found: ${allNFTs.length}`);

  if (allNFTs.length === 0) {
    console.log("No NFTs to sync.");
    return;
  }

  // Fetch metadata and insert into database
  console.log("\n🔄 Fetching metadata and syncing to database...");

  const stats: SyncStats = {
    successCount: 0,
    skipCount: 0,
    errorCount: 0,
  };

  for (const nft of allNFTs) {
    console.log(`\n─────────────────────────────────────────────`);
    console.log(`Token #${nft.tokenId} on ${CHAINS[nft.chain].name}`);

    // Fetch metadata
    const metadata = await fetchMetadata(nft.tokenURI);
    if (!metadata) {
      stats.errorCount++;
      continue;
    }

    nft.metadata = metadata;

    // Parse and insert
    try {
      const actionData = parseNFTMetadata(nft, metadata, atlantisProtocolId);
      const inserted = await insertAction(supabase, actionData, dryRun);
      if (inserted) {
        stats.successCount++;
      } else {
        stats.skipCount++;
      }
    } catch (error) {
      console.error(`  ✗ Error processing NFT:`, error);
      stats.errorCount++;
    }
  }

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                       Sync Complete                          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  ✅ Synced: ${stats.successCount}`);
  console.log(`  ⏭️  Skipped: ${stats.skipCount}`);
  console.log(`  ❌ Errors: ${stats.errorCount}`);

  if (dryRun) {
    console.log("\n🔶 This was a dry run. Run without --dry-run to apply changes.");
  }
}

main().catch(console.error);
