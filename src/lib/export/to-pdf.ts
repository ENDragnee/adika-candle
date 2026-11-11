import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportColumn } from "./export-column";

// Brand amber — the same dark-mode --chart-series-1 hex already validated
// against this app's surfaces (see docs/DECISIONS.md, Epic 17 decisions);
// reused here since a PDF page is always a plain white surface with no
// light/dark concept of its own.
const HEADER_FILL: [number, number, number] = [0xb4, 0x6e, 0x00];

export function ToPdf<T>(
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => String(column.value(row)))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: HEADER_FILL, textColor: 255 },
    alternateRowStyles: { fillColor: [250, 248, 245] },
  });

  doc.save(filename);
}
