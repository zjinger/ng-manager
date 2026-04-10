import { Component, input } from '@angular/core';
import {
  AttachmentPreviewItem,
  AttachmentViewerComponent,
} from '@app/shared/components/attachment-viewer/attachment-viewer.component';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { ProjectMemberEntity } from '@models/project.model';
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
      } @else {
        <div class="empty">当前还没有附件</div>
      }
    </app-detail-item-card>
  `,
  styles: `
    .empty {
      text-align: center;
      color: gray;
    }
  `,
})
export class IssueAttachmentAreaComponent {
  readonly attachments = input<IssueAttachmentEntity[]>([]);
  readonly projectId = input<string>('');
  readonly members = input<ProjectMemberEntity[]>([]);
  protected readonly apiBaseUrl = '';

  attachmentPreviewItems(): AttachmentPreviewItem[] {
    return this.attachments().map((item) => {
      const mime = (item.upload.mimeType || '').toLowerCase();
      const uploaderName = this.resolveUploaderName(
        item.upload.uploaderId,
        item.upload.uploaderName,
      );
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
        meta: `${uploaderName} · ${item.upload.mimeType || 'file'} · ${this.formatSize(item.upload.fileSize)}`,
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
