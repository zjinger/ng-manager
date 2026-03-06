import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../env";

function runMigrations() {
    const db = new Database(env.dbPath);
    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    try {
        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
            db.exec(sql);
            console.log(`[migrate] applied: ${file}`);
        }
        console.log("[migrate] done");
    } finally {
        db.close();
    }
}

runMigrations();