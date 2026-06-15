import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateSkillCommentInput,
  CreateSkillInput,
  CreateSkillVersionInput,
  ListSkillsQuery,
  RejectSkillVersionInput,
  ReviewSkillInput,
  SkillDiscoveryMeta,
  SkillCommentEntity,
  SkillDetailEntity,
  SkillEntity,
  SkillExportConfig,
  SkillExportTarget,
  SkillListResult,
  UpdateSkillInput,
  SkillVersionEntity
} from "./skill-hub.types";

export interface SkillHubCommandContract {
  create(input: CreateSkillInput, ctx: RequestContext): Promise<SkillDetailEntity>;
  update(skillId: string, input: UpdateSkillInput, ctx: RequestContext): Promise<SkillDetailEntity>;
  createVersion(skillId: string, input: CreateSkillVersionInput, ctx: RequestContext): Promise<SkillDetailEntity>;
  submitVersion(skillId: string, versionId: string, ctx: RequestContext): Promise<SkillVersionEntity>;
  publishVersion(skillId: string, versionId: string, ctx: RequestContext): Promise<SkillDetailEntity>;
  rejectVersion(skillId: string, versionId: string, input: RejectSkillVersionInput, ctx: RequestContext): Promise<SkillVersionEntity>;
  archive(skillId: string, ctx: RequestContext): Promise<SkillEntity>;
  deleteSkill(skillId: string, ctx: RequestContext): Promise<{ id: string }>;
  deleteDraft(skillId: string, ctx: RequestContext): Promise<{ id: string }>;
  setFavorite(skillId: string, favorite: boolean, ctx: RequestContext): Promise<SkillDetailEntity>;
  review(skillId: string, input: ReviewSkillInput, ctx: RequestContext): Promise<SkillDetailEntity>;
  createComment(skillId: string, input: CreateSkillCommentInput, ctx: RequestContext): Promise<SkillCommentEntity>;
}

export interface SkillHubQueryContract {
  list(query: ListSkillsQuery, ctx: RequestContext): Promise<SkillListResult>;
  getMeta(query: ListSkillsQuery, ctx: RequestContext): Promise<SkillDiscoveryMeta>;
  getById(skillId: string, ctx: RequestContext): Promise<SkillDetailEntity>;
  listComments(skillId: string, ctx: RequestContext): Promise<SkillCommentEntity[]>;
  getDownload(skillId: string, versionId: string, ctx: RequestContext): Promise<SkillVersionEntity>;
  getExport(skillId: string, versionId: string, target: SkillExportTarget, ctx: RequestContext): Promise<SkillExportConfig>;
}
