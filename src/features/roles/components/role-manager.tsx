"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useRoles, useUpdateRolePermissions } from "../hooks/use-roles";
import {
  DescribeModule,
  DescribePermission,
  HumanizeRoleName,
} from "../permission-labels";
import type { ModuleDTO, RoleDTO } from "../validators/role.schema";

function PermissionModuleSection({
  module,
  selectedIds,
  onToggle,
}: {
  module: ModuleDTO;
  selectedIds: Set<string>;
  onToggle: (permissionId: string) => void;
}) {
  const { label, icon: Icon } = DescribeModule(module.name);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </div>
      <div className="flex flex-col divide-y divide-border">
        {module.permissions.map((permission) => {
          const { label: permissionLabel, description } = DescribePermission(
            permission.name,
          );
          const switchId = `permission-${permission.id}`;

          return (
            <div
              key={permission.id}
              className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
            >
              <Label
                htmlFor={switchId}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="text-sm font-medium text-foreground">
                  {permissionLabel}
                </span>
                {description && (
                  <span className="text-sm text-muted-foreground">
                    {description}
                  </span>
                )}
              </Label>
              <Switch
                id={switchId}
                checked={selectedIds.has(permission.id)}
                onCheckedChange={() => onToggle(permission.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleCard({ role, modules }: { role: RoleDTO; modules: ModuleDTO[] }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{HumanizeRoleName(role.name)}</CardTitle>
        {role.description && (
          <CardDescription>{role.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {modules.map((module) => (
            <PermissionModuleSection
              key={module.id}
              module={module}
              selectedIds={selectedIds}
              onToggle={toggle}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
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
      </CardContent>
    </Card>
  );
}

// Matches RoleCard's title + module-section + save-button shape. Two
// cards — the app only ever seeds two roles (Manager, Inventory Manager),
// see docs/DECISIONS.md "RBAC modeled as data".
function RoleCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static group count, never reordered
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-border p-3"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
        <Skeleton className="h-8 w-28" />
      </CardContent>
    </Card>
  );
}

export function RoleManager() {
  const { data, isLoading } = useRoles();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <RoleCardSkeleton />
        <RoleCardSkeleton />
      </div>
    );
  }

  if (!data?.roles.length) {
    return <p className="text-sm text-muted-foreground">No roles found.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {data.roles.map((role) => (
        <RoleCard key={role.id} role={role} modules={data.modules} />
      ))}
    </div>
  );
}
