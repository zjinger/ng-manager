import type Database from "better-sqlite3";
import type { ProjectMemberEntity, ProjectMemberRole } from "./project.types";

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  enabled: number;
  display_name: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  avatar_upload_id: string | null;
};

type ProjectMemberRoleRow = {
  member_id: string;
  role: string;
};

type UserBriefRow = {
  id: string;
  username: string;
  display_name: string | null;
  status: string;
};

export class ProjectMemberRepo {
  constructor(private readonly db: Database.Database) { }

  runInTransaction<T>(handler: () => T): T {
    const tx = this.db.transaction(handler);
    return tx();
  }

  findUserById(userId: string): { id: string; displayName: string; status: string } | null {
    const row = this.db.prepare(`
      SELECT id, username, display_name, status
      FROM users
      WHERE id = ?
      LIMIT 1
    `).get(userId) as UserBriefRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      displayName: row.display_name ?? row.username,
      status: row.status
    };
  }

  createMember(input: {
    id: string;
    projectId: string;
    userId: string;
    displayName: string;
    roles: ProjectMemberRole[];
    createdAt: string;
    updatedAt: string;
  }): void {
    this.db.prepare(`
      INSERT INTO project_members (id, project_id, user_id, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(input.id, input.projectId, input.userId, input.displayName, input.createdAt, input.updatedAt);

    for (const role of input.roles) {
      this.db.prepare(`
        INSERT INTO project_member_roles (id, member_id, role, created_at)
        VALUES (?, ?, ?, ?)
      `).run(`${input.id}:${role}`, input.id, role, input.createdAt);
    }
  }

  listMembers(projectId: string): ProjectMemberEntity[] {
    // const memberRows = this.db.prepare(`
    //   SELECT *
    //   FROM project_members
    //   WHERE project_id = ?
    //   ORDER BY updated_at DESC, created_at DESC
    // `).all(projectId) as ProjectMemberRow[];
    const memberRows = this.db.prepare(`
      SELECT
        pm.*,
        au.avatar_upload_id
      FROM project_members pm
      LEFT JOIN admin_users au ON au.user_id = pm.user_id
      WHERE pm.project_id = ?
      ORDER BY pm.updated_at DESC, pm.created_at DESC
    `).all(projectId) as ProjectMemberRow[];

    if (memberRows.length === 0) {
      return [];
    }
    const memberIds = memberRows.map((item) => item.id);
    const placeholders = memberIds.map(() => "?").join(",");
    const roleRows = this.db.prepare(`
      SELECT member_id, role
      FROM project_member_roles
      WHERE member_id IN (${placeholders})
    `).all(...memberIds) as ProjectMemberRoleRow[];

    const rolesByMemberId = new Map<string, ProjectMemberRole[]>();
    for (const row of roleRows) {
      const list = rolesByMemberId.get(row.member_id) ?? [];
      list.push(row.role as ProjectMemberRole);
      rolesByMemberId.set(row.member_id, list);
    }

    return memberRows.map((row) => this.toMemberEntity(row, rolesByMemberId.get(row.id) ?? []));
  }

  findMemberById(projectId: string, memberId: string): ProjectMemberEntity | null {
    const row = this.db.prepare(`
      SELECT *
      FROM project_members
      WHERE id = ? AND project_id = ?
      LIMIT 1
    `).get(memberId, projectId) as ProjectMemberRow | undefined;

    if (!row) {
      return null;
    }

    const roles = this.listMemberRoles(row.id);
    return this.toMemberEntity(row, roles);
  }

  findMemberByProjectAndUserId(projectId: string, userId: string): ProjectMemberEntity | null {
    const row = this.db.prepare(`
      SELECT *
      FROM project_members
      WHERE project_id = ? AND user_id = ?
      LIMIT 1
    `).get(projectId, userId) as ProjectMemberRow | undefined;

    if (!row) {
      return null;
    }

    const roles = this.listMemberRoles(row.id);
    return this.toMemberEntity(row, roles);
  }

  listProjectIdsByUserId(userId: string): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT project_id
      FROM project_members
      WHERE user_id = ?
      ORDER BY project_id ASC
    `).all(userId) as Array<{ project_id: string }>;

    return rows.map((row) => row.project_id);
  }

  updateMember(projectId: string, memberId: string, patch: { displayName?: string; updatedAt: string }): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (patch.displayName !== undefined) {
      fields.push("display_name = ?");
      params.push(patch.displayName);
    }

    fields.push("updated_at = ?");
    params.push(patch.updatedAt);
    params.push(memberId, projectId);

    const result = this.db.prepare(`
      UPDATE project_members
      SET ${fields.join(", ")}
      WHERE id = ? AND project_id = ?
    `).run(...params);

    return result.changes > 0;
  }

  replaceMemberRoles(memberId: string, roles: ProjectMemberRole[], createdAt: string): void {
    this.db.prepare(`DELETE FROM project_member_roles WHERE member_id = ?`).run(memberId);

    for (const role of roles) {
      this.db.prepare(`
        INSERT INTO project_member_roles (id, member_id, role, created_at)
        VALUES (?, ?, ?, ?)
      `).run(`${memberId}:${role}`, memberId, role, createdAt);
    }
  }

  deleteMember(projectId: string, memberId: string): boolean {
    const result = this.db.prepare(`DELETE FROM project_members WHERE id = ? AND project_id = ?`).run(memberId, projectId);
    return result.changes > 0;
  }

  private listMemberRoles(memberId: string): ProjectMemberRole[] {
    const rows = this.db.prepare(`SELECT role FROM project_member_roles WHERE member_id = ?`).all(memberId) as Array<{ role: string }>;
    return rows.map((row) => row.role as ProjectMemberRole);
  }

  private toMemberEntity(row: ProjectMemberRow, roles: ProjectMemberRole[]): ProjectMemberEntity {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      displayName: row.display_name,
      avatarUploadId: row.avatar_upload_id ?? null,
      avatarUrl: row.avatar_upload_id ? `/api/admin/preview/${row.avatar_upload_id}` : null,
      roles,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
