"use client";

import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  KeyIcon,
  LockOpenIcon,
  PencilSimpleIcon,
  PlusIcon,
  ProhibitIcon,
  SignOutIcon,
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
import { PasswordField, PasswordIsValid } from "@/components/ui/password-field";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToneBadge } from "@/components/ui/tone-badge";
import { useRoles } from "@/features/roles/hooks/use-roles";
import { HumanizeRoleName } from "@/features/roles/permission-labels";
import { useRevokeSessions } from "@/features/sessions/hooks/use-sessions";
import { FormatDateTime } from "@/lib/format";
import { usePagination } from "@/lib/use-pagination";
import {
  useCreateUser,
  useSetUserPassword,
  useUnlockUser,
  useUpdateUser,
  useUsers,
} from "../hooks/use-users";
import type { UserDTO } from "../validators/user.schema";

// "Ask them to choose their own password" (Epic 24): on by default
// whenever someone sets a password for another person.
// "14:05" today, otherwise the full date and time.
function FormatTime(value: string): string {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Addis_Ababa",
      })
    : FormatDateTime(value);
}

function RequireChangeSwitch({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
    >
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-label="Require a new password at next sign-in"
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">
          Require a new password at next sign-in
        </span>
        <span className="text-xs text-muted-foreground">
          They'll pick their own before they can use the app, so nobody else
          knows it.
        </span>
      </span>
    </label>
  );
}

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
  const [requireChange, setRequireChange] = useState(true);

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
      requirePasswordChange: requireChange,
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
      <PasswordField
        id="new-user-password"
        label="Password"
        value={password}
        onChange={setPassword}
        context={{ personal: [name, username, email] }}
      />
      <RequireChangeSwitch
        id="new-user-require-change"
        checked={requireChange}
        onChange={setRequireChange}
      />
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
      <Button
        loading={createUser.isPending}
        type="submit"
        disabled={
          createUser.isPending ||
          !PasswordIsValid(password, { personal: [name, username, email] })
        }
      >
        {createUser.isPending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}

// Manager-only reset (Epic 22): the new password twice, the same rules
// the API enforces (live checklist), and — on by default — signing the
// person out of every device, so the old password or a lost phone can't
// keep a session open.
function SetPasswordForm({
  user,
  isSelf,
  onSuccess,
}: {
  user: UserDTO;
  isSelf: boolean;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutEverywhere, setSignOutEverywhere] = useState(true);
  const [requireChange, setRequireChange] = useState(true);
  const setUserPassword = useSetUserPassword(user.id);
  const context = { personal: [user.name, user.username, user.email] };
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = PasswordIsValid(password, context) && confirm === password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    await setUserPassword.mutateAsync({
      password,
      confirmPassword: confirm,
      signOutEverywhere,
      requirePasswordChange: !isSelf && requireChange,
    });
    setPassword("");
    setConfirm("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PasswordField
        id="set-user-password"
        label="New password"
        value={password}
        onChange={setPassword}
        context={context}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-user-password" className="text-sm font-medium">
          Type it again
        </label>
        <PasswordInput
          id="confirm-user-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={mismatch}
          aria-describedby="confirm-user-password-hint"
          required
        />
        {mismatch && (
          <p
            id="confirm-user-password-hint"
            className="text-xs text-destructive"
            role="alert"
          >
            The two passwords don't match.
          </p>
        )}
      </div>
      <label
        htmlFor="sign-out-everywhere"
        className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
      >
        <Switch
          id="sign-out-everywhere"
          checked={signOutEverywhere}
          onCheckedChange={setSignOutEverywhere}
          aria-label="Sign out everywhere"
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Sign out everywhere</span>
          <span className="text-xs text-muted-foreground">
            {isSelf
              ? "Ends your sessions on other devices. You stay signed in here."
              : `${user.name} will need to sign in again with the new password on every device.`}
          </span>
        </span>
      </label>
      {!isSelf && (
        <RequireChangeSwitch
          id="set-password-require-change"
          checked={requireChange}
          onChange={setRequireChange}
        />
      )}
      <Button
        loading={setUserPassword.isPending}
        type="submit"
        disabled={!canSubmit}
      >
        Set password
      </Button>
    </form>
  );
}

