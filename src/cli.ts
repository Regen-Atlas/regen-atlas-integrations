#!/usr/bin/env npx tsx
/**
 * CLI for protocol-agnostic sync
 *
 * Usage: npx tsx src/cli.ts sync atlantis [--chain base] [--dry-run]
 *        npx tsx src/cli.ts sync hedera [--actor DOVU] [--dry-run]
 */

import "dotenv/config";
import { CHAINS } from "./connectors/atlantis/index";
import { listHederaActorLabels } from "./connectors/hedera/actorScope";
import { runSync } from "./core/runner";

function collectActorArgs(args: string[]): string[] {
  const actors: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--actor" && args[i + 1]) {
      const raw = args[i + 1];
      for (const part of raw.split(",")) {
        const t = part.trim();
        if (t) actors.push(t);
      }
      i++;
    }
  }
  return actors;
}

function parseArgs(): {
  command: string;
  connectorId: string;
  chain?: string;
  actors: string[];
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const chainIndex = args.indexOf("--chain");
  const chain = chainIndex !== -1 && args[chainIndex + 1] ? args[chainIndex + 1] : undefined;

  const command = args[0] || "sync";
  const connectorId = args[1] || "atlantis";
  const actors = collectActorArgs(args);

  return { command, connectorId, chain, actors, dryRun };
}

async function main(): Promise<void> {
  const { command, connectorId, chain, actors, dryRun } = parseArgs();

  if (command !== "sync") {
    console.error("Usage: npx tsx src/cli.ts sync <connector> [options]");
    console.error("  connector: atlantis, ecocertain, example-rest, hedera, silvi, ...");
    console.error("  chain: arbitrum, base, celo, optimism (atlantis only)");
    console.error(
      `  --actor <name>   hedera only; repeat or comma-separate. ${listHederaActorLabels()}`
    );
    console.error("  --dry-run");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       Protocol-Agnostic Sync CLI                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (dryRun) {
    console.log("\n🔶 DRY RUN MODE - No database changes will be made\n");
  }

  const scope =
    chain || actors.length > 0
      ? {
          ...(chain ? { chain } : {}),
          ...(actors.length > 0 ? { actors } : {}),
        }
      : undefined;

  if (chain && connectorId === "atlantis") {
    if (!CHAINS[chain]) {
      console.error(`❌ Unknown chain: ${chain}. Valid: ${Object.keys(CHAINS).join(", ")}`);
      process.exit(1);
    }
    console.log(`🌐 Chain: ${chain}`);
  }

  if (actors.length > 0 && connectorId !== "hedera") {
    console.error(`❌ --actor is only supported for connector "hedera" (got "${connectorId}")`);
    process.exit(1);
  }

  if (connectorId === "hedera" && actors.length > 0) {
    console.log(`🎭 Hedera actors: ${actors.join(", ")}`);
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
