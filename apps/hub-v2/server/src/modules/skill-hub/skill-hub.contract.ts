import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateSkillInput,
  CreateSkillVersionInput,
  ListSkillsQuery,
  RejectSkillVersionInput,
  SkillDetailEntity,
  SkillEntity,
  SkillListResult,
  SkillVersionEntity
} from "./skill-hub.types";

export interface SkillHubCommandContract {
  create(input: CreateSkillInput, ctx: RequestContext): Promise<SkillDetailEntity>;
  createVersion(skillId: string, input: CreateSkillVersionInput, ctx: RequestContext): Promise<SkillDetailEntity>;
  submitVersion(skillId: string, versionId: string, ctx: RequestContext): Promise<SkillVersionEntity>;
  publishVersion(skillId: string, versionId: string, ctx: RequestContext): Promise<SkillDetailEntity>;
  rejectVersion(skillId: string, versionId: string, input: RejectSkillVersionInput, ctx: RequestContext): Promise<SkillVersionEntity>;
  archive(skillId: string, ctx: RequestContext): Promise<SkillEntity>;
}

export interface SkillHubQueryContract {
  list(query: ListSkillsQuery, ctx: RequestContext): Promise<SkillListResult>;
  getById(skillId: string, ctx: RequestContext): Promise<SkillDetailEntity>;
  getDownload(skillId: string, versionId: string, ctx: RequestContext): Promise<SkillVersionEntity>;
}
