"use client";

import {
  DesktopIcon,
  DeviceMobileIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
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
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ListSearch } from "@/components/ui/list-search";
import { ToneBadge } from "@/components/ui/tone-badge";
import { DescribeDevice } from "@/lib/describe-device";
import { FormatDateTime, FormatRelative } from "@/lib/format";
import { HumanizeRoleName } from "@/lib/roles";
import { usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";
import {
  useRevokeSession,
  useRevokeSessions,
  useSessions,
} from "../hooks/use-sessions";
import type { SessionDTO } from "../validators/session.schema";

function IsPhone(userAgent: string | null) {
  return !!userAgent && /Android|iPhone|iPad|Mobile/.test(userAgent);
}

// A confirm-then-act button; the dialog stays open while the request runs.
function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            loading={pending}
            onClick={async () => {
              await onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SessionActions({ session }: { session: SessionDTO }) {
  const revokeOne = useRevokeSession();
  const revokeUser = useRevokeSessions();

  if (session.isCurrent) {
    return <span className="text-xs text-muted-foreground">This device</span>;
  }
  if (!session.canRevoke) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title="This account has access your role doesn't"
      >
        Out of reach
      </span>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      <ConfirmAction
        trigger={(open) => (
          <Button variant="ghost" size="sm" onClick={open}>
            <SignOutIcon data-icon="inline-start" />
            End
          </Button>
        )}
        title={`Sign ${session.userName} out of this device?`}
        description="They'll need to sign in again on this device. Their other devices stay signed in."
        confirmLabel="End session"
        pending={revokeOne.isPending}
        onConfirm={() => revokeOne.mutateAsync(session.id)}
      />
      <ConfirmAction
        trigger={(open) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={open}
          >
            All devices
          </Button>
        )}
        title={`Sign ${session.userName} out everywhere?`}
        description="Every device they're signed in on is signed out on its next request."
        confirmLabel="Sign out everywhere"
        pending={revokeUser.isPending}
        onConfirm={() => revokeUser.mutateAsync({ userId: session.userId })}
      />
    </div>
  );
}

const columns: DataTableColumn<SessionDTO>[] = [
  {
    key: "user",
    header: "Person",
    cell: (session) => (
      <span className="flex flex-col">
        <span className="font-medium">
          {session.userName}
          {session.isCurrent && (
            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {[
            session.username,
            session.roleName ? HumanizeRoleName(session.roleName) : "No role",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    ),
  },
  {
    key: "device",
    header: "Device",
    cell: (session) => {
      const Icon = IsPhone(session.userAgent) ? DeviceMobileIcon : DesktopIcon;
      return (
        <span className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex flex-col">
            <span>{DescribeDevice(session.userAgent) ?? "Unknown device"}</span>
            <span className="text-xs text-muted-foreground">
              {session.ipAddress ?? "No IP recorded"}
            </span>
          </span>
        </span>
      );
    },
  },
  {
    key: "signedIn",
    header: "Signed in",
    cell: (session) => (
      <span title={FormatDateTime(session.createdAt)}>
        {FormatRelative(session.createdAt)}
      </span>
    ),
    className: "text-muted-foreground",
  },
  {
    key: "used",
    header: "Last used",
    cell: (session) =>
      session.isCurrent ? (
        <ToneBadge tone="good">Now</ToneBadge>
      ) : (
        <span title={FormatDateTime(session.updatedAt)}>
          {FormatRelative(session.updatedAt)}
        </span>
      ),
    className: "text-muted-foreground",
  },
  {
    key: "actions",
    header: "",
    cell: (session) => <SessionActions session={session} />,
    className: "text-right",
  },
];

// /manager/sessions (Epic 23, Admin): every signed-in device, with
// per-device and per-person sign-out, and a sign-everyone-out switch for
// a suspected break-in. Ending a session takes effect on that device's
// next request.
export function SessionManager() {
  const pager = usePagination();
  const { setPage } = pager;
  const [search, setSearch] = useState<string | undefined>(undefined);
  const {
    data: result,
    isLoading,
    isFetching,
  } = useSessions({ ...pager.params, search });
  const revokeEveryone = useRevokeSessions();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListSearch
          placeholder="Search person or IP…"
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          className="w-full sm:w-64"
        />
        <ConfirmAction
          trigger={(open) => (
            <Button variant="destructive" onClick={open}>
              <SignOutIcon data-icon="inline-start" />
              Sign everyone out
            </Button>
          )}
          title="Sign everyone out?"
          description="Every session except the one you're using now ends, on every device. Use this if you think an account or device has been compromised."
          confirmLabel="Sign everyone out"
          pending={revokeEveryone.isPending}
          onConfirm={() => revokeEveryone.mutateAsync({ everyone: true })}
        />
      </div>
      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : (
        <div className={cn(isFetching && "opacity-70 transition-opacity")}>
          <DataTable
            columns={columns}
            data={result?.data ?? []}
            getRowKey={(session) => session.id}
            emptyMessage="Nobody is signed in."
            pagination={pager.Bind(result?.pagination)}
          />
        </div>
      )}
    </div>
  );
}
