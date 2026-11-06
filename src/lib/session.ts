import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type AppSession, auth } from "./auth";

export async function GetApiSession(): Promise<AppSession | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function GetSession(): Promise<AppSession> {
  const session = await GetApiSession();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return session;
}

export async function CheckPermission(
  permissionName: string,
): Promise<boolean> {
  const session = await GetApiSession();
  return session?.user?.permissions?.includes(permissionName) ?? false;
}

export async function CheckAnyPermission(
  permissionNames: string[],
): Promise<boolean> {
  const session = await GetApiSession();
  return (
    permissionNames.some((name) =>
      session?.user?.permissions?.includes(name),
    ) ?? false
  );
}
