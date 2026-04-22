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

import { EllipsisTextComponent } from '@app/shared/components/ellipsis-text/ellipsis-text.component';
import { ISSUE_ACTION_TYPES_LABELS } from '@app/shared/constants/issue-type-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import { extractAndRemoveImagePaths, splitTextWithMentions } from '@app/utils/md-text';
import {
  IssueActionType,
  IssueLogEntity,
  type createCommentInput,
  type ProjectMemberEntity,
} from '@pages/issues/models/issue.model';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMentionModule } from 'ng-zorro-antd/mention';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { IssueCommentInputComponent } from './issue-comment-input.component';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzSelectModule } from 'ng-zorro-antd/select';

type LogFilterType = 'all' | IssueActionType;

type ParsedLog = {
  id: string;
  issueId: string;
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  operatorId: string | null;
  operatorName: string | null;
  metaJson: string | null;
  createdAt: string;
} & LogContent;

type LogContent = {
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
    NzSelectModule,
    NzDropDownModule,
    FormsModule,
    NzAvatarModule,
    IssueCommentInputComponent,
    DetailItemCardComponent,
    EllipsisTextComponent,
  ],
  template: `
    <app-detail-item-card title="活动记录">
      <div actions>
        @if (showFilter()) {
          <div panel-actions class="timeline-filter">
            <label class="timeline-filter__label">筛选</label>
            <nz-select
              class="timeline-filter__select"
              nzSize="small"
              [ngModel]="filterMode()"
              (ngModelChange)="onFilterModelChange($event)"
              [nzDropdownMatchSelectWidth]="false"
            >
              @for (opt of filterOptions(); track opt.value) {
                <nz-option [nzLabel]="opt.label" [nzValue]="opt.value"></nz-option>
              }
            </nz-select>
          </div>
        }
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
            @for (log of parsedLogs(); track log.id) {
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
                            *ngTemplateOutlet="logContent; context: { $implicit: log }"
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
                        *ngTemplateOutlet="logContent; context: { $implicit: log }"
                      ></ng-container>
                      <div class="time">{{ log.createdAt | date: 'MM/dd HH:mm' }}</div>
                    </div>
                  </div>
                }
              </nz-timeline-item>

              <ng-template #dotTemplate>
                <nz-icon [nzType]="iconType(log)" nzTheme="outline" style="font-size: 16px;" />
              </ng-template>

              <ng-template #logContent let-parsedLog>
                <app-ellipsis-text [lines]="2" [maxHeight]="46">
                  @for (seg of parsedLog.segments ?? []; track $index) {
                    @if (seg.mention) {
                      <span class="mention">{{ seg.text }}</span>
                    } @else {
                      <span>{{ seg.text }}</span>
                    }
                  }
                  <br />
                  @for (imgUrl of parsedLog.imgUrls ?? []; track imgUrl) {
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
    .timeline-filter {
      display: flex;
      align-items: center;
      gap: 10px;
      .timeline-filter__label {
        white-space: nowrap;
        color: gray;
        font-size: 12px;
      }
      .timeline-filter__select {
        min-width: 128px;
        height: auto;
      }
    }

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
  readonly logs = input.required<IssueLogEntity[]>();
  readonly issueId = input<string>('');
  readonly canComment = input(false);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly projectId = input<string>();
  readonly busy = input(false);
  readonly submit = output<createCommentInput>();

  // 查看模式
  readonly filterMode = signal<LogFilterType>('all');

  constructor() {
    effect(() => {
      const issueId = this.issueId();
      if (issueId) {
        this.filterMode.set('all');
      }
    });
  }
  // 是否展示筛选
  readonly showFilter = computed(() => this.logs().length > 10);

  // 筛选选项
  readonly filterOptions = computed(() => {
    const uniqueActionTypes = Array.from(
      new Set(
        this.logs()
          .map((item) => item.actionType)
          .filter((type) => !!type?.trim()),
      ),
    );
    return [
      { value: 'all', label: '全部' },
      ...uniqueActionTypes.map((type) => ({
        value: type,
        label: ISSUE_ACTION_TYPES_LABELS[type] || type,
      })),
    ];
  });

  readonly parsedLogs = computed<ParsedLog[]>(() => {
    // 过滤logs
    let filteredLogs;
    if (this.filterMode() === 'all') {
      filteredLogs = this.logs();
    } else {
      filteredLogs = this.logs().filter((log) => log.actionType === this.filterMode());
    }

    return filteredLogs.map((log) => {
      const logContent = this.parseLogContent(log);
      return {
        ...log,
        ...logContent,
      };
    });
  });

  readonly membersNames = computed(() => {
    return this.members().map((member) => member.displayName);
  });

  // 解析日志,生成展示用内容
  parseLogContent(log: IssueLogEntity): LogContent {
    const imgUrls: string[] = [];
    let segments: Array<{ text: string; mention?: boolean }> = [];
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

    segments = splitTextWithMentions(text, this.membersNames());
    return { segments, imgUrls };
  }

  onFilterModelChange(value: LogFilterType): void {
    const next = value || 'all';
    const hasOption = this.filterOptions().some((item) => item.value === next);
    this.filterMode.set(hasOption ? next : 'all');
  }

  iconType(item: ParsedLog): string {
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
