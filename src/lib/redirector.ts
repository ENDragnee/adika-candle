import { redirect } from "next/navigation";
import { GetSession } from "./session";

export const ROLES = {
  MANAGER: "MANAGER",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
} as const;

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
