import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AttachmentCardListComponent } from '../../../../shared/components/attachment-card-list/attachment-card-list.component';
import type { AttachmentCardItem } from '../../../../shared/components/attachment-card-list/attachment-card.model';
import type { IssueAttachment } from '../../issues.model';

@Component({
  selector: 'app-issue-attachments',
  imports: [NzButtonModule, NzIconModule, AttachmentCardListComponent],
  templateUrl: './issue-attachments.component.html',
  styleUrls: ['./issue-attachments.component.less']
})
export class IssueAttachmentsComponent {
  @Input() projectId = '';
  @Input() issueId = '';
  @Input() attachments: IssueAttachment[] = [];
  @Input() canUpload = false;
  @Input() canDeleteIds: string[] = [];
  @Input() uploading = false;

  @Output() readonly uploaded = new EventEmitter<File[]>();
  @Output() readonly deleted = new EventEmitter<string>();

  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  protected openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.uploaded.emit(files);
    }
    input.value = '';
  }

  protected attachmentCards(): AttachmentCardItem[] {
    return this.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.originalName,
      size: attachment.fileSize,
      mimeType: attachment.mimeType,
      fileExt: attachment.fileExt,
      url: this.downloadUrl(attachment),
      previewUrl: this.downloadUrl(attachment)
    }));
  }

  protected downloadUrl(attachment: IssueAttachment): string {
    return `/api/admin/projects/${this.projectId}/issues/${this.issueId}/attachments/${attachment.id}/download`;
  }
}