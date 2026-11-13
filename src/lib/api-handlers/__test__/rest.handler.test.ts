import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DomainError } from "../../server/domain-error";
import { CreateApiRoute } from "../rest.handler";

vi.mock("@/lib/session", () => ({
  GetApiSession: vi.fn(),
  CheckPermission: vi.fn(),
  CheckAnyPermission: vi.fn(),
}));

const { GetApiSession, CheckPermission, CheckAnyPermission } = await import(
  "@/lib/session"
);

function makeRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/v1/stub", {
    method,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

const emptyContext = { params: Promise.resolve({}) };

describe("CreateApiRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth is required and there is no session", async () => {
    vi.mocked(GetApiSession).mockResolvedValue(null);

    const route = CreateApiRoute({
      moduleName: "stub",
      requiresAuth: { status: true, permission: "stub:read" },
      handler: async () => ({ ok: true }),
    });

    const response = await route(makeRequest("GET"), emptyContext);
    expect(response.status).toBe(401);
  });

  it("returns 403 when the session lacks the required permission", async () => {
    vi.mocked(GetApiSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(CheckPermission).mockResolvedValue(false);

    const route = CreateApiRoute({
      moduleName: "stub",
      requiresAuth: { status: true, permission: "stub:read" },
      handler: async () => ({ ok: true }),
    });

    const response = await route(makeRequest("GET"), emptyContext);
    expect(response.status).toBe(403);
  });

  it("validates the body against the schema and rejects invalid payloads", async () => {
    const route = CreateApiRoute({
      moduleName: "stub",
      schema: z.object({ name: z.string().min(1) }),
      requiresAuth: { status: false, permission: "" },
      handler: async (body) => body,
    });

    const response = await route(
      makeRequest("POST", { name: "" }),
      emptyContext,
    );
    expect(response.status).toBe(400);
  });

  it("calls the handler and returns its result when auth and validation pass", async () => {
    vi.mocked(GetApiSession).mockResolvedValue({
      user: { id: "user_1", permissions: ["stub:read"] },
    } as never);
    vi.mocked(CheckPermission).mockResolvedValue(true);

    const route = CreateApiRoute({
      moduleName: "stub",
      requiresAuth: { status: true, permission: "stub:read" },
      handler: async (_body, session) => ({ userId: session?.id }),
    });

    const response = await route(makeRequest("GET"), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ userId: "user_1" });
  });

  it("passes through a handler result that matches the responseSchema", async () => {
    const route = CreateApiRoute({
      moduleName: "stub",
      responseSchema: z.object({ id: z.string() }),
      requiresAuth: { status: false, permission: "" },
      handler: async () => ({ id: "abc" }),
    });

    const response = await route(makeRequest("GET"), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ id: "abc" });
  });

  it("returns 500 when a handler result does not match the responseSchema", async () => {
    const route = CreateApiRoute({
      moduleName: "stub",
      responseSchema: z.object({ id: z.string() }),
      requiresAuth: { status: false, permission: "" },
      handler: async () => ({ id: 123 }) as never,
    });

    const response = await route(makeRequest("GET"), emptyContext);
    expect(response.status).toBe(500);
  });

  it("grants access via CheckAnyPermission when permission is an array", async () => {
    vi.mocked(GetApiSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(CheckAnyPermission).mockResolvedValue(true);

    const route = CreateApiRoute({
      moduleName: "stub",
      requiresAuth: { status: true, permission: ["stub:manage", "stub:use"] },
      handler: async () => ({ ok: true }),
    });

    const response = await route(makeRequest("GET"), emptyContext);

    expect(CheckAnyPermission).toHaveBeenCalledWith([
      "stub:manage",
      "stub:use",
    ]);
    expect(CheckPermission).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("maps a thrown DomainError to its status, message, code, and details", async () => {
    const route = CreateApiRoute({
      moduleName: "stub",
      requiresAuth: { status: false, permission: "" },
      handler: async () => {
        throw new DomainError("Not enough stock", 409, "INSUFFICIENT_STOCK", {
          availableKg: "5",
        });
      },
    });

    const response = await route(makeRequest("POST", {}), emptyContext);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Not enough stock",
      code: "INSUFFICIENT_STOCK",
      availableKg: "5",
    });
  });
});
