import { redirect } from "next/navigation";
import { HomeRouteFor, SafeNextPath } from "./nav-routes";
import { ROLES } from "./roles";
import { GetSession } from "./session";

export { ROLES };

// Sends a signed-in user to `next` (when it's a safe same-site path) or
// to the first page their permissions open — not to a page picked by role
// name, so custom roles (Epic 22) land somewhere they can actually use.
export async function RoleRedirector(next?: string | null) {
  const session = await GetSession();
  const home = HomeRouteFor(session.user.role, session.user.permissions);

  if (!home) {
    redirect("/unauthorized");
  }

  redirect(SafeNextPath(next) ?? home);
}
