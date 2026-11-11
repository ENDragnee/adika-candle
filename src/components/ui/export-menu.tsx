"use client";

import {
  DownloadSimpleIcon,
  FileCsvIcon,
  FilePdfIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DownloadBlob } from "@/lib/export/download-blob";
import type { ExportColumn } from "@/lib/export/export-column";
import { ToCsv } from "@/lib/export/to-csv";
import { ToPdf } from "@/lib/export/to-pdf";

interface ExportMenuProps<T> {
  // Base filename, no extension — ".csv"/".pdf" is appended per format.
  filename: string;
  // PDF page heading; defaults to `filename` when omitted.
  title?: string;
  columns: ExportColumn<T>[];
  // Either the already-loaded rows (every analytics tab — Epic 17 fetches
  // each tab's full, unpaginated result set up front) or a lazy fetch-all
  // callback for a paginated list, called only when the user actually
  // picks a format — not on every render, and not the current page's 20
  // rows, which would make "export" nearly useless for reporting.
  rows: T[] | (() => Promise<T[]>);
}

export function ExportMenu<T>({
  filename,
  title,
  columns,
  rows,
}: ExportMenuProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "csv" | "pdf") {
    setIsExporting(true);
    try {
      const data = typeof rows === "function" ? await rows() : rows;
      if (format === "csv") {
        DownloadBlob(
          ToCsv(columns, data),
          `${filename}.csv`,
          "text/csv;charset=utf-8;",
        );
      } else {
        ToPdf(title ?? filename, columns, data, `${filename}.pdf`);
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <DownloadSimpleIcon data-icon="inline-start" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => handleExport("csv")}>
          <FileCsvIcon />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExport("pdf")}>
          <FilePdfIcon />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
