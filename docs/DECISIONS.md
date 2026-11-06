# Decisions

A running log of non-obvious decisions on this project — what was decided,
why, and what else was considered. Newest entries first. This complements
(doesn't replace) git history and `AGENTS.md`: git log says *what* changed,
`AGENTS.md` is a snapshot of current state, this file is *why* for anything
future sessions/agents would otherwise have to re-derive from scratch.

Add an entry whenever you make a call that isn't obvious from reading the
code — especially ones a future session might second-guess or accidentally
undo.

---

## 2026-11-06 — CLAUDE.md as a pointer file, not a symlink

Wanted `CLAUDE.md` to be a real symlink to `AGENTS.md` (the open-standard
handoff file) so there's one source of truth. The auto-mode permission
classifier blocked `ln -s` as a bash action. Used a one-line stub file
("see AGENTS.md") instead.

**Why this is fine, not just a workaround:** symlinks aren't universally
reliable anyway — they need `core.symlinks` on in git and can silently
become plain text files on some Windows checkouts. The stub file is more
portable. If a real symlink is ever wanted, recreate it manually (outside
auto mode) and delete the stub.

## 2026-11-06 — Didn't fix the `next build` `/_global-error` crash

`pnpm build` crashes prerendering Next's internal `/_global-error` page
(`Cannot read properties of null (reading 'useContext')`). Isolated it to
a genuine Next 16.4.5 + React 19.3 framework bug: reproduces on a bare
scaffold with no custom providers, with Turbopack *and* `--webpack`, with
experimental flags (`reactCompiler`/`cacheComponents`/`partialPrefetching`)
on or off.

**Decision:** documented it, did not downgrade Next/React. Pinning to
older framework versions is a bigger call than this task warranted, and
it doesn't block `pnpm dev` or the Docker build (which only needs
`prisma generate` + `next build`'s webpack path to work around it — see
below). Revisit if/when Next or React ship a fix, or if production builds
become urgent before that happens.

## 2026-11-06 — Dockerfile build stage gets a placeholder `DATABASE_URL`

`prisma generate` in the Docker build stage was failing because
`prisma.config.ts` resolves `DATABASE_URL` eagerly and `.env` isn't copied
into the build context (by design, via `.dockerignore`). `prisma generate`
only needs the URL string to exist — it never opens a connection — so the
build stage sets a literal fake value (`postgresql://build:build@...`)
before `RUN pnpm prisma generate`. The real value is injected at runtime
via `docker-compose.yml`'s `env_file`, so this never reaches the running
container.

## 2026-11-06 — `prisma.config.ts` loads `.env` itself

Prisma 7's new config system disables its own `.env` auto-loading when
evaluating `prisma.config.ts` (confirmed in `@prisma/config`'s source:
`dotenv: false` in its c12 loader config). Any `prisma` CLI command run
without the shell already having `DATABASE_URL` exported fails with
`PrismaConfigEnvError`. Fixed by calling `process.loadEnvFile()` at the
top of `prisma.config.ts` (Node 20.12+/21.7+ built-in, no `dotenv`
dependency needed), wrapped in try/catch so it doesn't throw when no
`.env` exists (CI, Docker).

## 2026-11-06 — Pinned the `prisma` CLI to `7.10.1`, not `latest`

`pnpm add -D prisma` resolved to `8.0.0-rc.30` (the `latest` dist-tag) and
pulled a huge, flaky optional-dependency tree through `@effect/vitest` →
`effect` (including things like `alchemy`, `@distilled.cloud/*`,
`@cloudflare/workerd-linux-64`) that kept timing out against the npm
registry. Pinned to `7.10.1` to match the already-installed
`@prisma/client@^7.10.1` and `@prisma/adapter-pg` — avoids the RC's
dependency tree entirely and keeps CLI/client versions in lockstep.
Revisit once Prisma 8 is stable and the project is ready to upgrade.

## 2026-11-06 — RBAC modeled as data (`Role`/`Permission`/`Module` tables), not an enum

Only two roles exist today (Manager, Inventory Manager), which would be
simpler as a `Role` enum on `User`. Modeled it as real tables instead
because the spec explicitly says the Manager manages "permission" as a
first-class thing from the UI — an enum can't be edited at runtime.
Seed data (not yet written) should still only create the two roles; the
schema just doesn't hard-code that assumption.

## 2026-11-06 — better-auth instead of the existing next-auth scaffold

The reused `src/lib/auth-options.ts` was next-auth-based but referenced
several files that didn't exist (`@/configs/global-vars`,
`@/features/auth/services/sigin.service`, `@/generated/prisma/client`,
`@/types/next-auth`) — it was unwired scaffolding, not working code. The
project's required stack explicitly lists better-auth. Replaced it
entirely: `src/lib/auth.ts` (better-auth server instance, `username` +
`customSession` plugins), `src/lib/auth-client.ts` (React client),
`src/lib/session.ts` (`GetApiSession`/`CheckPermission`/etc.). The REST and
GraphQL API factories (`src/lib/api-handlers/*.ts`) were updated to match
the new session shape rather than kept generic against both.

## 2026-11-06 — Docker Compose renamed from `rastech` to `adika-candle`

The compose file was a straight copy from a prior project (`rastech`
naming throughout: services, containers, network, volume, DB credentials).
Renamed everything to match this project, and fixed a bug while at it: the
Postgres volume was mounted at `/var/lib/postgresql` instead of
`/var/lib/postgresql/data` (the actual data directory for the official
Postgres image) — would have silently stored nothing durably.
