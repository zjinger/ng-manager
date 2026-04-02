import { z } from "zod";

const usernameSchema = z.string().trim().min(1).max(60);
const mobilePattern = /^1\d{10}$/;

export const encryptedLoginSchema = z.object({
  username: usernameSchema,
  nonce: z.string().trim().min(16).max(200),
  cipherText: z.string().trim().min(16).max(8192)
});

export const loginSchema = encryptedLoginSchema;

const plainChangePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const encryptedChangePasswordSchema = z.object({
  nonce: z.string().trim().min(16).max(200),
  oldCipherText: z.string().trim().min(16).max(8192),
  newCipherText: z.string().trim().min(16).max(8192)
});

export const changePasswordSchema = z.union([plainChangePasswordSchema, encryptedChangePasswordSchema]);

export const updateAvatarSchema = z.object({
  uploadId: z.string().trim().nullable().optional()
});

export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(60),
  email: z.string().trim().email().nullable().optional(),
  mobile: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || mobilePattern.test(value), "invalid mobile")
    .nullable()
    .optional(),
  remark: z.string().trim().max(500).nullable().optional()
});
