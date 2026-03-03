/**
 * Sanitize actor name for actions_actors table.
 * Constraint: length(TRIM(name)) >= 2 AND length(TRIM(name)) <= 50
 */
export function sanitizeActorName(name: string | undefined | null): string | null {
  if (!name) return null;

  let sanitized = name.trim();
  if (sanitized.length === 0) return null;

  if (sanitized.length > 50) {
    sanitized = sanitized.slice(0, 47) + "...";
  }
  if (sanitized.length < 2) {
    return null;
  }

  return sanitized;
}
