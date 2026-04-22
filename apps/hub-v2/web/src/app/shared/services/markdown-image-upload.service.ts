import { Injectable, inject } from '@angular/core';
import { type UploadTargetPolicy } from '@shared/constants';
import { ImageUploadService } from './image-upload.service';

@Injectable({ providedIn: 'root' })
export class MarkdownImageUploadService {
  private readonly imageUpload = inject(ImageUploadService);

  async uploadImage(file: File, policy?: UploadTargetPolicy): Promise<string> {
    return this.imageUpload.uploadImage(file, policy);
  }
}
