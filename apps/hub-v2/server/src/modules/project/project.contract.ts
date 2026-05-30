import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateRdStageTaskTemplateInput,
  RdStageTaskTemplateEntity,
  UpdateRdStageTaskTemplateInput
} from "../rd/rd.types";
import type {
  AddProjectModuleMemberInput,
  AddProjectMemberInput,
  CreateProjectFeaturePointInput,
  CreateProjectFeaturePointGroupInput,
  CreateProjectConfigItemInput,
  CreateProjectInput,
  ProjectModuleRdLinkEntity,
  ReplaceModuleRdLinksInput,
  CreateProjectVersionItemInput,
  ListProjectsQuery,
  ProjectEntity,
  ProjectConfigItemEntity,
  ProjectFeaturePointEntity,
  ProjectFeaturePointGroupEntity,
  ProjectFeaturePointGroupUpdateResult,
  ProjectFeaturePointUpdateResult,
  ProjectFeatureProgressIncrementalResult,
  ProjectFeatureProgressOverrideDeleteResult,
  ProjectFeatureProgressOverrideEntity,
  ProjectFeatureProgressOverrideUpdateResult,
  ProjectFeatureProgressSettings,
  ProjectFeatureProgressView,
  ProjectListResult,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectModuleMemberEntity,
  UpdateProjectMemberInput,
  UpdateProjectFeaturePointInput,
  UpdateProjectFeaturePointGroupInput,
  UpdateProjectFeatureProgressSettingsInput,
  UpsertProjectFeatureProgressOverrideInput,
  DeleteProjectFeatureProgressOverrideInput,
  ProjectVersionItemEntity,
  UpdateProjectConfigItemInput,
  UpdateProjectInput,
  UpdateProjectFavoriteInput,
  UpdateProjectVersionItemInput
} from "./project.types";

export interface ProjectCommandContract {
  create(input: CreateProjectInput, ctx: RequestContext): Promise<ProjectEntity>;
  update(projectId: string, input: UpdateProjectInput, ctx: RequestContext): Promise<ProjectEntity>;
  updateFavorite(projectId: string, input: UpdateProjectFavoriteInput, ctx: RequestContext): Promise<ProjectEntity>;
  addMember(projectId: string, input: AddProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity>;
  updateMember(projectId: string, memberId: string, input: UpdateProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity>;
  removeMember(projectId: string, memberId: string, ctx: RequestContext): Promise<void>;
  addModule(projectId: string, input: CreateProjectConfigItemInput, ctx: RequestContext): Promise<ProjectConfigItemEntity>;
  updateModule(
    projectId: string,
    moduleId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity>;
  removeModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<void>;
  updateFeatureProgressSettings(
    projectId: string,
    input: UpdateProjectFeatureProgressSettingsInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressSettings>;
  addFeaturePoint(
    projectId: string,
    input: CreateProjectFeaturePointInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointEntity>;
  addFeaturePointGroup(
    projectId: string,
    input: CreateProjectFeaturePointGroupInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointGroupEntity>;
  updateFeaturePointGroup(
    projectId: string,
    groupId: string,
    input: UpdateProjectFeaturePointGroupInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointGroupUpdateResult>;
  removeFeaturePointGroup(projectId: string, groupId: string, ctx: RequestContext): Promise<ProjectFeatureProgressIncrementalResult>;
  updateFeaturePoint(
    projectId: string,
    featurePointId: string,
    input: UpdateProjectFeaturePointInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointUpdateResult>;
  removeFeaturePoint(projectId: string, featurePointId: string, ctx: RequestContext): Promise<ProjectFeatureProgressIncrementalResult>;
  upsertFeatureProgressOverride(
    projectId: string,
    input: UpsertProjectFeatureProgressOverrideInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressOverrideUpdateResult>;
  removeFeatureProgressOverride(
    projectId: string,
    input: DeleteProjectFeatureProgressOverrideInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressOverrideDeleteResult>;
  addModuleMember(
    projectId: string,
    moduleId: string,
    input: AddProjectModuleMemberInput,
    ctx: RequestContext
  ): Promise<ProjectModuleMemberEntity>;
  removeModuleMember(projectId: string, moduleId: string, moduleMemberId: string, ctx: RequestContext): Promise<void>;
  replaceModuleRdLinks(
    projectId: string,
    moduleId: string,
    input: ReplaceModuleRdLinksInput,
    ctx: RequestContext
  ): Promise<ProjectModuleRdLinkEntity[]>;
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
  createRdStageTaskTemplate(
    projectId: string,
    input: CreateRdStageTaskTemplateInput,
    ctx: RequestContext
  ): Promise<RdStageTaskTemplateEntity>;
  updateRdStageTaskTemplate(
    projectId: string,
    templateId: string,
    input: UpdateRdStageTaskTemplateInput,
    ctx: RequestContext
  ): Promise<RdStageTaskTemplateEntity>;
  removeRdStageTaskTemplate(projectId: string, templateId: string, ctx: RequestContext): Promise<RdStageTaskTemplateEntity>;
}

export interface ProjectQueryContract {
  list(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult>;
  listAccessible(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult>;
  getById(projectId: string, ctx: RequestContext): Promise<ProjectEntity>;
  listMembers(projectId: string, ctx: RequestContext): Promise<ProjectMemberEntity[]>;
  listMemberCandidates(projectId: string, ctx: RequestContext): Promise<ProjectMemberCandidate[]>;
  listModules(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]>;
  getModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity>;
  getFeatureProgressSettings(projectId: string, ctx: RequestContext): Promise<ProjectFeatureProgressSettings>;
  getFeatureProgress(projectId: string, ctx: RequestContext): Promise<ProjectFeatureProgressView>;
  listModuleMembers(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectModuleMemberEntity[]>;
  listModuleRdLinks(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectModuleRdLinkEntity[]>;
  listProjectModuleRdLinks(projectId: string, ctx: RequestContext): Promise<ProjectModuleRdLinkEntity[]>;
  listEnvironments(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]>;
  listVersions(projectId: string, ctx: RequestContext): Promise<ProjectVersionItemEntity[]>;
  listRdStageTaskTemplates(projectId: string, ctx: RequestContext): Promise<RdStageTaskTemplateEntity[]>;
}
