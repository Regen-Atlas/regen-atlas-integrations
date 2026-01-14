/**
 * Database operations for syncing actions to Supabase
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedActionData } from "./types.js";

/**
 * Get or create an actor by name
 */
export async function getOrCreateActor(
  supabase: SupabaseClient,
  actorName: string,
  dryRun: boolean
): Promise<string | null> {
  // Check if actor exists
  const { data: existing } = await supabase
    .from("actions_actors")
    .select("id")
    .eq("name", actorName)
    .single();

  if (existing) {
    return existing.id;
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would create actor: ${actorName}`);
    return "dry-run-actor-id";
  }

  // Create new actor
  const { data: newActor, error } = await supabase
    .from("actions_actors")
    .insert({ name: actorName })
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ Failed to create actor "${actorName}":`, error);
    return null;
  }

  console.log(`  ✓ Created actor: ${actorName}`);
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
  console.log(`\n  📝 Processing: ${actionData.title}`);

  // Check if this proof already exists
  const exists = await checkExistingProof(supabase, actionData.proof_metadata_link);
  if (exists) {
    console.log(`    ⏭️  Skipping - proof already exists in database`);
    return false;
  }

  if (dryRun) {
    console.log(`    [DRY RUN] Would insert action:`, {
      title: actionData.title,
      description: actionData.description?.slice(0, 50) + "...",
      sdgs: actionData.sdg_ids,
      actor: actionData.actor_name,
      protocol_id: actionData.protocol_id,
      platform: actionData.platform_id,
    });
    return true;
  }

  // 1. Insert action
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
  console.log(`    ✓ Created action with ID: ${actionId}`);

  // 2. Insert SDG mappings
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
    } else {
      console.log(`    ✓ Linked ${actionData.sdg_ids.length} SDGs`);
    }
  }

  // 3. Handle actor
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
      } else {
        console.log(`    ✓ Linked actor: ${actionData.actor_name}`);
      }
    }
  }

  // 4. Insert proof
  const { error: proofError } = await supabase
    .from("actions_proofs")
    .insert({
      action_id: actionId,
      protocol_id: actionData.protocol_id,
      platform_id: actionData.platform_id,
      proof_link: actionData.proof_link || actionData.explorer_link,
      proof_metadata_link: actionData.proof_metadata_link,
      proof_image_link: actionData.proof_image_link,
      proof_explorer_link: actionData.explorer_link,
    });

  if (proofError) {
    console.error(`    ⚠️  Failed to insert proof:`, proofError);
  } else {
    console.log(`    ✓ Added proof record`);
  }

  console.log(`    ✅ Successfully synced: ${actionData.title}`);
  return true;
}
