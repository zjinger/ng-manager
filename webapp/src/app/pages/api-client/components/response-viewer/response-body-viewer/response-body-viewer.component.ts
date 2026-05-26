import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import { ApiResponseEntity } from '@models/api-client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import {
  AttachmentPreviewItem,
  AttachmentViewerComponent,
} from '@shared/components/attachment-viewer/attachment-viewer.component';
import {
  base64ToBlob,
  downloadByUrl,
  extractFilename,
  getMimeType,
  guessExtension,
} from '@app/utils/file.utils';
import { JsonViewerComponent } from '@app/shared/components/json-viewer/json-viewer.component';
import { MarkupViewerComponent } from '@app/shared/components/markup-viewer/markup-viewer.component';

type PreviewKind = 'json' | 'image' | 'video' | 'audio' | 'pdf' | 'binary' | 'text';

@Component({
  selector: 'app-response-body-viewer',
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    AttachmentViewerComponent,
    JsonViewerComponent,
    MarkupViewerComponent,
  ],
  template: `
    <div class="pane">
      @switch (response()?.bodyType ?? 'text') {
        @case ('json') {
          <!-- <pre class="code">{{ prettyJson() }}</pre> -->
          <app-json-viewer [json]="response()?.bodyText ?? ''" />
        }
        @case ('image') {
          <div class="attachment-preview-wrap">
            <app-attachment-viewer [item]="attachmentItem()!" />
          </div>
        }
        @case ('video') {
          <div class="attachment-preview-wrap">
            <app-attachment-viewer [item]="attachmentItem()!" />
          </div>
        }
        @case ('pdf') {
          <div class="attachment-preview-wrap">
            <app-attachment-viewer [item]="attachmentItem()!" />
          </div>
        }
        @case ('audio') {
          <audio controls [src]="fileUrl()"></audio>
        }
        @case ('binary') {
          <div class="binary-wrap">
            <div class="meta">二进制文件不支持预览</div>

            <button nz-button class="download-btn" (click)="downloadFile()">
              <nz-icon nzType="download"></nz-icon>
              点击下载
            </button>
          </div>
        }
        @case ('html') {
          <app-markup-viewer [content]="response()?.bodyText ?? ''" />
        }
        @case ('xml') {
          <app-markup-viewer [content]="response()?.bodyText ?? ''" />
        }
        @default {
          <pre class="code"
            >{{ response()?.bodyText }}
          </pre
          >
        }
      }
    </div>
  `,
  styles: `
    .code {
      margin: 0;
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
        monospace;

      font-size: 12px;
      line-height: 1.5;

      white-space: pre-wrap;
      word-break: break-word;
    }

    .attachment-preview-wrap {
      display: flex;
    }

    .binary-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .download-btn {
      width: fit-content;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResponseBodyViewerComponent {
  readonly response = input<ApiResponseEntity | null>();

  constructor() {
    effect((onCleanup) => {
      const url = this.fileInfo()?.objectUrl;

      // 释放URL 对象
      onCleanup(() => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    });
  }

  /** 文件信息*/
  readonly fileInfo = computed(() => {
    const res = this.response();

    if (!res?.bodyBase64) {
      return null;
    }

    const mime = getMimeType(res);
    const filename =
      extractFilename(
        res.headers?.['content-disposition'] ?? res.headers?.['Content-Disposition'],
      ) ?? `response.${guessExtension(mime)}`;

    const blob = base64ToBlob(res.bodyBase64, mime);
    const objectUrl = URL.createObjectURL(blob);

    return {
      mime,
      filename,
      blob,
      objectUrl,
    };
  });

  /** 附件预览项（组件app-attachment-viewer输入)   */
  readonly attachmentItem = computed<AttachmentPreviewItem | null>(() => {
    const file = this.fileInfo();
    if (!file) return null;

    const kind = this.response()?.bodyType ?? 'text';

    if (kind !== 'image' && kind !== 'video' && kind !== 'pdf') {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      name: file.filename,
      url: file.objectUrl,
      kind,
      meta: file.mime,
    };
  });

  /**
   * 文件 URL
   */
  readonly fileUrl = computed(() => {
    return this.fileInfo()?.objectUrl ?? null;
  });

  /**
   * JSON 美化
   */
  // readonly prettyJson = computed(() => {
  //   const text = this.response()?.bodyText?.trim();
  //   if (!text) return '';

  //   try {
  //     return JSON.stringify(JSON.parse(text), null, 2);
  //   } catch {
  //     return text;
  //   }
  // });

  /**
   * 下载文件
   */
  downloadFile() {
    const file = this.fileInfo();

    if (!file) {
      return;
    }
    downloadByUrl(file.objectUrl, file.filename);
  }
}
