import type Database from "better-sqlite3";
import type { RequestContext } from "../../shared/context/request-context";
import type { EventBus } from "../../shared/event/event-bus";
import type { ProjectCommandContract, ProjectQueryContract } from "./project.contract";
import { ProjectAuthorizationService } from "./project-authorization.service";
import { ProjectAccessService } from "./project-access.service";
import { UserRepo } from "../user/user.repo";
import { RdRepo } from "../rd/rd.repo";
import { ProjectRepo } from "./project.repo";
import type {
  AddProjectModuleMemberInput,
  AddProjectMemberInput,
  CreateProjectConfigItemInput,
  CreateProjectFeaturePointGroupInput,
  CreateProjectFeaturePointInput,
  CreateProjectInput,
  CreateProjectVersionItemInput,
  DeleteProjectFeatureProgressOverrideInput,
  ListProjectsQuery,
  ProjectConfigItemEntity,
  ProjectEntity,
  ProjectFeaturePointEntity,
  ProjectFeaturePointGroupEntity,
  ProjectFeaturePointGroupUpdateResult,
  ProjectFeaturePointUpdateResult,
  ProjectFeatureProgressIncrementalResult,
  ProjectFeatureProgressOverrideDeleteResult,
  ProjectFeatureProgressOverrideUpdateResult,
  ProjectFeatureProgressSettings,
  ProjectFeatureProgressView,
  ProjectListResult,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectModuleMemberEntity,
  ProjectModuleRdLinkEntity,
  ProjectVersionItemEntity,
  ReplaceModuleRdLinksInput,
  UpdateProjectConfigItemInput,
  UpdateProjectFeaturePointGroupInput,
  UpdateProjectFeaturePointInput,
  UpdateProjectFeatureProgressSettingsInput,
  UpdateProjectInput,
  UpdateProjectMemberInput,
  UpdateProjectVersionItemInput,
  UpsertProjectFeatureProgressOverrideInput
} from "./project.types";
import { ProjectBaseService } from "./services/project-base.service";
import { ProjectFeaturePointGroupService } from "./services/project-feature-point-group.service";
import { ProjectFeaturePointService } from "./services/project-feature-point.service";
import { ProjectFeatureProgressAggregateService } from "./services/project-feature-progress-aggregate.service";
import { ProjectFeatureProgressService } from "./services/project-feature-progress.service";
import { ProjectMemberService } from "./services/project-member.service";
import { ProjectMetaService } from "./services/project-meta.service";
import { ProjectVersionService } from "./services/project-version.service";

export class ProjectService implements ProjectCommandContract, ProjectQueryContract {
  private readonly baseService: ProjectBaseService;
  private readonly memberService: ProjectMemberService;
  private readonly metaService: ProjectMetaService;
  private readonly versionService: ProjectVersionService;
  private readonly featurePointGroupService: ProjectFeaturePointGroupService;
  private readonly featurePointService: ProjectFeaturePointService;
  private readonly featureProgressService: ProjectFeatureProgressService;

  constructor(
    repo: ProjectRepo,
    userRepo: UserRepo,
    rdRepo: RdRepo,
    access: ProjectAccessService,
    authorization: ProjectAuthorizationService,
    eventBus: EventBus,
    db: Database.Database,
    initAdminUsername: string | null = null
  ) {
    const aggregateService = new ProjectFeatureProgressAggregateService(repo);
    this.baseService = new ProjectBaseService(repo, userRepo, rdRepo, access, authorization, db);
    this.memberService = new ProjectMemberService(
      repo,
      userRepo,
      access,
      authorization,
      eventBus,
      db,
      this.baseService,
      initAdminUsername
    );
    this.metaService = new ProjectMetaService(repo, userRepo, rdRepo, access, db, this.baseService);
    this.versionService = new ProjectVersionService(repo, access, this.baseService);
    this.featurePointGroupService = new ProjectFeaturePointGroupService(repo, access, this.baseService, aggregateService);
    this.featurePointService = new ProjectFeaturePointService(
      repo,
      access,
      this.baseService,
      this.featurePointGroupService,
      aggregateService
    );
    this.featureProgressService = new ProjectFeatureProgressService(repo, access, this.baseService, aggregateService);
  }

