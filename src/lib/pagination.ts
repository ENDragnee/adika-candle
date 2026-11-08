import { type ZodType, z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Shared response shape for every paginated service.ts fetch function —
// `T` is the row DTO, e.g. `Paginated<ProductDTO>`.
export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Params every paginated hook/service accepts. `pageSize` defaults to 20
// (browsable lists); dropdown/"need everything" consumers (e.g. a
// product picker) pass `{ pageSize: MAX_PAGE_SIZE }` instead of adding a
// second non-paginated fetch path — see docs/DECISIONS.md.
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export function ToSkipTake(query: PaginationQuery) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function BuildPaginationMeta(
  query: PaginationQuery,
  total: number,
): PaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

const PaginationMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export function PaginatedResponseSchema<T extends ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    pagination: PaginationMetaSchema,
  });
}
