// Pure access-containment rules, shared by the API (which enforces them —
// src/lib/server/access-containment.ts) and the UI (which hides what the
// API would refuse). A set of permissions is "within reach" of an actor
// when the actor holds every one of them.

export function MissingPermissions(
  actorPermissions: readonly string[],
  required: Iterable<string>,
): string[] {
  const held = new Set(actorPermissions);
  return [...new Set(required)].filter((name) => !held.has(name));
}

export function IsWithinReach(
  actorPermissions: readonly string[],
  required: Iterable<string>,
): boolean {
  return MissingPermissions(actorPermissions, required).length === 0;
}
