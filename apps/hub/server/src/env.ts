import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const cwd = process.cwd();
const dataDir = path.resolve(process.env.NMG_HUB_DATA_DIR || path.join(cwd, "data"));
const dbPath = path.join(dataDir, "hub.db");

ensureDir(dataDir);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 19527),
  host: process.env.HOST || "0.0.0.0",
  logLevel: (process.env.LOG_LEVEL || "info") as "trace" | "debug" | "info" | "warn" | "error",
  dataDir,
  dbPath,
  isDev: (process.env.NODE_ENV || "development") !== "production"
};