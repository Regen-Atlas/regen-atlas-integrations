#!/usr/bin/env npx tsx
/**
 * CLI for protocol-agnostic sync
 *
 * Usage: npx tsx src/cli.ts sync atlantis [--chain base] [--dry-run]
 */

import "dotenv/config";
import { CHAINS } from "./connectors/atlantis/index";
import { runSync } from "./core/runner";

function parseArgs(): {
  command: string;
  connectorId: string;
  chain?: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const chainIndex = args.indexOf("--chain");
  const chain = chainIndex !== -1 && args[chainIndex + 1] ? args[chainIndex + 1] : undefined;

  const command = args[0] || "sync";
  const connectorId = args[1] || "atlantis";

  return { command, connectorId, chain, dryRun };
}

async function main(): Promise<void> {
  const { command, connectorId, chain, dryRun } = parseArgs();

  if (command !== "sync") {
    console.error("Usage: npx tsx src/cli.ts sync <connector> [--chain <chain>] [--dry-run]");
    console.error("  connector: atlantis, ecocertain, example-rest, silvi, ...");
    console.error("  chain: arbitrum, base, celo, optimism (atlantis only)");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       Protocol-Agnostic Sync CLI                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (dryRun) {
    console.log("\n🔶 DRY RUN MODE - No database changes will be made\n");
  }

  const scope = chain ? { chain } : undefined;
  if (chain && connectorId === "atlantis") {
    if (!CHAINS[chain]) {
      console.error(`❌ Unknown chain: ${chain}. Valid: ${Object.keys(CHAINS).join(", ")}`);
      process.exit(1);
    }
    console.log(`🌐 Chain: ${chain}`);
  }

  try {
    const stats = await runSync({
      connectorId,
      scope,
      dryRun,
    });

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║                       Sync Complete                          ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log(`  ✅ Synced: ${stats.successCount}`);
    console.log(`  ⏭️  Skipped: ${stats.skipCount}`);
    console.log(`  ❌ Errors: ${stats.errorCount}`);

    if (dryRun) {
      console.log("\n🔶 This was a dry run. Run without --dry-run to apply changes.");
    }
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

main();
