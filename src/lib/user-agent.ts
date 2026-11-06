import { headers } from "next/headers";
import { userAgent } from "next/server";

interface IUserAgent {
  userAgent: string;
  ip: string;
  deviceType: "mobile" | "tablet" | "desktop";
}

export async function getUserAgent(): Promise<IUserAgent> {
  const headersList = await headers();

  const ua = userAgent({ headers: headersList });
  const ip = (headersList.get("x-forwarded-for") ?? "127.0.0.1")
    .split(",")[0]
    .trim();
  const rawUserAgent = ua.ua;

  const deviceType = (ua.device.type ?? "desktop") as
    | "mobile"
    | "tablet"
    | "desktop";

  return {
    userAgent: rawUserAgent,
    ip,
    deviceType,
  };
}
