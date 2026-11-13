"use client";

import {
  DotsThreeVerticalIcon,
  HandCoinsIcon,
  PiggyBankIcon,
  ScalesIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportMenu } from "@/components/ui/export-menu";
import { ListSearch } from "@/components/ui/list-search";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatTile } from "@/features/analytics/components/stat-tile";
import type { ExportColumn } from "@/lib/export/export-column";
import {
  DescribeLoanBalance,
  FormatDate,
  FormatMoney,
  FormatRelative,
  Pluralize,
} from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";
import { useLoanAccounts } from "../hooks/use-loans";
import { FetchLoanAccounts } from "../services/loan.service";
import type {
  LoanAccountDTO,
  LoanBalanceFilter,
} from "../validators/loan.schema";
import { LoanBalance } from "./loan-balance-badge";
import { ManualAdjustmentForm } from "./manual-adjustment-form";
import { RepaymentForm } from "./repayment-form";

// A payment gap longer than this on an open debt is highlighted — same
// threshold as the Dashboard's "hasn't paid in 30+ days" attention item.
const STALE_DAYS = 30;

function IsStale(account: LoanAccountDTO): boolean {
  if (Number(account.balance) <= 0) return false;
  const reference = account.lastPaymentAt ?? account.updatedAt;
  return Date.now() - new Date(reference).getTime() > STALE_DAYS * 86_400_000;
}

function AccountActions({ account }: { account: LoanAccountDTO }) {
  const [dialog, setDialog] = useState<"payment" | "adjust" | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Account actions">
            <DotsThreeVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("payment")}>
            <WalletIcon />
            Record payment
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("adjust")}>
            <ScalesIcon />
            Correct balance
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/manager/customers/${account.customerId}`}>
              <HandCoinsIcon />
              Open account history
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "adjust" ? "Correct balance" : "Record payment"} —{" "}
              {account.customerName}
            </DialogTitle>
            <DialogDescription>
              {dialog === "adjust"
                ? "For fixing mistakes or carrying over an old balance. The reason is kept in the account history."
                : "Money the customer paid toward what they owe, or paid in advance."}
            </DialogDescription>
          </DialogHeader>
          {dialog === "adjust" ? (
            <ManualAdjustmentForm
              accountId={account.id}
              customerId={account.customerId}
              currentBalance={account.balance}
              onSuccess={() => setDialog(null)}
            />
          ) : (
            <RepaymentForm
              accountId={account.id}
              customerId={account.customerId}
              currentBalance={account.balance}
              onSuccess={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const columns: DataTableColumn<LoanAccountDTO>[] = [
  {
    key: "customer",
    header: "Customer",
    cell: (account) => (
      <span className="flex flex-col">
        <Link
          href={`/manager/customers/${account.customerId}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {account.customerName}
        </Link>
        {!account.customerIsActive && (
          <span className="text-xs text-muted-foreground">Inactive</span>
        )}
      </span>
    ),
  },
  {
    key: "balance",
    header: "Balance",
    cell: (account) => <LoanBalance balance={account.balance} />,
    className: "text-right",
  },
  {
    key: "lastPayment",
    header: "Last payment",
    cell: (account) => (
      <span
        className={cn(IsStale(account) && "font-medium")}
        style={
          IsStale(account)
            ? { color: "var(--color-status-critical)" }
            : undefined
        }
        title={
          account.lastPaymentAt ? FormatDate(account.lastPaymentAt) : undefined
        }
      >
        {account.lastPaymentAt
          ? FormatRelative(account.lastPaymentAt)
          : "Never"}
      </span>
    ),
  },
  {
    key: "activity",
    header: "Last activity",
    cell: (account) => FormatRelative(account.updatedAt),
    className: "text-muted-foreground",
  },
  {
    key: "actions",
    header: "",
    cell: (account) => <AccountActions account={account} />,
    className: "w-10",
  },
];

const exportColumns: ExportColumn<LoanAccountDTO>[] = [
  { header: "Customer", value: (account) => account.customerName },
  {
    header: "Status",
    value: (account) => DescribeLoanBalance(account.balance).label,
  },
  // Raw signed balance for spreadsheets: + owes you, − credit.
  {
    header: "Balance (+ owes you, − credit)",
    value: (account) => account.balance,
  },
  { header: "Last payment", value: (account) => account.lastPaymentAt ?? "" },
  { header: "Last activity", value: (account) => account.updatedAt },
];

const FILTERS: { value: LoanBalanceFilter; label: string }[] = [
  { value: "OWES", label: "Owe you" },
  { value: "CREDIT", label: "Have credit" },
  { value: "SETTLED", label: "Settled" },
  { value: "ALL", label: "All" },
];

// /manager/loans as a receivables view (Epic 21): totals for the whole
// book, filter by who owes whom, last-payment aging, and payment /
// correction actions on each row without leaving the page.
export function LoanOversightList() {
  const pager = usePagination();
  const { setPage } = pager;
  const [filter, setFilter] = useState<LoanBalanceFilter>("OWES");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const params = { ...pager.params, balance: filter, search };
  const { data: result, isLoading, isFetching } = useLoanAccounts(params);
  const summary = result?.summary;

  return (
    <div className="flex flex-col gap-6">
      {summary ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            icon={HandCoinsIcon}
            label="Customers owe you"
            value={Number(summary.owedToUs)}
            format={FormatMoney}
            hint={Pluralize(summary.debtorCount, "customer")}
          />
          <StatTile
            icon={PiggyBankIcon}
            label="Credit you hold for customers"
            value={Number(summary.customerCredit)}
            format={FormatMoney}
            hint={
              summary.creditCount > 0
                ? `${Pluralize(summary.creditCount, "customer")} paid in advance`
                : "No advances outstanding"
            }
          />
          <StatTile
            icon={ScalesIcon}
            label="Net owed to you"
            value={Number(summary.owedToUs) - Number(summary.customerCredit)}
            format={FormatMoney}
            hint="Owed to you minus credit held"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={filter}
            onValueChange={(value) => {
              setFilter(value as LoanBalanceFilter);
              setPage(1);
            }}
          >
            <TabsList>
              {FILTERS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <ListSearch
              placeholder="Search customer…"
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
              className="w-48"
            />
            <ExportMenu
              filename="customer-balances"
              title="Customer balances"
              columns={exportColumns}
              rows={() =>
                FetchLoanAccounts({
                  ...params,
                  page: 1,
                  pageSize: MAX_PAGE_SIZE,
                }).then((page) => page.data)
              }
            />
          </div>
        </div>
        {isLoading ? (
          <TableSkeleton columns={columns.length} />
        ) : (
          <div className={cn(isFetching && "opacity-70 transition-opacity")}>
            <DataTable
              columns={columns}
              data={result?.data ?? []}
              getRowKey={(account) => account.id}
              emptyMessage={
                filter === "OWES"
                  ? "No customer owes you anything."
                  : "No accounts match."
              }
              pagination={pager.Bind(result?.pagination)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
