import type { RdItemEntity } from "../rd.types";
import { AppError } from "../../../shared/errors/app-error";
import { ERROR_CODES } from "../../../shared/errors/error-codes";
import type { RequestContext } from "../../../shared/context/request-context";
import type { RdServiceContext } from "./rd-service-context";

export type RdMemberRef = {
  memberIds: string[];
  memberNames: string[];
  verifierId: string | null;
  verifierName: string | null;
};

export class RdMemberService {
  constructor(private readonly context: RdServiceContext) {}

  async resolveMembers(
    projectId: string,
    memberIds: string[],
    verifierId: string | null | undefined
  ): Promise<RdMemberRef> {
    const normalizedMemberIds = this.collectEffectiveMemberIds(memberIds);
    if (normalizedMemberIds.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "rd memberIds requires at least one member", 400);
    }
    const memberNames: string[] = [];
    let normalizedVerifierId = verifierId?.trim() || null;
    let verifierName: string | null = null;

    for (const memberId of normalizedMemberIds) {
      const member = await this.context.projectAccess.requireProjectMember(projectId, memberId, "resolve rd member");
      memberNames.push(member.displayName);
    }

    if (normalizedVerifierId) {
      const verifier = await this.context.projectAccess.requireProjectMember(
        projectId,
        normalizedVerifierId,
        "resolve rd verifier"
      );
      normalizedVerifierId = verifier.userId;
      verifierName = verifier.displayName;
    }

    return {
      memberIds: normalizedMemberIds,
      memberNames,
      verifierId: normalizedVerifierId,
      verifierName
    };
  }

  collectEffectiveMemberIds(memberIds: string[] | null | undefined, fallbackAssigneeId?: string | null): string[] {
    const sourceIds = Array.isArray(memberIds) ? memberIds : [];
    const all = [...sourceIds, fallbackAssigneeId ?? ""];
    return Array.from(new Set(all.map((id) => id.trim()).filter(Boolean)));
  }

  async resolveMemberNamesFallback(projectId: string, memberIds: string[]): Promise<string[]> {
    const names: string[] = [];
    for (const memberId of memberIds) {
      if (!memberId?.trim()) {
        continue;
      }
      try {
        const member = await this.context.projectAccess.requireProjectMember(
          projectId,
          memberId.trim(),
          "resolve rd member fallback"
        );
        names.push(member.displayName);
      } catch {
        names.push(memberId.trim());
      }
    }
    return names;
  }

  getEffectiveVerifierId(item: Pick<RdItemEntity, "verifierId" | "creatorId">): string | null {
    return item.verifierId?.trim() || item.creatorId?.trim() || null;
  }

  withVerifierFallback(item: RdItemEntity): RdItemEntity {
    const effectiveVerifierId = this.getEffectiveVerifierId(item);
    const effectiveVerifierName = item.verifierName?.trim() || item.creatorName?.trim() || null;
    if (item.verifierId === effectiveVerifierId && item.verifierName === effectiveVerifierName) {
      return item;
    }
    return {
      ...item,
      verifierId: effectiveVerifierId,
      verifierName: effectiveVerifierName
    };
  }

  isVerifier(item: Pick<RdItemEntity, "verifierId" | "creatorId">, ctx: RequestContext): boolean {
    const userId = ctx.userId?.trim();
    const effectiveVerifierId = this.getEffectiveVerifierId(item);
    return !!userId && !!effectiveVerifierId && effectiveVerifierId === userId;
  }
}