  create(input: CreateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    return this.baseService.create(input, ctx);
  }

  update(projectId: string, input: UpdateProjectInput, ctx: RequestContext): Promise<ProjectEntity> {
    return this.baseService.update(projectId, input, ctx);
  }

  list(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult> {
    return this.baseService.list(query, ctx);
  }

  listAccessible(query: ListProjectsQuery, ctx: RequestContext): Promise<ProjectListResult> {
    return this.baseService.listAccessible(query, ctx);
  }

  getById(projectId: string, ctx: RequestContext): Promise<ProjectEntity> {
    return this.baseService.getById(projectId, ctx);
  }

  listMembers(projectId: string, ctx: RequestContext): Promise<ProjectMemberEntity[]> {
    return this.memberService.listMembers(projectId, ctx);
  }

  listMemberCandidates(projectId: string, ctx: RequestContext): Promise<ProjectMemberCandidate[]> {
    return this.memberService.listMemberCandidates(projectId, ctx);
  }

  addMember(projectId: string, input: AddProjectMemberInput, ctx: RequestContext): Promise<ProjectMemberEntity> {
    return this.memberService.addMember(projectId, input, ctx);
  }

  updateMember(
    projectId: string,
    memberId: string,
    input: UpdateProjectMemberInput,
    ctx: RequestContext
  ): Promise<ProjectMemberEntity> {
    return this.memberService.updateMember(projectId, memberId, input, ctx);
  }

  removeMember(projectId: string, memberId: string, ctx: RequestContext): Promise<void> {
    return this.memberService.removeMember(projectId, memberId, ctx);
  }

  listModules(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]> {
    return this.metaService.listModules(projectId, ctx);
  }

  getModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity> {
    return this.metaService.getModule(projectId, moduleId, ctx);
  }

  addModule(projectId: string, input: CreateProjectConfigItemInput, ctx: RequestContext): Promise<ProjectConfigItemEntity> {
    return this.metaService.addModule(projectId, input, ctx);
  }

  updateModule(
    projectId: string,
    moduleId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    return this.metaService.updateModule(projectId, moduleId, input, ctx);
  }

  removeModule(projectId: string, moduleId: string, ctx: RequestContext): Promise<void> {
    return this.metaService.removeModule(projectId, moduleId, ctx);
  }

  getFeatureProgressSettings(projectId: string, ctx: RequestContext): Promise<ProjectFeatureProgressSettings> {
    return this.featureProgressService.getFeatureProgressSettings(projectId, ctx);
  }

  updateFeatureProgressSettings(
    projectId: string,
    input: UpdateProjectFeatureProgressSettingsInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressSettings> {
    return this.featureProgressService.updateFeatureProgressSettings(projectId, input, ctx);
  }

  getFeatureProgress(projectId: string, ctx: RequestContext): Promise<ProjectFeatureProgressView> {
    return this.featureProgressService.getFeatureProgress(projectId, ctx);
  }

  addFeaturePoint(
    projectId: string,
    input: CreateProjectFeaturePointInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointEntity> {
    return this.featurePointService.addFeaturePoint(projectId, input, ctx);
  }

  addFeaturePointGroup(
    projectId: string,
    input: CreateProjectFeaturePointGroupInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointGroupEntity> {
    return this.featurePointGroupService.addFeaturePointGroup(projectId, input, ctx);
  }

  updateFeaturePointGroup(
    projectId: string,
    groupId: string,
    input: UpdateProjectFeaturePointGroupInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointGroupUpdateResult> {
    return this.featurePointGroupService.updateFeaturePointGroup(projectId, groupId, input, ctx);
  }

  removeFeaturePointGroup(
    projectId: string,
    groupId: string,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressIncrementalResult> {
    return this.featurePointGroupService.removeFeaturePointGroup(projectId, groupId, ctx);
  }

  updateFeaturePoint(
    projectId: string,
    featurePointId: string,
    input: UpdateProjectFeaturePointInput,
    ctx: RequestContext
  ): Promise<ProjectFeaturePointUpdateResult> {
    return this.featurePointService.updateFeaturePoint(projectId, featurePointId, input, ctx);
  }

  removeFeaturePoint(projectId: string, featurePointId: string, ctx: RequestContext): Promise<ProjectFeatureProgressIncrementalResult> {
    return this.featurePointService.removeFeaturePoint(projectId, featurePointId, ctx);
  }

  upsertFeatureProgressOverride(
    projectId: string,
    input: UpsertProjectFeatureProgressOverrideInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressOverrideUpdateResult> {
    return this.featureProgressService.upsertFeatureProgressOverride(projectId, input, ctx);
  }

  removeFeatureProgressOverride(
    projectId: string,
    input: DeleteProjectFeatureProgressOverrideInput,
    ctx: RequestContext
  ): Promise<ProjectFeatureProgressOverrideDeleteResult> {
    return this.featureProgressService.removeFeatureProgressOverride(projectId, input, ctx);
  }

  listModuleMembers(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectModuleMemberEntity[]> {
    return this.metaService.listModuleMembers(projectId, moduleId, ctx);
  }

  addModuleMember(
    projectId: string,
    moduleId: string,
    input: AddProjectModuleMemberInput,
    ctx: RequestContext
  ): Promise<ProjectModuleMemberEntity> {
    return this.metaService.addModuleMember(projectId, moduleId, input, ctx);
  }

  removeModuleMember(projectId: string, moduleId: string, moduleMemberId: string, ctx: RequestContext): Promise<void> {
    return this.metaService.removeModuleMember(projectId, moduleId, moduleMemberId, ctx);
  }

  listModuleRdLinks(projectId: string, moduleId: string, ctx: RequestContext): Promise<ProjectModuleRdLinkEntity[]> {
    return this.metaService.listModuleRdLinks(projectId, moduleId, ctx);
  }

  replaceModuleRdLinks(
    projectId: string,
    moduleId: string,
    input: ReplaceModuleRdLinksInput,
    ctx: RequestContext
  ): Promise<ProjectModuleRdLinkEntity[]> {
    return this.metaService.replaceModuleRdLinks(projectId, moduleId, input, ctx);
  }

  listProjectModuleRdLinks(projectId: string, ctx: RequestContext): Promise<ProjectModuleRdLinkEntity[]> {
    return this.metaService.listProjectModuleRdLinks(projectId, ctx);
  }

  listEnvironments(projectId: string, ctx: RequestContext): Promise<ProjectConfigItemEntity[]> {
    return this.metaService.listEnvironments(projectId, ctx);
  }

  addEnvironment(
    projectId: string,
    input: CreateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    return this.metaService.addEnvironment(projectId, input, ctx);
  }

  updateEnvironment(
    projectId: string,
    environmentId: string,
    input: UpdateProjectConfigItemInput,
    ctx: RequestContext
  ): Promise<ProjectConfigItemEntity> {
    return this.metaService.updateEnvironment(projectId, environmentId, input, ctx);
  }

  removeEnvironment(projectId: string, environmentId: string, ctx: RequestContext): Promise<void> {
    return this.metaService.removeEnvironment(projectId, environmentId, ctx);
  }

  listVersions(projectId: string, ctx: RequestContext): Promise<ProjectVersionItemEntity[]> {
    return this.versionService.listVersions(projectId, ctx);
  }

  addVersion(projectId: string, input: CreateProjectVersionItemInput, ctx: RequestContext): Promise<ProjectVersionItemEntity> {
    return this.versionService.addVersion(projectId, input, ctx);
  }

  updateVersion(
    projectId: string,
    versionId: string,
    input: UpdateProjectVersionItemInput,
    ctx: RequestContext
  ): Promise<ProjectVersionItemEntity> {
    return this.versionService.updateVersion(projectId, versionId, input, ctx);
  }

  removeVersion(projectId: string, versionId: string, ctx: RequestContext): Promise<void> {
    return this.versionService.removeVersion(projectId, versionId, ctx);
  }
}
