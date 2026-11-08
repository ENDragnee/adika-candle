"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/features/roles/hooks/use-roles";
import { useCreateUser, useUpdateUser, useUsers } from "../hooks/use-users";
import type { UserDTO } from "../validators/user.schema";

const inputClassName =
  "h-8 w-full rounded-none border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

function CreateUserForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [roleId, setRoleId] = useState("");

  // `roles` arrives from useRoles() after this form's first render, so the
  // initial useState can't default to roles[0].id yet — sync it once the
  // list loads instead of leaving the select submitting an empty string.
  useEffect(() => {
    if (!roleId && roles.length > 0) {
      setRoleId(roles[0].id);
    }
  }, [roleId, roles]);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const createUser = useCreateUser();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await createUser.mutateAsync({
      name,
      email,
      username,
      roleId,
    });

    setTemporaryPassword(result.temporaryPassword);
    setName("");
    setEmail("");
    setUsername("");
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-2 border border-border p-3"
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor="new-user-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="new-user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={inputClassName}
          />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor="new-user-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="new-user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={inputClassName}
          />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor="new-user-username" className="text-sm font-medium">
            Username
          </label>
          <input
            id="new-user-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            className={inputClassName}
          />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor="new-user-role" className="text-sm font-medium">
            Role
          </label>
          <select
            id="new-user-role"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            required
            className={inputClassName}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={createUser.isPending}>
          {createUser.isPending ? "Creating…" : "Create user"}
        </Button>
        {createUser.isError && (
          <p className="w-full text-sm text-destructive">
            Couldn&apos;t create user — check the email/username aren&apos;t
            already in use.
          </p>
        )}
      </form>
      {temporaryPassword && (
        <div className="flex flex-wrap items-center gap-2 border border-border bg-muted/50 p-3 text-sm">
          <span>
            Temporary password (shown once — share it with the new user):
          </span>
          <code className="rounded-none bg-background px-2 py-1 font-mono">
            {temporaryPassword}
          </code>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTemporaryPassword(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  roles,
  isSelf,
}: {
  user: UserDTO;
  roles: { id: string; name: string }[];
  isSelf: boolean;
}) {
  const updateUser = useUpdateUser(user.id);

  async function handleRoleChange(roleId: string) {
    await updateUser.mutateAsync({ roleId });
  }

  async function handleToggleActive() {
    await updateUser.mutateAsync({ isActive: !user.isActive });
  }

  return (
    <tr className="border-b border-border">
      <td className="p-2 text-sm">
        {user.name}
        {isSelf && (
          <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
        )}
      </td>
      <td className="p-2 text-sm text-muted-foreground">{user.email}</td>
      <td className="p-2 text-sm text-muted-foreground">
        {user.username ?? "—"}
      </td>
      <td className="p-2">
        <select
          value={user.roleId ?? ""}
          onChange={(event) => handleRoleChange(event.target.value)}
          disabled={isSelf || updateUser.isPending}
          className={inputClassName}
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2 text-sm">{user.isActive ? "Active" : "Inactive"}</td>
      <td className="p-2">
        <Button
          size="sm"
          variant={user.isActive ? "destructive" : "secondary"}
          onClick={handleToggleActive}
          disabled={isSelf || updateUser.isPending}
          title={isSelf ? "You can't deactivate your own account" : undefined}
        >
          {user.isActive ? "Deactivate" : "Activate"}
        </Button>
      </td>
    </tr>
  );
}

export function UserManager({ currentUserId }: { currentUserId: string }) {
  const { data: users, isLoading } = useUsers();
  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles ?? [];

  return (
    <div className="flex flex-col gap-4">
      <CreateUserForm roles={roles} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-2 text-sm font-medium">Name</th>
                <th className="p-2 text-sm font-medium">Email</th>
                <th className="p-2 text-sm font-medium">Username</th>
                <th className="p-2 text-sm font-medium">Role</th>
                <th className="p-2 text-sm font-medium">Status</th>
                <th className="p-2 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.length ? (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    roles={roles}
                    isSelf={user.id === currentUserId}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-3 text-center text-sm text-muted-foreground"
                  >
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
