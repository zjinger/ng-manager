import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { HubFileSizePipe } from '../../pipes/file-size.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AttachmentCardItem } from './attachment-card.model';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-attachment-card-list',
  standalone: true,
  imports: [NzButtonModule, NzEmptyModule, NzImageModule, NzPopconfirmModule, HubFileSizePipe, NzIconModule, NzTooltipModule],
  templateUrl: './attachment-card-list.component.html',
  styleUrls: ['./attachment-card-list.component.less'],
})
export class AttachmentCardListComponent {
  @Input() items: AttachmentCardItem[] = [];
  @Input() loading = false;
  @Input() showDownload = false;
  @Input() showRemove = false;
  @Input() showEmpty = true;
  @Input() showMeta = true;

  @Output() remove = new EventEmitter<string>();

  protected isImage(item: AttachmentCardItem): boolean {
    const mimeType = item.mimeType?.toLowerCase() ?? '';
    if (mimeType.startsWith('image/')) {
      return true;
    }

    const ext = (item.fileExt ?? '').toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
  }

  protected getPreviewUrl(item: AttachmentCardItem): string | null {
    return item.previewUrl ?? item.url ?? null;
  }

  protected preview(item: AttachmentCardItem): void {
    const url = this.getPreviewUrl(item);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  protected download(item: AttachmentCardItem): void {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener');
    }
  }

  protected onRemove(id: string): void {
    this.remove.emit(id);
  }
}

