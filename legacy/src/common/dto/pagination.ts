import { z } from 'zod';

/** Shared list-endpoint query contract. Coerces ?limit=10&offset=0 from strings. */
export const paginationQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
