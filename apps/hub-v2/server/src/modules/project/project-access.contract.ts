import type { RequestContext } from "../../shared/context/request-context";
import type { ProjectMemberEntity } from "./project.types";

export interface ProjectAccessContract {
  listAccessibleProjectIds(ctx: RequestContext): Promise<string[]>;
  requireProjectAccess(projectId: string, ctx: RequestContext, action: string): Promise<void>;
  requireProjectMember(projectId: string, userId: string, action: string): Promise<ProjectMemberEntity>;
}
