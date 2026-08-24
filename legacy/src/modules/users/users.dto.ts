import { z } from 'zod';
import { paginationQuerySchema } from '../../common/dto/pagination.js';

const userBodySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createUserSchema = z.object({
    body: userBodySchema,
});

export const updateUserSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        phoneNumber: z.string().min(1).optional(),
        email: z.string().email('Invalid email format').optional(),
        avatar: z.string().optional(),
        bio: z.string().optional(),
    }),
});

export const getUsersSchema = z.object({
    query: paginationQuerySchema.optional(),
});

export const userIdSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid user id'),
    }),
});
