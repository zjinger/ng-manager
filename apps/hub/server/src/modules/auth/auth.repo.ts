import type Database from "better-sqlite3";
import type { AdminUserEntity } from "./auth.types";

type AdminUserRow = {
    id: string;
    user_id?: string | null;
    username: string;
    password_hash: string;
    nickname: string | null;
    status: string;
    role?: string;
    must_change_password: number;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
};

export class AuthRepo {
    constructor(private readonly db: Database.Database) { }

    countAdmins(): number {
        const row = this.db
            .prepare(`SELECT COUNT(*) as total FROM admin_users WHERE role = 'admin' OR role IS NULL`)
            .get() as { total: number };

        return row.total;
    }

    create(entity: AdminUserEntity): void {
        const stmt = this.db.prepare(`
      INSERT INTO admin_users (
        id, user_id, username, password_hash, nickname, status, role,
        must_change_password, last_login_at, created_at, updated_at
      ) VALUES (
        @id, @user_id, @username, @password_hash, @nickname, @status, @role,
        @must_change_password, @last_login_at, @created_at, @updated_at
      )
    `);

        stmt.run({
            id: entity.id,
            user_id: entity.userId ?? null,
            username: entity.username,
            password_hash: entity.passwordHash,
            nickname: entity.nickname ?? null,
            status: entity.status,
            role: entity.role,
            must_change_password: entity.mustChangePassword ? 1 : 0,
            last_login_at: entity.lastLoginAt ?? null,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt
        });
    }

    findById(id: string): AdminUserEntity | null {
        const row = this.db
            .prepare(`SELECT * FROM admin_users WHERE id = ?`)
            .get(id) as AdminUserRow | undefined;

        return row ? this.toEntity(row) : null;
    }

    findByUsername(username: string): AdminUserEntity | null {
        const row = this.db
            .prepare(`SELECT * FROM admin_users WHERE username = ?`)
            .get(username) as AdminUserRow | undefined;

        return row ? this.toEntity(row) : null;
    }

    findByUserId(userId: string): AdminUserEntity | null {
        const row = this.db
            .prepare(`SELECT * FROM admin_users WHERE user_id = ? LIMIT 1`)
            .get(userId) as AdminUserRow | undefined;

        return row ? this.toEntity(row) : null;
    }

    updateLastLoginAt(id: string, lastLoginAt: string, updatedAt: string): boolean {
        const result = this.db
            .prepare(`
        UPDATE admin_users
        SET last_login_at = ?, updated_at = ?
        WHERE id = ?
      `)
            .run(lastLoginAt, updatedAt, id);

        return result.changes > 0;
    }

    updatePassword(
        id: string,
        passwordHash: string,
        mustChangePassword: boolean,
        updatedAt: string
    ): boolean {
        const result = this.db
            .prepare(`
        UPDATE admin_users
        SET password_hash = ?, must_change_password = ?, updated_at = ?
        WHERE id = ?
      `)
            .run(passwordHash, mustChangePassword ? 1 : 0, updatedAt, id);

        return result.changes > 0;
    }

    updateByUserId(
        userId: string,
        patch: {
            username?: string;
            nickname?: string | null;
            status?: AdminUserEntity["status"];
            updatedAt: string;
        }
    ): boolean {
        const fields: string[] = [];
        const params: unknown[] = [];

        if (patch.username !== undefined) {
            fields.push("username = ?");
            params.push(patch.username);
        }
        if (patch.nickname !== undefined) {
            fields.push("nickname = ?");
            params.push(patch.nickname);
        }
        if (patch.status !== undefined) {
            fields.push("status = ?");
            params.push(patch.status);
        }

        fields.push("updated_at = ?");
        params.push(patch.updatedAt);
        params.push(userId);

        const result = this.db
            .prepare(`UPDATE admin_users SET ${fields.join(", ")} WHERE user_id = ?`)
            .run(...params);

        return result.changes > 0;
    }

    private toEntity(row: AdminUserRow): AdminUserEntity {
        return {
            id: row.id,
            userId: row.user_id ?? null,
            username: row.username,
            passwordHash: row.password_hash,
            nickname: row.nickname,
            status: row.status as AdminUserEntity["status"],
            role: (row.role ?? "admin") as AdminUserEntity["role"],
            mustChangePassword: row.must_change_password === 1,
            lastLoginAt: row.last_login_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
