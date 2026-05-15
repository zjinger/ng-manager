import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL, ApiClientService } from '@core/http';
import { buildUploadFormData, UPLOAD_TARGETS } from '@shared/constants';
import type {
  AttachReimbursementUploadInput,
  CreateReimbursementClaimInput,
  ReimbursementActionInput,
  ReimbursementClaimDetail,
  ReimbursementClaimListResult,
  ReimbursementDashboard,
  ReimbursementStats,
  ReimbursementStatsQuery,
  ReimbursementTransferInput,
  ReimbursementListQuery,
  UpdateReimbursementClaimInput,
} from '../models/reimbursement.model';

@Injectable({ providedIn: 'root' })
export class ReimbursementApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getDashboard() {
    return this.api.get<ReimbursementDashboard>('/reimbursements/dashboard');
  }

  getStats(query: ReimbursementStatsQuery) {
    return this.api.get<ReimbursementStats>('/reimbursements/stats', query);
  }

  listClaims(query: ReimbursementListQuery) {
    return this.api.get<ReimbursementClaimListResult>('/reimbursements/claims', query);
  }

  getClaimById(claimId: string) {
    return this.api.get<ReimbursementClaimDetail>(`/reimbursements/claims/${claimId}`);
  }

  createClaim(input: CreateReimbursementClaimInput) {
    return this.api.post<ReimbursementClaimDetail, CreateReimbursementClaimInput>('/reimbursements/claims', input);
  }

  updateClaim(claimId: string, input: UpdateReimbursementClaimInput) {
    return this.api.patch<ReimbursementClaimDetail, UpdateReimbursementClaimInput>(`/reimbursements/claims/${claimId}`, input);
  }

  submitClaim(claimId: string) {
    return this.api.post<ReimbursementClaimDetail>(`/reimbursements/claims/${claimId}/submit`);
  }

  approveClaim(claimId: string, input: ReimbursementActionInput) {
    return this.api.post<ReimbursementClaimDetail, ReimbursementActionInput>(`/reimbursements/claims/${claimId}/approve`, input);
  }

  rejectClaim(claimId: string, input: ReimbursementActionInput) {
    return this.api.post<ReimbursementClaimDetail, ReimbursementActionInput>(`/reimbursements/claims/${claimId}/reject`, input);
  }

  transferClaim(claimId: string, input: ReimbursementTransferInput) {
    return this.api.post<ReimbursementClaimDetail, ReimbursementTransferInput>(`/reimbursements/claims/${claimId}/transfer`, input);
  }

  addSign(claimId: string, input: ReimbursementTransferInput) {
    return this.api.post<ReimbursementClaimDetail, ReimbursementTransferInput>(`/reimbursements/claims/${claimId}/add-sign`, input);
  }

  attachUpload(claimId: string, input: AttachReimbursementUploadInput) {
    return this.api.post<ReimbursementClaimDetail, AttachReimbursementUploadInput>(`/reimbursements/claims/${claimId}/attachments`, input);
  }

  detachUpload(claimId: string, attachmentId: string) {
    return this.api.delete<ReimbursementClaimDetail>(`/reimbursements/claims/${claimId}/attachments/${attachmentId}`);
  }

  uploadAttachment(file: File) {
    const formData = buildUploadFormData(file, UPLOAD_TARGETS.reimbursementAttachment);
    return this.api.post<{ id: string }, FormData>('/uploads', formData);
  }

  exportWord(claimId: string) {
    return this.http.get(`${this.baseUrl}/reimbursements/claims/${claimId}/export`, {
      responseType: 'blob',
      observe: 'response',
      withCredentials: true,
    });
  }
}
