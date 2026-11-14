# Epic 23 — Admin role, session control, and account edits

**Depends on:** 22 (Platform Features)
**Status:** done

## Goal

Two requests from the owner (2026-11-14):

1. The Manager can change a user's **name and username**.
2. A new **Admin** that can do everything the Manager does, plus **revoke
   sessions**, with "total control of the system from his dashboard".

## 1. Editing name and username

**Found:** `PATCH /api/v1/users/[id]` accepted `roleId`/`isActive` only;
the Edit dialog showed the name read-only. Your own row had no actions at
all.

**Scope:**
- Name and username can be edited. Email stays fixed: people sign in by username, and email is the account's identity in better-auth.
- Usernames follow better-auth's username-plugin rules (3–30 characters; letters, digits, `_` and `.`). Both `username` (lowercase, for lookup) and `displayUsername` are updated, and a duplicate returns 409.
- Your own row now opens Edit (the role field is locked) and Set password. You still can't deactivate yourself.

## 2. Admin role

**Found:** the Manager held every permission, so an "Admin" needed
something the Manager doesn't have. Worse, with `user:manage` +
`role:manage` the Manager could have made themselves Admin, or reset the
Admin's password. A separate role would mean nothing without
containment.

**Scope:**
- New permission `session:manage` (module `session`), held only by **ADMIN**. ADMIN holds every permission; MANAGER holds every permission except `session:manage`. Both are seeded, plus an `admin` account (`SEED_ADMIN_*`).
- **Access containment** (`src/lib/server/access-containment.ts`, pure rules in `src/lib/access-rules.ts`): nobody can give out, or act on, access they don't hold. The comparison is by permission set, so it holds for custom roles too. It covers:
  - assigning a role, or creating a user with one
  - copying a role
  - editing, renaming or deleting a role
  - switching individual permissions on or off
  - renaming, re-roling, deactivating, resetting the password of, or signing out a user

  APIs return 403 `OUTSIDE_YOUR_ACCESS`. The UI hides or locks these controls through `canManage` (users) and `canEdit` (roles).
- `/manager/sessions` lists every signed-in device (person, browser/OS, IP, signed in, last used) and lets you end one session, sign one person out of every device, or sign everyone out except yourself.
  - Better-auth has no cookie cache configured, so revocation takes effect on the device's next request.
  - Every revocation is written to the activity log.
- The dashboard gets a **System** panel for `session:manage`: signed-in people/devices, active and deactivated accounts, and failed sign-ins in 24h (from the activity log). Each tile links to the page that acts on it.
- The Users row menu gets **Sign out everywhere** for `session:manage`.
- Admin uses the `/manager` area (`MANAGER_AREA_ROLES`) and the Manager tour.
