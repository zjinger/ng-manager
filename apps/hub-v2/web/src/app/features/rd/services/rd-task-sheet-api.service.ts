import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL, ApiClientService } from '@core/http';
import { buildUploadFormData, UPLOAD_TARGETS } from '@shared/constants';
import type {
  CloseRdTaskSheetInput,
  AssignRdTaskSheetInput,
  ConvertRdTaskSheetToIssueInput,
  ConvertRdTaskSheetToRdItemInput,
  CreateRdTaskSheetInput,
  PreviewRdTaskSheetImportResult,
  RdTaskSheetDetail,
  RdTaskSheetListQuery,
  RdTaskSheetListResult,
  ReplyRdTaskSheetInput,
  ReturnReviewRdTaskSheetInput,
  UpdateRdTaskSheetInput,
} from '../models/rd-task-sheet.model';

@Injectable({ providedIn: 'root' })
export class RdTaskSheetApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(query: Partial<RdTaskSheetListQuery>) {
    const normalizedQuery: Record<string, string | number | boolean | null | undefined> = {
      ...query,
      status: query.status && query.status.length > 0 ? query.status.join(',') : undefined,
    };
    return this.api.get<RdTaskSheetListResult>('/rd/task-sheets', normalizedQuery);
  }

  getById(sheetId: string) {
    return this.api.get<RdTaskSheetDetail>(`/rd/task-sheets/${sheetId}`);
  }

  create(input: CreateRdTaskSheetInput) {
    return this.api.post<RdTaskSheetDetail, CreateRdTaskSheetInput>('/rd/task-sheets', input);
  }

  update(sheetId: string, input: UpdateRdTaskSheetInput) {
    return this.api.patch<RdTaskSheetDetail, UpdateRdTaskSheetInput>(`/rd/task-sheets/${sheetId}`, input);
  }

  delete(sheetId: string) {
    return this.api.delete<{ id: string }>(`/rd/task-sheets/${sheetId}`);
  }

  issue(sheetId: string) {
    return this.api.post<RdTaskSheetDetail>(`/rd/task-sheets/${sheetId}/issue`);
  }

  submitReview(sheetId: string) {
    return this.api.post<RdTaskSheetDetail>(`/rd/task-sheets/${sheetId}/submit-review`);
  }

  approveReview(sheetId: string) {
    return this.api.post<RdTaskSheetDetail>(`/rd/task-sheets/${sheetId}/review/approve`);
  }

  returnReview(sheetId: string, input: ReturnReviewRdTaskSheetInput) {
    return this.api.post<RdTaskSheetDetail, ReturnReviewRdTaskSheetInput>(`/rd/task-sheets/${sheetId}/review/return`, input);
  }

  assign(sheetId: string, input: AssignRdTaskSheetInput) {
    return this.api.post<RdTaskSheetDetail, AssignRdTaskSheetInput>(`/rd/task-sheets/${sheetId}/assign`, input);
  }

  startProcessing(sheetId: string) {
    return this.api.post<RdTaskSheetDetail>(`/rd/task-sheets/${sheetId}/start-processing`);
  }

  reply(sheetId: string, input: ReplyRdTaskSheetInput) {
    return this.api.post<RdTaskSheetDetail, ReplyRdTaskSheetInput>(`/rd/task-sheets/${sheetId}/reply`, input);
  }

  close(sheetId: string, input: CloseRdTaskSheetInput = {}) {
    return this.api.post<RdTaskSheetDetail, CloseRdTaskSheetInput>(`/rd/task-sheets/${sheetId}/close`, input);
  }

  attachUpload(sheetId: string, uploadId: string) {
    return this.api.post<RdTaskSheetDetail, { uploadId: string }>(`/rd/task-sheets/${sheetId}/attachments`, { uploadId });
  }

  detachUpload(sheetId: string, attachmentId: string) {
    return this.api.delete<RdTaskSheetDetail>(`/rd/task-sheets/${sheetId}/attachments/${attachmentId}`);
  }

  previewImport(uploadId: string) {
    return this.api.post<PreviewRdTaskSheetImportResult, { uploadId: string }>('/rd/task-sheets/import/preview', { uploadId });
  }

  exportWord(sheetId: string) {
    return this.http.get(`${this.baseUrl}/rd/task-sheets/${sheetId}/export`, {
      observe: 'response',
      responseType: 'blob',
      withCredentials: true,
    });
  }

  convertToRdItem(sheetId: string, input: ConvertRdTaskSheetToRdItemInput) {
    return this.api.post<RdTaskSheetDetail, ConvertRdTaskSheetToRdItemInput>(`/rd/task-sheets/${sheetId}/convert/rd-item`, input);
  }

  convertToIssue(sheetId: string, input: ConvertRdTaskSheetToIssueInput) {
    return this.api.post<RdTaskSheetDetail, ConvertRdTaskSheetToIssueInput>(`/rd/task-sheets/${sheetId}/convert/issue`, input);
  }

  uploadAttachment(file: File) {
    return this.api.post<{ id: string }, FormData>('/uploads', buildUploadFormData(file, UPLOAD_TARGETS.taskSheetAttachment));
  }

  uploadWordImport(file: File) {
    return this.api.post<{ id: string }, FormData>('/uploads', buildUploadFormData(file, UPLOAD_TARGETS.taskSheetWordImport));
  }
}
