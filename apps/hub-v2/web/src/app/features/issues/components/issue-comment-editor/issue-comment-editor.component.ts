import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { AuthStore } from '../../../../core/auth/auth.store';
import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';
import type { IssueCommentEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-comment-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule, PanelCardComponent],
  template: `
    <app-panel-card title="评论" [empty]="comments().length === 0" emptyText="还没有评论">
      @if (comments().length > 0) {
        <div class="comment-list">
          @for (item of comments(); track item.id) {
            <div class="comment-item">
              <div class="comment-item__avatar">{{ avatarText(item.authorName) }}</div>
              <div class="comment-item__body">
                <div class="comment-item__header">
                  <span class="comment-item__author">{{ item.authorName }}</span>
                  <span class="comment-item__action">添加了评论</span>
                  <span class="comment-item__time">{{ item.createdAt | date: 'MM-dd HH:mm' }}</span>
                </div>
                <div class="comment-item__content">{{ item.content }}</div>
              </div>
            </div>
          }
        </div>
      }

      <div class="composer">
        <div class="composer__avatar">{{ currentUserInitial() }}</div>
        <div class="composer__main">
          <textarea
            nz-input
            class="composer__textarea"
            rows="4"
            placeholder="添加评论… 输入 @ 提及成员"
            [ngModel]="draft()"
            (ngModelChange)="draft.set($event)"
          ></textarea>
          <div class="composer__actions">
            <div class="composer__tools">
              <button nz-button nzType="text" type="button" class="tool-btn">
                <span nz-icon nzType="paper-clip"></span>
              </button>
              <button nz-button nzType="text" type="button" class="tool-btn">
                <span nz-icon nzType="notification"></span>
              </button>
            </div>
            <button nz-button nzType="primary" [nzLoading]="busy()" (click)="submitComment()">
              发送评论
            </button>
          </div>
        </div>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .comment-list {
        display: grid;
      }
      .comment-item {
        display: flex;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid var(--border-color-soft);
      }
      .comment-item__avatar,
      .composer__avatar {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .comment-item__body {
        flex: 1;
      }
      .comment-item__header {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .comment-item__author {
        font-weight: 700;
        color: var(--text-primary);
      }
      .comment-item__action,
      .comment-item__time {
        font-size: 12px;
        color: var(--text-muted);
      }
      .comment-item__time {
        margin-left: auto;
      }
      .comment-item__content {
        margin-top: 8px;
        color: var(--text-secondary);
        white-space: pre-wrap;
        line-height: 1.7;
      }
      .composer {
        display: flex;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid var(--border-color-soft);
      }
      .composer__main {
        flex: 1;
      }
      .composer__textarea {
        min-height: 72px;
        border-radius: 8px;
      }
      .composer__actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 10px;
      }
      .composer__tools {
        display: flex;
        gap: 8px;
      }
      .tool-btn {
        color: var(--text-muted);
      }
      @media (max-width: 768px) {
        .comment-item__time {
          margin-left: 0;
        }
        .composer {
          flex-direction: column;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCommentEditorComponent {
  private readonly authStore = inject(AuthStore);

  readonly comments = input.required<IssueCommentEntity[]>();
  readonly busy = input(false);
  readonly submit = output<string>();

  readonly draft = signal('');
  readonly currentUserInitial = computed(() => this.avatarText(this.authStore.currentUser()?.nickname || '我'));

  submitComment(): void {
    const content = this.draft().trim();
    if (!content) {
      return;
    }

    this.submit.emit(content);
    this.draft.set('');
  }

  avatarText(name: string): string {
    return name.slice(0, 1);
  }
}
