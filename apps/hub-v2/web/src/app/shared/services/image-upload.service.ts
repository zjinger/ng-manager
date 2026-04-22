import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL, ApiClientService } from '@core/http';
import { buildUploadFormData, type UploadTargetPolicy, UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';

interface UploadResult {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private readonly api = inject(ApiClientService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly defaultPolicy = UPLOAD_TARGETS.markdownImage;

  async uploadImage(file: File, policy: UploadTargetPolicy = this.defaultPolicy): Promise<string> {
    this.ensureImageFile(file, policy);
    const formData = buildUploadFormData(file, policy);

    try {
      const upload = await firstValueFrom(
        this.api.post<UploadResult, FormData>('/uploads', formData)
      );
      return `${this.apiBaseUrl}/uploads/${upload.id}/raw`;
    } catch {
      throw new Error('图片上传失败，请稍后重试');
    }
  }

  private ensureImageFile(file: File, policy: UploadTargetPolicy): void {
    const validationMessage = validateUploadFile(file, policy);
    if (validationMessage) {
      throw new Error(validationMessage);
    }
  }
}
