import type { RequestContext } from "../../shared/context/request-context";
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  ListProjectsQuery,
  ProjectEntity,
  ProjectListResult,
  ProjectMemberEntity
} from "./project.types";

export interface ProjectCommandContract {
  create(input: CreateProjectInput, ctx: RequestContext): Promise<ProjectEntity>;
  addMember(projectId: string, input: AddProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity>;
  removeMember(projectId: string, memberId: string, ctx: RequestContext): Promise<void>;
}

export interface ProjectQueryContract {
  list(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult>;
  listAccessible(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult>;
  getById(projectId: string, ctx: RequestContext): Promise<ProjectEntity>;
  listMembers(projectId: string, ctx: RequestContext): Promise<ProjectMemberEntity[]>;
}
