import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

import { ROLE_LABELS } from '@app/shared/constants/role-options';

import { EllipsisTextComponent } from '@app/shared/components/ellipsis-text/ellipsis-text.component';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import {
  IssueEntity,
  IssueLogEntity,
  type createCommentInput,
  type ProjectMemberEntity,
} from '@pages/issues/models/issue.model';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzListModule } from 'ng-zorro-antd/list';
import { MentionOnSearchTypes, NzMentionModule } from 'ng-zorro-antd/mention';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { extractAndRemoveImagePaths } from '@app/utils/md-text';
import { NzImageModule } from 'ng-zorro-antd/image';
import { IssueCommentInputComponent } from './issue-comment-input.component';

type LogViewType = 'comment' | 'all';

type logContent = {
  segments: {
    text: string;
    mention?: boolean;
  }[];
  imgUrls?: string[];
};

@Component({
  selector: 'app-issue-logs-area',
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
    NzImageModule,
    NzMentionModule,
    NzFormModule,
    FormsModule,
    NzAvatarModule,
    IssueCommentInputComponent,
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
      <app-issue-comment-input
        [busy]="busy()"
        [members]="members()"
        [canComment]="canComment()"
        (submit)="submit.emit($event)"
      ></app-issue-comment-input>
      <div class="logs-content">
        @if (logs().length === 0) {
          <div class="comment-empty">暂无评论/备注</div>
        } @else {
          <nz-timeline>
            @for (log of viewLogs(); track log.id) {
              @let parsed = parseLogContent(log);
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
                          <ng-container
                            *ngTemplateOutlet="logContent; context: { logParsed: parsed }"
                          ></ng-container>
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
                      <ng-container
                        *ngTemplateOutlet="logContent; context: { logParsed: parsed }"
                      ></ng-container>
                      <div class="time">{{ log.createdAt | date: 'MM/dd HH:mm' }}</div>
                    </div>
                  </div>
                }
              </nz-timeline-item>

              <ng-template #dotTemplate>
                <nz-icon [nzType]="iconType(log)" nzTheme="outline" style="font-size: 16px;" />
              </ng-template>

              <ng-template #logContent let-logParsed>
                <app-ellipsis-text [lines]="2" [maxHeight]="40">
                  @for (seg of parsed.segments; track $index) {
                    @if (seg.mention) {
                      <span class="mention">{{ seg.text }}</span>
                    } @else {
                      <span>{{ seg.text }}</span>
                    }
                  }
                  <br />
                  @for (imgUrl of parsed.imgUrls; track imgUrl) {
                    <img nz-image width="100px" height="100px" [nzSrc]="imgUrl" alt="" />
                  }
                </app-ellipsis-text>
              </ng-template>
            }
          </nz-timeline>
        }
      </div>
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

    .logs-content {
      padding: 12px 0;
      max-height: 600px;
      overflow: auto;
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
export class IssueLogsAreaComponent {
  private readonly mentionPattern = /(@[^\s@,，.。;；:：!?！？]+)/g;
  extractAndRemoveImagePaths = extractAndRemoveImagePaths;
  readonly issueId = input<string>('');
  readonly canComment = input(false);
  readonly logs = input.required<IssueLogEntity[]>();
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly projectId = input<string>();
  readonly busy = input(false);
  readonly submit = output<createCommentInput>();

  // 查看模式
  readonly viewMode = signal<LogViewType>('all');
  constructor() {
    effect(() => {
      const issueId = this.issueId();
      if (issueId) {
        this.viewMode.set('all');
      }
    });
  }

  readonly commentDraft = signal('');
  readonly mentionKeyword = signal('');

  readonly commontLogs = computed(() => this.logs().filter((log) => log.actionType === 'comment'));

  readonly viewLogs = computed(() => {
    if (this.viewMode() === 'comment') {
      return this.commontLogs();
    }
    return this.logs();
  });

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

  parseLogContent(log: IssueLogEntity): logContent {
    const segments: Array<{ text: string; mention?: boolean }> = [];
    const imgUrls: string[] = [];
    let text = log.summary;

    if (!text) return { segments };

    // 如果是评论需要提取图片
    if (log.actionType === 'comment' || log.actionType === 'reopen') {
      const extracted = extractAndRemoveImagePaths(
        text,
        this.projectId()!,
        this.issueId(),
        'issues',
      );

      text = extracted.text;
      imgUrls.push(...extracted.imgUrls);
    }

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

    return { segments, imgUrls };
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
