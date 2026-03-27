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
    return this.api.get<AnnouncementListResult>('/announcements', query);
  }

  listDocuments(query: Partial<ContentQuery>) {
    return this.api.get<DocumentListResult>('/documents', query);
  }

  listReleases(query: Partial<ContentQuery>) {
    return this.api.get<ReleaseListResult>('/releases', query);
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

  updateDocument(documentId: string, input: UpdateDocumentInput) {
    return this.api.patch<DocumentEntity, UpdateDocumentInput>(`/documents/${documentId}`, input);
  }

  publishDocument(documentId: string) {
    return this.api.post<DocumentEntity>(`/documents/${documentId}/publish`);
  }

  updateRelease(releaseId: string, input: UpdateReleaseInput) {
    return this.api.patch<ReleaseEntity, UpdateReleaseInput>(`/releases/${releaseId}`, input);
  }

  publishRelease(releaseId: string) {
    return this.api.post<ReleaseEntity>(`/releases/${releaseId}/publish`);
  }
}
