import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateDocumentInput,
  DocumentEntity,
  DocumentListResult,
  ListDocumentsQuery,
  UpdateDocumentInput
} from "./document.types";

export interface DocumentCommandContract {
  create(input: CreateDocumentInput, ctx: RequestContext): Promise<DocumentEntity>;
  update(id: string, input: UpdateDocumentInput, ctx: RequestContext): Promise<DocumentEntity>;
  publish(id: string, ctx: RequestContext): Promise<DocumentEntity>;
  archive(id: string, ctx: RequestContext): Promise<DocumentEntity>;
}

export interface DocumentQueryContract {
  list(query: ListDocumentsQuery, ctx: RequestContext): Promise<DocumentListResult>;
  getById(id: string, ctx: RequestContext): Promise<DocumentEntity>;
  listPublic(query: ListDocumentsQuery, ctx: RequestContext): Promise<DocumentListResult>;
  getPublicByProjectAndSlug(projectKey: string, slug: string): Promise<DocumentEntity>;
  listRecentPublishedForNotifications(projectIds: string[], limit: number, ctx: RequestContext): Promise<DocumentEntity[]>;
  listRecentArchivedForNotifications(projectIds: string[], limit: number, ctx: RequestContext): Promise<DocumentEntity[]>;
}
