import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';
import type { IssueAttachmentEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-attachments-panel',
  standalone: true,
  imports: [NzButtonModule, PanelCardComponent],
  template: `
    <app-panel-card title="附件" [count]="attachments().length" [empty]="attachments().length === 0" emptyText="当前还没有附件">
      <label panel-actions class="upload-btn">
        <input type="file" [disabled]="busy()" (change)="onFileChange($event)" />
        <span>上传附件</span>
      </label>

      @if (attachments().length > 0) {
        <div class="attachment-list">
          @for (item of attachments(); track item.id) {
            <div class="attachment-item">
              <div class="attachment-item__main">
                <div class="attachment-item__name">{{ item.upload.originalName }}</div>
                <div class="attachment-item__meta">{{ item.upload.mimeType || '文件' }} · {{ formatSize(item.upload.fileSize) }}</div>
              </div>
              <button nz-button nzType="text" [nzLoading]="busy()" (click)="remove.emit(item.id)">移除</button>
            </div>
          }
        </div>
      }
    </app-panel-card>
  `,
  styles: [
    `
      .upload-btn {
        position: relative;
        overflow: hidden;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 96px;
        height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--border-color);
        background: var(--surface-overlay);
        color: var(--text-primary);
        cursor: pointer;
        font-weight: 600;
      }
      .upload-btn input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
      .attachment-item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        padding: 14px 20px;
        border-top: 1px solid var(--border-color-soft);
      }
      .attachment-item__name {
        font-weight: 700;
        color: var(--text-primary);
      }
      .attachment-item__meta {
        margin-top: 4px;
        color: var(--text-muted);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueAttachmentsPanelComponent {
  readonly attachments = input<IssueAttachmentEntity[]>([]);
  readonly busy = input(false);
  readonly upload = output<File>();
  readonly remove = output<string>();

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.upload.emit(file);
    input.value = '';
  }

  formatSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
}
