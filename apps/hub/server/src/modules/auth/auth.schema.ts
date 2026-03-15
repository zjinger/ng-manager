import { z } from "zod";

const usernameSchema = z.string().trim().min(1).max(60);

export const plainLoginSchema = z.object({
    username: usernameSchema,
    password: z.string().min(1).max(200)
});

export const encryptedLoginSchema = z.object({
    username: usernameSchema,
    nonce: z.string().trim().min(16).max(200),
    iv: z.string().trim().min(16).max(120),
    cipherText: z.string().trim().min(16).max(4096)
});

export const loginSchema = z.union([encryptedLoginSchema, plainLoginSchema]);

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1).max(200),
    newPassword: z.string().min(8).max(200)
});

export const updateAccountProfileSchema = z.object({
    displayName: z.string().trim().min(1).max(60),
    email: z.union([z.string().trim().email().max(120), z.literal("")]).optional(),
    mobile: z.union([z.string().trim().max(40), z.literal("")]).optional(),
    bio: z.union([z.string().trim().max(500), z.literal("")]).optional()
});

export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type UpdateAccountProfileDto = z.infer<typeof updateAccountProfileSchema>;
