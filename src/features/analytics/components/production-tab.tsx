"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { ExportColumn } from "@/lib/export/export-column";
import { useProductionReport } from "../hooks/use-analytics";
import type {
  MaterialProductionRowDTO,
  ProductProductionRowDTO,
  ReportGranularity,
} from "../validators/analytics.schema";
import { TrendLineChart } from "./trend-line-chart";

const GRANULARITY_OPTIONS: { value: ReportGranularity; label: string }[] = [
  { value: "DAY", label: "Day" },
  { value: "WEEK", label: "Week" },
  { value: "MONTH", label: "Month" },
];

const materialColumns: DataTableColumn<MaterialProductionRowDTO>[] = [
  { key: "name", header: "Material", cell: (row) => row.materialName },
  { key: "opening", header: "Opening Stock", cell: (row) => row.openingKg },
  { key: "received", header: "Received", cell: (row) => row.receivedKg },
  { key: "consumption", header: "Consumption", cell: (row) => row.consumedKg },
  { key: "closing", header: "Closing Stock", cell: (row) => row.closingKg },
];

const productColumns: DataTableColumn<ProductProductionRowDTO>[] = [
  {
    key: "name",
    header: "Product",
    cell: (row) => `${row.productName} (${row.productSku})`,
  },
  { key: "opening", header: "Opening Stock", cell: (row) => row.openingKg },
  { key: "received", header: "Received", cell: (row) => row.receivedKg },
  { key: "consumption", header: "Consumption", cell: (row) => row.consumedKg },
  { key: "closing", header: "Closing Stock", cell: (row) => row.closingKg },
  {
    key: "expected",
    header: "Expected output",
    cell: (row) => row.expectedOutputKg ?? "—",
    className: "text-muted-foreground",
  },
  {
    key: "variance",
    header: "Variance %",
    cell: (row) => row.variancePercent ?? "—",
    className: "text-muted-foreground",
  },
];

const materialExportColumns: ExportColumn<MaterialProductionRowDTO>[] = [
  { header: "Material", value: (row) => row.materialName },
  { header: "Opening Stock", value: (row) => row.openingKg },
  { header: "Received", value: (row) => row.receivedKg },
  { header: "Consumption", value: (row) => row.consumedKg },
  { header: "Closing Stock", value: (row) => row.closingKg },
];

const productExportColumns: ExportColumn<ProductProductionRowDTO>[] = [
  {
    header: "Product",
    value: (row) => `${row.productName} (${row.productSku})`,
  },
  { header: "Opening Stock", value: (row) => row.openingKg },
  { header: "Received", value: (row) => row.receivedKg },
  { header: "Consumption", value: (row) => row.consumedKg },
  { header: "Closing Stock", value: (row) => row.closingKg },
  { header: "Expected output", value: (row) => row.expectedOutputKg ?? "—" },
  { header: "Variance %", value: (row) => row.variancePercent ?? "—" },
];

export function ProductionTab() {
  const [granularity, setGranularity] = useState<ReportGranularity>("DAY");
  const { data, isLoading } = useProductionReport(granularity, true);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Production</h2>
          <p className="text-xs text-muted-foreground">
            {data
              ? `Period: ${data.periodLabel}`
              : "Opening/Received/Consumption/Closing, matching the paper Daily Stock Report."}
          </p>
        </div>
        <Select
          value={granularity}
          onValueChange={(value) => setGranularity(value as ReportGranularity)}
        >
          <SelectTrigger className="w-32">
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

      {isLoading || !data ? (
        <CardSkeleton />
      ) : (
        <TrendLineChart
          points={data.trend.map((point) => ({
            label: point.periodLabel,
            values: {
              consumed: Number(point.materialConsumedKg),
              output: Number(point.productActualOutputKg),
            },
          }))}
          series={[
            {
              key: "consumed",
              label: "Material consumed (kg)",
              color: "var(--color-chart-series-1)",
            },
            {
              key: "output",
              label: "Actual output (kg)",
              color: "var(--color-chart-series-2)",
            },
          ]}
        />
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Raw materials</h3>
          {data && (
            <ExportMenu
              filename="production-materials"
              title="Production — raw materials"
              columns={materialExportColumns}
              rows={data.materials}
            />
          )}
        </div>
        {isLoading || !data ? (
          <TableSkeleton columns={materialColumns.length} />
        ) : (
          <DataTable
            columns={materialColumns}
            data={data.materials}
            getRowKey={(row) => row.materialId}
            emptyMessage="No raw materials yet."
          />
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Finished goods</h3>
          {data && (
            <ExportMenu
              filename="production-products"
              title="Production — finished goods"
              columns={productExportColumns}
              rows={data.products}
            />
          )}
        </div>
        {isLoading || !data ? (
          <TableSkeleton columns={productColumns.length} />
        ) : (
          <DataTable
            columns={productColumns}
            data={data.products}
            getRowKey={(row) => row.productId}
            emptyMessage="No products yet."
          />
        )}
      </div>
    </div>
  );
}
