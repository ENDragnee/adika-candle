import { redirect } from "next/navigation";
import { ROLES } from "./roles";
import { GetSession } from "./session";

export { ROLES };

export async function RoleRedirector() {
  const session = await GetSession();
  const role = session.user.role;

  if (role === ROLES.MANAGER) {
    redirect("/manager/dashboard");
  }

  if (role === ROLES.INVENTORY_MANAGER) {
    redirect("/inventory/dashboard");
  }

  redirect("/unauthorized");
}
