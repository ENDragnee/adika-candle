import type { ExportColumn } from "./export-column";

// RFC 4180 quoting: wrap in quotes (doubling any embedded quote) whenever
// the cell contains a comma, quote, or newline — leave everything else
// bare rather than quoting unconditionally, so a plain CSV stays easy to
// eyeball.
function EscapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function ToCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const header = columns.map((column) => EscapeCsvCell(column.header));
  const lines = rows.map((row) =>
    columns.map((column) => EscapeCsvCell(column.value(row))),
  );
  // CRLF per RFC 4180; a leading BOM so Excel (still the most common
  // opener for a downloaded .csv) detects UTF-8 instead of guessing a
  // local 8-bit codepage and mangling non-ASCII text.
  const BOM = "﻿";
  return BOM + [header, ...lines].map((line) => line.join(",")).join("\r\n");
}
