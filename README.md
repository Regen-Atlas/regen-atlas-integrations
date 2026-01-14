# RA Admin Scripts

Utility scripts for syncing external data sources to the Regen Atlas database.

## Setup

1. Install dependencies:
   ```bash
   cd scripts
   npm install
   ```

2. Create a `.env` file with your credentials:
   ```
   SUPABASE_URL=https://xrgelebuwxauzggmlfnd.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ATLANTIS_PROTOCOL_ID=uuid-of-atlantis-protocol
   ```

   - Get the service role key from your Supabase project dashboard: Settings → API → Service Role Key
   - Get the Atlantis protocol ID from the `actions_protocols` table in your database

## Available Scripts

### sync-impact-certificates.ts

Syncs Impact Certificate NFTs from blockchain collections to the `actions` tables.

**What it does:**
1. Fetches all NFTs from the Impact Certificate contract across multiple chains (Arbitrum, Base, Celo, Optimism)
2. Downloads JSON metadata from Arweave for each NFT
3. Creates records in:
   - `actions` - The main action record
   - `actions_sdgs_map` - Links to SDG goals
   - `actions_actors` & `actions_actors_map` - Project backers
   - `actions_proofs` - Blockchain proof records linked to the Atlantis protocol

**Usage:**

```bash
# Dry run - preview changes without modifying database
npm run sync-nfts:dry-run

# Full sync - all chains
npm run sync-nfts

# Sync specific chain only
npx tsx sync-impact-certificates.ts --chain arbitrum
npx tsx sync-impact-certificates.ts --chain base
npx tsx sync-impact-certificates.ts --chain celo
npx tsx sync-impact-certificates.ts --chain optimism
```

**Contract Address:** `0x10098ed90523404ee7450152b266dcbbe32ea97c`

**Supported Chains:**
- Arbitrum One
- Base
- Celo
- Optimism

## Project Structure

```
scripts/
├── sync-impact-certificates.ts   # Main entry point
├── lib/
│   ├── index.ts                  # Library exports
│   ├── config.ts                 # Configuration constants
│   ├── types.ts                  # TypeScript interfaces
│   ├── utils.ts                  # Utility functions
│   ├── blockchain.ts             # Blockchain interactions
│   └── database.ts               # Database operations
├── package.json
├── tsconfig.json
└── README.md
```

### Module Overview

- **`config.ts`** - Chain configurations, contract address, SDG mappings
- **`types.ts`** - TypeScript interfaces for NFTs, metadata, actions
- **`utils.ts`** - Helper functions (URL resolution, metadata parsing, date handling)
- **`blockchain.ts`** - Ethereum RPC calls to fetch NFTs from contracts
- **`database.ts`** - Supabase operations for actions, actors, proofs, SDGs

## Development

The scripts use:
- `ethers.js v6` for blockchain interactions
- `@supabase/supabase-js` for database operations
- `tsx` for running TypeScript directly
- `dotenv` for environment variable loading