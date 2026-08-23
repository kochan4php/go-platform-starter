import { z } from 'zod';

export const createUserSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        phoneNumber: z.string().min(1, 'Phone number is required'),
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
    }),
});

export const updateUserSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        phoneNumber: z.string().min(1).optional(),
        email: z.string().email().optional(),
    }),
});

export const getUsersSchema = z.object({
    query: z
        .object({
            limit: z.coerce.number().min(1).max(100).default(10),
            offset: z.coerce.number().min(0).default(0),
        })
        .optional(),
});
