import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { CreateGraphqlRoute } from "@/lib/api-handlers/graphql.handler";

const typeDefs = /* GraphQL */ `
  type HealthStatus {
    status: String!
    service: String!
    time: String!
  }

  type Query {
    health: HealthStatus!
  }
`;

const resolvers = {
  Query: {
    health: CreateGraphqlRoute({
      moduleName: "health",
      requiresAuth: { status: false },
      handler: async () => ({
        status: "ok",
        service: "adika-candle",
        time: new Date().toISOString(),
      }),
    }),
  },
};

const { handleRequest } = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
});

function handler(request: NextRequest) {
  return handleRequest(request, {});
}

export { handler as GET, handler as POST };
