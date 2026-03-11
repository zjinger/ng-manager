import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveEnvFile(cwd: string) {
  const nodeEnv = process.env.NODE_ENV || "development";

  if (nodeEnv === "production") {
    const prodEnvFile = path.join(cwd, ".env.production");
    if (fs.existsSync(prodEnvFile)) {
      return prodEnvFile;
    }
  }

  const defaultEnvFile = path.join(cwd, ".env");
  if (fs.existsSync(defaultEnvFile)) {
    return defaultEnvFile;
  }

  return null;
}

function resolveWebRoot(cwd: string) {
  const candidates = [
    path.join(cwd, "www", "browser"),
    path.join(cwd, "www")
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

const cwd = process.cwd();
const envFile = resolveEnvFile(cwd);
console.log(`Current working directory: ${cwd}`);
console.log(`Node environment: ${process.env.NODE_ENV || "not set (default to development)"}`);
console.log(`Loading environment variables from: ${envFile || "default environment"}`);

if (envFile) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";
const isDev = !isProd;

const dataDir = path.resolve(process.env.NMG_HUB_DATA_DIR || path.join(cwd, "data"));
const dbPath = path.join(dataDir, "hub.db");

const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || path.join(dataDir, "uploads"));
const tempRoot = path.resolve(process.env.TEMP_ROOT || path.join(dataDir, "tmp"));

ensureDir(dataDir);
ensureDir(uploadRoot);
ensureDir(tempRoot);

export const env = {
  nodeEnv,
  isDev,
  isProd,

  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 19527),
  logLevel: (process.env.LOG_LEVEL || "info") as "trace" | "debug" | "info" | "warn" | "error",

  dataDir,
  dbPath,
  uploadRoot,
  tempRoot,
  webRoot: resolveWebRoot(cwd),

  jwtSecret: process.env.JWT_SECRET || "ngm_hub_sk_123456",
  authCookieName: process.env.AUTH_COOKIE_NAME || "ngm_hub_token",
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
  authTokenExpiresIn: process.env.AUTH_TOKEN_EXPIRES_IN || "7d",

  loginAesKey: process.env.LOGIN_AES_KEY || "ngm_hub_login_aes_2026",
  loginChallengeTtlMs: Number(process.env.LOGIN_CHALLENGE_TTL_MS || 120000),

  initAdminUsername: process.env.INIT_ADMIN_USERNAME || "admin",
  initAdminPassword: process.env.INIT_ADMIN_PASSWORD || "Ad@_2o26",
  initAdminNickname: process.env.INIT_ADMIN_NICKNAME || "Administrator",

  uploadMaxFileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE || 10 * 1024 * 1024),
  uploadMaxFiles: Number(process.env.UPLOAD_MAX_FILES || 20)
};