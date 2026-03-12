/**
 * Core types for the protocol-agnostic sync framework
 */

/** Parsed action data ready for database insertion */
export interface ParsedActionData {
  title: string;
  description: string | null;
  main_image: string | null;
  /** PostGIS WKT point: POINT(lng lat), or null */
  geography: string | null;
  action_start_date: string | null;
  action_end_date: string | null;
  sdg_ids: number[];
  actor_name: string | null;
  protocol_id: string;
  proof_link: string | null;
  proof_metadata_link: string;
  proof_image_link: string | null;
  platform_id: string;
  explorer_link: string;
}

/** Raw record from a protocol - type is protocol-specific (e.g. NFTData for Atlantis) */
export type RawRecord = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Connector interface - each protocol implements this */
export interface Connector {
  id: string;
  protocolId: string;
  fetch(scope?: { chain?: string }): Promise<RawRecord[]>;
  parse(raw: RawRecord): ParsedActionData;
}

/** Sync result statistics */
export interface SyncStats {
  successCount: number;
  skipCount: number;
  errorCount: number;
}
