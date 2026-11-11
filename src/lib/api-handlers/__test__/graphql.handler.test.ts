import { GraphQLError } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CreateGraphqlRoute } from "../graphql.handler";

vi.mock("@/lib/session", () => ({
  GetApiSession: vi.fn(),
  CheckPermission: vi.fn(),
}));

const { GetApiSession, CheckPermission } = await import("@/lib/session");

describe("CreateGraphqlRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UNAUTHORIZED when auth is required and there is no session", async () => {
    vi.mocked(GetApiSession).mockResolvedValue(null);

    const resolver = CreateGraphqlRoute({
      moduleName: "stub",
      requiresAuth: { status: true, permission: "stub:read" },
      handler: async () => ({ ok: true }),
    });

    await expect(resolver(null, {}, {}, {})).rejects.toMatchObject({
      extensions: { code: "UNAUTHORIZED" },
    });
  });

  it("throws FORBIDDEN when the session lacks the required permission", async () => {
    vi.mocked(GetApiSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(CheckPermission).mockResolvedValue(false);

    const resolver = CreateGraphqlRoute({
      moduleName: "stub",
      requiresAuth: { status: true, permission: "stub:read" },
      handler: async () => ({ ok: true }),
    });

    await expect(resolver(null, {}, {}, {})).rejects.toMatchObject({
      extensions: { code: "FORBIDDEN" },
    });
  });

  it("validates args against the schema and rejects invalid payloads", async () => {
    const resolver = CreateGraphqlRoute({
      moduleName: "stub",
      schema: z.object({ name: z.string().min(1) }),
      requiresAuth: { status: false },
      handler: async (_parent, args) => args,
    });

    await expect(resolver(null, { name: "" }, {}, {})).rejects.toBeInstanceOf(
      GraphQLError,
    );
  });

  it("calls the handler and returns its result when auth and validation pass", async () => {
    vi.mocked(GetApiSession).mockResolvedValue({
      user: { id: "user_1", permissions: ["stub:read"] },
    } as never);
    vi.mocked(CheckPermission).mockResolvedValue(true);

    const resolver = CreateGraphqlRoute({
      moduleName: "stub",
      requiresAuth: { status: true, permission: "stub:read" },
      handler: async (_parent, _args, context) => ({
        userId: context.session.id,
      }),
    });

    const result = await resolver(null, {}, {}, {});
    expect(result).toEqual({ userId: "user_1" });
  });
});
