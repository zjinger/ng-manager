import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { MentionOnSearchTypes, NzMentionModule } from 'ng-zorro-antd/mention';

import { ROLE_LABELS } from '@app/shared/constants';
import { AuthStore } from '@core/auth';
import { PanelCardComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { IssueCommentEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-comment-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzMentionModule, PanelCardComponent],
  template: `
    <app-panel-card title="评论/备注" >
      <!-- @if (comments().length > 0) {
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
                <div class="comment-item__content">
                  @for (segment of commentSegments(item); track $index) {
                    @if (segment.mentioned) {
                      <span class="comment-mention">{{ segment.text }}</span>
                    } @else {
                      <span>{{ segment.text }}</span>
                    }
                  }
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="comment-empty">还没有讨论</div>
      } -->

      <div class="composer">
        <div class="composer__avatar">{{ currentUserInitial() }}</div>
        <div class="composer__main">
          <nz-mention
            [nzSuggestions]="mentionSuggestions()"
            [nzValueWith]="mentionLabel"
            (nzOnSearchChange)="handleMentionSearch($event)"
            (nzOnSelect)="handleMentionSelect($event)"
          >
            <textarea
              nz-input
              nzMentionTrigger
              class="composer__textarea"
              rows="4"
              placeholder="添加评论… 输入 @ 提及成员"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
            ></textarea>
            <ng-template nzMentionSuggestion let-member>
              <div class="mention-option">
                <span class="mention-name">{{ member.displayName || member.userId }}</span>
                <span class="mention-id">{{roleLabel( member.roleCode) }}</span>
              </div>
            </ng-template>
          </nz-mention>
          <div class="composer__actions">
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
      .comment-empty {
        padding: 20px;
        text-align: center;
        color: var(--text-muted);
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
      .comment-mention {
        color: var(--primary-700);
        font-weight: 700;
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        border-radius: 6px;
        padding: 0 4px;
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
      .mention-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .mention-name {
        color: var(--text-primary);
        font-weight: 600;
      }
      .mention-id {
        color: var(--text-muted);
        font-size: 12px;
      }
      :host-context(html[data-theme='dark']) .comment-mention {
        color: var(--primary-300);
        background: color-mix(in srgb, var(--primary-400) 26%, transparent);
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
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly busy = input(false);
  readonly submit = output<{ content: string; mentions: string[] }>();

  readonly draft = signal('');
  readonly mentionKeyword = signal('');
  readonly currentUserInitial = computed(() => this.avatarText(this.authStore.currentUser()?.nickname || '我'));

  submitComment(): void {
    const raw = this.draft();
    const content = raw.trim();
    if (!content) {
      return;
    }

    this.submit.emit({ content, mentions: this.collectMentions(raw) });
    this.draft.set('');
    this.mentionKeyword.set('');
  }

  avatarText(name: string): string {
    return name.slice(0, 1);
  }

  mentionSuggestions(): ProjectMemberEntity[] {
    const keyword = this.mentionKeyword().trim().toLowerCase();
    if (!keyword) {
      return this.members().slice(0, 20);
    }

    return this.members()
      .filter((member) => {
        const displayName = (member.displayName || '').toLowerCase();
        const userId = (member.userId || '').toLowerCase();
        return displayName.includes(keyword) || userId.includes(keyword);
      })
      .slice(0, 20);
  }

  mentionLabel(member: ProjectMemberEntity): string {
    return member.displayName?.trim() || member.userId;
  }

  handleMentionSearch(event: MentionOnSearchTypes): void {
    this.mentionKeyword.set(event.value || '');
  }

  handleMentionSelect(_member: ProjectMemberEntity): void {
    this.mentionKeyword.set('');
  }

  commentSegments(item: IssueCommentEntity): Array<{ text: string; mentioned: boolean }> {
    const mentionMarkers = this.mentionMarkers(item);
    if (mentionMarkers.length === 0) {
      return [{ text: item.content, mentioned: false }];
    }

    const escaped = mentionMarkers
      .sort((left, right) => right.length - left.length)
      .map((value) => this.escapeRegExp(value));
    const pattern = new RegExp(`(${escaped.join('|')})`, 'g');
    const segments: Array<{ text: string; mentioned: boolean }> = [];
    let lastIndex = 0;

    for (const match of item.content.matchAll(pattern)) {
      const index = match.index ?? 0;
      const text = match[0] ?? '';
      if (!text) {
        continue;
      }
      if (index > lastIndex) {
        segments.push({ text: item.content.slice(lastIndex, index), mentioned: false });
      }
      segments.push({ text, mentioned: true });
      lastIndex = index + text.length;
    }

    if (lastIndex < item.content.length) {
      segments.push({ text: item.content.slice(lastIndex), mentioned: false });
    }

    return segments.length > 0 ? segments : [{ text: item.content, mentioned: false }];
  }

  roleLabel(roleCode: string): string {
    return ROLE_LABELS[roleCode] || roleCode;
  }

  private collectMentions(content: string): string[] {
    const result = new Set<string>();
    for (const member of this.members()) {
      const label = this.mentionLabel(member);
      if (label && content.includes(`@${label}`)) {
        result.add(member.userId);
      }
    }
    return [...result];
  }

  private mentionMarkers(item: IssueCommentEntity): string[] {
    const mentions = this.parseMentionIds(item.mentionsJson);
    if (mentions.length === 0) {
      return [];
    }

    const markers: string[] = [];
    for (const userId of mentions) {
      const member = this.members().find((m) => m.userId === userId);
      const label = member?.displayName?.trim() || member?.userId;
      if (label) {
        markers.push(`@${label}`);
      }
    }

    return Array.from(new Set(markers));
  }

  private parseMentionIds(raw: string | null): string[] {
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    } catch {
      return [];
    }
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
