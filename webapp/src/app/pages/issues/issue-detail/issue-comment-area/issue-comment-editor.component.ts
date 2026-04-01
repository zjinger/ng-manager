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

import type { createCommentInput, ProjectMemberEntity } from '@pages/issues/models/issue.model';
import type { IssueCommentEntity } from '../../models/issue.model';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzFormModule } from 'ng-zorro-antd/form';

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
    NzFormModule,
    FormsModule,
    NzAvatarModule,
  ],
  template: `
    @if (comments().length === 0) {
      <span class="comment-empty">暂无评论/备注</span>
    } @else {
      <nz-list [nzDataSource]="comments()" [nzRenderItem]="item" nzItemLayout="horizontal">
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
      </nz-list>
    }
    <nz-comment>
      <nz-avatar
        nz-comment-avatar
        [nzText]="'我'"
        nzSize="small"
        style="background-color:#87d068"
      />
      <nz-comment-content>
        <nz-form-item>
          <textarea [(ngModel)]="commentDraft" nz-input rows="4"></textarea>
        </nz-form-item>
        <nz-form-item>
          <button nz-button nzType="primary" [nzLoading]="busy()" (click)="handleSubmit()">
            发送评论
          </button>
        </nz-form-item>
      </nz-comment-content>
    </nz-comment>
  `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCommentAreaComponent {
  private readonly authStore = inject(UserStore);

  readonly comments = input.required<IssueCommentEntity[]>();
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
