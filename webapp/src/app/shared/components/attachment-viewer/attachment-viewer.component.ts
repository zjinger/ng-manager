import { Component, inject, input, signal, TemplateRef, ViewChild } from '@angular/core';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';

export interface AttachmentPreviewItem {
  id: string;
  name: string;
  url: string;
  kind: 'image' | 'video' | 'file';
  meta?: string;
}

@Component({
  selector: 'app-attachment-viewer',
  standalone: true,
  imports: [NzImageModule, NzIconModule, NzModalModule],
  template: `
    <div class="attachment-viewer__item">
      <!-- 内容 -->
      @if (item().kind === 'image') {
        <img
          nz-image
          class="attachment-viewer__image"
          [nzSrc]="item().url"
          [alt]="item().name"
          [attr.data-preview-id]="item().id"
        />
      } @else if (item().kind === 'video') {
        <video class="attachment-viewer__video" [src]="item().url"></video>
      } @else {
        <div class="attachment-viewer__file">
          <span nz-icon nzType="file"></span>
          <span class="attachment-viewer__file-name">{{ item().name }}</span>
        </div>
      }

      <!-- 底部信息层 -->
      <div class="attachment-viewer__info">
        <div class="attachment-viewer__name" [title]="item().name">
          {{ item().name }}
        </div>

        <div class="attachment-viewer__meta">
          @if (item().meta) {
            <span>{{ item().meta }}</span>
          }
        </div>
      </div>

      <!-- 遮罩层 -->
      <div class="attachment-viewer__mask" (click)="openPreview(item())">
        @if (item().kind === 'image') {
          <span class="attachment-viewer__preview">
            <span nz-icon nzType="eye"></span>
          </span>
        } @else if (item().kind === 'video') {
          <span class="attachment-viewer__preview">
            <span nz-icon nzType="play-circle"></span>
          </span>
        } @else if (item().kind === 'file') {
          <span class="attachment-viewer__preview">
            <span nz-icon nzType="download"></span>
          </span>
        }
      </div>

      <ng-template #videoTpl>
        <video
          [src]="previewUrl()"
          controls
          autoplay
          style="width:100%;height:100%;background:#000"
        ></video>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .attachment-viewer__item {
        margin: 6px;
        position: relative;
        height: 120px;
        border-radius: 8px;
        overflow: hidden;
        background: #f5f5f5;
      }

      .attachment-viewer__image,
      .attachment-viewer__video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .attachment-viewer__video {
        background: #000;
      }

      .attachment-viewer__file {
        width: 100%;
        height: 100%;
        display: grid;
        place-content: center;
        gap: 6px;
        text-align: center;
        padding: 8px;
        font-size: 12px;
      }

      .attachment-viewer__file-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* 👇 信息层（40%） */
      .attachment-viewer__info {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 40%;

        display: flex;
        flex-direction: column;
        justify-content: flex-end;

        padding: 8px;
        box-sizing: border-box;

        color: #fff;

        background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.4), transparent);
      }

      .attachment-viewer__name {
        font-size: 12px;
        font-weight: 600;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .attachment-viewer__meta {
        font-size: 11px;
        opacity: 0.85;
        display: flex;
        gap: 8px;
      }

      /* hover 遮罩 */
      .attachment-viewer__mask {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 0.2s;
        cursor: pointer;
      }

      .attachment-viewer__item:hover .attachment-viewer__mask {
        opacity: 1;
      }

      .attachment-viewer__preview {
        font-size: 18px;
        color: #fff;
      }
    `,
  ],
})
export class AttachmentViewerComponent {
  private readonly modal = inject(NzModalService);
  readonly item = input.required<AttachmentPreviewItem>();

  @ViewChild('videoTpl', { static: true }) videoTpl!: TemplateRef<any>;
  previewUrl = signal('');

  openPreview(item: AttachmentPreviewItem) {
    if (item.kind === 'image') {
      const el = document.querySelector(
        `img[data-preview-id="${item.id}"]`,
      ) as HTMLImageElement | null;

      el?.click();
      return;
    }

    if (item.kind === 'video') {
      this.previewUrl.set(item.url);

      this.modal.create({
        nzContent: this.videoTpl,
        nzFooter: null,
        nzWidth: '80vw',
        nzBodyStyle: {
          padding: '0',
          background: '#000',
        },
        nzCentered: true,
      });
    }

    if (item.kind === 'file') {
      this.downloadFile(item);
    }
  }

  private downloadFile(item: AttachmentPreviewItem) {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name; // 指定文件名
    link.target = '_blank'; // 防止某些浏览器拦截
    link.click();
    link.remove();
  }
}
