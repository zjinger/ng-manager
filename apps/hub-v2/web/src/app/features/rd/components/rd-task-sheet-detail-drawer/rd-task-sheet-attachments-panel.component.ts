import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import type { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { Subscription } from 'rxjs';

import { formatUploadSizeLimit, UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';
import { PanelCardComponent } from '@shared/ui';
import type { RdTaskSheetAttachmentEntity, RdTaskSheetDetail } from '../../models/rd-task-sheet.model';

@Component({
  selector: 'app-rd-task-sheet-attachments-panel',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzTooltipDirective, NzUploadModule, PanelCardComponent],
  template: `
    @if (detail(); as current) {
      <app-panel-card title="附件" [count]="current.attachments.length" [empty]="current.attachments.length === 0" [emptyText]="'当前还没有附件'">
        @if (current.status !== 'closed') {
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
            <button nz-button [disabled]="busy()" [nz-tooltip]="'支持 Word / PDF / JPG / PNG，单个文件最大 ' + uploadSizeLimit">
              <span nz-icon nzType="upload"></span>
              上传
            </button>
          </nz-upload>
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
      .upload-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
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
  private readonly message = inject(NzMessageService);

  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly busy = input(false);
  readonly upload = output<File[]>();
  readonly detach = output<{ sheetId: string; attachmentId: string }>();

  readonly uploadPolicy = UPLOAD_TARGETS.taskSheetAttachment;
  readonly uploadSizeLimit = formatUploadSizeLimit(this.uploadPolicy);

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
    this.upload.emit([rawFile]);
    return false;
  };

  readonly customRequest = (item: NzUploadXHRArgs): Subscription => {
    item.onSuccess?.({}, item.file, item);
    return new Subscription();
  };

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

  private toRawFile(file: NzUploadFile): File | null {
    if (file.originFileObj instanceof File) {
      return file.originFileObj;
    }
    if (file instanceof File) {
      return file;
    }
    return null;
  }
}
