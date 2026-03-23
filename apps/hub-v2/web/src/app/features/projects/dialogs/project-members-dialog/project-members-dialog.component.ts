import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import type { UserEntity } from '../../../users/models/user.model';
import type { AddProjectMemberInput, ProjectMemberEntity, ProjectSummary } from '../../models/project.model';

@Component({
  selector: 'app-project-members-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="820"
      [title]="project() ? project()!.name + ' · 成员管理' : '项目成员'"
      [subtitle]="'先补齐测试协作所需的项目成员和角色。'"
      [icon]="'team'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body class="members-dialog">
        <section class="members-panel members-panel--form">
          <div class="members-panel__title">添加成员</div>
          <div class="member-form">
            <label class="field dialog-field">
              <span class="dialog-field__label">用户</span>
              <nz-select
                nzShowSearch
                nzAllowClear
                nzPlaceHolder="选择用户"
                [ngModel]="selectedUserId()"
                (ngModelChange)="selectedUserId.set($event ?? '')"
              >
                @for (item of availableUsers(); track item.id) {
                  <nz-option [nzLabel]="item.displayName || item.username" [nzValue]="item.id"></nz-option>
                }
              </nz-select>
            </label>

            <label class="field dialog-field">
              <span class="dialog-field__label">角色</span>
              <nz-select [ngModel]="roleCode()" (ngModelChange)="roleCode.set($event || 'member')">
                <nz-option nzLabel="成员" nzValue="member"></nz-option>
                <nz-option nzLabel="管理者" nzValue="manager"></nz-option>
                <nz-option nzLabel="测试" nzValue="tester"></nz-option>
                <nz-option nzLabel="查看者" nzValue="viewer"></nz-option>
              </nz-select>
            </label>

            <label class="field dialog-field field--owner">
              <span class="dialog-field__label">负责人</span>
              <button type="button" class="owner-toggle" [class.owner-toggle--active]="isOwner()" (click)="isOwner.set(!isOwner())">
                {{ isOwner() ? '是' : '否' }}
              </button>
            </label>

            <button nz-button nzType="primary" class="member-form__submit" [disabled]="!selectedUserId()" [nzLoading]="busy()" (click)="submitAdd()">
              添加成员
            </button>
          </div>
        </section>

        <section class="members-panel">
          <div class="members-panel__header">
            <div class="members-panel__title">当前成员</div>
            <div class="members-panel__count">{{ members().length }}</div>
          </div>

          @if (loading()) {
            <div class="members-empty">正在加载成员列表…</div>
          } @else if (members().length === 0) {
            <div class="members-empty">当前项目还没有成员。</div>
          } @else {
            <div class="members-list">
              @for (member of members(); track member.id) {
                <div class="member-item">
                  <div class="member-item__avatar">{{ avatarText(member.displayName) }}</div>
                  <div class="member-item__content">
                    <div class="member-item__name">
                      {{ member.displayName }}
                      @if (member.isOwner) {
                        <span class="member-item__tag">负责人</span>
                      }
                    </div>
                    <div class="member-item__meta">{{ member.roleCode || 'member' }}</div>
                  </div>
                  <button nz-button nzType="default" nzDanger [disabled]="busy()" (click)="remove.emit(member)">移除</button>
                </div>
              }
            </div>
          }
        </section>
      </div>
    </app-dialog-shell>
  `,
  styles: [
    `
      .members-dialog {
        display: grid;
        gap: 18px;
      }
      .members-panel {
        border: 1px solid var(--border-color);
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)), var(--bg-container);
        padding: 18px;
      }
      .members-panel--form {
        background: linear-gradient(180deg, rgba(79, 70, 229, 0.04), rgba(79, 70, 229, 0.01)), var(--bg-container);
      }
      .members-panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .members-panel__title {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-heading);
      }
      .members-panel__count {
        min-width: 28px;
        height: 28px;
        padding-inline: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .member-form {
        display: grid;
        grid-template-columns: 1.5fr 1fr 0.7fr auto;
        gap: 14px;
        align-items: end;
      }
      .field--owner {
        align-self: stretch;
      }
      .owner-toggle {
        height: 40px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--surface-overlay);
        color: var(--text-primary);
        font-weight: 700;
      }
      .owner-toggle--active {
        border-color: var(--primary-500);
        background: rgba(79, 70, 229, 0.12);
        color: var(--primary-600);
      }
      .member-form__submit {
        height: 40px;
        padding-inline: 16px;
        border-radius: 10px;
      }
      .members-empty {
        padding: 18px 0 8px;
        color: var(--text-muted);
      }
      .members-list {
        display: grid;
      }
      .member-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 0;
        border-top: 1px solid var(--border-color-soft);
      }
      .member-item:first-child {
        border-top: 0;
      }
      .member-item__avatar {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        box-shadow: 0 12px 24px rgba(79, 70, 229, 0.22);
        flex-shrink: 0;
      }
      .member-item__content {
        min-width: 0;
        flex: 1;
      }
      .member-item__name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        color: var(--text-heading);
      }
      .member-item__tag {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(79, 70, 229, 0.14);
        color: var(--primary-600);
        font-size: 12px;
        font-weight: 700;
      }
      .member-item__meta {
        margin-top: 4px;
        font-size: 12px;
        color: var(--text-muted);
      }
      :host-context(html[data-theme='dark']) .member-item__tag {
        background: rgba(99, 102, 241, 0.22);
        color: #c7d2fe;
      }
      @media (max-width: 840px) {
        .member-form {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMembersDialogComponent {
  readonly open = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly users = input<UserEntity[]>([]);
  readonly loading = input(false);
  readonly busy = input(false);

  readonly add = output<AddProjectMemberInput>();
  readonly remove = output<ProjectMemberEntity>();
  readonly cancel = output<void>();

  readonly selectedUserId = signal('');
  readonly roleCode = signal('member');
  readonly isOwner = signal(false);

  readonly availableUsers = computed(() => {
    const memberIds = new Set(this.members().map((item) => item.userId));
    return this.users().filter((item) => !memberIds.has(item.id) && item.status === 'active');
  });

  submitAdd(): void {
    if (!this.selectedUserId()) {
      return;
    }
    this.add.emit({
      userId: this.selectedUserId(),
      roleCode: this.roleCode(),
      isOwner: this.isOwner(),
    });
    this.selectedUserId.set('');
    this.roleCode.set('member');
    this.isOwner.set(false);
  }

  avatarText(name: string): string {
    return (name || '?').slice(0, 1).toUpperCase();
  }
}
