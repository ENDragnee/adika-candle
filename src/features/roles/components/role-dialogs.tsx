"use client";

import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HumanizeRoleName } from "@/lib/roles";
import {
  useCreateRole,
  useDeleteRole,
  useUpdateRole,
} from "../hooks/use-roles";
import type { RoleDTO } from "../validators/role.schema";

const NONE = "__none__";

// "New role" (Epic 22): a name, an optional description, and optionally
// another role to start from — copying "Inventory Manager" and trimming it
// is quicker and safer than ticking twenty switches from nothing.
export function CreateRoleDialog({
  roles,
  onCreated,
}: {
  roles: RoleDTO[];
  onCreated: (roleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState(NONE);
  const createRole = useCreateRole();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const role = await createRole.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      copyFromRoleId: copyFrom === NONE ? undefined : copyFrom,
    });
    setName("");
    setDescription("");
    setCopyFrom(NONE);
    setOpen(false);
    onCreated(role.id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0 md:w-full">
          <PlusIcon data-icon="inline-start" />
          New role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New role</DialogTitle>
            <DialogDescription>
              A role is a set of things people can do. After creating it, pick
              its permissions, then assign it to people under Users.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="role-name"
              placeholder="e.g. Sales Clerk"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-description" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="role-description"
              placeholder="What people with this role do"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-copy" className="text-sm font-medium">
              Start with permissions from
            </label>
            <Select value={copyFrom} onValueChange={setCopyFrom}>
              <SelectTrigger id="role-copy" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nothing — I'll choose them</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {HumanizeRoleName(role.name)} ({role.permissionIds.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createRole.isPending}
              disabled={name.trim().length < 2}
            >
              Create role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditRoleDialog({ role }: { role: RoleDTO }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const updateRole = useUpdateRole(role.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateRole.mutateAsync({
      ...(!role.isBuiltIn && { name: name.trim() }),
      description: description.trim() || null,
    });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName(role.name);
          setDescription(role.description ?? "");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <PencilSimpleIcon data-icon="inline-start" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            {role.isBuiltIn && (
              <DialogDescription>
                Built-in roles keep their name; you can change the description.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-role-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="edit-role-name"
              value={role.isBuiltIn ? HumanizeRoleName(role.name) : name}
              onChange={(event) => setName(event.target.value)}
              disabled={role.isBuiltIn}
              maxLength={60}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-role-description"
              className="text-sm font-medium"
            >
              Description
            </label>
            <Input
              id="edit-role-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updateRole.isPending}
              disabled={!role.isBuiltIn && name.trim().length < 2}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete is offered only for custom roles; while anyone holds the role the
// dialog explains why it can't go yet instead of offering the button.
export function DeleteRoleDialog({
  role,
  onDeleted,
}: {
  role: RoleDTO;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const deleteRole = useDeleteRole(role.id);
  const inUse = role.userCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <TrashIcon data-icon="inline-start" />
        Delete
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {inUse ? "This role is still in use" : `Delete "${role.name}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {inUse
              ? `${role.userCount === 1 ? "1 person has" : `${role.userCount} people have`} this role. Give them another role under Users first, then delete it.`
              : "This can't be undone. Nobody has this role, so no one loses access."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{inUse ? "Close" : "Cancel"}</AlertDialogCancel>
          {!inUse && (
            <Button
              variant="destructive"
              loading={deleteRole.isPending}
              onClick={async () => {
                await deleteRole.mutateAsync();
                setOpen(false);
                onDeleted();
              }}
            >
              Delete role
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
