import type { SqliteDatabase } from "../sqlite";
import { initTaskAnalyzeReportSchema } from "./task-analyze-report.schema";

export function initSqliteSchema(db: SqliteDatabase): void {
    initTaskAnalyzeReportSchema(db);
}

export * from "./task-analyze-report.schema";
