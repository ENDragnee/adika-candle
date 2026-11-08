"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableContainer, TableSkeleton } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRoles } from "@/features/roles/hooks/use-roles";
import { useCreateUser, useUpdateUser, useUsers } from "../hooks/use-users";
import type { UserDTO } from "../validators/user.schema";

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
      <Card>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="flex min-w-full flex-1 flex-col gap-1 sm:min-w-48">
              <label htmlFor="new-user-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="new-user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="flex min-w-full flex-1 flex-col gap-1 sm:min-w-48">
              <label htmlFor="new-user-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="new-user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="flex min-w-full flex-1 flex-col gap-1 sm:min-w-40">
              <label
                htmlFor="new-user-username"
                className="text-sm font-medium"
              >
                Username
              </label>
              <Input
                id="new-user-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div className="flex min-w-full flex-1 flex-col gap-1 sm:min-w-40">
              <label htmlFor="new-user-role" className="text-sm font-medium">
                Role
              </label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="new-user-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createUser.isPending}>
              <PlusIcon data-icon="inline-start" />
              {createUser.isPending ? "Creating…" : "Create user"}
            </Button>
            {createUser.isError && (
              <p className="w-full text-sm text-destructive">
                Couldn&apos;t create user — check the email/username aren&apos;t
                already in use.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
      {temporaryPassword && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm">
            <span>
              Temporary password (shown once — share it with the new user):
            </span>
            <code className="rounded-md bg-muted px-2 py-1 font-mono">
              {temporaryPassword}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTemporaryPassword(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
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
    <TableRow>
      <TableCell>
        {user.name}
        {isSelf && (
          <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell className="text-muted-foreground">
        {user.username ?? "—"}
      </TableCell>
      <TableCell>
        <Select
          value={user.roleId ?? ""}
          onValueChange={handleRoleChange}
          disabled={isSelf || updateUser.isPending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>{user.isActive ? "Active" : "Inactive"}</TableCell>
      <TableCell>
        <Button
          size="sm"
          variant={user.isActive ? "destructive" : "secondary"}
          onClick={handleToggleActive}
          disabled={isSelf || updateUser.isPending}
          title={isSelf ? "You can't deactivate your own account" : undefined}
        >
          {user.isActive ? "Deactivate" : "Activate"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function UserManager({ currentUserId }: { currentUserId: string }) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useUsers({ page });
  const users = result?.data;
  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles ?? [];

  return (
    <div className="flex flex-col gap-4">
      <CreateUserForm roles={roles} />
      {isLoading ? (
        <TableSkeleton columns={6} mobileCard={false} />
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-muted/50">Name</TableHead>
                  <TableHead className="bg-muted/50">Email</TableHead>
                  <TableHead className="bg-muted/50">Username</TableHead>
                  <TableHead className="bg-muted/50">Role</TableHead>
                  <TableHead className="bg-muted/50">Status</TableHead>
                  <TableHead className="bg-muted/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            page={page}
            totalPages={result?.pagination.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
