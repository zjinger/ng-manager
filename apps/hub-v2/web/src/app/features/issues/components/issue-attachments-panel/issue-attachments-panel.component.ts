import { ChangeDetectionStrategy, Component, HostListener, inject, input, output } from '@angular/core';
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
        <button nz-button [disabled]="busy()" [nz-tooltip]="'点击上传图片/视频格式，或 Ctrl+V 粘贴截图， 单文件不超过 ' + attachmentUploadSizeText ">
          <span nz-icon nzType="upload"></span>
          上传
        </button>
      </nz-upload>
      <!-- <span panel-actions class="upload-paste-tip">截图后按 Ctrl+V 可直接上传</span> -->

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
      .upload-paste-tip {
        margin-left: 8px;
        color: var(--text-color-secondary);
        font-size: 12px;
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

  @HostListener('document:paste', ['$event'])
  onDocumentPaste(event: ClipboardEvent): void {
    if (this.busy() || this.shouldIgnorePasteTarget()) {
      return;
    }
    const pastedFile = this.extractClipboardFile(event);
    if (!pastedFile) {
      return;
    }
    const validationMessage = validateUploadFile(pastedFile, this.uploadPolicy);
    if (validationMessage) {
      this.message.warning(validationMessage);
      return;
    }
    event.preventDefault();
    this.upload.emit(pastedFile);
  }

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

  private extractClipboardFile(event: ClipboardEvent): File | null {
    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return null;
    }
    const itemWithFile = Array.from(clipboardData.items || []).find((item) => item.kind === 'file');
    const file = itemWithFile?.getAsFile() || clipboardData.files?.item(0);
    if (!(file instanceof File)) {
      return null;
    }
    return this.normalizeClipboardFileName(file);
  }

  private normalizeClipboardFileName(file: File): File {
    if (file.name?.trim()) {
      return file;
    }
    const extension = this.inferExtension(file.type);
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
    const fallbackName = `screenshot-${timestamp}${extension}`;
    return new File([file], fallbackName, { type: file.type, lastModified: Date.now() });
  }

  private inferExtension(mimeType: string): string {
    const normalizedType = mimeType.toLowerCase();
    if (normalizedType.includes('png')) {
      return '.png';
    }
    if (normalizedType.includes('jpeg') || normalizedType.includes('jpg')) {
      return '.jpg';
    }
    if (normalizedType.includes('gif')) {
      return '.gif';
    }
    if (normalizedType.includes('webp')) {
      return '.webp';
    }
    if (normalizedType.includes('mp4')) {
      return '.mp4';
    }
    return '';
  }

  private shouldIgnorePasteTarget(): boolean {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) {
      return false;
    }
    const tagName = activeElement.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || activeElement.isContentEditable;
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
