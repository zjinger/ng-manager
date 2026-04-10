import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { API_BASE_URL } from '@core/http';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import type { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { Subscription } from 'rxjs';

import { type AttachmentPreviewItem, AttachmentPreviewWallComponent, PanelCardComponent } from '@shared/ui';
import { formatUploadSizeLimit, resolveAttachmentPreviewKind, UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { IssueAttachmentEntity } from '../../models/issue.model';
import { NzTooltipDirective } from "ng-zorro-antd/tooltip";

@Component({
  selector: 'app-issue-attachments-panel',
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    NzUploadModule,
    PanelCardComponent,
    AttachmentPreviewWallComponent,
    NzTooltipDirective
],
  template: `
    <app-panel-card title="附件" [count]="attachments().length" [empty]="attachments().length === 0" emptyText="当前还没有附件">
      <nz-upload
        panel-actions
        class="upload-btn"
        [nzShowUploadList]="false"
        [nzDisabled]="busy()"
        [nzMultiple]="false"
        [nzAccept]="uploadPolicy.accept"  
        [nzBeforeUpload]="beforeUpload"
        [nzCustomRequest]="customRequest"
      >
        <button nz-button [disabled]="busy()" [nz-tooltip]="'支持上传图片/视频格式，单文件不超过 ' + attachmentUploadSizeText">
          <span nz-icon nzType="upload"></span>
          上传
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
  private readonly apiBaseUrl = inject(API_BASE_URL);

  readonly attachments = input<IssueAttachmentEntity[]>([]);
  readonly members = input<Array<{ userId: string; displayName: string }>>([]);
  readonly removableAttachmentIds = input<Set<string>>(new Set());
  readonly busy = input(false);
  readonly upload = output<File>();
  readonly remove = output<string>();
  readonly uploadPolicy = UPLOAD_TARGETS.issueAttachment;

  readonly attachmentUploadSizeText = formatUploadSizeLimit(this.uploadPolicy);

  readonly beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = this.toRawFile(file);
    if (!rawFile) {
      this.message.warning('文件读取失败，请重试');
      return false;
    }
    const validationMessage = validateUploadFile(rawFile, this.uploadPolicy);
    if (validationMessage) {
      this.message.warning(validationMessage);
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
    return `${this.apiBaseUrl}/uploads/${item.upload.id}/raw`;
  }

  attachmentPreviewItems(): AttachmentPreviewItem[] {
    return this.attachments().map((item) => {
      const uploaderName = this.resolveUploaderName(item.upload.uploaderId, item.upload.uploaderName);
      const metaParts = [
        uploaderName,
        item.upload.mimeType || '文件',
        this.formatSize(item.upload.fileSize),
      ];
      return {
        id: item.id,
        name: item.upload.originalName,
        url: this.fileUrl(item),
        kind: resolveAttachmentPreviewKind({
          name: item.upload.originalName,
          type: item.upload.mimeType || '',
        }),
        meta: metaParts.join(' · '),
        removable: this.removableAttachmentIds().has(item.id),
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

  private resolveUploaderName(uploaderId: string | null, uploaderName: string | null): string {
    const normalizedName = uploaderName?.trim();
    if (normalizedName) {
      return normalizedName;
    }
    const normalizedId = uploaderId?.trim();
    if (!normalizedId) {
      return '未知上传者';
    }
    return this.members().find((item) => item.userId === normalizedId)?.displayName || normalizedId;
  }
}
