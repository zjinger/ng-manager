import type { RequestContext } from "../../shared/context/request-context";
import type {
  AnnouncementEntity,
  AnnouncementListResult,
  CreateAnnouncementInput,
  ListAnnouncementsQuery,
  UpdateAnnouncementInput
} from "./announcement.types";

export interface AnnouncementCommandContract {
  create(input: CreateAnnouncementInput, ctx: RequestContext): Promise<AnnouncementEntity>;
  update(id: string, input: UpdateAnnouncementInput, ctx: RequestContext): Promise<AnnouncementEntity>;
  publish(id: string, ctx: RequestContext): Promise<AnnouncementEntity>;
  archive(id: string, ctx: RequestContext): Promise<AnnouncementEntity>;
  markReadBatch(ids: string[], ctx: RequestContext): Promise<number>;
}

export interface AnnouncementQueryContract {
  list(query: ListAnnouncementsQuery, ctx: RequestContext): Promise<AnnouncementListResult>;
  getById(id: string, ctx: RequestContext): Promise<AnnouncementEntity>;
  listPublic(query: ListAnnouncementsQuery, ctx: RequestContext): Promise<AnnouncementListResult>;
  listRecentForDashboard(projectIds: string[], limit: number, ctx: RequestContext): Promise<AnnouncementEntity[]>;
  listRecentArchivedForNotifications(projectIds: string[], limit: number, ctx: RequestContext): Promise<AnnouncementEntity[]>;
  getReadVersions(ids: string[], ctx: RequestContext): Promise<Map<string, string>>;
}
