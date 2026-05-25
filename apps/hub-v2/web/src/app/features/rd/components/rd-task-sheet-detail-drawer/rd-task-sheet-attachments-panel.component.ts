import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { formatUploadSizeLimit, UPLOAD_TARGETS } from '@shared/constants';
import { FileUploadDropzoneComponent, PanelCardComponent } from '@shared/ui';
import type { RdTaskSheetAttachmentEntity, RdTaskSheetDetail } from '../../models/rd-task-sheet.model';

@Component({
  selector: 'app-rd-task-sheet-attachments-panel',
  standalone: true,
  imports: [NzButtonModule, PanelCardComponent, FileUploadDropzoneComponent],
  template: `
    @if (detail(); as current) {
      <app-panel-card title="附件" [count]="current.attachments.length" [empty]="current.attachments.length === 0 && current.status === 'closed'" [emptyText]="'暂无附件'">
        @if (current.status !== 'closed') {
          <div class="upload-area">
            <app-file-upload-dropzone
              [policy]="uploadPolicy"
              [files]="uploadFiles()"
              [disabled]="busy()"
              [hint]="'支持 Word / PDF / JPG / PNG，单个文件最大 ' + uploadSizeLimit"
              (filesChange)="handleUploadFiles($event)"
            />
          </div>
        }
        @if (current.attachments.length > 0) {
          <div class="attachment-list">
            @for (attachment of current.attachments; track attachment.id) {
              <div class="attachment-item">
                <a [href]="attachmentUrl(attachment.uploadId)" target="_blank" rel="noreferrer">
                  {{ attachment.originalName || attachment.fileName || attachment.uploadId }}
                </a>
                <span>{{ formatFileSize(attachment.fileSize) }}</span>
                @if (current.status !== 'closed') {
                  <button nz-button nzType="link" nzDanger (click)="detach.emit({ sheetId: current.id, attachmentId: attachment.id })">删除</button>
                }
              </div>
            }
          </div>
        }
      </app-panel-card>
    }
  `,
  styles: [
    `
      .upload-area {
        padding: 16px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .attachment-list {
        display: grid;
      }
      .attachment-item {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-top: 1px solid var(--border-color-soft);
      }
      .attachment-item:first-child {
        border-top: 0;
      }
      .attachment-item a {
        min-width: 0;
        overflow: hidden;
        color: var(--primary-700);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .attachment-item span {
        color: var(--text-muted);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetAttachmentsPanelComponent {
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly busy = input(false);
  readonly upload = output<File[]>();
  readonly detach = output<{ sheetId: string; attachmentId: string }>();

  readonly uploadPolicy = UPLOAD_TARGETS.taskSheetAttachment;
  readonly uploadSizeLimit = formatUploadSizeLimit(this.uploadPolicy);
  readonly uploadFiles = signal<File[]>([]);

  handleUploadFiles(files: File[]): void {
    this.uploadFiles.set(files);
    if (files.length > 0) {
      this.upload.emit(files);
    }
  }

  attachmentUrl(uploadId: string): string {
    return `/api/admin/uploads/${encodeURIComponent(uploadId)}/raw`;
  }

  formatFileSize(size: RdTaskSheetAttachmentEntity['fileSize']): string {
    if (!size) {
      return '';
    }
    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)}KB`;
    }
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  }
}
