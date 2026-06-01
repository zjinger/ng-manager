import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import type {
  AnnouncementEntity,
  AnnouncementListResult,
  ContentQuery,
  CreateAnnouncementInput,
  CreateDocumentInput,
  CreateReleaseInput,
  DocumentEntity,
  DocumentListResult,
  ReleaseEntity,
  ReleaseListResult,
  UpdateAnnouncementInput,
  UpdateDocumentInput,
  UpdateReleaseInput,
} from '../models/content.model';

@Injectable({ providedIn: 'root' })
export class ContentApiService {
  private readonly api = inject(ApiClientService);

  listAnnouncements(query: Partial<ContentQuery>) {
    return this.api.get<AnnouncementListResult>('/announcements', this.normalizeListQuery(query));
  }

  getAnnouncementById(announcementId: string) {
    return this.api.get<AnnouncementEntity>(`/announcements/${announcementId}`);
  }

  listDocuments(query: Partial<ContentQuery>) {
    return this.api.get<DocumentListResult>('/documents', this.normalizeListQuery(query));
  }

  getDocumentById(documentId: string) {
    return this.api.get<DocumentEntity>(`/documents/${documentId}`);
  }

  listReleases(query: Partial<ContentQuery>) {
    return this.api.get<ReleaseListResult>('/releases', this.normalizeListQuery(query));
  }

  getReleaseById(releaseId: string) {
    return this.api.get<ReleaseEntity>(`/releases/${releaseId}`);
  }

  createAnnouncement(input: CreateAnnouncementInput) {
    return this.api.post<AnnouncementEntity>('/announcements', input);
  }

  createDocument(input: CreateDocumentInput) {
    return this.api.post<DocumentEntity>('/documents', input);
  }

  createRelease(input: CreateReleaseInput) {
    return this.api.post<ReleaseEntity>('/releases', input);
  }

  updateAnnouncement(announcementId: string, input: UpdateAnnouncementInput) {
    return this.api.patch<AnnouncementEntity, UpdateAnnouncementInput>(`/announcements/${announcementId}`, input);
  }

  publishAnnouncement(announcementId: string) {
    return this.api.post<AnnouncementEntity>(`/announcements/${announcementId}/publish`);
  }

  archiveAnnouncement(announcementId: string) {
    return this.api.post<AnnouncementEntity>(`/announcements/${announcementId}/archive`);
  }

  deleteArchivedAnnouncement(announcementId: string) {
    return this.api.delete<{ id: string }>(`/announcements/${announcementId}`);
  }

  updateDocument(documentId: string, input: UpdateDocumentInput) {
    return this.api.patch<DocumentEntity, UpdateDocumentInput>(`/documents/${documentId}`, input);
  }

  publishDocument(documentId: string) {
    return this.api.post<DocumentEntity>(`/documents/${documentId}/publish`);
  }

  archiveDocument(documentId: string) {
    return this.api.post<DocumentEntity>(`/documents/${documentId}/archive`);
  }

  deleteArchivedDocument(documentId: string) {
    return this.api.delete<{ id: string }>(`/documents/${documentId}`);
  }

  updateRelease(releaseId: string, input: UpdateReleaseInput) {
    return this.api.patch<ReleaseEntity, UpdateReleaseInput>(`/releases/${releaseId}`, input);
  }

  publishRelease(releaseId: string) {
    return this.api.post<ReleaseEntity>(`/releases/${releaseId}/publish`);
  }

  archiveRelease(releaseId: string) {
    return this.api.post<ReleaseEntity>(`/releases/${releaseId}/archive`);
  }

  deleteArchivedRelease(releaseId: string) {
    return this.api.delete<{ id: string }>(`/releases/${releaseId}`);
  }

  private normalizeListQuery(query: Partial<ContentQuery>): Partial<ContentQuery> {
    if (query.status !== 'active') {
      return query;
    }
    const { status: _status, ...rest } = query;
    return { ...rest, statusGroup: 'active' };
  }
}
