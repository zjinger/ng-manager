import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzInputModule } from 'ng-zorro-antd/input';
import { MentionOnSearchTypes, NzMentionModule } from 'ng-zorro-antd/mention';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { AuthStore } from '@core/auth';
import { UPLOAD_TARGETS } from '@shared/constants';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { MarkdownViewerComponent } from '@shared/ui';
import { composeContentWithMarkdownImages, createUploadId, extractClipboardImages, revokePreviewUrls } from '../../../issues/utils';
import type { UserEntity } from '../../../users/models/user.model';
import type { SkillCommentEntity } from '../../models/skill-hub.model';

interface CommentImageUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'done' | 'error';
  url: string | null;
  error: string | null;
}

@Component({
  selector: 'app-skill-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzImageModule, NzInputModule, NzMentionModule, NzSpinModule, MarkdownViewerComponent],
  template: `
    <nz-spin [nzSpinning]="loading()">
      <div class="skill-comments">
        @if (comments().length > 0) {
          <div class="comment-list">
            @for (item of comments(); track item.id) {
              <article class="comment-item">
                <span class="comment-avatar" [class.has-image]="commentAuthorAvatar(item)">
                  @if (commentAuthorAvatar(item); as avatarUrl) {
                    <img [src]="avatarUrl" [alt]="item.authorName" />
                  } @else {
                    {{ avatarText(item.authorName) }}
                  }
                </span>
                <div class="comment-body">
                  <header class="comment-header">
                    <strong>{{ item.authorName }}</strong>
                    <span>{{ item.createdAt | date: 'MM-dd HH:mm' }}</span>
                  </header>
                  <app-markdown-viewer [content]="item.content" [showToc]="false" />
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="comment-empty">暂无讨论。</div>
        }

        <div class="composer">
          <span class="comment-avatar" [class.has-image]="currentUser()?.avatarUrl">
            @if (currentUser()?.avatarUrl) {
              <img [src]="currentUser()?.avatarUrl!" [alt]="currentUser()?.nickname || '我'" />
            } @else {
              {{ currentUserInitial() }}
            }
          </span>
          <div class="composer__main">
            <nz-mention
              [nzSuggestions]="mentionOptions()"
              [nzValueWith]="mentionValue"
              [nzPrefix]="['@']"
              nzNotFoundContent="未找到匹配成员"
              (nzOnSearchChange)="handleMentionSearch($event)"
            >
              <textarea
                #textareaRef
                nz-input
                nzMentionTrigger
                class="composer__textarea"
                rows="4"
                placeholder="添加评论，输入 @ 提及成员"
                [ngModel]="draft()"
                (ngModelChange)="draft.set($event)"
                (paste)="onPaste($event)"
              ></textarea>
              <ng-template nzMentionSuggestion let-option>
                <div class="mention-option">
                  <span class="mention-name">{{ option.displayName || option.username }}</span>
                  <span class="mention-id">{{ option.username }}</span>
                </div>
              </ng-template>
            </nz-mention>

            @if (uploads().length > 0) {
              <div class="image-upload-list">
                @for (item of uploads(); track item.id) {
                  <div class="image-upload-item" [class.is-error]="item.status === 'error'">
                    <img nz-image class="image-upload-item__thumb" [nzSrc]="item.previewUrl" [alt]="item.file.name || 'comment-image'" />
                    @if (item.status === 'uploading') {
                      <div class="image-upload-item__mask">
                        <span class="image-upload-item__spinner" aria-hidden="true"></span>
                      </div>
                    }
                    @if (item.status === 'error') {
                      <div class="image-upload-item__mask image-upload-item__mask--error">
                        <span>{{ item.error || '上传失败' }}</span>
                        <button nz-button nzType="link" (click)="retryUpload(item.id)">
                          <nz-icon nzType="reload" nzTheme="outline" />
                        </button>
                      </div>
                    }
                    <button nz-button nzShape="circle" nzType="link" class="image-upload-item__remove" (click)="removeUpload(item.id)">
                      <nz-icon nzType="close" nzTheme="outline" />
                    </button>
                  </div>
                }
              </div>
            }

            <div class="composer__actions">
              <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="!canSubmit()" (click)="submitComment()">
                发送评论
              </button>
            </div>
          </div>
        </div>
      </div>
    </nz-spin>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .skill-comments {
        display: grid;
        gap: 16px;
      }
      .comment-list {
        display: grid;
        gap: 14px;
      }
      .comment-item,
      .composer {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .comment-avatar {
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        border-radius: 999px;
        background: linear-gradient(135deg, #14b8a6, #0ea5e9);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
      .comment-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .comment-body,
      .composer__main {
        min-width: 0;
        flex: 1;
      }
      .comment-body {
        padding-bottom: 14px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .comment-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .comment-header strong {
        color: var(--text-primary);
      }
      .comment-header span,
      .comment-empty {
        color: var(--text-muted);
        font-size: 12px;
      }
      .comment-empty {
        padding: 16px 0;
        text-align: center;
      }
      .composer {
        padding-top: 2px;
      }
      .composer__textarea {
        resize: vertical;
        min-height: 104px;
        border-radius: 8px;
      }
      .composer__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 10px;
      }
      .image-upload-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
      }
      .image-upload-item {
        position: relative;
        width: 88px;
        height: 88px;
        overflow: hidden;
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-subtle);
      }
      .image-upload-item__thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .image-upload-item__mask {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.42);
        color: #fff;
      }
      .image-upload-item__mask--error {
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        background: rgba(127, 29, 29, 0.72);
        font-size: 12px;
        text-align: center;
      }
      .image-upload-item__spinner {
        width: 26px;
        height: 26px;
        border: 3px solid rgba(255, 255, 255, 0.36);
        border-top-color: #fff;
        border-radius: 999px;
        animation: skill-comment-upload-spin 0.85s linear infinite;
      }
      .image-upload-item__remove {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 22px;
        min-width: 22px;
        height: 22px;
        color: rgba(15, 23, 42, 0.86);
        background: rgba(255, 255, 255, 0.92);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
      }
      .image-upload-item:hover .image-upload-item__remove,
      .image-upload-item:focus-within .image-upload-item__remove {
        opacity: 1;
        pointer-events: auto;
      }
      .mention-option {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
      }
      .mention-name {
        color: var(--text-primary);
        font-weight: 600;
      }
      .mention-id {
        overflow: hidden;
        color: var(--text-muted);
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      :host-context(html[data-theme='dark']) .comment-body {
        border-color: rgba(148, 163, 184, 0.14);
      }
      :host-context(html[data-theme='dark']) .image-upload-item {
        border-color: rgba(148, 163, 184, 0.14);
      }
      @keyframes skill-comment-upload-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      @media (max-width: 768px) {
        .composer__actions {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCommentsComponent implements OnDestroy {
  private readonly imageUpload = inject(ImageUploadService);
  private readonly authStore = inject(AuthStore);
  private readonly commentUploadPolicy = UPLOAD_TARGETS.commentImage;

  readonly comments = input<SkillCommentEntity[]>([]);
  readonly members = input<UserEntity[]>([]);
  readonly loading = input(false);
  readonly busy = input(false);
  readonly submit = output<string>();

  readonly draft = signal('');
  readonly mentionKeyword = signal('');
  readonly uploads = signal<CommentImageUploadItem[]>([]);
  readonly currentUser = this.authStore.currentUser;
  readonly currentUserInitial = computed(() => this.avatarText(this.currentUser()?.nickname || '我'));
  readonly uploading = computed(() => this.uploads().some((item) => item.status === 'uploading'));
  readonly canSubmit = computed(() => {
    const hasText = !!this.draft().trim();
    const hasUploadedImages = this.uploads().some((item) => item.status === 'done' && !!item.url);
    return (hasText || hasUploadedImages) && !this.busy() && !this.uploading();
  });
  readonly mentionOptions = computed(() => {
    const keyword = this.mentionKeyword().trim().toLowerCase();
    return this.members()
      .filter((member) => member.status === 'active')
      .filter((member) => {
        if (!keyword) {
          return true;
        }
        return this.memberLabel(member).toLowerCase().includes(keyword) || member.username.toLowerCase().includes(keyword);
      })
      .slice(0, 20);
  });
  readonly mentionValue = (member: UserEntity): string => this.memberLabel(member);

  handleMentionSearch(event: MentionOnSearchTypes): void {
    this.mentionKeyword.set(event.value || '');
  }

  onPaste(event: ClipboardEvent): void {
    if (this.busy()) {
      return;
    }
    const files = extractClipboardImages(event, 'skill-comment-image');
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
    this.uploads.update((items) => items.map((item) => (item.id === id ? { ...item, status: 'uploading', error: null } : item)));
    void this.runUpload(id, target.file);
  }

  removeUpload(id: string): void {
    const target = this.uploads().find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    this.uploads.update((items) => items.filter((item) => item.id !== id));
  }

  submitComment(): void {
    const content = composeContentWithMarkdownImages(this.draft(), this.uploads());
    if (!content || this.busy() || this.uploading()) {
      return;
    }
    this.submit.emit(content);
    this.draft.set('');
    this.mentionKeyword.set('');
    this.clearUploads();
  }

  commentAuthorAvatar(comment: SkillCommentEntity): string | null {
    const member = this.members().find((item) => item.id === comment.authorId || item.username === comment.authorId);
    return member?.avatarUrl ?? null;
  }

  avatarText(name: string | null): string {
    return (name || '用户').trim().slice(0, 2).toUpperCase();
  }

  ngOnDestroy(): void {
    this.clearUploads();
  }

  private memberLabel(member: UserEntity): string {
    return member.displayName?.trim() || member.username;
  }

  private enqueueImageUpload(file: File): void {
    const id = createUploadId(file);
    const previewUrl = URL.createObjectURL(file);
    this.uploads.update((items) => [...items, { id, file, previewUrl, status: 'uploading', url: null, error: null }]);
    void this.runUpload(id, file);
  }

  private async runUpload(id: string, file: File): Promise<void> {
    try {
      const url = await this.imageUpload.uploadImage(file, this.commentUploadPolicy);
      this.uploads.update((items) => items.map((item) => (item.id === id ? { ...item, status: 'done', url, error: null } : item)));
    } catch (error) {
      const message = error instanceof Error ? error.message : '图片上传失败';
      this.uploads.update((items) => items.map((item) => (item.id === id ? { ...item, status: 'error', error: message } : item)));
    }
  }

  private clearUploads(): void {
    revokePreviewUrls(this.uploads());
    this.uploads.set([]);
  }
}
