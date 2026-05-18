import { SystemRbacRepo } from "./system-rbac.repo";

export class PlatformRoleSyncService {
  constructor(private readonly repo: SystemRbacRepo) {}

  syncFromLegacyRole(userId: string | null | undefined, _legacyRole: "admin" | "user", timestamp: string): void {
    const normalized = userId?.trim();
    if (!normalized) {
      return;
    }
    const roles = this.repo.listUserSystemRoles(normalized);
    const hasPlatformRole = roles.some((role) => role.roleCode === "super_admin" || role.roleCode === "admin" || role.roleCode === "member");
    if (!hasPlatformRole) {
      this.repo.ensureSystemRoleBindingByCode(normalized, "member", timestamp);
    }
  }
}
