import type Database from "better-sqlite3";

export interface DashboardPreferenceRecord {
  id: string;
  userId: string;
  statsConfigJson: string;
  createdAt: string;
  updatedAt: string;
}

type DashboardPreferenceRow = {
  id: string;
  user_id: string;
  stats_config_json: string;
  created_at: string;
  updated_at: string;
};

export class DashboardRepo {
  constructor(private readonly db: Database.Database) {}

  findPreferenceByUserId(userId: string): DashboardPreferenceRecord | null {
    const row = this.db.prepare(`SELECT * FROM dashboard_preferences WHERE user_id = ?`).get(userId) as
      | DashboardPreferenceRow
      | undefined;

    return row ? this.toRecord(row) : null;
  }

  savePreference(record: DashboardPreferenceRecord): void {
    const existing = this.findPreferenceByUserId(record.userId);
    if (existing) {
      this.db.prepare(`
        UPDATE dashboard_preferences
        SET stats_config_json = ?, updated_at = ?
        WHERE user_id = ?
      `).run(record.statsConfigJson, record.updatedAt, record.userId);
      return;
    }

    this.db.prepare(`
      INSERT INTO dashboard_preferences (
        id, user_id, stats_config_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run(record.id, record.userId, record.statsConfigJson, record.createdAt, record.updatedAt);
  }

  private toRecord(row: DashboardPreferenceRow): DashboardPreferenceRecord {
    return {
      id: row.id,
      userId: row.user_id,
      statsConfigJson: row.stats_config_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
