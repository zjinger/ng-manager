import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../core/http/api-client.service';

interface UploadResult {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class MarkdownImageUploadService {
  private readonly api = inject(ApiClientService);

  async uploadImage(file: File, maxSizeMb = 10): Promise<string> {
    this.ensureImageFile(file, maxSizeMb);

    const formData = new FormData();
    formData.set('file', file);
    formData.set('bucket', 'issues');
    formData.set('category', 'markdown');
    formData.set('visibility', 'private');

    try {
      const upload = await firstValueFrom(
        this.api.post<UploadResult, FormData>('/uploads', formData)
      );
      return `/api/admin/uploads/${upload.id}/raw`;
    } catch {
      throw new Error('图片上传失败，请稍后重试');
    }
  }

  private ensureImageFile(file: File, maxSizeMb: number): void {
    if (!file.type.startsWith('image/')) {
      throw new Error('仅支持图片文件');
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      throw new Error(`图片大小不能超过 ${maxSizeMb}MB`);
    }
  }
}

