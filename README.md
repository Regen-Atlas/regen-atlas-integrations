# Regen Atlas Integrations

Protocol-agnostic integration framework for syncing external data sources to the Regen Atlas database. Supports pluggable connectors (blockchain, REST API, etc.) and deploys sync jobs via Vercel Cron.

## Setup

1. Install dependencies:
   ```bash
   cd regen-atlas-integrations
   npm install
   ```

2. Create a `.env` file (see `.env.example`):
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ATLANTIS_PROTOCOL_ID=uuid-of-atlantis-protocol
   ```

3. **Production (recommended)**: Set RPC overrides to avoid rate limits. Base's public RPC is strict.
   Add to `.env`:
   ```
   RPC_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   RPC_ARBITRUM_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   RPC_CELO_URL=https://celo-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   RPC_OPTIMISM_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   ```
   Free tiers (Alchemy, Infura) support 20–80 NFTs × 4 chains easily.

## CLI Usage

```bash
# Sync Atlantis (Impact Certificates) - all chains
npx tsx src/cli.ts sync atlantis

# Sync single chain
npx tsx src/cli.ts sync atlantis --chain base

# Dry run (preview without DB changes)
npx tsx src/cli.ts sync atlantis --chain arbitrum --dry-run

# Shorthand scripts
npm run sync:atlantis
npm run sync:atlantis:dry-run
```

## Project Structure

```
regen-atlas-integrations/
├── src/
│   ├── core/
│   │   ├── types.ts       # Connector interface, ParsedActionData
│   │   ├── database.ts   # Supabase operations
│   │   ├── runner.ts     # Orchestrates sync
│   │   └── sdgs.ts       # SDG name→ID mapping
│   ├── connectors/
│   │   ├── atlantis/     # Impact Certificates (blockchain + Arweave)
│   │   ├── example-rest/ # Template for REST API protocols
│   │   └── registry.ts   # Maps connector id → Connector
│   └── cli.ts            # CLI entry point
├── app/
│   └── api/cron/sync/    # Vercel Cron endpoint
├── vercel.json           # Cron schedule (one job per chain)
└── package.json
```

## Adding a New Protocol

1. Create `src/connectors/<protocol-id>/` with `index.ts`, `fetcher.ts`, `parser.ts`
2. Implement the `Connector` interface and register in `registry.ts`
3. Add env vars (e.g. `MY_PROTOCOL_PROTOCOL_ID`)
4. Add cron entries to `vercel.json` if needed
5. Run: `npx tsx src/cli.ts sync <protocol-id> [--chain X]`

## Deployment (Vercel)

1. Deploy to Vercel
2. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ATLANTIS_PROTOCOL_ID`
3. **Required for production**: Set `RPC_BASE_URL`, `RPC_ARBITRUM_URL`, etc. (Alchemy/Infura) – public RPCs rate limit
4. Optional: `CRON_SECRET` for Authorization header validation

Cron jobs run daily (6:00 UTC) - one per chain to avoid timeouts:
- arbitrum, base at 6:00
- celo at 6:05
- optimism at 6:10

