import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { Subscription } from 'rxjs';

import {
  formatUploadSizeLimit,
  resolveAttachmentPreviewKind,
  type UploadTargetPolicy,
  validateUploadFile,
} from '@shared/constants';
import { AttachmentPreviewItem, AttachmentPreviewWallComponent } from '../attachment-preview-wall';

@Component({
  selector: 'app-file-upload-dropzone',
  standalone: true,
  imports: [NzIconModule, NzUploadModule, AttachmentPreviewWallComponent],
  template: `
    <div class="file-upload-dropzone">
      <nz-upload
        class="upload-zone"
        nzType="drag"
        [nzMultiple]="multiple()"
        [nzShowUploadList]="false"
        [nzAccept]="policy().accept"
        [nzDisabled]="disabled()"
        [nzBeforeUpload]="beforeUpload"
        [nzCustomRequest]="customRequest"
      >
        <p class="upload-zone__icon">
          <span nz-icon nzType="plus"></span>
        </p>
        <div class="upload-zone__title">{{ title() }}</div>
        <div class="upload-zone__hint">{{ hintText() }}</div>
      </nz-upload>

      @if (files().length > 0) {
        <div class="upload-picked">
          <app-attachment-preview-wall
            [items]="previewItems()"
            [removeDisabled]="disabled() || removeDisabled()"
            (remove)="removeById($event)"
          />
        </div>
      }
    </div>
  `,
  styles: [
    `
      .file-upload-dropzone {
        display: grid;
        gap: 12px;
      }
      .upload-zone {
        display: block;
      }
      .upload-zone__icon {
        margin: 0 0 8px;
        color: var(--primary-color);
        font-size: 22px;
        line-height: 1;
      }
      .upload-zone__title {
        color: var(--text-body);
        font-weight: 600;
      }
      .upload-zone__hint {
        margin-top: 4px;
        color: var(--text-muted);
        font-size: 12px;
      }
      .upload-picked {
        padding-top: 2px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadDropzoneComponent implements OnDestroy {
  private readonly message = inject(NzMessageService);
  private readonly previewUrlMap = new Map<string, string>();

  readonly policy = input.required<UploadTargetPolicy>();
  readonly files = input<File[]>([]);
  readonly multiple = input(true);
  readonly disabled = input(false);
  readonly removeDisabled = input(false);
  readonly title = input('点击或拖拽文件到此区域上传');
  readonly hint = input('');
  readonly filesChange = output<File[]>();

  readonly hintText = computed(() => this.hint() || `单个文件最大 ${formatUploadSizeLimit(this.policy())}`);

  readonly previewItems = computed<AttachmentPreviewItem[]>(() =>
    this.files().map((file) => ({
      id: this.fileIdentity(file),
      name: file.name,
      url: this.previewUrl(file),
      kind: resolveAttachmentPreviewKind(file),
    })),
  );

  constructor() {
    effect(() => {
      const activeIds = new Set(this.files().map((file) => this.fileIdentity(file)));
      for (const [id, url] of this.previewUrlMap) {
        if (!activeIds.has(id)) {
          URL.revokeObjectURL(url);
          this.previewUrlMap.delete(id);
        }
      }
    });
  }

  readonly beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = this.toRawFile(file);
    if (!rawFile) {
      this.message.warning('文件读取失败，请重试');
      return false;
    }
    const validationMessage = validateUploadFile(rawFile, this.policy());
    if (validationMessage) {
      this.message.warning(validationMessage);
      return false;
    }

    const current = this.files();
    const exists = current.some((item) => this.fileIdentity(item) === this.fileIdentity(rawFile));
    if (!exists) {
      this.filesChange.emit(this.multiple() ? [...current, rawFile] : [rawFile]);
    }
    return false;
  };

  readonly customRequest = (item: NzUploadXHRArgs): Subscription => {
    item.onSuccess?.({}, item.file, item);
    return new Subscription();
  };

  removeById(id: string): void {
    const file = this.files().find((item) => this.fileIdentity(item) === id);
    if (!file) {
      return;
    }
    this.revokePreviewUrl(file);
    this.filesChange.emit(this.files().filter((item) => this.fileIdentity(item) !== id));
  }

  ngOnDestroy(): void {
    for (const url of this.previewUrlMap.values()) {
      URL.revokeObjectURL(url);
    }
    this.previewUrlMap.clear();
  }

  private previewUrl(file: File): string {
    const key = this.fileIdentity(file);
    const cached = this.previewUrlMap.get(key);
    if (cached) {
      return cached;
    }
    const created = URL.createObjectURL(file);
    this.previewUrlMap.set(key, created);
    return created;
  }

  private revokePreviewUrl(file: File): void {
    const key = this.fileIdentity(file);
    const cached = this.previewUrlMap.get(key);
    if (!cached) {
      return;
    }
    URL.revokeObjectURL(cached);
    this.previewUrlMap.delete(key);
  }

  private toRawFile(file: NzUploadFile): File | null {
    if (file.originFileObj instanceof File) {
      return file.originFileObj;
    }
    if (file instanceof File) {
      return file;
    }
    return null;
  }

  private fileIdentity(file: File): string {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }
}
