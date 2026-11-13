"use client";

import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  KeyIcon,
  PencilSimpleIcon,
  PlusIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { type FormEvent, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { TableContainer, TableSkeleton } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PasswordInput } from "@/components/ui/password-input";
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
import { HumanizeRoleName } from "@/features/roles/permission-labels";
import {
  useCreateUser,
  useSetUserPassword,
  useUpdateUser,
  useUsers,
} from "../hooks/use-users";
import type { UserDTO } from "../validators/user.schema";

function CreateUserForm({
  roles,
  onSuccess,
}: {
  roles: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");

  // `roles` arrives from useRoles() after this form's first render, so the
  // initial useState can't default to roles[0].id yet — sync it once the
  // list loads instead of leaving the select submitting an empty string.
  useEffect(() => {
    if (!roleId && roles.length > 0) {
      setRoleId(roles[0].id);
    }
  }, [roleId, roles]);
  const createUser = useCreateUser();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createUser.mutateAsync({
      name,
      email,
      username,
      roleId,
      password,
    });

    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
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
      <div className="flex flex-col gap-1">
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
      <div className="flex flex-col gap-1">
        <label htmlFor="new-user-username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="new-user-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-user-password" className="text-sm font-medium">
          Password
        </label>
        <PasswordInput
          id="new-user-password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters. Share it with the new user yourself.
        </p>
      </div>
      <div className="flex flex-col gap-1">
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
                {HumanizeRoleName(role.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}

function SetPasswordForm({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const setUserPassword = useSetUserPassword(userId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await setUserPassword.mutateAsync({ password });
    setPassword("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="set-user-password" className="text-sm font-medium">
          New password
        </label>
        <PasswordInput
          id="set-user-password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters. Takes effect immediately.
        </p>
      </div>
      <Button type="submit" disabled={setUserPassword.isPending}>
        {setUserPassword.isPending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}

function EditUserForm({
  user,
  roles,
  onSuccess,
}: {
  user: UserDTO;
  roles: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [roleId, setRoleId] = useState(user.roleId ?? "");
  const updateUser = useUpdateUser(user.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await updateUser.mutateAsync({ roleId });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-user-name" className="text-sm font-medium">
          Name
        </label>
        <Input id="edit-user-name" value={user.name} disabled />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-user-role" className="text-sm font-medium">
          Role
        </label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger id="edit-user-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {HumanizeRoleName(role.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={updateUser.isPending}>
        {updateUser.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const updateUser = useUpdateUser(user.id);

  async function handleActivate() {
    await updateUser.mutateAsync({ isActive: true });
  }

  async function handleConfirmDeactivate() {
    await updateUser.mutateAsync({ isActive: false });
    setIsConfirmOpen(false);
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
        {user.roleName ? HumanizeRoleName(user.roleName) : "No role"}
      </TableCell>
      <TableCell>{user.isActive ? "Active" : "Inactive"}</TableCell>
      <TableCell>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Actions"
                    disabled={isSelf}
                    title={
                      isSelf ? "You can't edit your own account" : undefined
                    }
                  >
                    <DotsThreeVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
                    <PencilSimpleIcon />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setIsPasswordOpen(true)}>
                    <KeyIcon />
                    Set password
                  </DropdownMenuItem>
                  {user.isActive ? (
                    <DropdownMenuItem
                      onSelect={() => setIsConfirmOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <ProhibitIcon />
                      Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={handleActivate}>
                      <CheckCircleIcon />
                      Activate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set password for {user.name}</DialogTitle>
                </DialogHeader>
                <SetPasswordForm
                  userId={user.id}
                  onSuccess={() => setIsPasswordOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{user.name}&rdquo; will no longer be able to sign in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeactivate}>
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
            </DialogHeader>
            <EditUserForm
              user={user}
              roles={roles}
              onSuccess={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

export function UserManager({ currentUserId }: { currentUserId: string }) {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: result, isLoading } = useUsers({ page });
  const users = result?.data;
  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Create user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
            </DialogHeader>
            <CreateUserForm
              roles={roles}
              onSuccess={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
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
