import { type NextRequest, NextResponse } from "next/server";
import type { Logger } from "pino";
import type { ZodType } from "zod";
import type { AppUser } from "@/lib/auth";
import { CheckPermission, GetApiSession } from "@/lib/session";
import { logger as baseLogger } from "../logger";

interface IApiHandlerConfig<T, P = Record<string, string>, R = any> {
  moduleName: string;
  schema?: ZodType<T>;
  // Validates the handler's return value before it's sent — catches a
  // handler that drifts from its documented response shape. Skipped for
  // void responses and for handlers that return a NextResponse directly.
  responseSchema?: ZodType<R>;
  requiresAuth: {
    status: boolean;
    permission: string;
  };
  handler: (
    body: T,
    session?: AppUser,
    params?: P,
    logger?: Logger,
  ) => Promise<R | NextResponse>;
}

export function CreateApiRoute<T = any, P = Record<string, string>, R = any>(
  config: IApiHandlerConfig<T, P, R>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    const reqId = crypto.randomUUID();
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
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hasPermission = await CheckPermission(
          config.requiresAuth.permission,
        );

        if (!hasPermission) {
          reqLogger.warn(
            { userId: session.id },
            "Forbidden: Missing permissions",
          );
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
          return NextResponse.json(
            {
              error: "Invalid payload",
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
            { error: "Internal Server Error" },
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

      reqLogger.error(
        { err, stack: err.stack, durationMs },
        "Internal Server Error Exception",
      );
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  };
}
