import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth-options";

export async function GetSession() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return redirect("/auth/signin");
  }

  return session;
}

export async function GetApiSession() {
  const session = await getServerSession(authOptions);

  return session;
}
