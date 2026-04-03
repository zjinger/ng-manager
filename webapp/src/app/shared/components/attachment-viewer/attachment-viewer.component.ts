// attachment-preview.component.ts
import { Component, input, signal, HostListener } from '@angular/core';

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
  template: `
    <!-- thumbnail -->
    <div class="thumb" (click)="open()">
      @if (item().kind === 'image') {
        <img [src]="item().url" />
      } @else if (item().kind === 'video') {
        <video [src]="item().url"></video>
      } @else {
        <div class="file">
          <span>{{ item().name }}</span>
        </div>
      }
    </div>

    <!-- fullscreen preview -->
    @if (visible()) {
      <div class="overlay" (click)="close()">
        <div class="viewer" (click)="$event.stopPropagation()">
          @if (item().kind === 'image') {
            <img class="content" [src]="item().url" />
          } @else if (item().kind === 'video') {
            <video class="content" [src]="item().url" controls autoplay></video>
          } @else {
            <div class="file-preview">
              <p>{{ item().name }}</p>
              <a [href]="item().url" target="_blank">打开文件</a>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .thumb {
        width: 120px;
        height: 120px;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      img,
      video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .file {
        font-size: 12px;
        padding: 6px;
        text-align: center;
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .viewer {
        max-width: 90vw;
        max-height: 90vh;
      }

      .content {
        max-width: 100%;
        max-height: 100%;
      }

      .file-preview {
        color: #fff;
        text-align: center;
      }
    `,
  ],
})
export class AttachmentViewerComponent {
  readonly item = input.required<AttachmentPreviewItem>();

  visible = signal(false);

  open() {
    this.visible.set(true);
  }

  close() {
    this.visible.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.close();
  }
}