// Name, username and role (Epic 23). Email stays fixed — it's the
// account's identity in better-auth; people sign in by username. Your own
// role can't be changed here (self-lockout guard).
function EditUserForm({
  user,
  roles,
  isSelf,
  onSuccess,
}: {
  user: UserDTO;
  roles: { id: string; name: string }[];
  isSelf: boolean;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [roleId, setRoleId] = useState(user.roleId ?? "");
  const updateUser = useUpdateUser(user.id);
  const usernameValid = /^[a-zA-Z0-9_.]{3,30}$/.test(username.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await updateUser.mutateAsync({
      ...(name.trim() !== user.name && { name: name.trim() }),
      ...(username.trim() !== (user.username ?? "") && {
        username: username.trim(),
      }),
      ...(!isSelf && roleId !== (user.roleId ?? "") && { roleId }),
    });
    onSuccess();
  }

  // The current role stays listed even if it's no longer one the viewer
  // could hand out, so the select never shows blank.
  const roleOptions =
    user.roleId && !roles.some((role) => role.id === user.roleId)
      ? [{ id: user.roleId, name: user.roleName ?? "Current role" }, ...roles]
      : roles;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-user-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="edit-user-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={160}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-user-username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="edit-user-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          aria-invalid={username.length > 0 && !usernameValid}
          aria-describedby="edit-user-username-hint"
          required
        />
        <p
          id="edit-user-username-hint"
          className="text-xs text-muted-foreground"
        >
          3–30 letters, numbers, underscores or dots. They sign in with this.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-user-email" className="text-sm font-medium">
          Email
        </label>
        <Input id="edit-user-email" value={user.email} disabled />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-user-role" className="text-sm font-medium">
          Role
        </label>
        <Select value={roleId} onValueChange={setRoleId} disabled={isSelf}>
          <SelectTrigger id="edit-user-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {HumanizeRoleName(role.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSelf && (
          <p className="text-xs text-muted-foreground">
            You can't change your own role.
          </p>
        )}
      </div>
      <Button
        loading={updateUser.isPending}
        type="submit"
        disabled={!name.trim() || !usernameValid}
      >
        Save
      </Button>
    </form>
  );
}

function UserRow({
  user,
  roles,
  isSelf,
  canManageSessions,
  canManageSystem,
}: {
  user: UserDTO;
  roles: { id: string; name: string }[];
  isSelf: boolean;
  canManageSessions: boolean;
  canManageSystem: boolean;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const updateUser = useUpdateUser(user.id);
  const revokeSessions = useRevokeSessions();
  const unlockUser = useUnlockUser(user.id);

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
      <TableCell>
        <span className="flex flex-wrap items-center gap-1.5">
          {user.isActive ? "Active" : "Inactive"}
          {user.lockedUntil && (
            <ToneBadge tone="critical">
              Locked until {FormatTime(user.lockedUntil)}
            </ToneBadge>
          )}
          {user.mustChangePassword && (
            <ToneBadge tone="warning">New password pending</ToneBadge>
          )}
        </span>
      </TableCell>
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
                    disabled={!user.canManage}
                    title={
                      user.canManage
                        ? undefined
                        : "This account has access your role doesn't, so you can't change it"
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
                  {canManageSystem && user.lockedUntil && (
                    <DropdownMenuItem onSelect={() => unlockUser.mutate()}>
                      <LockOpenIcon />
                      Unlock
                    </DropdownMenuItem>
                  )}
                  {canManageSessions && (
                    <DropdownMenuItem onSelect={() => setIsSignOutOpen(true)}>
                      <SignOutIcon />
                      {isSelf
                        ? "Sign out other devices"
                        : "Sign out everywhere"}
                    </DropdownMenuItem>
                  )}
                  {isSelf ? null : user.isActive ? (
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
                  user={user}
                  isSelf={isSelf}
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
              isSelf={isSelf}
              onSuccess={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <AlertDialog open={isSignOutOpen} onOpenChange={setIsSignOutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isSelf
                  ? "Sign out your other devices?"
                  : `Sign ${user.name} out everywhere?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isSelf
                  ? "Every other device you're signed in on is signed out. You stay signed in here."
                  : "Every device they're signed in on is signed out on its next request. Their account stays active."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                loading={revokeSessions.isPending}
                onClick={async () => {
                  await revokeSessions.mutateAsync({ userId: user.id });
                  setIsSignOutOpen(false);
                }}
              >
                Sign out
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function UserManager({
  currentUserId,
  canManageSessions = false,
  canManageSystem = false,
}: {
  currentUserId: string;
  canManageSessions?: boolean;
  canManageSystem?: boolean;
}) {
  const pager = usePagination();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: result, isLoading } = useUsers(pager.params);
  const users = result?.data;
  const { data: rolesData } = useRoles();
  // Only roles the viewer could hand out (access containment, Epic 23).
  const roles = (rolesData?.roles ?? []).filter((role) => role.canEdit);

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
                      canManageSessions={canManageSessions}
                      canManageSystem={canManageSystem}
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
          <Pagination {...pager.Bind(result?.pagination)} />
        </>
      )}
    </div>
  );
}
