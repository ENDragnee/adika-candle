"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ExportMenu } from "@/components/ui/export-menu";
import { Section } from "@/components/ui/section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ToneBadge } from "@/components/ui/tone-badge";
import { type DateRangeValue, ResolveDateRange } from "@/lib/date-range";
import type { ExportColumn } from "@/lib/export/export-column";
import {
  FormatKg,
  FormatNumber,
  FormatPercent,
  FormatSignedKg,
} from "@/lib/format";
import { useProductionReport } from "../hooks/use-analytics";
import type {
  MaterialProductionRowDTO,
  ProductProductionRowDTO,
  ReportGranularity,
} from "../validators/analytics.schema";
import { TrendLineChart } from "./trend-line-chart";

const GRANULARITY_OPTIONS: {
  value: ReportGranularity | "CUSTOM";
  label: string;
}[] = [
  { value: "DAY", label: "Daily" },
  { value: "WEEK", label: "Weekly" },
  { value: "MONTH", label: "Monthly" },
  { value: "CUSTOM", label: "Custom range" },
];

const CURRENT_LABEL: Record<ReportGranularity, string> = {
  DAY: "Today",
  WEEK: "This week",
  MONTH: "This month",
};

// |variance| up to this is normal production noise; beyond it is worth a
// look (a judgment call — see docs/DECISIONS.md, "Epic 21 decisions").
const VARIANCE_WARNING_PERCENT = 10;

function VarianceBadge({ value }: { value: string | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const number = Number(value);
  const tone =
    Math.abs(number) <= VARIANCE_WARNING_PERCENT ? "good" : "warning";
  return (
    <ToneBadge tone={tone}>{FormatPercent(number, { signed: true })}</ToneBadge>
  );
}

function AdjustedCell({ value }: { value: string }) {
  return Number(value) === 0 ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span className="font-medium">{FormatSignedKg(value)}</span>
  );
}

function BuildMaterialColumns(
  showAdjusted: boolean,
): DataTableColumn<MaterialProductionRowDTO>[] {
  return [
    { key: "name", header: "Material", cell: (row) => row.materialName },
    {
      key: "opening",
      header: "Opening",
      cell: (row) => FormatKg(row.openingKg),
      className: "text-right tabular-nums",
    },
    {
      key: "received",
      header: "Received",
      cell: (row) => FormatKg(row.receivedKg),
      className: "text-right tabular-nums",
    },
    {
      key: "consumption",
      header: "Used",
      cell: (row) => FormatKg(row.consumedKg),
      className: "text-right tabular-nums",
    },
    ...(showAdjusted
      ? [
          {
            key: "adjusted",
            header: "Count corrections",
            cell: (row: MaterialProductionRowDTO) => (
              <AdjustedCell value={row.adjustedKg} />
            ),
            className: "text-right tabular-nums",
          },
        ]
      : []),
    {
      key: "closing",
      header: "Closing",
      cell: (row) => FormatKg(row.closingKg),
      className: "text-right font-medium tabular-nums",
    },
  ];
}

function BuildProductColumns(
  showAdjusted: boolean,
): DataTableColumn<ProductProductionRowDTO>[] {
  return [
    {
      key: "name",
      header: "Product",
      cell: (row) => (
        <span>
          {row.productName}{" "}
          <span className="text-muted-foreground">{row.productSku}</span>
        </span>
      ),
    },
    {
      key: "opening",
      header: "Opening",
      cell: (row) => FormatKg(row.openingKg),
      className: "text-right tabular-nums",
    },
    {
      key: "received",
      header: "Produced",
      cell: (row) => FormatKg(row.receivedKg),
      className: "text-right tabular-nums",
    },
    {
      key: "consumption",
      header: "Sold",
      cell: (row) => FormatKg(row.consumedKg),
      className: "text-right tabular-nums",
    },
    ...(showAdjusted
      ? [
          {
            key: "adjusted",
            header: "Count corrections",
            cell: (row: ProductProductionRowDTO) => (
              <AdjustedCell value={row.adjustedKg} />
            ),
            className: "text-right tabular-nums",
          },
        ]
      : []),
    {
      key: "closing",
      header: "Closing",
      cell: (row) => FormatKg(row.closingKg),
      className: "text-right font-medium tabular-nums",
    },
    {
      key: "expected",
      header: "Expected output",
      cell: (row) =>
        row.expectedOutputKg === null ? "—" : FormatKg(row.expectedOutputKg),
      className: "text-right tabular-nums text-muted-foreground",
    },
    {
      key: "variance",
      header: "Variance",
      cell: (row) => <VarianceBadge value={row.variancePercent} />,
    },
  ];
}

const materialExportColumns: ExportColumn<MaterialProductionRowDTO>[] = [
  { header: "Material", value: (row) => row.materialName },
  { header: "Opening (kg)", value: (row) => row.openingKg },
  { header: "Received (kg)", value: (row) => row.receivedKg },
  { header: "Used (kg)", value: (row) => row.consumedKg },
  { header: "Count corrections (kg)", value: (row) => row.adjustedKg },
  { header: "Closing (kg)", value: (row) => row.closingKg },
];

