import { inject, Injectable } from '@angular/core';

import { ApiClientService } from '@core/http';
import { buildUploadFormData, UPLOAD_TARGETS } from '@shared/constants';
import type {
  CloseRdTaskSheetInput,
  CreateRdTaskSheetInput,
  RdTaskSheetDetail,
  RdTaskSheetListQuery,
  RdTaskSheetListResult,
  ReplyRdTaskSheetInput,
  UpdateRdTaskSheetInput,
} from '../models/rd-task-sheet.model';

@Injectable({ providedIn: 'root' })
export class RdTaskSheetApiService {
  private readonly api = inject(ApiClientService);

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

  issue(sheetId: string) {
    return this.api.post<RdTaskSheetDetail>(`/rd/task-sheets/${sheetId}/issue`);
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

  uploadAttachment(file: File) {
    return this.api.post<{ id: string }, FormData>('/uploads', buildUploadFormData(file, UPLOAD_TARGETS.taskSheetAttachment));
  }
}
