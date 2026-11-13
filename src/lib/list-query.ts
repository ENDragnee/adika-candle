import { z } from "zod";

// Shared search + sort query params for list endpoints (Epic 21). Lists
// are paginated server-side, so sorting and searching must happen in the
// query too — sorting one page client-side would only reorder 20 rows.
// Each route whitelists its own sort keys and maps them to an orderBy.
export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export function ListQuerySchema<const K extends string>(
  sortKeys: readonly [K, ...K[]],
  defaultSort: NoInfer<K>,
) {
  return z.object({
    search: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(sortKeys).default(defaultSort),
    dir: SortDirectionSchema.default("asc"),
  });
}

export interface ListParams<K extends string = string> {
  search?: string;
  sort?: K;
  dir?: SortDirection;
}
