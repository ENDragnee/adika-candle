import { ZodType } from "zod";
import { GetApiSession } from "@lib/session";
import { checkPermission } from "@lib/auth-options";
import { GraphQLError } from "graphql";
import { Logger } from "pino";
import { logger as baseLogger } from "@/lib/logger";

interface IGraphqlHandlerConfig<T> {
  moduleName: string;
  schema?: ZodType<T>;
  requiresAuth: {
    status: boolean;
    permission?: string;
  };
  handler: (parent: any, args: T, context: any, logger: Logger) => Promise<any>;
}

export function CreateGraphqlRoute<T = any>(config: IGraphqlHandlerConfig<T>) {
  return async (parent: any, args: T, context: any, info?: any) => {
    const reqId = context?.reqId || crypto.randomUUID();
    const startTime = performance.now();

    const reqLogger = baseLogger.child({
      reqId,
      module: config.moduleName,
      resolver: info?.fieldName,
    });

    reqLogger.info("GraphQL resolver started");

    try {
      if (config.requiresAuth.status) {
        const session = context?.session || (await GetApiSession());

        if (!session?.id && !session?.user?.id) {
          reqLogger.warn("Unauthorized: No session found");
          throw new GraphQLError("Unauthorized", {
            extensions: { code: "UNAUTHORIZED", http: { status: 401 } },
          });
        }

        if (!config.requiresAuth.permission) {
          reqLogger.warn("Unauthorized: Permission not specified in config");
          throw new GraphQLError("Invalid Request", {
            extensions: { code: "UNAUTHORIZED", http: { status: 401 } },
          });
        }

        const hasPermission = await checkPermission(
          config.requiresAuth.permission,
        );

        if (!hasPermission) {
          reqLogger.warn(
            { userId: session.user?.id || session.id },
            "Forbidden: Missing permissions",
          );
          throw new GraphQLError("Forbidden", {
            extensions: { code: "FORBIDDEN", http: { status: 403 } },
          });
        }

        context.session = session.user ? session.user : session;
      }

      if (config.schema) {
        const validation = config.schema.safeParse(args);

        if (!validation.success) {
          reqLogger.warn(
            { issues: validation.error.issues, args },
            "Invalid GraphQL payload",
          );
          throw new GraphQLError("Invalid payload", {
            extensions: { code: "BAD REQUEST", http: { status: 400 } },
          });
        }

        args = validation.data;
      }

      reqLogger.debug("Executing GraphQL handler");
      const result = await config.handler(parent, args, context, reqLogger);

      const durationMs = Math.round(performance.now() - startTime);
      reqLogger.info({ durationMs }, "GraphQL resolver completed successfully");

      return result;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);

      if (err instanceof GraphQLError) {
        reqLogger.info(
          { err: err.message, durationMs },
          "GraphQL Error returned to client",
        );
        throw err;
      }

      reqLogger.error(
        { err, stack: err.stack, durationMs },
        "Internal Server Error in GraphQL resolver",
      );

      throw new GraphQLError("Internal Server Error", {
        extensions: { code: "INTERNAL_SERVER_ERROR", http: { status: 500 } },
      });
    }
  };
}
