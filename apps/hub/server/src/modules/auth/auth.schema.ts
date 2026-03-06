import { z } from "zod";

export const loginSchema = z.object({
    username: z.string().trim().min(1).max(60),
    password: z.string().min(1).max(200)
});

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1).max(200),
    newPassword: z.string().min(8).max(200)
});

export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
