import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off", ""].includes(normalized)) {
      return false;
    }
  }
  return value;
}, z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(19528),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  DATA_DIR: z.string().optional(),
  JWT_SECRET: z.string().min(8).default("ngm_hub_v2_dev_secret"),
  AUTH_COOKIE_NAME: z.string().min(1).default("ngm_hub_v2_token"),
  AUTH_COOKIE_SECURE: booleanFromEnv.default(false),
  AUTH_TOKEN_EXPIRES_IN: z.string().min(1).default("7d"),
  LOGIN_RSA_PRIVATE_KEY: z.string().min(1),
  LOGIN_RSA_PUBLIC_KEY: z.string().min(1),
  LOGIN_CHALLENGE_TTL_MS: z.coerce.number().int().positive().default(120000),
  INIT_ADMIN_USERNAME: z.string().min(1).default("admin"),
  INIT_ADMIN_PASSWORD: z.string().min(1).default("Ad@_2o26"),
  INIT_ADMIN_NICKNAME: z.string().min(1).default("Administrator"),
  UPLOAD_DIR: z.string().optional(),
  UPLOAD_MAX_FILE_SIZE: z.coerce.number().int().positive().default(10 * 1024 * 1024)
});
