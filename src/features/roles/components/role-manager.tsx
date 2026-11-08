"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRoles, useUpdateRolePermissions } from "../hooks/use-roles";
import type { ModuleDTO, RoleDTO } from "../validators/role.schema";

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
    <div className="flex flex-col gap-3 border border-border p-3">
      <div>
        <h3 className="text-sm font-semibold">{role.name}</h3>
        {role.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {role.description}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {modules.map((module) => (
          <div key={module.id} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium capitalize">
              {module.name}
            </span>
            <div className="flex flex-wrap gap-3">
              {module.permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(permission.id)}
                    onChange={() => toggle(permission.id)}
                    className="size-4"
                  />
                  {permission.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || updatePermissions.isPending}
        >
          {updatePermissions.isPending ? "Saving…" : "Save"}
        </Button>
        {isDirty && (
          <Button size="sm" variant="ghost" onClick={handleReset}>
            Reset
          </Button>
        )}
      </div>
      {updatePermissions.isError && (
        <p className="text-sm text-destructive">
          {(
            updatePermissions.error as {
              response?: { data?: { error?: string } };
            }
          )?.response?.data?.error ?? "Couldn't save permissions."}
        </p>
      )}
    </div>
  );
}

export function RoleManager() {
  const { data, isLoading } = useRoles();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading roles…</p>;
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
