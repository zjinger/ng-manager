import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { envSchema } from "./env.schema";

function resolveEnvFile(cwd: string): string | null {
  const nodeEnv = process.env.NODE_ENV || "development";
  const envFiles =
    nodeEnv === "production"
      ? [path.join(cwd, ".env.production"), path.join(cwd, ".env")]
      : [path.join(cwd, ".env")];

  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      return file;
    }
  }

  return null;
}

export type AppConfig = ReturnType<typeof loadEnv>;

export function loadEnv() {
  const cwd = process.cwd();
  const envFile = resolveEnvFile(cwd);
  
  if (envFile) {
    dotenv.config({ path: envFile });
  } else {
    dotenv.config();
  }
  const parsed = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    HOST: process.env.HOST,
    PORT: process.env.PORT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    DATA_DIR: process.env.DATA_DIR,
    JWT_SECRET: process.env.JWT_SECRET,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
    AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
    AUTH_TOKEN_EXPIRES_IN: process.env.AUTH_TOKEN_EXPIRES_IN,
    HTTPS_ENABLED: process.env.HTTPS_ENABLED,
    HTTPS_KEY_FILE: process.env.HTTPS_KEY_FILE,
    HTTPS_CERT_FILE: process.env.HTTPS_CERT_FILE,
    LOGIN_RSA_PRIVATE_KEY: process.env.LOGIN_RSA_PRIVATE_KEY,
    LOGIN_RSA_PUBLIC_KEY: process.env.LOGIN_RSA_PUBLIC_KEY,
    LOGIN_CHALLENGE_TTL_MS: process.env.LOGIN_CHALLENGE_TTL_MS,
    INIT_ADMIN_USERNAME: process.env.INIT_ADMIN_USERNAME,
    INIT_ADMIN_PASSWORD: process.env.INIT_ADMIN_PASSWORD,
    INIT_ADMIN_NICKNAME: process.env.INIT_ADMIN_NICKNAME,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    UPLOAD_MAX_FILE_SIZE: process.env.UPLOAD_MAX_FILE_SIZE
  });

  const dataDir = path.resolve(parsed.DATA_DIR || path.join(cwd, "data"));
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "hub-v2.db");
  const uploadDir = path.resolve(parsed.UPLOAD_DIR || path.join(dataDir, "uploads"));
  fs.mkdirSync(uploadDir, { recursive: true });

  return {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    dataDir,
    dbPath,
    jwtSecret: parsed.JWT_SECRET,
    authCookieName: parsed.AUTH_COOKIE_NAME,
    authCookieSecure: parsed.AUTH_COOKIE_SECURE,
    authTokenExpiresIn: parsed.AUTH_TOKEN_EXPIRES_IN,
    httpsEnabled: parsed.HTTPS_ENABLED,
    httpsKeyFile: parsed.HTTPS_KEY_FILE ?? null,
    httpsCertFile: parsed.HTTPS_CERT_FILE ?? null,
    loginRsaPrivateKey: parsed.LOGIN_RSA_PRIVATE_KEY,
    loginRsaPublicKey: parsed.LOGIN_RSA_PUBLIC_KEY,
    loginChallengeTtlMs: parsed.LOGIN_CHALLENGE_TTL_MS,
    initAdminUsername: parsed.INIT_ADMIN_USERNAME,
    initAdminPassword: parsed.INIT_ADMIN_PASSWORD,
    initAdminNickname: parsed.INIT_ADMIN_NICKNAME,
    uploadDir,
    uploadMaxFileSize: parsed.UPLOAD_MAX_FILE_SIZE
  };
}
