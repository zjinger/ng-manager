import type Database from "better-sqlite3";
import type { SystemSettingEntity, SettingsCategory } from "./system-settings.types";

type SystemSettingRow = {
  id: string;
  category: string;
  settings_data: string;
  created_at: string;
  updated_at: string;
};

export class SystemSettingsRepo {
  constructor(private readonly db: Database.Database) {}

  findByCategory(category: SettingsCategory): SystemSettingEntity | null {
    const row = this.db
      .prepare("SELECT * FROM system_settings WHERE category = ?")
      .get(category) as SystemSettingRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  upsert(category: SettingsCategory, settingsData: string): void {
    const now = new Date().toISOString();
    const existing = this.findByCategory(category);

    if (existing) {
      this.db
        .prepare("UPDATE system_settings SET settings_data = ?, updated_at = ? WHERE category = ?")
        .run(settingsData, now, category);
    } else {
      this.db
        .prepare("INSERT INTO system_settings (id, category, settings_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .run(`setting_${category}`, category, settingsData, now, now);
    }
  }

  private mapRow(row: SystemSettingRow): SystemSettingEntity {
    return {
      id: row.id,
      category: row.category as SettingsCategory,
      settingsData: row.settings_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