const productExportColumns: ExportColumn<ProductProductionRowDTO>[] = [
  { header: "Product", value: (row) => row.productName },
  { header: "SKU", value: (row) => row.productSku },
  { header: "Opening (kg)", value: (row) => row.openingKg },
  { header: "Produced (kg)", value: (row) => row.receivedKg },
  { header: "Sold (kg)", value: (row) => row.consumedKg },
  { header: "Count corrections (kg)", value: (row) => row.adjustedKg },
  { header: "Closing (kg)", value: (row) => row.closingKg },
  {
    header: "Expected output (kg)",
    value: (row) => row.expectedOutputKg ?? "",
  },
  { header: "Variance %", value: (row) => row.variancePercent ?? "" },
];

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

type Mode = ReportGranularity | "CUSTOM";

export function ProductionTab() {
  const [mode, setMode] = useState<Mode>("DAY");
  const [offset, setOffset] = useState(0);
  // Custom range mode (Epic 22): one report for the whole range, with a
  // daily (or weekly, for long ranges) trend.
  const [range, setRange] = useState<DateRangeValue>({ preset: "30d" });
  const granularity: ReportGranularity = mode === "CUSTOM" ? "DAY" : mode;
  const { data, isLoading, isFetching } = useProductionReport(
    granularity,
    offset,
    true,
    mode === "CUSTOM" ? ResolveDateRange(range) : {},
  );

  const showMaterialAdjusted =
    data?.materials.some((row) => Number(row.adjustedKg) !== 0) ?? false;
  const showProductAdjusted =
    data?.products.some((row) => Number(row.adjustedKg) !== 0) ?? false;
  const materialColumns = BuildMaterialColumns(showMaterialAdjusted);
  const productColumns = BuildProductColumns(showProductAdjusted);

  const totalUsed =
    data?.materials.reduce((sum, row) => sum + Number(row.consumedKg), 0) ?? 0;
  const totalProduced =
    data?.products.reduce((sum, row) => sum + Number(row.receivedKg), 0) ?? 0;
  const totalSold =
    data?.products.reduce((sum, row) => sum + Number(row.consumedKg), 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {mode === "CUSTOM" ? (
          <DateRangeFilter
            value={range}
            onChange={setRange}
            presets={["7d", "30d", "month", "last-month", "90d", "year"]}
            className="w-60"
          />
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous period"
              onClick={() => setOffset((value) => value - 1)}
            >
              <CaretLeftIcon />
            </Button>
            <div className="min-w-40 px-2 text-center">
              <div className="text-sm font-semibold">
                {data?.periodLabel ?? "…"}
              </div>
              <div className="text-xs text-muted-foreground">
                {offset === 0
                  ? CURRENT_LABEL[granularity]
                  : isFetching
                    ? "Loading…"
                    : "Past period"}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next period"
              disabled={!data?.hasNext}
              onClick={() => setOffset((value) => Math.min(0, value + 1))}
            >
              <CaretRightIcon />
            </Button>
            {offset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
                {CURRENT_LABEL[granularity]}
              </Button>
            )}
          </div>
        )}
        <Select
          value={mode}
          onValueChange={(value) => {
            setMode(value as Mode);
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Report period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRANULARITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label="Raw material used" value={FormatKg(totalUsed)} />
        <SummaryTile label="Candles produced" value={FormatKg(totalProduced)} />
        <SummaryTile label="Candles sold" value={FormatKg(totalSold)} />
      </div>

      <Section
        title="Material used vs. candles produced"
        description="Kilograms per period, ending with the selected one."
      >
        {isLoading || !data ? (
          <CardSkeleton />
        ) : (
          <TrendLineChart
            points={data.trend.map((point) => ({
              key: point.periodKey,
              label: point.periodLabel,
              values: {
                consumed: Number(point.materialConsumedKg),
                output: Number(point.productActualOutputKg),
              },
            }))}
            series={[
              {
                key: "consumed",
                label: "Material used",
                color: "var(--color-chart-series-1)",
              },
              {
                key: "output",
                label: "Candles produced",
                color: "var(--color-chart-series-2)",
              },
            ]}
            valueFormatter={FormatKg}
            axisFormatter={(value) => FormatNumber(value, 0)}
          />
        )}
      </Section>

      <Section
        title="Raw materials"
        description="Opening + Received − Used ± Count corrections = Closing, like the paper Daily Stock Report."
        actions={
          data && (
            <ExportMenu
              filename="production-materials"
              title={`Production — raw materials — ${data.periodLabel}`}
              columns={materialExportColumns}
              rows={data.materials}
            />
          )
        }
      >
        {isLoading || !data ? (
          <TableSkeleton columns={materialColumns.length} />
        ) : (
          <DataTable
            clientPageSize={20}
            columns={materialColumns}
            data={data.materials}
            getRowKey={(row) => row.materialId}
            emptyMessage="No raw materials yet."
          />
        )}
      </Section>

      <Section
        title="Finished goods"
        description="Expected output comes from each product's recipe and the material used. Variance beyond ±10% is highlighted."
        actions={
          data && (
            <ExportMenu
              filename="production-products"
              title={`Production — finished goods — ${data.periodLabel}`}
              columns={productExportColumns}
              rows={data.products}
            />
          )
        }
      >
        {isLoading || !data ? (
          <TableSkeleton columns={productColumns.length} />
        ) : (
          <DataTable
            clientPageSize={20}
            columns={productColumns}
            data={data.products}
            getRowKey={(row) => row.productId}
            emptyMessage="No products yet."
          />
        )}
      </Section>
    </div>
  );
}
