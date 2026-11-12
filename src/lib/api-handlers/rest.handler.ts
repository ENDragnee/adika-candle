import { type NextRequest, NextResponse } from "next/server";
import type { Logger } from "pino";
import type { ZodType } from "zod";
import type { AppUser } from "@/lib/auth";
import {
  CheckAnyPermission,
  CheckPermission,
  GetApiSession,
} from "@/lib/session";
import {
  type ActivityInput,
  RecordActivity,
  RequestContext,
} from "../activity/record-activity";
import { logger as baseLogger } from "../logger";
import { ToDomainErrorResponse } from "../server/domain-error";

interface IApiHandlerConfig<T, P = Record<string, string>, R = any> {
  moduleName: string;
  schema?: ZodType<T>;
  // Validates the handler's return value before it's sent — catches a
  // handler that drifts from its documented response shape. Skipped for
  // void responses and for handlers that return a NextResponse directly.
  responseSchema?: ZodType<R>;
  requiresAuth: {
    status: boolean;
    // A string[] grants access to any one of the listed permissions (via
    // CheckAnyPermission) — e.g. a read endpoint that both a "manage" role
    // and a narrower "use" role may call. Single-string behavior (the
    // common case) is unchanged.
    permission: string | string[];
  };
  handler: (
    body: T,
    session?: AppUser,
    params?: P,
    logger?: Logger,
  ) => Promise<R | NextResponse>;
  // Describes this request for the activity log (Epic 22). Called only
  // after a successful non-GET request. Routes that leave it out still
  // get a generic entry (method, path, redacted input), so a new
  // mutating route can never silently skip the log; return null to opt a
  // request out deliberately.
  activity?: (event: {
    body: T;
    result: R;
    params?: P;
    session?: AppUser;
  }) => ActivityInput | null | Promise<ActivityInput | null>;
}

export function CreateApiRoute<T = any, P = Record<string, string>, R = any>(
  config: IApiHandlerConfig<T, P, R>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    const reqId = crypto.randomUUID();
    const response = await Run(req, context, reqId);
    // Every response carries its request id; error bodies repeat it as
    // `requestId`, which the UI's error dialog shows as a reference to
    // quote when reporting a problem (Epic 22).
    response.headers.set("x-request-id", reqId);
    return response;
  };

  async function Run(
    req: NextRequest,
    context: { params: Promise<P> },
    reqId: string,
  ): Promise<NextResponse> {
    const method = req.method;
    const url = req.nextUrl.pathname;
    const startTime = performance.now();

    const reqLogger = baseLogger.child({
      reqId,
      module: config.moduleName,
      method,
      url,
    });

    reqLogger.info("Request started");

    try {
      let session: AppUser | undefined;
      const environment = process.env.ENVIRONMENT;
      const params = await context.params;

      if (config.requiresAuth.status) {
        session = (await GetApiSession())?.user;

        if (!session?.id) {
          reqLogger.warn("Unauthorized: No session found");
          return NextResponse.json(
            {
              error: "Your session has ended. Please sign in again.",
              code: "UNAUTHENTICATED",
              requestId: reqId,
            },
            { status: 401 },
          );
        }

        const hasPermission = Array.isArray(config.requiresAuth.permission)
          ? await CheckAnyPermission(config.requiresAuth.permission)
          : await CheckPermission(config.requiresAuth.permission);

        if (!hasPermission) {
          reqLogger.warn(
            { userId: session.id },
            "Forbidden: Missing permissions",
          );
          return NextResponse.json(
            {
              error: "You don't have permission to do this.",
              code: "FORBIDDEN",
              requestId: reqId,
            },
            { status: 403 },
          );
        }
      }

      let parsedBody = {} as T;

      if (config.schema) {
        let rawData: unknown;

        if (req.method === "GET" || req.method === "DELETE") {
          rawData = Object.fromEntries(req.nextUrl.searchParams.entries());
        } else {
          try {
            rawData = await req.json();
          } catch {
            rawData = {};
          }
        }

        const validation = config.schema.safeParse(rawData);

        if (!validation.success) {
          reqLogger.warn(
            { issues: validation.error.issues, rawData },
            "Invalid payload",
          );
          // A custom rule (e.g. "The two passwords don't match") is
          // written for people — lead with it; otherwise stay generic.
          const custom = validation.error.issues.find(
            (issue) => issue.code === "custom",
          );
          return NextResponse.json(
            {
              error:
                custom?.message ?? "Some of the information sent isn't valid",
              code: "INVALID_INPUT",
              requestId: reqId,
              ...(environment !== "production" && {
                details: validation.error.issues,
              }),
            },
            { status: 400 },
          );
        }

        parsedBody = validation.data;
      }

      const result = await config.handler(
        parsedBody,
        session,
        params,
        reqLogger,
      );
      const durationMs = Math.round(performance.now() - startTime);

      if (method !== "GET") {
        const succeeded = !(result instanceof NextResponse) || result.ok;
        if (succeeded) {
          const described =
            config.activity && !(result instanceof NextResponse)
              ? await config.activity({
                  body: parsedBody,
                  result: result as R,
                  params,
                  session,
                })
              : undefined;
          if (described !== null) {
            await RecordActivity(
              described ?? {
                type: config.moduleName.split(".")[0],
                action: `${config.moduleName}.${method.toLowerCase()}`,
                message: `${method} ${url}`,
                changes: { input: parsedBody as unknown },
              },
              { userId: session?.id, ...RequestContext(req.headers) },
            );
          }
        }
      }

      if (result instanceof NextResponse) {
        reqLogger.info(
          { status: result.status, durationMs },
          "Request completed with custom NextResponse",
        );
        return result;
      }

      if (result === undefined || result === null) {
        reqLogger.info(
          { status: 200, durationMs },
          "Request completed successfully (Void)",
        );
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Narrowed past the NextResponse/void checks above — the remaining
      // value is the handler's typed result.
      const typedResult = result as R;
      let responseData: unknown = typedResult;

      if (config.responseSchema) {
        const responseValidation = config.responseSchema.safeParse(typedResult);

        if (!responseValidation.success) {
          reqLogger.error(
            { issues: responseValidation.error.issues, durationMs },
            "Handler response does not match responseSchema",
          );
          return NextResponse.json(
            {
              error: "Something went wrong on our side",
              code: "INTERNAL",
              requestId: reqId,
            },
            { status: 500 },
          );
        }

        responseData = responseValidation.data;
      }

      reqLogger.info(
        { status: 200, durationMs },
        "Request completed successfully",
      );
      return NextResponse.json(responseData, { status: 200 });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);

      // Business-rule rejections thrown from a service (see
      // src/lib/server/domain-error.ts) are expected outcomes, not crashes.
      const domainResponse = ToDomainErrorResponse(err, reqId);
      if (domainResponse) {
        reqLogger.info(
          { status: domainResponse.status, code: err.code, durationMs },
          "Request rejected by a business rule",
        );
        return domainResponse;
      }

      reqLogger.error(
        { err, stack: err.stack, durationMs },
        "Internal Server Error Exception",
      );
      return NextResponse.json(
        {
          error: "Something went wrong on our side",
          code: "INTERNAL",
          requestId: reqId,
        },
        { status: 500 },
      );
    }
  }
}
