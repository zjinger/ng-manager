import { SystemRbacRepo } from "./system-rbac.repo";

export class PlatformRoleSyncService {
  constructor(private readonly repo: SystemRbacRepo) {}

  syncFromLegacyRole(userId: string | null | undefined, legacyRole: "admin" | "user", timestamp: string): void {
    const normalized = userId?.trim();
    if (!normalized) {
      return;
    }
    this.repo.syncPlatformRoleForUser(normalized, legacyRole, timestamp);
  }
}
