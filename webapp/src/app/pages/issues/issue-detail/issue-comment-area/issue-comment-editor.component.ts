import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { ROLE_LABELS } from '@app/shared/constants/role-options';
import { UserStore } from '@app/core/stores/user/user.store';

import {
  IssueLogEntity,
  type createCommentInput,
  type ProjectMemberEntity,
} from '@pages/issues/models/issue.model';
import type { IssueCommentEntity } from '../../models/issue.model';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzFormModule } from 'ng-zorro-antd/form';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { MentionOnSearchTypes, NzMentionModule } from 'ng-zorro-antd/mention';
import { RdAction } from '@pages/rd/models/rd.model';
import { EllipsisTextComponent } from '@app/shared/components/ellipsis-text/ellipsis-text.component';

type LogViewType = 'comment' | 'all';

@Component({
  selector: 'app-issue-comment-area',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzListModule,
    NzCommentModule,
    NzTimelineModule,
    NzMentionModule,
    NzFormModule,
    FormsModule,
    NzAvatarModule,
    DetailItemCardComponent,
    EllipsisTextComponent,
  ],
  template: `
    <app-detail-item-card title="活动记录">
      <div actions>
        <button nz-button nzSize="small" (click)="toggleViewMode()">
          @if (viewMode() === 'all') {
            仅看评论
          } @else {
            查看全部
          }
        </button>
      </div>
      <nz-comment>
        <nz-avatar
          nz-comment-avatar
          [nzSrc]=""
          [nzText]="'我'"
          nzSize="small"
          style="background-color:#87d068"
        />
        <nz-comment-content>
          <nz-form-item>
            <nz-mention
              [nzSuggestions]="mentionOptions()"
              [nzValueWith]="mentionLabel"
              (nzOnSearchChange)="handleMentionSearch($event)"
              (nzOnSelect)="handleMentionSelect($event)"
            >
              <textarea
                [(ngModel)]="commentDraft"
                nz-input
                nzMentionTrigger
                rows="4"
                class="comment-input"
                placeholder="添加评论...输入 @ 提及成员"
              ></textarea>
              <ng-template nzMentionSuggestion let-member>
                <div class="mention-option">
                  <span class="mention-name">{{ member.displayName || member.userId }}</span>
                  <span class="mention-id">{{ roleLabel(member.roleCode) }}</span>
                </div>
              </ng-template>
            </nz-mention>
          </nz-form-item>
          <nz-form-item class="toolbar">
            <button
              nz-button
              nzType="primary"
              [nzLoading]="busy()"
              (click)="handleSubmit()"
              class="send"
              [disabled]="!canComment()"
            >
              @if (canComment()) {
                发送评论
              } @else {
                没有评论权限
              }
            </button>
          </nz-form-item>
        </nz-comment-content>
      </nz-comment>
      @if (logs().length === 0) {
        <div class="comment-empty">暂无评论/备注</div>
      } @else {
        <nz-timeline>
          @for (log of viewLogs(); track log.id) {
            <nz-timeline-item [nzDot]="dotTemplate">
              @if (log.actionType === 'comment') {
                <!-- 用户评论 -->
                <div class="comment-item">
                  <nz-comment [nzAuthor]="log.operatorName!">
                    <nz-avatar
                      nz-comment-avatar
                      [nzSrc]="getMemberAvatarUrl(log?.operatorId ?? '')"
                      [nzText]="log.operatorName!.charAt(0)"
                      nzSize="small"
                      style="background-color: #1890ff"
                    />
                    <nz-comment-content>
                      <p class="summary">
                        <app-ellipsis-text [lines]="2">
                          @for (seg of commentSegments(log.summary!); track $index) {
                            @if (seg.mention) {
                              <span class="mention">{{ seg.text }}</span>
                            } @else {
                              <span>{{ seg.text }}</span>
                            }
                          }
                        </app-ellipsis-text>
                      </p>
                    </nz-comment-content>
                  </nz-comment>
                  <span class="time">{{ log.createdAt | date: 'MM/dd HH:mm' }}</span>
                </div>
              } @else {
                <!-- 评论以外的操作 -->
                <div class="log-item">
                  <div class="meta">
                    <span class="operator">{{ log.operatorName || '系统' }}</span>
                    <app-ellipsis-text [text]="log.summary || log.actionType" [lines]="2">
                      <span class="content">{{ log.summary || log.actionType }}</span>
                    </app-ellipsis-text>
                    <div class="time">{{ log.createdAt | date: 'MM/dd HH:mm' }}</div>
                  </div>
                </div>
              }
            </nz-timeline-item>
            <ng-template #dotTemplate>
              <nz-icon [nzType]="iconType(log)" nzTheme="outline" style="font-size: 16px;" />
            </ng-template>
          }
        </nz-timeline>
      }
    </app-detail-item-card>
  `,
  styles: `
    .mention {
      color: #1677ff;
      font-weight: 500;
      cursor: pointer;
    }
    .comment-empty {
      margin: 1rem;
      text-align: center;
      color: gray;
    }
    .comment-input {
      width: 100%;
      border-radius: 10px;
    }
    .toolbar {
      display: flex;
      justify-content: end;
    }
    .send {
      border-radius: 6px;
    }
    .mention-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .mention-name {
      font-weight: 600;
    }
    .mention-id {
      font-size: 12px;
    }
    .log-item {
      padding: 4px 0 0;
      .meta {
        display: flex;
        align-items: start;
        gap: 0.875rem;
        color: rgba(0, 0, 0, 0.65);
        font-size: 0.875rem;
        margin-bottom: 4px;
        .operator {
          font-weight: bold;
          white-space: nowrap;
        }
        .content {
          color: rgba(0, 0, 0, 0.85);
          font-size: 14px;
        }
      }
      .empty {
        color: rgba(0, 0, 0, 0.45);
      }
    }
    .comment-item {
      display: flex;
    }
    .time {
      padding-left: 10px;
      display: flex;
      align-items: center;
      min-width: 100px;
      font-size: 14px;
      font-weight: 300;
      color: #bbbbbb;
      margin-left: auto;
    }
    .log-item {
      padding-bottom: 16px;
    }
    .summary {
      font-size: 14px;
    }
    :host ::ng-deep .ant-timeline-item {
      margin-left: 6px;
      padding-bottom: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCommentAreaComponent {
  private readonly mentionPattern = /(@[^\s@,，.。;；:：!?！？]+)/g;

  readonly canComment = input(false);
  readonly logs = input.required<IssueLogEntity[]>();
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly projectId = input<string>();
  readonly busy = input(false);
  readonly submit = output<createCommentInput>();

  // 查看模式
  readonly viewMode = signal<LogViewType>('all');

  readonly commentDraft = signal('');
  readonly mentionKeyword = signal('');

  readonly mentionOptions = computed(() => {
    const keyword = this.mentionKeyword().trim().toLowerCase();
    const members = this.members();
    if (!keyword) {
      return members.slice(0, 20);
    }
    return members
      .filter((member) => {
        const displayName = (member.displayName || '').toLowerCase();
        const userId = (member.userId || '').toLowerCase();
        return displayName.includes(keyword) || userId.includes(keyword);
      })
      .slice(0, 20);
  });

  readonly commontLogs = computed(() => this.logs().filter((log) => log.actionType === 'comment'));

  readonly viewLogs = computed(() => {
    if (this.viewMode() === 'comment') {
      return this.commontLogs();
    }
    return this.logs();
  });

  handleSubmit() {
    if (!this.commentDraft().trim()) return;
    this.submit.emit({
      content: this.commentDraft(),
      mentions: this.collectMentions(this.commentDraft()),
    });
    this.commentDraft.set('');
    this.mentionKeyword.set('');
  }

  roleLabel(roleCode: string): string {
    return ROLE_LABELS[roleCode] || roleCode;
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

  iconType(item: IssueLogEntity): string {
    const metaKind = this.readMetaKind(item.metaJson);
    if (metaKind === 'participant.added' || metaKind === 'participant.added.batch') {
      return 'user-add';
    }
    if (metaKind === 'participant.removed') {
      return 'user-delete';
    }
    if (metaKind === 'issue_branch.created' || metaKind === 'issue_branch.claimed') {
      return 'share-alt';
    }
    if (metaKind === 'issue_branch.started') {
      return 'play-circle';
    }
    if (metaKind === 'issue_branch.completed') {
      return 'check-circle';
    }

    return (
      {
        create: 'plus-circle',
        assign: 'user-add',
        claim: 'user-add',
        start: 'play-circle',
        wait_update: 'clock-circle',
        resolve: 'check-circle',
        verify: 'safety-certificate',
        reopen: 'redo',
        close: 'close-circle',
        comment: 'message',
        update: 'edit',
      }[item.actionType] || 'clock-circle'
    );
  }

  commentSegments(text: string): Array<{ text: string; mention?: boolean }> {
    const segments: Array<{ text: string; mention?: boolean }> = [];

    if (!text) return segments;

    const regex = this.mentionPattern;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      const start = match.index;
      const full = match[0]; // @陈墨
      const name = full.slice(1); // 陈墨

      // 普通文本
      if (start > lastIndex) {
        segments.push({
          text: text.slice(lastIndex, start),
        });
      }

      // mention（只对成员高亮）
      segments.push({
        text: full,
        mention: this.isMember(name),
      });

      lastIndex = regex.lastIndex;
    }

    // 剩余文本
    if (lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
      });
    }

    return segments;
  }

  isMember(name: string): boolean {
    return !!this.members().find((member) => member.displayName === name);
  }

  getMemberAvatarUrl(userId: string): string {
    // if (!this.projectId()) return '';
    // const member = this.members().find((member) => member.userId === userId);
    // const avatarUrl = this.transformAvatarUrl(
    //   member?.avatarUrl || '',
    //   this.projectId()!,
    //   this.logs()[0].issueId,
    // );
    // return avatarUrl;
    return '';
  }

  toggleViewMode(mode?: LogViewType) {
    if (mode) this.viewMode.set(mode);
    const m = this.viewMode() === 'all' ? 'comment' : 'all';
    this.viewMode.set(m);
  }

  private transformAvatarUrl(url: string, projectKey: string, issueId: string): string {
    // 使用正则表达式从原始路径中提取出 attachmentId
    const regex = /\/api\/admin\/uploads\/(upl_[a-zA-Z0-9_-]+)\/raw/;
    const match = url.match(regex);

    if (match) {
      // 提取出 attachmentId
      const attachmentId = match[1];

      // 返回转换后的 URL
      return `/api/token/projects/${projectKey}/issues/${issueId}/attachments/${attachmentId}/raw`;
    } else {
      return '';
    }
  }

  private readMetaKind(metaJson: string | null): string | null {
    const parsed = this.parseMeta(metaJson);
    return typeof parsed?.['kind'] === 'string' ? parsed['kind'] : null;
  }

  private parseMeta(metaJson: string | null): Record<string, unknown> | null {
    if (!metaJson) {
      return null;
    }
    try {
      const parsed = JSON.parse(metaJson) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
}
