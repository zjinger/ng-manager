// reimbursement-upload.service.ts
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL, ApiClientService } from '@core/http';
import { buildUploadFormData, type UploadTargetPolicy, UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';
import { UploadEntity } from '@app/features/issues/models/issue.model';

@Injectable({ providedIn: 'root' })
export class ReimbursementUploadService {
  private readonly api = inject(ApiClientService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly defaultPolicy = UPLOAD_TARGETS.reimbursementAttachment;

  async uploadReimbursementFile(
    file: File,
    policy: UploadTargetPolicy = this.defaultPolicy,
    options?: { entityType?: string | null; entityId?: string | null }
  ): Promise<{ uploadId: string; fileUrl: string; fileInfo: UploadEntity }> {
    this.validateFile(file, policy);
    const formData = buildUploadFormData(file, policy, options);

    try {
      // ApiClientService 可能已经自动解包，直接返回 data
      const uploadData = await firstValueFrom(
        this.api.post<UploadEntity, FormData>('/uploads', formData)
      );
      
      console.log('API Response (auto-unwrapped):', uploadData);
      
      // 直接检查 uploadData 是否有 id
      if (!uploadData || !uploadData.id) {
        throw new Error('上传失败：未获取到文件ID');
      }

      const fileUrl = `${this.apiBaseUrl}/uploads/${uploadData.id}/raw`;
      
      console.log('Upload success:', { uploadId: uploadData.id, fileUrl });
      
      return {
        uploadId: uploadData.id,
        fileUrl: fileUrl,
        fileInfo: uploadData,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('文件上传失败，请稍后重试');
    }
  }

  private validateFile(file: File, policy: UploadTargetPolicy): void {
    const validationMessage = validateUploadFile(file, policy);
    if (validationMessage) {
      throw new Error(validationMessage);
    }
  }
}