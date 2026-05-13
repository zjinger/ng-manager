import type { SqliteDatabase } from "@yinuo-ngm/storage";
import { initApiScopedJsonSchema } from "./api-scoped-json.schema";
import { initApiHistorySchema } from "./api-history.schema";

export function initApiSqliteSchema(db: SqliteDatabase): void {
    initApiScopedJsonSchema(db);
    initApiHistorySchema(db);
}

export * from "./api-scoped-json.schema";
export * from "./api-history.schema";
