import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        phoneNumber: z.string().min(1, 'Phone number is required'),
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        loginType: z.string().min(1, 'Login type (email/phone) is required'),
        password: z.string().min(1, 'Password is required'),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(10),
        password: z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
