import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { UPLOAD_TARGETS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { DialogShellComponent } from '@shared/ui';
import type { IssueEntity } from '../../models/issue.model';
import { composeContentWithMarkdownImages, createUploadId, extractClipboardImages, revokePreviewUrls } from '../../utils';

export type IssueTransitionMode = 'resolve' | 'reopen' | 'close';
interface TransitionUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'done' | 'error';
  url: string | null;
  error: string | null;
}

@Component({
  selector: 'app-issue-transition-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzImageModule, NzTooltipModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="680"
      [title]="title()"
      [subtitle]="issue() ? issue()!.title : subtitle()"
      [icon]="mode() === 'resolve' ? 'check-circle' : 'rollback'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="issue-transition-form" class="transition-form" (ngSubmit)="submitForm()">
          <label class="transition-field dialog-field">
            <span class="transition-field__label dialog-field__label">{{ fieldLabel() }}</span>
            <div class="transition-input-shell" [class.has-upload]="uploads().length > 0">
              @if (uploads().length > 0) {
                <div class="upload-list">
                  @for (item of uploads(); track item.id) {
                    <div class="upload-item" [class.is-uploading]="item.status === 'uploading'" [class.is-error]="item.status === 'error'">
                      <img nz-image class="upload-item__thumb" [nzSrc]="item.previewUrl" [alt]="item.file.name || 'reopen-image'" />
                      @if (item.status === 'uploading') {
                        <div class="upload-item__mask">
                          <span class="upload-item__spinner" aria-hidden="true"></span>
                        </div>
                      }
                      @if (item.status === 'error') {
                        <div class="upload-item__mask upload-item__mask--error">
                          <span class="upload-item__error-text">{{ item.error || '上传失败' }}</span>
                          <button nz-button nzType="link" class="upload-item__retry" type="button" (click)="retryUpload(item.id)">重试</button>
                        </div>
                      }
                      <button
                        nz-button
                        nzShape="circle"
                        nzType="link"
                        class="upload-item__remove"
                        type="button"
                        (click)="removeUpload(item.id)"
                        nz-tooltip="删除"
                      >
                        ×
                      </button>
                    </div>
                  }
                </div>
              }
              <textarea
                nz-input
                rows="6"
                [placeholder]="placeholder()"
                [ngModel]="content()"
                name="content"
                (ngModelChange)="content.set($event)"
                (paste)="onPaste($event)"
              ></textarea>
            </div>
            @if (mode() === 'reopen') {
              <span class="transition-field__tip">支持直接粘贴截图上传图片。</span>
            }
          </label>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button
          nz-button
          nzType="primary"
          [disabled]="(reasonRequired() && !content().trim()) || uploading()"
          [nzLoading]="busy()"
          type="submit"
          form="issue-transition-form"
        >
          {{ confirmText() }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .transition-form {
        display: grid;
      }
      .transition-input-shell {
        position: relative;
      }
      .transition-input-shell.has-upload textarea {
        padding-top: 130px;
      }
      .transition-field__tip {
        margin-top: 8px;
        display: inline-block;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .upload-list {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .upload-item {
        position: relative;
        width: 110px;
        height: 110px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--border-color-soft) 80%, transparent);
        background: color-mix(in srgb, var(--bg-subtle) 88%, #000 12%);
      }
      .upload-item__thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .upload-item__mask {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(18, 20, 26, 0.42);
        backdrop-filter: blur(1px);
      }
      .upload-item__mask--error {
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        background: rgba(35, 10, 10, 0.62);
      }
      .upload-item__spinner {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        border: 4px solid rgba(255, 255, 255, 0.35);
        border-top-color: #fff;
        animation: transition-upload-spin 0.85s linear infinite;
      }
      .upload-item__error-text {
        color: #fff;
        font-size: 12px;
        line-height: 1.2;
      }
      .upload-item__retry {
        height: auto;
        padding: 0 2px;
        color: #fff;
        font-size: 12px;
      }
      .upload-item__remove {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 24px;
        min-width: 24px;
        height: 24px;
        font-size: 16px;
        border: 0;
        color: rgba(0, 0, 0, 0.8);
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.25);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
      }
      .upload-item:hover .upload-item__remove,
      .upload-item:focus-within .upload-item__remove {
        opacity: 1;
        pointer-events: auto;
      }
      @keyframes transition-upload-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueTransitionDialogComponent implements OnDestroy {
  private readonly message = inject(NzMessageService);
  private readonly imageUpload = inject(ImageUploadService);
  private readonly markdownUploadPolicy = UPLOAD_TARGETS.markdownImage;

  readonly open = input(false);
  readonly busy = input(false);
  readonly mode = input<IssueTransitionMode>('resolve');
  readonly reasonRequired = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly confirm = output<{ content: string }>();
  readonly cancel = output<void>();

  readonly content = signal('');
  readonly uploads = signal<TransitionUploadItem[]>([]);
  readonly uploading = computed(() => this.uploads().some((item) => item.status === 'uploading'));

  readonly title = computed(() => {
    if (this.mode() === 'resolve') {
      return '标记解决';
    }
    if (this.mode() === 'reopen') {
      return '重新打开';
    }
    return '关闭问题';
  });
  readonly subtitle = computed(() => {
    if (this.mode() === 'resolve') {
      return '填写本次处理结果。';
    }
    if (this.mode() === 'reopen') {
      return '说明重开的原因。';
    }
    return this.reasonRequired() ? '请填写关闭原因。' : '可选填写关闭说明。';
  });
  readonly fieldLabel = computed(() => {
    if (this.mode() === 'resolve') {
      return '解决说明';
    }
    if (this.mode() === 'reopen') {
      return '重开说明';
    }
    return this.reasonRequired() ? '关闭原因' : '关闭说明';
  });
  readonly confirmText = computed(() => {
    if (this.mode() === 'resolve') {
      return '确认解决';
    }
    if (this.mode() === 'reopen') {
      return '确认重开';
    }
    return '确认关闭';
  });
  readonly placeholder = computed(() => {
    if (this.mode() === 'resolve') {
      return '例如：已修复用户登录异常问题，涉及登录模块相关代码变更。';
    }
    if (this.mode() === 'reopen') {
      return '例如：验收时发现还有xx问题未解决。';
    }
    return this.reasonRequired() ? '例如：需求取消 / 重复问题 / 无法复现。' : '可选填写关闭说明。';
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        if (this.mode() === 'resolve') {
          this.content.set('已解决');
        } else {
          this.content.set('');
        }
        this.clearUploadItems();
      }
    });
  }

  submitForm(): void {
    const value = this.composeSubmitContent(this.content());
    if (!value && this.reasonRequired()) {
      return;
    }
    if (this.uploading()) {
      return;
    }
    this.confirm.emit({ content: value });
  }

  onPaste(event: ClipboardEvent): void {
    if (this.mode() !== 'reopen' || this.busy()) {
      return;
    }
    const files = extractClipboardImages(event, 'reopen-image');
    if (files.length === 0) {
      return;
    }
    event.preventDefault();
    for (const file of files) {
      this.enqueueImageUpload(file);
    }
  }

  retryUpload(id: string): void {
    const target = this.uploads().find((item) => item.id === id);
    if (!target || target.status !== 'error') {
      return;
    }
    this.uploads.update((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status: 'uploading', error: null } : item
      )
    );
    void this.runUpload(id, target.file);
  }

  removeUpload(id: string): void {
    const target = this.uploads().find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    this.uploads.update((items) => items.filter((item) => item.id !== id));
  }

  ngOnDestroy(): void {
    this.clearUploadItems();
  }

  private enqueueImageUpload(file: File): void {
    const id = createUploadId(file);
    const previewUrl = URL.createObjectURL(file);
    this.uploads.update((items) => [...items, { id, file, previewUrl, status: 'uploading', url: null, error: null }]);
    void this.runUpload(id, file);
  }

  private async runUpload(id: string, file: File): Promise<void> {
    try {
      const url = await this.imageUpload.uploadImage(file, this.markdownUploadPolicy);
      this.uploads.update((items) =>
        items.map((item) =>
          item.id === id ? { ...item, status: 'done', url, error: null } : item
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '图片上传失败';
      this.uploads.update((items) =>
        items.map((item) =>
          item.id === id ? { ...item, status: 'error', error: message } : item
        )
      );
      this.message.error(message);
    }
  }

  private composeSubmitContent(raw: string): string {
    return composeContentWithMarkdownImages(raw, this.uploads());
  }

  private clearUploadItems(): void {
    const items = untracked(() => this.uploads());
    if (items.length === 0) {
      return;
    }
    revokePreviewUrls(items);
    this.uploads.set([]);
  }
}
