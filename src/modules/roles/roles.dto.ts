import { z } from 'zod';

export const createRoleSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        permissions: z.array(z.string()).optional(),
    }),
});

export const updateRoleSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
    }),
    params: z.object({
        id: z.string().uuid('Invalid role id'),
    }),
});

export const roleIdSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid role id'),
    }),
});

export const replacePermissionsSchema = z.object({
    body: z.object({
        permissions: z.array(z.string().min(1)).max(100),
    }),
    params: z.object({
        id: z.string().uuid('Invalid role id'),
    }),
});
