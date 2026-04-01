import { z } from "zod";

const usernameSchema = z.string().trim().min(1).max(60);

export const encryptedLoginSchema = z.object({
  username: usernameSchema,
  nonce: z.string().trim().min(16).max(200),
  cipherText: z.string().trim().min(128).max(8192)
});

export const loginSchema = encryptedLoginSchema;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export const updateAvatarSchema = z.object({
  uploadId: z.string().trim().nullable().optional()
});
