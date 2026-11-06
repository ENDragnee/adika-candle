import { redirect } from "next/navigation";
import { GetSession } from "./session";

// Define the role constants to match your database exactly
export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
} as const;

export async function RoleRedirector() {
  const session = await GetSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userRoles = session.user.role || [];

  if (userRoles.includes(ROLES.ADMIN)) {
    redirect("/admin/dashboard");
  }

  if (userRoles.includes(ROLES.MANAGER)) {
    redirect("/manager/dashboard");
  }

  if (userRoles.includes(ROLES.CASHIER)) {
    redirect("/cashier/dashboard");
  }

  redirect("/unauthorized");
}
