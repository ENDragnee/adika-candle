// Shared shape for both ToCsv and ToPdf. Deliberately separate from
// DataTableColumn<T> (src/components/ui/data-table.tsx) — that type's
// `cell` returns a React node (links, badges, icons) for on-screen
// rendering, which CSV/PDF can't serialize; `value` here always returns
// plain text/number instead. A render-cell row is already a plain value
// most of the time (a name, an amount), so most call sites just reuse the
// same primitive; only the handful of columns rendering JSX need a
// separate `value` function alongside their existing `cell`.
export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}
