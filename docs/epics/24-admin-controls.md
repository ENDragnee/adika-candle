# Epic 24 — Admin controls

**Depends on:** 23 (Admin role, session control, account edits)
**Status:** done

## Goal

Seven Admin powers chosen by the owner on 2026-11-14:

1. Lock an account after repeated failed sign-ins; the Admin can unlock it.
2. Force a password change at the next sign-in.
3. **Lock past periods** (closing the books) so old sales can't be changed.
4. **Maintenance mode**, so that only the Admin can use the system.
5. Activity-log retention.
6. Backup / export.
7. Restore a voided sale.

All of them are managed from a new **System** page (`/manager/system`),
except "Restore", which lives on the sale. New permissions are
admin-only: `system:manage` and `sale:restore`. They join
`session:manage` in `ADMIN_ONLY_PERMISSIONS` (prisma/seed.ts), and access
containment (Epic 23) keeps the Manager from granting them.

## Validation (done before building)

- **Dated writes.** Every write is dated "now": sales, stock and material entries, and loan transactions all use `createdAt` default now, and there are no back-dated inputs. So a period lock can't be broken by a new entry. It *can* be broken by voiding or restoring an old sale: analytics filter `voidedAt: null`, so a void silently rewrites a closed month's reports. The lock therefore guards void and restore by the sale's own date.
- **Deactivated records.** Categories, products, customers, raw materials, units and users already have activate/deactivate for the Manager. The only record nothing can bring back is a **voided sale**, so that is what "restore" covers.
- **Session reads.** better-auth reads the session table on every request (no cookie cache), so `customSession` can enforce lockout, maintenance and forced password change per request.
- **Backup tools.** `pg_dump` isn't available to the app (hosted Postgres; the CLI isn't installed). The backup is therefore a logical JSON export taken through Prisma.

## Phases

### Phase 1 — Settings foundation
- New `SystemSetting` model (key → JSON value, updatedAt, updatedBy). It is read through `GetSystemSettings()`, which validates with Zod defaults and keeps a short in-memory cache (it is read on every request).
- Admin-only permissions `system:manage` and `sale:restore`.
- The `/manager/system` page shell, plus its nav entry.

### Phase 2 — Account lockout and forced password change
- New `User` fields `failedSignInCount`, `lockedUntil` and `mustChangePassword`.
- **Lockout** works through better-auth hooks:
  - Before the hook: a locked account is refused with a clear message (no password check).
  - After the hook: each failure is counted. At the threshold the account locks for N minutes, and a success resets the count.
  - The threshold and duration are set on the System page (defaults: 5 attempts, 15 min).
  - The Users list shows a "Locked" badge, with **Unlock** for `system:manage`.
- **Forced password change:**
  - "Require a new password at next sign-in" appears when creating a user or setting a password (on by default).
  - While the flag is set, `customSession` grants no permissions, and the dashboard layout redirects to `/auth/change-password`.
  - The person sets a new password (current password plus the shared policy). Their other sessions end and the flag clears.

### Phase 3 — Maintenance mode
- A setting with `enabled` and a `message`.
- While it is on, everyone without `system:manage`:
  - is refused at sign-in;
  - gets no permissions in `customSession`;
  - is redirected to `/maintenance`.
- Turning it on can also end everyone else's sessions. A banner reminds the Admin that it is on.

### Phase 4 — Period lock and sale restore
- A setting `lockedThrough` (a business date, Africa/Addis_Ababa).
- Voiding or restoring a sale dated on or before it is refused with 409 `PERIOD_LOCKED`. The Sales UI hides those actions on locked rows.
- **Restore** (`sale:restore`) reverses a void:
  - The sale's stock and loan effects are re-applied through new ledger entries (`SALE_RESTORE`), and `voidedAt` is cleared.
  - Its stock check is the same as a new sale's: the product must have enough on hand.
  - Restoring requires a reason. The void details are kept in the activity log.

### Phase 5 — Log retention and backup
- **Retention:**
  - A `logRetentionDays` setting (default 365, minimum 90).
  - "Purge now" previews how many entries will go, then deletes them, and the purge itself is logged.
  - There is no automatic purge: the app has no scheduler, and silent data deletion belongs behind a person's click.
- **Backup:** "Download backup" streams a JSON file holding every business table plus users and roles.
  - It never includes password hashes, session tokens or verification rows.
  - Each download is logged.
  - There is no restore-from-file: overwriting live data from the UI is out of scope.

## Verified (local dev DB, 2026-11-14)
- **Lockout:** 3 wrong passwords locked the account. The right password was then refused (`ACCOUNT_LOCKED`). The Manager's unlock was refused (403), the Admin's unlock worked, and every step was logged.
- **Forced change:** after a reset, the user had no permissions and was redirected to `/account/change-password`. A wrong current password was rejected, a reused password was rejected, and a valid change restored access.
- **Maintenance:**
  - Non-admins are refused at sign-in (503), including unknown usernames.
  - Open sessions are redirected to `/maintenance`.
  - Admins see the banner.
  - Turning it off reaches every server module within the 5s settings cache.
- **Void/restore:** two void→restore cycles each brought stock and the customer balance back exactly. The Manager's restore was refused (403), and restoring an active sale gave 409.
- **Period lock:** locking today was refused (400), and voiding a sale in a locked period gave 409 `PERIOD_LOCKED`.
- **Backup:** has no password, token or session fields. The Manager is refused (403).
- **Purge:** removed exactly the out-of-window entries and logged itself.

## Out of scope
- Automatic scheduled purges or backups (would need a scheduler or cron).
- Restoring a backup file through the UI.
