import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Subscription } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import type { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';

import { AttachmentPreviewWallComponent } from '../../../../shared/ui/attachment-preview-wall/attachment-preview-wall.component';
import type { AttachmentPreviewItem } from '../../../../shared/ui/attachment-preview-wall/attachment-preview-wall.component';
import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';
import type { IssueAttachmentEntity } from '../../models/issue.model';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-issue-attachments-panel',
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    NzUploadModule,
    PanelCardComponent,
    AttachmentPreviewWallComponent,
  ],
  template: `
    <app-panel-card title="附件" [count]="attachments().length" [empty]="attachments().length === 0" emptyText="当前还没有附件">
      <nz-upload
        panel-actions
        class="upload-btn"
        [nzShowUploadList]="false"
        [nzDisabled]="busy()"
        [nzMultiple]="false"
        [nzAccept]="acceptTypes"
        [nzBeforeUpload]="beforeUpload"
        [nzCustomRequest]="customRequest"
      >
        <button nz-button [disabled]="busy()">
          <span nz-icon nzType="upload"></span>
          上传附件
        </button>
      </nz-upload>

      @if (attachments().length > 0) {
        <div class="attachment-wall-wrap">
          <app-attachment-preview-wall
            [items]="attachmentPreviewItems()"
            [removeDisabled]="busy()"
            [showMeta]="true"
            (remove)="remove.emit($event)"
          />
        </div>
      }
    </app-panel-card>
  `,
  styles: [
    `
      .upload-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .attachment-wall-wrap {
        padding: 14px 20px 18px;
        border-top: 1px solid var(--border-color-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueAttachmentsPanelComponent {
  private readonly message = inject(NzMessageService);

  readonly attachments = input<IssueAttachmentEntity[]>([]);
  readonly busy = input(false);
  readonly upload = output<File>();
  readonly remove = output<string>();
  readonly acceptTypes = 'image/*,video/*';

  readonly beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = this.toRawFile(file);
    if (!rawFile) {
      this.message.warning('文件读取失败，请重试');
      return false;
    }
    if (!this.isAllowedFile(rawFile)) {
      this.message.warning('仅支持上传图片或视频文件');
      return false;
    }
    this.upload.emit(rawFile);
    return false;
  };

  readonly customRequest = (item: NzUploadXHRArgs): Subscription => {
    // Upload is handled by parent store (issueApi.uploadFile + addAttachment).
    item.onSuccess?.({}, item.file, item);
    return new Subscription();
  };

  fileUrl(item: IssueAttachmentEntity): string {
    return `/api/admin/uploads/${item.upload.id}/raw`;
  }

  attachmentPreviewItems(): AttachmentPreviewItem[] {
    return this.attachments().map((item) => {
      const mime = (item.upload.mimeType || '').toLowerCase();
      const kind: AttachmentPreviewItem['kind'] = mime.startsWith('image/')
        ? 'image'
        : mime.startsWith('video/')
          ? 'video'
          : 'file';
      return {
        id: item.id,
        name: item.upload.originalName,
        url: this.fileUrl(item),
        kind,
        meta: `${item.upload.mimeType || '文件'} · ${this.formatSize(item.upload.fileSize)}`,
      };
    });
  }

  private toRawFile(file: NzUploadFile): File | null {
    if (file.originFileObj instanceof File) {
      return file.originFileObj;
    }
    if (file instanceof File) {
      return file;
    }
    return null;
  }

  private isAllowedFile(file: File): boolean {
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('image/') || mime.startsWith('video/')) {
      return true;
    }

    const name = file.name.toLowerCase();
    return (
      /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name) ||
      /\.(mp4|mov|webm|mkv|avi|m4v)$/.test(name)
    );
  }

  formatSize(size: number): string {
    if (!Number.isFinite(size) || size < 0) {
      return '-';
    }
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
}
