import { Component, input } from '@angular/core';
import {
  AttachmentPreviewItem,
  AttachmentViewerComponent,
} from '@app/shared/components/attachment-viewer/attachment-viewer.component';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { IssueAttachmentEntity } from '@pages/issues/models/issue.model';
@Component({
  selector: 'app-issue-attachment-area',
  imports: [AttachmentViewerComponent, DetailItemCardComponent],
  template: `
    <app-detail-item-card title="附件">
      @if (attachments().length > 0) {
        @for (item of attachmentPreviewItems(); track $index) {
          <app-attachment-viewer [item]="item"></app-attachment-viewer>
        }
      }
    </app-detail-item-card>
  `,
  styles: ``,
})
export class IssueAttachmentAreaComponent {
  readonly attachments = input<IssueAttachmentEntity[]>([]);
  readonly projectId = input<string>('');
  protected readonly apiBaseUrl = '';

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

  private fileUrl(item: IssueAttachmentEntity): string {
    return `/api/client/hub-token/projects/${this.projectId()}/issues/${item.issueId}/attachments/${item.id}/raw`;
  }

  private formatSize(size: number): string {
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
