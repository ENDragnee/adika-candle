"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToneBadge } from "@/components/ui/tone-badge";
import {
  FormatDateTime,
  FormatKg,
  FormatMoney,
  FormatNumber,
  FormatPercent,
} from "@/lib/format";
import { PAYMENT_TYPE_META } from "../labels";
import type { SaleDTO } from "../validators/sale.schema";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

// Everything recorded about one sale, including the snapshots taken at
// the time (unit ratio, price, cost) and, if voided, who voided it and why.
export function SaleDetailsDialog({
  sale,
  open,
  onOpenChange,
  linkBase,
}: {
  sale: SaleDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // "/manager" or "/inventory" — where product/customer links point.
  linkBase: string;
}) {
  const cost =
    sale.costPerKgAtSale === null
      ? null
      : Number(sale.costPerKgAtSale) * Number(sale.quantityKg);
  const profit = cost === null ? null : Number(sale.totalAmount) - cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Sale {sale.referenceCode}
            {sale.voidedAt && <ToneBadge tone="critical">Voided</ToneBadge>}
          </DialogTitle>
          <DialogDescription>
            Recorded {FormatDateTime(sale.createdAt)}
            {sale.createdByName && ` by ${sale.createdByName}`}
          </DialogDescription>
        </DialogHeader>
        {sale.voidedAt && (
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="font-medium">
              Voided {FormatDateTime(sale.voidedAt)}
              {sale.voidedByName && ` by ${sale.voidedByName}`}
            </p>
            <p className="text-muted-foreground">{sale.voidReason}</p>
          </div>
        )}
        <dl className="text-sm">
          <Row label="Product">
            {linkBase === "/manager" ? (
              <Link
                href={`/manager/products/${sale.productId}`}
                className="underline-offset-4 hover:underline"
              >
                {sale.productName}
              </Link>
            ) : (
              sale.productName
            )}
          </Row>
          <Row label="Customer">
            {sale.customerId ? (
              <Link
                href={`${linkBase}/customers/${sale.customerId}`}
                className="underline-offset-4 hover:underline"
              >
                {sale.customerName}
              </Link>
            ) : (
              "Walk-in"
            )}
          </Row>
          <Row label="Quantity">
            {FormatNumber(sale.inputQuantity)} {sale.inputUnitName} ×{" "}
            {FormatNumber(sale.inputRatioToKg)} kg = {FormatKg(sale.quantityKg)}
          </Row>
          <Row label="Price at sale">
            {FormatMoney(sale.unitPriceAtSale)} / kg
          </Row>
          <Row label="Payment">{PAYMENT_TYPE_META[sale.paymentType].label}</Row>
          <Row label="Total">
            <span className="font-semibold">
              {FormatMoney(sale.totalAmount)}
            </span>
          </Row>
          {linkBase === "/manager" && (
            <Row label="Profit">
              {profit === null ? (
                <span className="text-muted-foreground">No cost on record</span>
              ) : (
                `${FormatMoney(profit)} (${FormatPercent((profit / Number(sale.totalAmount)) * 100)})`
              )}
            </Row>
          )}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
