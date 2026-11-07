import { RoleRedirector } from "@/lib/redirector";

// Pure session redirect, no renderable UI — not a candidate for instant
// navigation. See the root layout's `instant` export and docs/DECISIONS.md.
export const instant = false;

export default async function HomePage() {
  await RoleRedirector();
  return null;
}
