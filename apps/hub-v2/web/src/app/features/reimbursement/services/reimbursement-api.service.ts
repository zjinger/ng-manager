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

  /**
   * 获取报销工作台数据
   */
  getDashboard() {
    return this.api.get<ReimbursementDashboard>('/reimbursements/dashboard');
  }

  /**
   * 获取报销统计数据
   */
  getStats(query: ReimbursementStatsQuery) {
    return this.api.get<ReimbursementStats>('/reimbursements/stats', query);
  }

  /**
   * 获取报销单列表
   */
  listClaims(query: ReimbursementListQuery) {
    return this.api.get<ReimbursementClaimListResult>('/reimbursements/claims', query);
  }

  /**
   * 获取报销单详情
   */
  getClaimById(claimId: string) {
    return this.api.get<ReimbursementClaimDetail>(`/reimbursements/claims/${claimId}`);
  }

  /**
   * 创建报销单草稿
   */
  createClaim(input: CreateReimbursementClaimInput) {
    return this.api.post<ReimbursementClaimDetail, CreateReimbursementClaimInput>(
      '/reimbursements/claims',
      input
    );
  }

  /**
   * 编辑报销单
   */
  updateClaim(claimId: string, input: UpdateReimbursementClaimInput) {
    return this.api.patch<ReimbursementClaimDetail, UpdateReimbursementClaimInput>(
      `/reimbursements/claims/${claimId}`,
      input
    );
  }

  /**
   * 提交报销审批
   */
  submitClaim(claimId: string) {
    return this.api.post<ReimbursementClaimDetail>(`/reimbursements/claims/${claimId}/submit`);
  }

  /**
   * 审批通过
   */
  approveClaim(claimId: string, input: ReimbursementActionInput) {
    return this.api.post<ReimbursementClaimDetail, ReimbursementActionInput>(
      `/reimbursements/claims/${claimId}/approve`,
      input
    );
  }

  /**
   * 审批驳回
   */
  rejectClaim(claimId: string, input: ReimbursementActionInput) {
    return this.api.post<ReimbursementClaimDetail, ReimbursementActionInput>(
      `/reimbursements/claims/${claimId}/reject`,
      input
    );
  }

  /**
   * 转交审批
   */
  transferClaim(claimId: string, input: ReimbursementTransferInput) {
    return this.api.post<ReimbursementClaimDetail, ReimbursementTransferInput>(
      `/reimbursements/claims/${claimId}/transfer`,
      input
    );
  }

  /**
   * 审批加签
   */
  addSign(claimId: string, input: ReimbursementTransferInput) {
    return this.api.post<ReimbursementClaimDetail, ReimbursementTransferInput>(
      `/reimbursements/claims/${claimId}/add-sign`,
      input
    );
  }

  /**
   * 绑定报销附件
   */
  attachUpload(claimId: string, input: AttachReimbursementUploadInput) {
    return this.api.post<ReimbursementClaimDetail, AttachReimbursementUploadInput>(
      `/reimbursements/claims/${claimId}/attachments`,
      input
    );
  }

  /**
   * 删除报销附件
   */
  detachUpload(claimId: string, attachmentId: string) {
    return this.api.delete<ReimbursementClaimDetail>(
      `/reimbursements/claims/${claimId}/attachments/${attachmentId}`
    );
  }

  /**
   * 上传附件文件
   */
  uploadAttachment(file: File) {
    const formData = buildUploadFormData(file, UPLOAD_TARGETS.reimbursementAttachment);

    return this.api.post<{ id: string }, FormData>('/uploads', formData);
  }

  /**
   * 导出 Word 报销单
   */
  exportWord(claimId: string) {
    return this.http.get(`${this.baseUrl}/reimbursements/claims/${claimId}/export`, {
      responseType: 'blob',
      observe: 'response',
      withCredentials: true,
    });
  }
}
