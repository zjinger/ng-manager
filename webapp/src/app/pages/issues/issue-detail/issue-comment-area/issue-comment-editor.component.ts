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
import { UserStore } from '@app/core/stores/user.store';

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
    NzFormModule,
    FormsModule,
    NzAvatarModule,
    DetailItemCardComponent,
  ],
  template: `
    <app-detail-item-card title="研发动态">
      <nz-comment>
        <nz-avatar
          nz-comment-avatar
          [nzText]="'我'"
          nzSize="small"
          style="background-color:#87d068"
        />
        <nz-comment-content>
          <nz-form-item>
            <textarea [(ngModel)]="commentDraft" nz-input rows="4" class="comment-input"></textarea>
          </nz-form-item>
          <nz-form-item class="toolbar">
            <button
              nz-button
              nzType="primary"
              [nzLoading]="busy()"
              (click)="handleSubmit()"
              class="send"
            >
              发送评论
            </button>
          </nz-form-item>
        </nz-comment-content>
      </nz-comment>
      @if (comments().length === 0) {
        <div class="comment-empty">暂无评论/备注</div>
      } @else {
        <!-- <nz-list [nzDataSource]="comments()" [nzRenderItem]="item" nzItemLayout="horizontal">
          <ng-template #item let-item>
            <nz-comment [nzAuthor]="item.authorName" [nzDatetime]="formatDate(item.createdAt)">
              <nz-avatar
                nz-comment-avatar
                [nzText]="item.authorName.charAt(0)"
                nzSize="small"
                style="background-color: #1890ff"
              />
              <nz-comment-content>
                <p>{{ item.content }}</p>
              </nz-comment-content>
            </nz-comment>
          </ng-template>
        </nz-list> -->
        <nz-timeline>
          @for (log of logs(); track log.id) {
            <nz-timeline-item>
              <div class="log-item">
                <div class="meta">
                  <span class="operator">{{ log.operatorName || '系统' }}</span>
                  <span class="content">{{ log.summary || log.actionType }}</span>
                  <span class="time">{{ log.createdAt | date: 'MM/dd HH:mm' }}</span>
                </div>
              </div>
            </nz-timeline-item>
          }
          @if (logs().length === 0) {
            <nz-timeline-item>
              <span class="empty">暂无动态</span>
            </nz-timeline-item>
          }
        </nz-timeline>
      }
    </app-detail-item-card>
  `,
  styles: `
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
    .log-item {
      padding: 4px 0 0;
      .meta {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        color: rgba(0, 0, 0, 0.65);
        font-size: 1rem;
        margin-bottom: 4px;
        .operator {
          font-weight: bold;
        }
        .content {
          color: rgba(0, 0, 0, 0.85);
          font-size: 14px;
        }
        .time {
          fornsize: 10px;
          font-weight: 300;
          color: #bbbbbb;
          margin-left: auto;
        }
      }
      .empty {
        color: rgba(0, 0, 0, 0.45);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCommentAreaComponent {
  private readonly authStore = inject(UserStore);

  readonly comments = input.required<IssueCommentEntity[]>();
  readonly logs = input<IssueLogEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly busy = input(false);

  readonly submit = output<createCommentInput>();

  readonly commentDraft = signal('');

  handleSubmit() {
    if (!this.commentDraft().trim()) return;
    this.submit.emit({ content: this.commentDraft() });
    this.commentDraft.set('');
  }

  formatDate(isoString: string) {
    const date = new Date(isoString);

    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');

    return `${MM}-${dd} ${HH}:${mm}`;
  }
}
