import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzButtonComponent, NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DataTableComponent } from '@shared/ui';
import { PROJECT_TYPE_LABELS, type ProjectMemberEntity, type ProjectMetaItem, type ProjectSummary, type ProjectType } from '../../models/project.model';

@Component({
  selector: 'app-project-list-table',
  standalone: true,
  imports: [CommonModule, DatePipe, ClipboardModule, DataTableComponent, NzButtonModule, NzIconModule, NzTooltipModule, NzButtonComponent, NzPopconfirmModule, NgClass],
  template: `
    <app-data-table>
      <div table-head class="project-table__head">
        <div>项目</div>
        <div>类型</div>
        <div>成员数</div>
        <div>可见性</div>
        <div>状态</div>
        <div>更新时间</div>
        <div>操作</div>
      </div>
      <div table-body class="project-table__body">
        @for (item of items(); track item.id) {
          <div class="project-row">
            <div class="project-cell project-cell--project" (click)="toggleExpand.emit(item)">
              <button nz-button nzType="link" class="project-expand-btn" type="button"  [class.expanded]="isExpanded(item.id)">
                <nz-icon [nzType]="'right'" nzTheme="outline"  />
              </button>
              <div class="project-avatar" [ngClass]="{ 'project-avatar--without-url': !showAvatar(item) }">
                @if (showAvatar(item)) {
                  <img [src]="item.avatarUrl!" [alt]="item.name" (error)="markAvatarError(item.id)" />
                } @else {
                  {{ avatarText(item.displayCode || item.name) }}
                }
              </div>
              <div class="project-info">
                <div class="project-name">
                  <strong>{{ item.name }}</strong>
                  <a nz-icon nz-tooltip="复制项目Key" (click)="copyProjectKey(item.projectKey)" nzType="copy" nzTheme="outline"></a>
                </div>
                <div class="project-meta">{{ item.description || '暂无项目描述' }}</div>
              </div>
            </div>
            <div class="project-cell">
              <div class="project-type-cell">
                <span class="project-tag" [attr.data-type]="item.projectType">{{ projectTypeLabel(item.projectType) }}</span>
                @if (projectTypeDetail(item); as detail) {
                  <span class="project-cell--muted">{{ detail }}</span>
                }
              </div>
            </div>
            <div class="project-cell">
              <span class="project-member-count">{{ item.memberCount ?? 0 }} 人</span>
            </div>
            <div class="project-cell">
              <span class="project-tag" [attr.data-visibility]="item.visibility">
                {{ item.visibility === 'private' ? '私有' : '内部' }}
              </span>
            </div>
            <div class="project-cell">
              <span class="project-tag" [attr.data-status]="item.status">
                {{ item.status === 'active' ? '活跃' : '归档' }}
              </span>
            </div>
            <div class="project-cell project-cell--muted">{{ item.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</div>
            <div class="project-cell">
              <a nz-button nz-tooltip="编辑" nzType="text" class="project-action" type="button" (click)="edit.emit(item)">
                <nz-icon nzType="edit" nzTheme="outline" />
              </a>
              <a nz-button nz-tooltip="成员" nzType="text" class="project-action" type="button" (click)="manageMembers.emit(item)">
                <nz-icon nzType="team" nzTheme="outline" />
              </a>
              <a nz-button nz-tooltip="项目配置" nzType="text" class="project-action" type="button" (click)="manageConfig.emit(item)">
                <nz-icon nzType="setting" nzTheme="outline" />
              </a>
              @if (item.status === 'active') {
                <a nz-button nz-tooltip="归档" nz-popconfirm="确定要归档该项目吗？" nzType="text" class="project-action" type="button" (nzOnConfirm)="archive.emit(item)">
                  <nz-icon nzType="delete" nzTheme="outline" />
                </a>
              } @else {
                <a nz-button nz-tooltip="恢复" nz-popconfirm="确定要恢复该项目吗？" nzType="text" class="project-action" type="button" (nzOnConfirm)="restore.emit(item)">
                  <nz-icon nzType="reload" nzTheme="outline" />
                </a>
              }
            </div>
          </div>
          <div class="project-row project-row--expanded" [class.project-row--expanded-open]="isExpanded(item.id)">
            <div class="project-expand-wrap">
              <div class="project-expand">
                <div class="project-detail-grid">
                  <div class="project-detail-section">
                    <div class="project-detail-label">项目信息</div>
                    <div class="project-detail-content">
                      <span class="project-type-badge" [attr.data-type]="item.projectType">{{ projectTypeLabel(item.projectType) }}</span>
                      @if (projectTypeDetail(item); as detail) {
                        <span class="project-type-badge">{{ detail }}</span>
                      }
                      <span class="project-type-badge">项目编号 {{ item.projectNo }}</span>
                    </div>
                  </div>
                  <div class="project-detail-section">
                    <div class="project-detail-label">项目成员 ({{ memberItems(item.id).length }}人)</div>
                    @if (isMemberLoading(item.id)) {
                      <div class="project-cell--muted">正在加载成员…</div>
                    } @else if (memberItems(item.id).length === 0) {
                      <div class="project-cell--muted">暂无成员</div>
                    } @else {
                      <div class="project-detail-content project-members-list">
                        @for (member of memberItems(item.id); track member.id) {
                          <div class="project-member-chip">
                            <span class="project-member-avatar">{{ memberInitial(member.displayName) }}</span>
                            <span>{{ member.displayName }}</span>
                            <span class="member-role" [attr.data-role]="memberRoleTone(member)">{{ memberRoleLabel(member) }}</span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
                @if (isModuleLoading(item.id) || subsystemRows(item.id).length > 0) {
                  <div class="project-sub-list">
                    <div class="project-sub-header">
                      <span><nz-icon nzType="cluster" nzTheme="outline" /> 子项目</span>
                      @if (isModuleLoading(item.id)) {
                        <span class="project-cell--muted">正在加载…</span>
                      }
                    </div>
                    @for (subsystem of subsystemRows(item.id); track subsystem.id; let index = $index) {
                      <div class="project-sub-item">
                        <div class="project-sub-left">
                          <div class="project-sub-icon" [attr.data-index]="index">{{ subsystemInitial(subsystem.name) }}</div>
                          <div class="project-sub-info">
                            <div class="project-sub-name">{{ subsystem.name }}</div>
                            <div class="project-sub-meta">{{ subsystem.description || ('包含 ' + subsystem.moduleCount + ' 个模块') }}</div>
                          </div>
                        </div>
                        <div class="project-sub-right">
                          <span class="project-sub-status">进行中</span>
                          <div class="project-sub-progress">
                            <div class="project-sub-progress-bar">
                              <div class="project-sub-progress-bar-fill" [style.width.%]="placeholderProgress(subsystem)"></div>
                            </div>
                            <span class="project-sub-progress-text">{{ placeholderProgress(subsystem) }}%</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </app-data-table>
  `,
  styles: [
    `
      .project-table__head,
      .project-row {
        display: grid;
        grid-template-columns: 2fr 1.1fr 0.7fr 0.8fr 0.8fr 0.9fr 0.9fr;
        gap: 16px;
        align-items: center;
      }
      .project-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .project-row {
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
        transition: background 0.2s ease;
      }
      .project-row:hover {
        background: var(--bg-subtle);
      }
      .project-cell {
        min-width: 0;
        color: var(--text-primary);
      }
      .project-cell--project {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
      }
      .project-expand-btn {
        color: var(--text-muted);
        padding: 0;
        width: 24px;
        min-width: 24px;
        border:none;
        transition: all 0.2s ease;
        nz-icon{
          font-size: 12px;
        }
        &.expanded {
            transform: rotate(90deg);
        }
        
      }
      .project-avatar {
        width: 38px;
        height: 36px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        flex-shrink: 0;
        box-shadow: 0 12px 24px rgba(79, 70, 229, 0.24);
        overflow: hidden;
        &.project-avatar--without-url{
          background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        }
      }
      .project-avatar > img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .project-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .project-name {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        color: var(--text-heading);
      }
      .project-meta,
      .project-cell--muted {
        font-size: 12px;
        color: var(--text-muted);
      }
      .project-tag {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        border: 1px solid transparent;
        font-size: 12px;
        font-weight: 600;
      }
      .project-member-count {
        font-size: 13px;
        color: var(--text-secondary);
        font-weight: 600;
      }
      .project-type-cell {
        display: grid;
        gap: 6px;
        justify-items: start;
      }
      .project-tag[data-type='entrust_dev'] {
        background: rgba(245, 158, 11, 0.14);
        color: #b45309;
      }
      .project-tag[data-type='self_dev'] {
        background: rgba(34, 197, 94, 0.14);
        color: #15803d;
      }
      .project-tag[data-type='tech_service'] {
        background: rgba(14, 165, 233, 0.14);
        color: #0369a1;
      }
      .project-tag[data-status='active'] {
        background: rgba(34, 197, 94, 0.14);
        color: #16a34a;
      }
      .project-tag[data-status='inactive'] {
        background: rgba(239, 68, 68, 0.14);
        color: #dc2626;
      }
      .project-tag[data-visibility='private'] {
        background: rgba(79, 70, 229, 0.14);
        color: var(--primary-600);
      }
      .project-tag[data-visibility='internal'] {
        background: rgba(14, 165, 233, 0.14);
        color: #0284c7;
      }
      .project-action {
        border: 0;
        background: transparent;
        color: var(--primary-600);
        font-weight: 700;
        cursor: pointer;
      }
      .project-row--expanded {
        grid-template-columns: 1fr;
        padding: 0 16px;
        border-top: 0;
      }
      .project-row--expanded:hover {
        background: transparent;
      }
      .project-expand-wrap {
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, padding 0.25s ease;
      }
      .project-row--expanded-open .project-expand-wrap {
        max-height: 1200px;
        opacity: 1;
        padding: 0 0 14px;
      }
      .project-expand {
        border: 1px solid var(--border-color-soft);
        border-radius: 16px;
        padding: 18px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.02), transparent);
        display: grid;
        gap: 16px;
        transform: translateY(-8px);
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .project-row--expanded-open .project-expand {
        transform: translateY(0);
      }
      .project-detail-grid {
        display: grid;
        grid-template-columns: 1fr 1.3fr;
        gap: 18px;
      }
      .project-detail-section {
        display: grid;
        gap: 10px;
      }
      .project-detail-label {
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.2px;
      }
      .project-detail-content {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .project-type-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border: 1px solid var(--border-color-soft);
        border-radius: 14px;
        background: var(--bg-subtle);
        color: var(--text-secondary);
        font-size: 12px;
      }
      .project-type-badge[data-type='entrust_dev'] {
        background: rgba(245, 158, 11, 0.14);
        color: #b45309;
        border-color: transparent;
      }
      .project-type-badge[data-type='self_dev'] {
        background: rgba(34, 197, 94, 0.14);
        color: #15803d;
        border-color: transparent;
      }
      .project-type-badge[data-type='tech_service'] {
        background: rgba(14, 165, 233, 0.14);
        color: #0369a1;
        border-color: transparent;
      }
      .project-members-list {
        gap: 8px;
      }
      .project-member-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px 4px 4px;
        border-radius: 16px;
        border: 1px solid var(--border-color-soft);
        background: var(--bg-panel);
        color: var(--text-secondary);
        font-size: 12px;
      }
      .project-member-avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        color: #fff;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
      }
      .member-role {
        padding: 1px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
      }
      .member-role[data-role='owner'] {
        color: var(--primary-600);
        background: rgba(99, 102, 241, 0.12);
      }
      .member-role[data-role='manager'] {
        color: #0369a1;
        background: rgba(14, 165, 233, 0.15);
      }
      .member-role[data-role='tester'] {
        color: #b45309;
        background: rgba(245, 158, 11, 0.15);
      }
      .member-role[data-role='member'] {
        color: var(--text-muted);
        background: var(--bg-subtle);
      }
      .project-sub-list {
        display: grid;
        gap: 8px;
      }
      .project-sub-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 600;
        padding-bottom: 6px;
      }
      .project-sub-header > span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .project-sub-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
        padding: 12px 14px;
        background: var(--bg-panel);
      }
      .project-sub-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .project-sub-icon {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, #0ea5e9, #0284c7);
        flex-shrink: 0;
      }
      .project-sub-icon[data-index='1'] {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      }
      .project-sub-icon[data-index='2'] {
        background: linear-gradient(135deg, #10b981, #059669);
      }
      .project-sub-info {
        min-width: 0;
      }
      .project-sub-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-heading);
      }
      .project-sub-meta {
        margin-top: 2px;
        font-size: 11px;
        color: var(--text-muted);
      }
      .project-sub-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      .project-sub-status {
        font-size: 11px;
        font-weight: 600;
        color: #0369a1;
        background: rgba(14, 165, 233, 0.12);
        border-radius: 10px;
        padding: 2px 8px;
      }
      .project-sub-progress {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .project-sub-progress-bar {
        width: 64px;
        height: 4px;
        border-radius: 99px;
        background: var(--bg-subtle);
        overflow: hidden;
      }
      .project-sub-progress-bar-fill {
        height: 100%;
        border-radius: 99px;
        background: var(--primary-500);
      }
      .project-sub-progress-text {
        font-size: 11px;
        color: var(--text-muted);
      }
      :host-context(html[data-theme='dark']) .project-tag {
        border-color: rgba(148, 163, 184, 0.16);
      }
      :host-context(html[data-theme='dark']) .project-tag[data-type='entrust_dev'] {
        background: rgba(245, 158, 11, 0.2);
        color: #fcd34d;
      }
      :host-context(html[data-theme='dark']) .project-tag[data-type='self_dev'] {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
      }
      :host-context(html[data-theme='dark']) .project-tag[data-type='tech_service'] {
        background: rgba(14, 165, 233, 0.2);
        color: #7dd3fc;
      }
      :host-context(html[data-theme='dark']) .project-tag[data-status='active'] {
        background: rgba(34, 197, 94, 0.22);
        color: #86efac;
      }
      :host-context(html[data-theme='dark']) .project-tag[data-status='inactive'] {
        background: rgba(239, 68, 68, 0.22);
        color: #fca5a5;
      }
      :host-context(html[data-theme='dark']) .project-tag[data-visibility='private'] {
        background: rgba(99, 102, 241, 0.22);
        color: #c7d2fe;
      }
      :host-context(html[data-theme='dark']) .project-tag[data-visibility='internal'] {
        background: rgba(14, 165, 233, 0.22);
        color: #7dd3fc;
      }
      :host-context(html[data-theme='dark']) .project-expand {
        border-color: rgba(99, 102, 241, 0.22);
        background: linear-gradient(180deg, rgba(99, 102, 241, 0.08), transparent);
      }
      :host-context(html[data-theme='dark']) .project-member-chip {
        border-color: rgba(148, 163, 184, 0.2);
      }
      :host-context(html[data-theme='dark']) .project-type-badge {
        border-color: rgba(148, 163, 184, 0.2);
      }
      :host-context(html[data-theme='dark']) .project-sub-item {
        border-color: rgba(148, 163, 184, 0.2);
      }
      :host-context(html[data-theme='dark']) .project-sub-status {
        color: #7dd3fc;
        background: rgba(14, 165, 233, 0.22);
      }
      @media (max-width: 980px) {
        .project-table__head {
          display: none;
        }
        .project-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .project-detail-grid {
          grid-template-columns: 1fr;
        }
        .project-sub-item {
          flex-wrap: wrap;
          align-items: flex-start;
        }
        .project-sub-right {
          width: 100%;
          justify-content: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListTableComponent {
  private readonly message = inject(NzMessageService);
  private readonly clipboard = inject(Clipboard);
  readonly items = input.required<ProjectSummary[]>();
  readonly expandedProjectIds = input<string[]>([]);
  readonly modulePreviewMap = input<Record<string, ProjectMetaItem[]>>({});
  readonly moduleLoadingIds = input<string[]>([]);
  readonly memberPreviewMap = input<Record<string, ProjectMemberEntity[]>>({});
  readonly memberLoadingIds = input<string[]>([]);
  readonly manageMembers = output<ProjectSummary>();
  readonly edit = output<ProjectSummary>();
  readonly manageConfig = output<ProjectSummary>();
  readonly archive = output<ProjectSummary>();
  readonly restore = output<ProjectSummary>();
  readonly toggleExpand = output<ProjectSummary>();
  private readonly brokenAvatarMap = new Map<string, true>();

  avatarText(name: string): string {
    return name.slice(0, 3).toUpperCase();
  }

  showAvatar(item: ProjectSummary): boolean {
    return !!item.avatarUrl && !this.brokenAvatarMap.has(item.id);
  }

  markAvatarError(projectId: string): void {
    this.brokenAvatarMap.set(projectId, true);
  }

  copyProjectKey(projectKey: string): void {
    const ok = this.clipboard.copy(projectKey);
    if (ok) {
      this.message.success('projectKey 已复制');
    } else {
      this.message.error('复制 projectKey 失败');
    }
  }

  isExpanded(projectId: string): boolean {
    return this.expandedProjectIds().includes(projectId);
  }

  isModuleLoading(projectId: string): boolean {
    return this.moduleLoadingIds().includes(projectId);
  }

  isMemberLoading(projectId: string): boolean {
    return this.memberLoadingIds().includes(projectId);
  }

  projectTypeLabel(type: ProjectType): string {
    return PROJECT_TYPE_LABELS[type] ?? type;
  }

  projectTypeDetail(item: ProjectSummary): string | null {
    const parts = [
      item.contractNo ? `合同 ${item.contractNo}` : null,
      item.deliveryDate ? `交付 ${item.deliveryDate}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  memberItems(projectId: string): ProjectMemberEntity[] {
    return this.memberPreviewMap()[projectId] ?? [];
  }

  memberInitial(name: string): string {
    return (name || '?').slice(0, 1).toUpperCase();
  }

  memberRoleLabel(member: ProjectMemberEntity): string {
    if (member.isOwner) {
      return 'Owner';
    }
    if (member.roleCode === 'project_admin') {
      return 'Manager';
    }
    if (member.roleCode === 'qa') {
      return 'Tester';
    }
    return 'Member';
  }

  memberRoleTone(member: ProjectMemberEntity): 'owner' | 'manager' | 'tester' | 'member' {
    if (member.isOwner) {
      return 'owner';
    }
    if (member.roleCode === 'project_admin') {
      return 'manager';
    }
    if (member.roleCode === 'qa') {
      return 'tester';
    }
    return 'member';
  }

  subsystemInitial(name: string): string {
    return (name || 'S').slice(0, 1).toUpperCase();
  }

  placeholderProgress(_subsystem: { id: string }): number {
    return 60;
  }

  subsystemRows(projectId: string): Array<{ id: string; name: string; description: string | null; moduleCount: number }> {
    const items = this.modulePreviewMap()[projectId] ?? [];
    const moduleCountMap = new Map<string, number>();
    for (const item of items) {
      if (item.nodeType === 'module' && item.parentId) {
        moduleCountMap.set(item.parentId, (moduleCountMap.get(item.parentId) ?? 0) + 1);
      }
    }
    return items
      .filter((item) => item.nodeType === 'subsystem')
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? null,
        moduleCount: moduleCountMap.get(item.id) ?? 0
      }));
  }
}
