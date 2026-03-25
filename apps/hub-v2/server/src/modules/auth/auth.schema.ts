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
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export const updateAvatarSchema = z.object({
  uploadId: z.string().trim().nullable().optional()
});
