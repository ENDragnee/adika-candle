"use client";

import {
  ArrowCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  LockIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportMenu } from "@/components/ui/export-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToneBadge } from "@/components/ui/tone-badge";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useProducts } from "@/features/products/hooks/use-products";
import { BusinessDateKey } from "@/lib/business-time";
import {
  type DateRangePreset,
  type DateRangeValue,
  ResolveDateRange,
} from "@/lib/date-range";
import type { ExportColumn } from "@/lib/export/export-column";
import {
  FormatDateTime,
  FormatKg,
  FormatMoney,
  FormatNumber,
  Pluralize,
} from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useDebounce } from "@/lib/use-debounce";
import { usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";
import { useSales } from "../hooks/use-sales";
import { PAYMENT_TYPE_META } from "../labels";
import { FetchSales, type SalesQueryParams } from "../services/sale.service";
import type { SaleDTO } from "../validators/sale.schema";
import { RestoreSaleDialog } from "./restore-sale-dialog";
import { SaleDetailsDialog } from "./sale-details-dialog";
import { VoidSaleDialog } from "./void-sale-dialog";

// Any preset the shared date filter knows (Epic 22) — the page can
// start on one, e.g. ?range=today from the Dashboard.
export type SaleRange = Exclude<DateRangePreset, "custom">;

const ALL = "__all__";

// A sale dated on or before the lock date is in a closed period (Epic
// 24): it can't be voided or restored, so the actions are hidden.
function IsLocked(sale: SaleDTO, lockedThrough: string | null): boolean {
  return (
    lockedThrough !== null &&
    BusinessDateKey(new Date(sale.createdAt)) <= lockedThrough
  );
}

function SaleActions({
  sale,
  canVoid,
  canRestore,
  lockedThrough,
  linkBase,
}: {
  sale: SaleDTO;
  canVoid: boolean;
  canRestore: boolean;
  lockedThrough: string | null;
  linkBase: string;
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const locked = IsLocked(sale, lockedThrough);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Sale actions">
            <DotsThreeVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsDetailsOpen(true)}>
            <EyeIcon />
            View details
          </DropdownMenuItem>
          {locked && (canVoid || canRestore) && (
            <DropdownMenuItem disabled>
              <LockIcon />
              Period closed
            </DropdownMenuItem>
          )}
          {canRestore && sale.voidedAt && !locked && (
            <DropdownMenuItem onSelect={() => setIsRestoreOpen(true)}>
              <ArrowCounterClockwiseIcon />
              Restore sale
            </DropdownMenuItem>
          )}
          {canVoid && !sale.voidedAt && !locked && (
            <DropdownMenuItem
              onSelect={() => setIsVoidOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <ProhibitIcon />
              Void sale
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <SaleDetailsDialog
        sale={sale}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        linkBase={linkBase}
      />
      {canVoid && (
        <VoidSaleDialog
          sale={sale}
          open={isVoidOpen}
          onOpenChange={setIsVoidOpen}
        />
      )}
      {canRestore && sale.voidedAt && (
        <RestoreSaleDialog
          sale={sale}
          open={isRestoreOpen}
          onOpenChange={setIsRestoreOpen}
        />
      )}
    </>
  );
}

function BuildColumns({
  showProduct,
  showCustomer,
  canVoid,
  canRestore,
  lockedThrough,
  linkBase,
}: {
  showProduct: boolean;
  showCustomer: boolean;
  canVoid: boolean;
  canRestore: boolean;
  lockedThrough: string | null;
  linkBase: string;
}): DataTableColumn<SaleDTO>[] {
  return [
    {
      key: "date",
      header: "Sale",
      cell: (sale) => (
        <span className="flex flex-col">
          <span className={cn(sale.voidedAt && "text-muted-foreground")}>
            {FormatDateTime(sale.createdAt)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {sale.referenceCode}
          </span>
        </span>
      ),
    },
    ...(showProduct || showCustomer
      ? [
          {
            key: "item",
            header: showProduct ? "Product" : "Customer",
            cell: (sale: SaleDTO) => (
              <span className="flex flex-col">
                <span
                  className={cn(sale.voidedAt && "line-through opacity-60")}
                >
                  {showProduct
                    ? sale.productName
                    : (sale.customerName ?? "Walk-in")}
                </span>
                {showProduct && showCustomer && (
                  <span className="text-xs text-muted-foreground">
                    {sale.customerName ?? "Walk-in"}
                  </span>
                )}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "quantity",
      header: "Quantity",
      cell: (sale) => (
        <span className="flex flex-col tabular-nums">
          <span>{FormatKg(sale.quantityKg)}</span>
          <span className="text-xs text-muted-foreground">
            {FormatNumber(sale.inputQuantity)} {sale.inputUnitName}
          </span>
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      cell: (sale) => (
        <span
          className={cn(
            "font-medium tabular-nums",
            sale.voidedAt && "line-through opacity-60",
          )}
        >
          {FormatMoney(sale.totalAmount)}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "payment",
      header: "Payment",
      cell: (sale) =>
        sale.voidedAt ? (
          <ToneBadge tone="critical" title={sale.voidReason ?? undefined}>
            Voided
          </ToneBadge>
        ) : (
          <ToneBadge tone={PAYMENT_TYPE_META[sale.paymentType].tone}>
            {PAYMENT_TYPE_META[sale.paymentType].label}
          </ToneBadge>
        ),
    },
    {
      key: "by",
      header: "By",
      cell: (sale) => sale.createdByName ?? "—",
      className: "text-muted-foreground",
    },
    {
      key: "actions",
      header: "",
      cell: (sale) => (
        <SaleActions
          sale={sale}
          canVoid={canVoid}
          canRestore={canRestore}
          lockedThrough={lockedThrough}
          linkBase={linkBase}
        />
      ),
      className: "w-10",
    },
  ];
}

const exportColumns: ExportColumn<SaleDTO>[] = [
  { header: "Date", value: (sale) => FormatDateTime(sale.createdAt) },
  { header: "Reference", value: (sale) => sale.referenceCode },
  { header: "Product", value: (sale) => sale.productName },
  { header: "SKU", value: (sale) => sale.productSku },
  { header: "Customer", value: (sale) => sale.customerName ?? "Walk-in" },
  { header: "Quantity", value: (sale) => sale.inputQuantity },
  { header: "Unit", value: (sale) => sale.inputUnitName },
  { header: "Weight (kg)", value: (sale) => sale.quantityKg },
  { header: "Price / kg", value: (sale) => sale.unitPriceAtSale },
  { header: "Total", value: (sale) => sale.totalAmount },
  {
    header: "Payment",
    value: (sale) => PAYMENT_TYPE_META[sale.paymentType].label,
  },
  { header: "Recorded by", value: (sale) => sale.createdByName ?? "" },
  {
    header: "Status",
    value: (sale) => (sale.voidedAt ? `Voided: ${sale.voidReason}` : "Active"),
  },
];

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function SaleList({
  // When set (the Inventory Manager's "own recent sales" page), the list is
  // scoped to sales created by this user id. Omitted on /manager/sales,
  // which sees every sale — see SaleQuerySchema.
  createdById,
  // Fixed scope for a product's or customer's own Sales tab.
  productId,
  customerId,
  showFilters = false,
  canVoid = false,
  // Epic 24: Admin restore, and the closed-period date (from the System
  // page) after which void/restore are hidden.
  canRestore = false,
  lockedThrough = null,
  initialRange = "all",
  linkBase = "/manager",
}: {
  createdById?: string;
  productId?: string;
  customerId?: string;
  showFilters?: boolean;
  canVoid?: boolean;
  canRestore?: boolean;
  lockedThrough?: string | null;
  initialRange?: SaleRange;
  linkBase?: string;
}) {
  const pager = usePagination();
  const { setPage } = pager;
  const [range, setRange] = useState<DateRangeValue>({
    preset: initialRange,
  });
  const [productFilter, setProductFilter] = useState(ALL);
  const [customerFilter, setCustomerFilter] = useState(ALL);
  const [paymentFilter, setPaymentFilter] = useState(ALL);
  const [status, setStatus] = useState<"ACTIVE" | "VOIDED" | "ALL">("ACTIVE");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);

  const { data: products } = useProducts(
    showFilters && !productId ? { pageSize: MAX_PAGE_SIZE } : { pageSize: 1 },
  );
  const { data: customers } = useCustomers(
    showFilters && !customerId ? { pageSize: MAX_PAGE_SIZE } : { pageSize: 1 },
  );

  const query: SalesQueryParams = {
    ...ResolveDateRange(range),
    ...(createdById && { createdById }),
    ...((productId || productFilter !== ALL) && {
      productId: productId ?? productFilter,
    }),
    ...((customerId || customerFilter !== ALL) && {
      customerId: customerId ?? customerFilter,
    }),
    ...(paymentFilter !== ALL && {
      paymentType: paymentFilter as "CASH" | "LOAN",
    }),
    ...(debouncedSearch && { search: debouncedSearch }),
    status,
  };
  const {
    data: result,
    isLoading,
    isFetching,
  } = useSales({ ...query, ...pager.params });

  const columns = BuildColumns({
    showProduct: !productId,
    showCustomer: !customerId,
    canVoid,
    canRestore,
    lockedThrough,
    linkBase,
  });

  // Any filter change goes back to page 1.
  function Filter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  const summary = result?.summary;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter
          value={range}
          onChange={Filter(setRange)}
          presets={[
            "today",
            "yesterday",
            "7d",
            "30d",
            "month",
            "last-month",
            "all",
          ]}
          // Browsing sales history has no upper bound.
          maxDays={null}
          className="w-52"
        />
        {showFilters && !productId && (
          <Select
            value={productFilter}
            onValueChange={Filter(setProductFilter)}
          >
            <SelectTrigger className="w-44" aria-label="Product">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All products</SelectItem>
              {products?.data.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showFilters && !customerId && (
          <Select
            value={customerFilter}
            onValueChange={Filter(setCustomerFilter)}
          >
            <SelectTrigger className="w-44" aria-label="Customer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All customers</SelectItem>
              {customers?.data.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showFilters && (
          <Select
            value={paymentFilter}
            onValueChange={Filter(setPaymentFilter)}
          >
            <SelectTrigger className="w-36" aria-label="Payment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any payment</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="LOAN">On account</SelectItem>
            </SelectContent>
          </Select>
        )}
        {showFilters && (
          <Select
            value={status}
            onValueChange={Filter((v) =>
              setStatus(v as "ACTIVE" | "VOIDED" | "ALL"),
            )}
          >
            <SelectTrigger className="w-36" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active sales</SelectItem>
              <SelectItem value="VOIDED">Voided only</SelectItem>
              <SelectItem value="ALL">Active + voided</SelectItem>
            </SelectContent>
          </Select>
        )}
        {showFilters && (
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Reference…"
              aria-label="Search by reference"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-36 pl-7"
            />
          </div>
        )}
        <div className="ml-auto">
          <ExportMenu
            filename="sales"
            title="Sales"
            columns={exportColumns}
            rows={() =>
              FetchSales({ ...query, pageSize: MAX_PAGE_SIZE }).then(
                (page) => page.data,
              )
            }
          />
        </div>
      </div>

      {summary && (
        <div
          className={cn(
            "grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3 sm:grid-cols-4",
            isFetching && "opacity-70",
          )}
        >
          <SummaryStat
            label="Sales"
            value={Pluralize(summary.saleCount, "sale")}
          />
          <SummaryStat label="Weight" value={FormatKg(summary.totalKg)} />
          <SummaryStat label="Cash" value={FormatMoney(summary.cashAmount)} />
          <SummaryStat
            label="On account"
            value={FormatMoney(summary.onAccountAmount)}
          />
          <div className="col-span-2 flex items-baseline justify-between border-t border-border pt-2 sm:col-span-4">
            <span className="text-sm text-muted-foreground">
              Total{status !== "ACTIVE" && " (voided sales excluded)"}
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {FormatMoney(summary.totalAmount)}
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : (
        <DataTable
          columns={columns}
          data={result?.data ?? []}
          getRowKey={(sale) => sale.id}
          emptyMessage="No sales match these filters."
          pagination={pager.Bind(result?.pagination)}
        />
      )}
    </div>
  );
}
