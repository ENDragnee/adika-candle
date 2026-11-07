import { defineConfig, env } from "prisma/config";

// Prisma's config loader disables its own .env auto-loading (it expects
// DATABASE_URL to already be in the environment), so load it ourselves.
try {
  process.loadEnvFile();
} catch {
  // No .env file present (e.g. Docker build, CI with injected env vars) — fine.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
