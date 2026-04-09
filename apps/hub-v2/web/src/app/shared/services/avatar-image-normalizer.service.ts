import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AvatarImageNormalizerService {
  async normalize(file: File, size = 512): Promise<File> {
    const image = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('头像处理失败，请重试');
    }

    const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const sourceX = Math.max(((image.naturalWidth || image.width) - sourceSize) / 2, 0);
    const sourceY = Math.max(((image.naturalHeight || image.height) - sourceSize) / 2, 0);

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, size, size);
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

    const outputType = this.resolveOutputType(file.type);
    const blob = await this.canvasToBlob(canvas, outputType);
    return new File([blob], file.name, {
      type: outputType,
      lastModified: Date.now(),
    });
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('头像处理失败，请更换图片后重试'));
      };
      image.src = objectUrl;
    });
  }

  private canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('头像处理失败，请重试'));
      }, type, type === 'image/jpeg' ? 0.92 : undefined);
    });
  }

  private resolveOutputType(inputType: string): string {
    if (inputType === 'image/png' || inputType === 'image/webp' || inputType === 'image/jpeg') {
      return inputType;
    }
    return 'image/png';
  }
}
