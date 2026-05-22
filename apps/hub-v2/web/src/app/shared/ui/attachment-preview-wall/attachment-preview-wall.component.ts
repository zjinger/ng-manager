import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

export type AttachmentPreviewKind = 'image' | 'video' | 'file';

export interface AttachmentPreviewItem {
  id: string;
  name: string;
  url: string;
  kind: AttachmentPreviewKind;
  meta?: string;
  removable?: boolean;
}

@Component({
  selector: 'app-attachment-preview-wall',
  standalone: true,
  imports: [NzImageModule, NzButtonModule, NzIconModule, NzTooltipModule, NzPopconfirmModule],
  template: `
    @if (items().length > 0) {
      <nz-image-group class="attachment-wall" >
        @for (item of items(); track item.id) {
          <div class="attachment-wall__item">
            <div class="attachment-wall__badges">
              <span
                nz-icon
                class="attachment-wall__kind"
                [class.attachment-wall__kind--file]="item.kind === 'file'"
                [attr.data-type]="badgeType(item)"
                [nzType]="badgeIcon(item)"
              ></span>
            </div>
            @if (item.kind === 'image') {
              <img
                nz-image
                class="attachment-wall__image"
                [nzSrc]="item.url"
                [alt]="item.name"
                [attr.data-preview-id]="item.id"
              />
            } @else if (item.kind === 'video') {
              <video class="attachment-wall__video" [src]="item.url" controls preload="metadata"></video>
            } @else {
              <div class="attachment-wall__file">
                <!-- <span nz-icon [nzType]="fileIcon(item.name)"></span> -->
                <span class="attachment-wall__file-name" [title]="item.name">{{ item.name }}</span>
              </div>
            }

            @if (showMeta()) {
              <div class="attachment-wall__meta">
                <div class="attachment-wall__name" [title]="item.name">{{ item.name }}</div>
                @if (item.meta) {
                  <div class="attachment-wall__sub">{{ item.meta }}</div>
                }
              </div>
            }

            <div class="attachment-wall__mask">
              @if (item.kind === 'image') {
                <a
                  class="attachment-wall__preview"
                  (click)="openPreview(item.id)"
                >
                  <span nz-icon nzType="eye"></span>
              </a>
              } @else {
                <a
                  class="attachment-wall__preview"
                  [href]="item.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span nz-icon nzType="eye"></span>
                </a>
              }
            @if (removable() && item.removable !== false && !removeDisabled()) {
                <a
                  class="attachment-wall__remove"
                  nz-tooltip="删除"
                  nz-popconfirm
                  nzPopconfirmTitle="确认删除吗？"
                  nzPopconfirmOkText="删除"
                  nzPopconfirmCancelText="取消"
                  (nzOnConfirm)="remove.emit(item.id)"
                >
                  <span nz-icon nzType="delete"></span>
                </a>
              }
            </div>
          </div>
        }
      </nz-image-group>
    }
  `,
  styles: [
    `
      .attachment-wall {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
        gap: 10px;
      }
      .attachment-wall__item {
        position: relative;
        height: 108px;
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        overflow: hidden;
        background: var(--bg-elevated);
      }
      .attachment-wall__image,
      .attachment-wall__video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .attachment-wall__badges {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
      }
      .attachment-wall__kind {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--primary-500) 88%, white);
        color: #fff;
        font-size: 15px;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
      }
      .attachment-wall__kind--file {
        background: color-mix(in srgb, #334155 92%, white);
      }
      .attachment-wall__kind[data-type='image'] {
        background: color-mix(in srgb, #6366f1 88%, white);
      }
      .attachment-wall__kind[data-type='video'] {
        background: color-mix(in srgb, #0f172a 92%, white);
      }
      .attachment-wall__kind[data-type='pdf'] {
        background: color-mix(in srgb, #dc2626 90%, white);
      }
      .attachment-wall__kind[data-type='word'] {
        background: color-mix(in srgb, #2563eb 90%, white);
      }
      .attachment-wall__kind[data-type='excel'] {
        background: color-mix(in srgb, #16a34a 90%, white);
      }
      .attachment-wall__kind[data-type='ppt'] {
        background: color-mix(in srgb, #ea580c 90%, white);
      }
      .attachment-wall__kind[data-type='txt'] {
        background: color-mix(in srgb, #475569 90%, white);
      }
      .attachment-wall__video {
        background: #000;
      }
      .attachment-wall__file {
        width: 100%;
        height: 100%;
        display: grid;
        place-content: center;
        gap: 6px;
        text-align: center;
        color: var(--text-secondary);
        padding: 10px;
      }
      .attachment-wall__file > span[nz-icon] {
        font-size: 22px;
      }
      .attachment-wall__file-name {
        font-size: 12px;
        max-width: 90px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .attachment-wall__meta {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 6px 8px;
        background: color-mix(in srgb, #000 55%, transparent);
        color: #fff;
      }
      .attachment-wall__name {
        font-size: 12px;
        line-height: 1.2;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .attachment-wall__sub {
        margin-top: 2px;
        font-size: 11px;
        opacity: 0.85;
      }
      .attachment-wall__mask {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, #000 54%, transparent);
        opacity: 0;
        transition: opacity 0.16s ease;
        gap: 12px;
        pointer-events: none;
      }
      .attachment-wall__item:hover .attachment-wall__mask {
        opacity: 1;
      }
      .attachment-wall__remove,.attachment-wall__preview {
        font-size: 18px;
        color: #fff;
        border:none;
        pointer-events: auto;
      }
      .attachment-wall__remove:hover,.attachment-wall__preview:hover {
        color: #fff;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentPreviewWallComponent {
  private readonly document = inject(DOCUMENT);

  readonly items = input<AttachmentPreviewItem[]>([]);
  readonly removable = input(true);
  readonly removeDisabled = input(false);
  readonly showMeta = input(false);
  readonly remove = output<string>();

  badgeIcon(item: AttachmentPreviewItem): string {
    if (item.kind === 'image') {
      return 'file-image';
    }
    if (item.kind === 'video') {
      return 'video-camera';
    }

    return this.fileIcon(item.name);
  }

  badgeType(item: AttachmentPreviewItem): string {
    if (item.kind === 'image' || item.kind === 'video') {
      return item.kind;
    }

    return this.fileType(item.name);
  }

  fileType(name: string): string {
    const ext = this.extensionLabel(name);
    switch (ext) {
      case 'PDF':
        return 'pdf';
      case 'XLS':
      case 'XLSX':
        return 'excel';
      case 'DOC':
      case 'DOCX':
        return 'word';
      case 'PPT':
      case 'PPTX':
        return 'ppt';
      case 'TXT':
        return 'txt';
      default:
        return 'file';
    }
  }

  fileIcon(name: string): string {
    const ext = this.extensionLabel(name);
    switch (ext) {
      case 'PDF':
        return 'file-pdf';
      case 'XLS':
      case 'XLSX':
        return 'file-excel';
      case 'DOC':
      case 'DOCX':
        return 'file-word';
      case 'PPT':
      case 'PPTX':
        return 'file-ppt';
      case 'TXT':
        return 'file-text';
      default:
        return 'file';
    }
  }

  extensionLabel(name: string): string | null {
    const normalized = name.trim();
    const lastDotIndex = normalized.lastIndexOf('.');
    if (lastDotIndex < 0 || lastDotIndex === normalized.length - 1) {
      return null;
    }
    const extension = normalized.slice(lastDotIndex + 1).trim();
    return extension ? extension.toUpperCase() : null;
  }

  openPreview(id: string): void {
    const target = this.document.querySelector(`img[data-preview-id="${id}"]`) as HTMLImageElement | null;
    target?.click();
  }
}
