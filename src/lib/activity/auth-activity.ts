import {
  createAuthMiddleware,
  getSessionFromCtx,
  isAPIError,
} from "better-auth/api";
import { RecordActivity, RequestContext } from "./record-activity";

// Sign-in / sign-out / failed sign-in for the activity log (Epic 22),
// wired into better-auth's own request pipeline (src/lib/auth.ts) — those
// endpoints don't go through CreateApiRoute.

const SIGN_IN_PATH = "/sign-in/username";
const SIGN_OUT_PATH = "/sign-out";

export const AuthActivityAfterHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_IN_PATH) return;
  const meta = ctx.headers ? RequestContext(ctx.headers) : {};
  const returned = ctx.context.returned;

  if (isAPIError(returned)) {
    // Never log the attempted password; the username is what an admin
    // needs to spot repeated failures against one account.
    const username =
      ctx.body && typeof ctx.body === "object" && "username" in ctx.body
        ? String((ctx.body as { username: unknown }).username).slice(0, 60)
        : "unknown";
    await RecordActivity(
      {
        type: "auth",
        action: "auth.sign_in_failed",
        message: `Failed sign-in for "${username}"`,
        severity: "WARN",
        entityType: "user",
        entityLabel: username,
      },
      meta,
    );
    return;
  }

  const user = ctx.context.newSession?.user;
  if (user) {
    await RecordActivity(
      {
        type: "auth",
        action: "auth.sign_in",
        message: `${user.name} signed in`,
        entityType: "user",
        entityId: user.id,
        entityLabel: user.name,
      },
      { userId: user.id, ...meta },
    );
  }
});

// Sign-out is recorded *before* the endpoint runs: afterwards the session
// is gone and there's no way left to tell who it was.
export const AuthActivityBeforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_OUT_PATH) return;
  const session = await getSessionFromCtx(ctx);
  if (!session) return;
  await RecordActivity(
    {
      type: "auth",
      action: "auth.sign_out",
      message: `${session.user.name} signed out`,
      entityType: "user",
      entityId: session.user.id,
      entityLabel: session.user.name,
    },
    {
      userId: session.user.id,
      ...(ctx.headers ? RequestContext(ctx.headers) : {}),
    },
  );
});
