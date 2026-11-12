"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useRoles, useUpdateRolePermissions } from "../hooks/use-roles";
import {
  DescribeModule,
  DescribePermission,
  HumanizeRoleName,
} from "../permission-labels";
import type {
  ModuleDTO,
  PermissionDTO,
  RoleDTO,
} from "../validators/role.schema";

interface PermissionRow {
  permission: PermissionDTO;
  module: ModuleDTO;
}

// Mirrors the server's self-lockout guard in
// api/v1/roles/[id]/permissions: on your own role, "Manage roles" is
// locked on, since turning it off would lock you out of this page.
const SELF_LOCKED_PERMISSION = "role:manage";

function RolePermissionMatrix({
  role,
  modules,
  isOwnRole,
}: {
  role: RoleDTO;
  modules: ModuleDTO[];
  isOwnRole: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(role.permissionIds),
  );
  const updatePermissions = useUpdateRolePermissions(role.id);

  const isDirty =
    selectedIds.size !== role.permissionIds.length ||
    role.permissionIds.some((id) => !selectedIds.has(id));

  function toggle(permissionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  }

  async function handleSave() {
    await updatePermissions.mutateAsync(Array.from(selectedIds));
  }

  function handleReset() {
    setSelectedIds(new Set(role.permissionIds));
  }

  // Flattened module.permissions, one row per permission — the actual
  // "matrix": Permission | Module | Description | Enabled, via the same
  // DataTable<T> every other list in this app uses, so it gets the same
  // mobile card-view treatment for free instead of a bespoke table.
  const rows: PermissionRow[] = modules.flatMap((module) =>
    module.permissions.map((permission) => ({ permission, module })),
  );

  const columns: DataTableColumn<PermissionRow>[] = [
    {
      key: "permission",
      header: "Permission",
      cell: ({ permission }) => DescribePermission(permission.name).label,
    },
    {
      key: "enabled",
      header: "Enabled",
      // Placed right after the permission name (not last) so the actual
      // control is always reachable without scrolling the table
      // horizontally — Description's prose is the one cell allowed to
      // wrap (see its own className below), everything else here stays
      // single-line, so Enabled would otherwise land past the fold on
      // anything narrower than a wide desktop viewport.
      cell: ({ permission }) => {
        const locked = isOwnRole && permission.name === SELF_LOCKED_PERMISSION;
        return (
          <span className="inline-flex items-center gap-2">
            <Switch
              checked={selectedIds.has(permission.id)}
              onCheckedChange={() => toggle(permission.id)}
              disabled={locked}
              aria-label={DescribePermission(permission.name).label}
            />
            {locked && (
              <span className="text-xs text-muted-foreground">Your role</span>
            )}
          </span>
        );
      },
    },
    {
      key: "module",
      header: "Module",
      cell: ({ module }) => {
        const { label, icon: Icon } = DescribeModule(module.name);
        return (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Icon className="size-4 shrink-0" />
            {label}
          </span>
        );
      },
    },
    {
      key: "description",
      header: "Description",
      cell: ({ permission }) => DescribePermission(permission.name).description,
      // Overrides TableCell's default `whitespace-nowrap` — without this,
      // every row's full description forces the table wider than the
      // viewport (discovered the same way Epic 19's Legend page did: a
      // long prose cell inside Table's auto-layout, not caught until an
      // actual screenshot). min-w-56 keeps it legible once it wraps.
      className: "min-w-56 max-w-sm text-muted-foreground whitespace-normal",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium text-foreground">
          {HumanizeRoleName(role.name)}
        </h2>
        {role.description && (
          <p className="text-sm text-muted-foreground">{role.description}</p>
        )}
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowKey={(row) => row.permission.id}
        emptyMessage="No permissions defined."
      />
      <div className="flex items-center gap-2">
        <Button
          loading={updatePermissions.isPending}
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || updatePermissions.isPending}
        >
          {updatePermissions.isPending ? "Saving…" : "Save changes"}
        </Button>
        {isDirty && (
          <Button size="sm" variant="ghost" onClick={handleReset}>
            Discard changes
          </Button>
        )}
      </div>
    </div>
  );
}

// Below `md`, a horizontal row above the table (two roles today fit with
// no scrolling); `md+` becomes a real left sidebar — "use an internal
// side bar to select the role" per the user's own request.
function RoleSidebar({
  roles,
  selectedRoleId,
  onSelect,
}: {
  roles: RoleDTO[];
  selectedRoleId: string;
  onSelect: (roleId: string) => void;
}) {
  return (
    <nav className="flex gap-2 overflow-x-auto md:w-48 md:shrink-0 md:flex-col md:gap-1 md:overflow-visible">
      {roles.map((role) => (
        <Button
          key={role.id}
          type="button"
          variant={role.id === selectedRoleId ? "default" : "ghost"}
          className="shrink-0 justify-start md:w-full"
          onClick={() => onSelect(role.id)}
        >
          {HumanizeRoleName(role.name)}
        </Button>
      ))}
    </nav>
  );
}

function RoleManagerSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="flex gap-2 md:w-48 md:shrink-0 md:flex-col md:gap-1">
        <Skeleton className="h-9 w-24 md:w-full" />
        <Skeleton className="h-9 w-32 md:w-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <TableSkeleton columns={4} />
      </div>
    </div>
  );
}

export function RoleManager({
  currentRoleName,
}: {
  currentRoleName: string | null;
}) {
  const { data, isLoading } = useRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  if (isLoading) {
    return <RoleManagerSkeleton />;
  }

  if (!data?.roles.length) {
    return <p className="text-sm text-muted-foreground">No roles found.</p>;
  }

  const activeRole =
    data.roles.find((role) => role.id === selectedRoleId) ?? data.roles[0];

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <RoleSidebar
        roles={data.roles}
        selectedRoleId={activeRole.id}
        onSelect={setSelectedRoleId}
      />
      <div className="min-w-0 flex-1">
        {/* `key` forces a remount on role switch — RolePermissionMatrix's
            selectedIds state is only ever initialized from `role.
            permissionIds` on mount, so without this, switching roles
            would leave the previous role's in-progress toggle state
            showing against the newly selected role. */}
        <RolePermissionMatrix
          key={activeRole.id}
          role={activeRole}
          modules={data.modules}
          isOwnRole={activeRole.name === currentRoleName}
        />
      </div>
    </div>
  );
}
