/**
 * Database operations for syncing actions to Supabase
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { resolvePlatformId } from "../connectors/atlantis/config";
import type { ParsedActionData } from "./types";
import { sanitizeActorName } from "./utils";

/**
 * Get or create an actor by name.
 * Sanitizes name to fit DB constraint: 2-50 chars.
 */
export async function getOrCreateActor(
  supabase: SupabaseClient,
  actorName: string,
  dryRun: boolean
): Promise<string | null> {
  const sanitized = sanitizeActorName(actorName);
  if (!sanitized) {
    if (actorName.trim().length > 0) {
      console.warn(`  ⚠️  Actor name too long, truncated/skipped: "${actorName.slice(0, 30)}..."`);
    }
    return null;
  }

  const { data: existing } = await supabase
    .from("actions_actors")
    .select("id")
    .eq("name", sanitized)
    .single();

  if (existing) {
    return existing.id;
  }

  if (dryRun) {
    return "dry-run-actor-id";
  }

  const { data: newActor, error } = await supabase
    .from("actions_actors")
    .insert({ name: sanitized })
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Failed to create actor "${sanitized}":`, error);
    return null;
  }

  return newActor.id;
}

/**
 * Check if a proof already exists by metadata link
 */
export async function checkExistingProof(
  supabase: SupabaseClient,
  proofMetadataLink: string
): Promise<boolean> {
  const { data } = await supabase
    .from("actions_proofs")
    .select("id")
    .eq("proof_metadata_link", proofMetadataLink)
    .single();

  return !!data;
}

/**
 * Insert a complete action with all related records
 */
export async function insertAction(
  supabase: SupabaseClient,
  actionData: ParsedActionData,
  dryRun: boolean
): Promise<boolean> {
  const exists = await checkExistingProof(supabase, actionData.proof_metadata_link);
  if (exists) {
    console.log(`  ⏭️  Skipping "${actionData.title}" - proof already exists`);
    return false;
  }

  if (dryRun) {
    console.log(
      `  [DRY RUN] Would insert: "${actionData.title}" | ${actionData.sdg_ids.length} SDGs | actor: ${actionData.actor_name || "—"} | platform: ${actionData.platform_id}`
    );
    return true;
  }

  const { data: action, error: actionError } = await supabase
    .from("actions")
    .insert({
      title: actionData.title,
      description: actionData.description,
      main_image: actionData.main_image,
      action_start_date: actionData.action_start_date,
      action_end_date: actionData.action_end_date,
      status: "DRAFT",
    })
    .select("id")
    .single();

  if (actionError) {
    console.error(`    ✗ Failed to insert action:`, actionError);
    return false;
  }

  const actionId = action.id;

  if (actionData.sdg_ids.length > 0) {
    const sdgMappings = actionData.sdg_ids.map((sdgId) => ({
      action_id: actionId,
      sdg_id: sdgId,
    }));

    const { error: sdgError } = await supabase
      .from("actions_sdgs_map")
      .insert(sdgMappings);

    if (sdgError) {
      console.error(`    ⚠️  Failed to insert SDG mappings:`, sdgError);
    }
  }

  if (actionData.actor_name) {
    const actorId = await getOrCreateActor(supabase, actionData.actor_name, dryRun);
    if (actorId) {
      const { error: actorMapError } = await supabase
        .from("actions_actors_map")
        .insert({
          action_id: actionId,
          actor_id: actorId,
        });

      if (actorMapError) {
        console.error(`    ⚠️  Failed to link actor:`, actorMapError);
      }
    }
  }

  const resolvedPlatformId = resolvePlatformId(actionData.platform_id);

  let proofPayload = {
    action_id: actionId,
    protocol_id: actionData.protocol_id,
    platform_id: resolvedPlatformId,
    proof_link: actionData.proof_link || actionData.explorer_link,
    proof_metadata_link: actionData.proof_metadata_link,
    proof_image_link: actionData.proof_image_link,
    proof_explorer_link: actionData.explorer_link,
  };

  let { error: proofError } = await supabase
    .from("actions_proofs")
    .insert(proofPayload);

  if (proofError?.code === "23503" && proofError?.message?.includes("platform_id")) {
    console.warn(`    ⚠️  Platform "${resolvedPlatformId}" not in DB, falling back to ethereum`);
    proofError = (
      await supabase.from("actions_proofs").insert({
        ...proofPayload,
        platform_id: "ethereum",
      })
    ).error;
  }

  if (proofError) {
    console.error(`    ⚠️  Failed to insert proof:`, proofError);
  } else {
    const platformNote =
      resolvedPlatformId !== actionData.platform_id
        ? ` | platform: ${actionData.platform_id}→${resolvedPlatformId}`
        : "";
    console.log(
      `  ✅ Synced: "${actionData.title}" | id: ${actionId} | ${actionData.sdg_ids.length} SDGs | actor: ${actionData.actor_name || "—"}${platformNote}`
    );
  }
  return true;
}
