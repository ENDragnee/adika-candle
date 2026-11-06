import { NextRequest, NextResponse } from "next/server";
import { ZodType } from "zod";
import { GetApiSession } from "@lib/session";
import { checkPermission } from "@lib/auth-options";
import { ISession } from "@/types/next-auth";
import { Logger } from "pino";
import { logger as baseLogger } from "../logger";

interface IApiHandlerConfig<T, P = Record<string, string>> {
  moduleName: string;
  schema?: ZodType<T>;
  requiresAuth: {
    status: boolean;
    permission: string;
  };
  handler: (
    body: T,
    session?: ISession,
    params?: P,
    logger?: Logger,
  ) => Promise<any>;
}

export function CreateApiRoute<T = any, P = Record<string, string>>(
  config: IApiHandlerConfig<T, P>,
) {
  return async (req: NextRequest, context?: { params: Promise<P> }) => {
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
      let session: ISession | undefined;
      const environment = process.env.ENVIRONMENT;
      const params = context?.params ? await context.params : undefined;

      if (config.requiresAuth.status) {
        session = (await GetApiSession())?.user;

        if (!session?.id) {
          reqLogger.warn("Unauthorized: No session found");
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hasPermission = await checkPermission(
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

      reqLogger.info(
        { status: 200, durationMs },
        "Request completed successfully",
      );
      return NextResponse.json(result, { status: 200 });
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
