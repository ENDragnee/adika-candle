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
import { usePackingUnit } from "@/components/ui/packing-unit-toggle";
import { Section } from "@/components/ui/section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/skeleton";
import { type Tone, ToneBadge, ToneColor } from "@/components/ui/tone-badge";
import { type DateRangeValue, ResolveDateRange } from "@/lib/date-range";
import type { ExportColumn } from "@/lib/export/export-column";
import { FormatKg, FormatNumber, FormatSignedKg } from "@/lib/format";
import {
  CARTON_SIZE_META,
  FormatPacking,
  type PackingUnit,
} from "@/lib/packing";
import { useProductionReport } from "../hooks/use-analytics";
import type {
  MaterialProductionRowDTO,
  ProductProductionRowDTO,
  ReportGranularity,
  WaxCheckDTO,
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

function AdjustedCell({
  value,
  format,
}: {
  value: string;
  format: (value: string) => string;
}) {
  return Number(value) === 0 ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span className="font-medium">{format(value)}</span>
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
              <AdjustedCell value={row.adjustedKg} format={FormatSignedKg} />
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
  unit: PackingUnit,
): DataTableColumn<ProductProductionRowDTO>[] {
  const Format = (cartons: string) => FormatPacking(cartons, unit);
  return [
    {
      key: "name",
      header: "Product",
      cell: (row) => (
        <span>
          {row.productName}{" "}
          <span className="text-muted-foreground">
            {CARTON_SIZE_META[row.cartonSize].label}
          </span>
        </span>
      ),
    },
    {
      key: "opening",
      header: "Opening",
      cell: (row) => Format(row.openingCartons),
      className: "text-right tabular-nums",
    },
    {
      key: "received",
      header: "Produced",
      cell: (row) => Format(row.producedCartons),
      className: "text-right tabular-nums",
    },
    {
      key: "consumption",
      header: "Sold",
      cell: (row) => Format(row.soldCartons),
      className: "text-right tabular-nums",
    },
    ...(showAdjusted
      ? [
          {
            key: "adjusted",
            header: "Count corrections",
            cell: (row: ProductProductionRowDTO) => (
              <AdjustedCell
                value={row.adjustedCartons}
                format={(value) => FormatPacking(value, unit, { signed: true })}
              />
            ),
            className: "text-right tabular-nums",
          },
        ]
      : []),
    {
      key: "closing",
      header: "Closing",
      cell: (row) => Format(row.closingCartons),
      className: "text-right font-medium tabular-nums",
    },
    {
      key: "wax",
      header: "Wax used",
      cell: (row) => (Number(row.waxKg) === 0 ? "—" : FormatKg(row.waxKg)),
      className: "text-right tabular-nums text-muted-foreground",
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
  {
    header: "Carton size",
    value: (row) => CARTON_SIZE_META[row.cartonSize].label,
  },
  { header: "Opening (cartons)", value: (row) => row.openingCartons },
  { header: "Produced (cartons)", value: (row) => row.producedCartons },
  { header: "Sold (cartons)", value: (row) => row.soldCartons },
  {
    header: "Count corrections (cartons)",
    value: (row) => row.adjustedCartons,
  },
  { header: "Closing (cartons)", value: (row) => row.closingCartons },
  { header: "Wax used (kg)", value: (row) => row.waxKg },
];

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}

const WAX_CHECK_TONE: Record<WaxCheckDTO["status"], Tone> = {
  UNDER: "critical",
  OVER: "warning",
  OK: "good",
  NOT_COUNTED: "info",
};

// The under-production verdict for the selected period. The gap is
// shown in the selected unit; the kg figures underneath are the wax.
function WaxCheckBanner({
  check,
  unit,
}: {
  check: WaxCheckDTO;
  unit: PackingUnit;
}) {
  const gapCartons = Math.abs(Number(check.gapCartons));
  const gapKg = Math.abs(Number(check.gapKg));
  const copy: Record<WaxCheckDTO["status"], { title: string; detail: string }> =
    {
      UNDER: {
        title: `Under-production: about ${FormatPacking(gapCartons, unit)} short`,
        detail: `${FormatKg(check.actualKg)} of wax was used, but the cartons produced only account for ${FormatKg(check.expectedKg)}. ${FormatKg(gapKg)} of wax is unaccounted for — waste, spoiled candles, or production not recorded.`,
      },
      OVER: {
        title: `More produced than the wax used explains (${FormatPacking(gapCartons, unit)})`,
        detail: `The cartons produced need ${FormatKg(check.expectedKg)} of wax, but only ${FormatKg(check.actualKg)} is accounted for. A wax delivery may not have been recorded, or a wax count was off.`,
      },
      OK: {
        title: "No production deficit",
        detail: `Wax used (${FormatKg(check.actualKg)}) matches what the cartons produced need (${FormatKg(check.expectedKg)}).`,
      },
      NOT_COUNTED: {
        title: "Count the wax to check for under-production",
        detail: `Production used ${FormatKg(check.expectedKg)} of wax on paper. Only a physical wax count in this period shows whether more was really used.`,
      },
    };
  const nothingToCheck =
    check.status === "NOT_COUNTED" && Number(check.expectedKg) === 0;
  const text = nothingToCheck
    ? {
        title: "No production recorded",
        detail:
          "Nothing was accepted from production in this period, so there's no wax use to check.",
      }
    : copy[check.status];

  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-4"
      style={{
        borderColor: `color-mix(in oklab, ${ToneColor(WAX_CHECK_TONE[check.status])} 45%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${ToneColor(WAX_CHECK_TONE[check.status])} 8%, transparent)`,
      }}
    >
      <span className="flex items-center gap-2 font-semibold">
        <ToneBadge tone={WAX_CHECK_TONE[check.status]}>
          {check.status === "UNDER"
            ? "Deficit"
            : check.status === "OVER"
              ? "Check"
              : check.status === "OK"
                ? "OK"
                : "Not counted"}
        </ToneBadge>
        {text.title}
      </span>
      <span className="text-sm text-muted-foreground">{text.detail}</span>
    </div>
  );
}

type Mode = ReportGranularity | "CUSTOM";

export function ProductionTab() {
  const [mode, setMode] = useState<Mode>("DAY");
  const [offset, setOffset] = useState(0);
  // Custom range mode (Epic 22): one report for the whole range, with a
  // daily (or weekly, for long ranges) trend.
  const [range, setRange] = useState<DateRangeValue>({ preset: "30d" });
  const unit = usePackingUnit((state) => state.unit);
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
    data?.products.some((row) => Number(row.adjustedCartons) !== 0) ?? false;
  const materialColumns = BuildMaterialColumns(showMaterialAdjusted);
  const productColumns = BuildProductColumns(showProductAdjusted, unit);

  const totalProduced =
    data?.products.reduce((sum, row) => sum + Number(row.producedCartons), 0) ??
    0;
  const totalSold =
    data?.products.reduce((sum, row) => sum + Number(row.soldCartons), 0) ?? 0;
  const totalWax =
    data?.products.reduce((sum, row) => sum + Number(row.waxKg), 0) ?? 0;

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

      {data?.waxCheck && <WaxCheckBanner check={data.waxCheck} unit={unit} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Produced"
          value={FormatPacking(totalProduced, unit)}
        />
        <SummaryTile label="Sold" value={FormatPacking(totalSold, unit)} />
        <SummaryTile
          label="Wax used for production"
          value={FormatKg(totalWax)}
          hint="7 kg per Normal carton, 8.5 kg per Plus"
        />
      </div>

      <Section
        title="Wax used vs. what production needed"
        description="Kilograms per period, ending with the selected one. Where the used line sits above, wax went into something other than recorded cartons."
      >
        {isLoading || !data ? (
          <CardSkeleton />
        ) : (
          <TrendLineChart
            points={data.trend.map((point) => ({
              key: point.periodKey,
              label: point.periodLabel,
              values: {
                actual: Number(point.waxActualKg),
                expected: Number(point.waxExpectedKg),
              },
            }))}
            series={[
              {
                key: "actual",
                label: "Wax used",
                color: "var(--color-chart-series-1)",
              },
              {
                key: "expected",
                label: "Needed for cartons produced",
                color: "var(--color-chart-series-2)",
              },
            ]}
            valueFormatter={FormatKg}
            axisFormatter={(value) => FormatNumber(value, 0)}
          />
        )}
      </Section>

      <Section
        title="Finished goods"
        description="Opening + Produced − Sold ± Count corrections = Closing, like the paper Daily Stock Report."
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

      <Section
        title="Raw materials"
        description="In kg. Wax used in production is taken off automatically when stock is accepted; a wax count records any difference."
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
    </div>
  );
}
