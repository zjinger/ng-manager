import type { RequestContext } from "../../shared/context/request-context";
import type {
  AddProjectMemberInput,
  CreateProjectConfigItemInput,
  CreateProjectInput,
  CreateProjectVersionItemInput,
  ListProjectsQuery,
  ProjectEntity,
  ProjectConfigItemEntity,
  ProjectListResult,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectVersionItemEntity,
  UpdateProjectConfigItemInput,
  UpdateProjectInput,
  UpdateProjectVersionItemInput
} from "./project.types";

export interface ProjectCommandContract {
  create(input: CreateProjectInput, ctx: RequestContext): Promise<ProjectEntity>;
  update(projectId: string, input: UpdateProjectInput, ctx: RequestContext): Promise<ProjectEntity>;
  addMember(projectId: string, input: AddProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity>;
  removeMember(projectId: string, memberId: string, ctx: RequestContext): Promise<void>;
  addModule(projectId: string, input: CreateProjectConfigItemInput, ctx: RequestContext): Promise<ProjectConfigItemEntity>;
  updateModule(
    projectId: string,
    moduleId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity>;
  removeModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<void>;
  addEnvironment(
    projectId: string,
    input: CreateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity>;
  updateEnvironment(
    projectId: string,
    environmentId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity>;
  removeEnvironment(projectId: string, environmentId: string, ctx: RequestContext): Promise<void>;
  addVersion(projectId: string, input: CreateProjectVersionItemInput, ctx: RequestContext): Promise<ProjectVersionItemEntity>;
  updateVersion(
    projectId: string,
    versionId: string,
    input: UpdateProjectVersionItemInput,
    ctx: RequestContext
  ): Promise<ProjectVersionItemEntity>;
  removeVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<void>;
}

export interface ProjectQueryContract {
  list(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult>;
  listAccessible(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult>;
  getById(projectId: string, ctx: RequestContext): Promise<ProjectEntity>;
  listMembers(projectId: string, ctx: RequestContext): Promise<ProjectMemberEntity[]>;
  listMemberCandidates(projectId: string, ctx: RequestContext): Promise<ProjectMemberCandidate[]>;
  listModules(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]>;
  listEnvironments(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]>;
  listVersions(projectId: string, ctx: RequestContext): Promise<ProjectVersionItemEntity[]>;
}
