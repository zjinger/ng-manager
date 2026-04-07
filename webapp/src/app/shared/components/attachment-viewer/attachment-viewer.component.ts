// // attachment-preview.component.ts
// import { Component, input, signal, HostListener } from '@angular/core';

// export interface AttachmentPreviewItem {
//   id: string;
//   name: string;
//   url: string;
//   kind: 'image' | 'video' | 'file';
//   meta?: string;
// }

// @Component({
//   selector: 'app-attachment-viewer',
//   standalone: true,
//   template: `
//     <!-- thumbnail -->
//     <div class="thumb" (click)="open()">
//       @if (item().kind === 'image') {
//         <img [src]="item().url" />
//       } @else if (item().kind === 'video') {
//         <video [src]="item().url"></video>
//       } @else {
//         <div class="file">
//           <span>{{ item().name }}</span>
//         </div>
//       }
//     </div>

//     <!-- fullscreen preview -->
//     @if (visible()) {
//       <div class="overlay" (click)="close()">
//         <div class="viewer" (click)="$event.stopPropagation()">
//           @if (item().kind === 'image') {
//             <img class="content" [src]="item().url" />
//           } @else if (item().kind === 'video') {
//             <video class="content" [src]="item().url" controls autoplay></video>
//           } @else {
//             <div class="file-preview">
//               <p>{{ item().name }}</p>
//               <a [href]="item().url" target="_blank">打开文件</a>
//             </div>
//           }
//         </div>
//       </div>
//     }
//   `,
//   styles: [
//     `
//       .thumb {
//         width: 120px;
//         height: 120px;
//         border-radius: 8px;
//         overflow: hidden;
//         cursor: pointer;
//         background: #f5f5f5;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//       }

//       img,
//       video {
//         width: 100%;
//         height: 100%;
//         object-fit: cover;
//       }

//       .file {
//         font-size: 12px;
//         padding: 6px;
//         text-align: center;
//       }

//       .overlay {
//         position: fixed;
//         inset: 0;
//         background: rgba(0, 0, 0, 0.9);
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         z-index: 1000;
//       }

//       .viewer {
//         max-width: 90vw;
//         max-height: 90vh;
//       }

//       .content {
//         max-width: 100%;
//         max-height: 100%;
//       }

//       .file-preview {
//         color: #fff;
//         text-align: center;
//       }
//     `,
//   ],
// })
// export class AttachmentViewerComponent {
//   readonly item = input.required<AttachmentPreviewItem>();

//   visible = signal(false);

//   open() {
//     this.visible.set(true);
//   }

//   close() {
//     this.visible.set(false);
//   }

//   @HostListener('document:keydown.escape')
//   onEsc() {
//     this.close();
//   }
// }
import { Component, input, signal } from '@angular/core';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzIconModule } from 'ng-zorro-antd/icon';

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
  imports: [NzImageModule, NzIconModule],
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
        <video class="attachment-viewer__video" [src]="item().url" controls></video>
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
      <div class="attachment-viewer__mask" (click)="openPreview(item().id)">
        @if (item().kind === 'image') {
          <span class="attachment-viewer__preview" >
            <span nz-icon nzType="eye"></span>
          </span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .attachment-viewer__item {
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
  readonly item = input.required<AttachmentPreviewItem>();

  openPreview(id: string) {
    const el = document.querySelector(`img[data-preview-id="${id}"]`) as HTMLImageElement | null;

    el?.click();
  }
}
