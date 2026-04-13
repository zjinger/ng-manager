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
            <div class="project-cell project-cell--project">
              <button nz-button nzType="text" class="project-expand-btn" type="button" (click)="toggleExpand.emit(item)">
                <nz-icon [nzType]="isExpanded(item.id) ? 'down' : 'right'" nzTheme="outline" />
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
          @if (isExpanded(item.id)) {
            <div class="project-row project-row--expanded">
              <div class="project-expand">
                <div class="project-expand__summary">
                  <div class="project-expand__meta">
                    <span class="project-expand__label">项目类型</span>
                    <strong>{{ projectTypeLabel(item.projectType) }}</strong>
                    @if (projectTypeDetail(item); as detail) {
                      <span class="project-expand__detail">{{ detail }}</span>
                    }
                  </div>
                  <div class="project-expand__meta project-expand__meta--members">
                    <span class="project-expand__label">项目成员</span>
                    @if (isMemberLoading(item.id)) {
                      <span class="project-cell--muted">正在加载…</span>
                    } @else if (memberItems(item.id).length === 0) {
                      <span class="project-cell--muted">暂无成员</span>
                    } @else {
                      <div class="project-expand__members">
                        @for (member of memberItems(item.id); track member.id) {
                          <span class="project-member-pill">
                            {{ member.displayName }}
                            @if (member.isOwner) {
                              <span class="project-member-pill__owner">负责人</span>
                            }
                          </span>
                        }
                      </div>
                    }
                  </div>
                </div>
                @if (isModuleLoading(item.id) || subsystemRows(item.id).length > 0) {
                  <div class="project-expand__section">
                    <div class="project-expand__section-head">
                      <!-- <strong>子项目(系统)</strong> -->
                      @if (isModuleLoading(item.id)) {
                        <span class="project-cell--muted">正在加载…</span>
                      }
                    </div>
                    @if (subsystemRows(item.id).length > 0) {
                      <div class="project-expand__subsystems">
                        @for (subsystem of subsystemRows(item.id); track subsystem.id) {
                          <div class="project-subsystem-row">
                            <strong>{{ subsystem.name }}</strong>
                            <span>{{ subsystem.moduleCount }} 个模块</span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
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
      }
      .project-expand-btn {
        color: var(--text-muted);
        padding: 0;
        width: 24px;
        min-width: 24px;
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
        padding-top: 0;
      }
      .project-expand {
        border: 1px solid var(--border-color-soft);
        border-radius: 16px;
        padding: 16px 18px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.02), transparent);
        display: grid;
        gap: 16px;
      }
      .project-expand__summary {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
      }
      .project-expand__meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .project-expand__meta--members {
        flex: 1;
      }
      .project-expand__label {
        font-size: 12px;
        color: var(--text-muted);
      }
      .project-expand__detail {
        font-size: 12px;
        color: var(--text-secondary);
      }
      .project-expand__members {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .project-member-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border-radius: 999px;
        background: var(--bg-subtle);
        color: var(--text-secondary);
        font-size: 12px;
      }
      .project-member-pill__owner {
        font-size: 11px;
        color: var(--primary-600);
        font-weight: 600;
      }
      .project-expand__section {
        display: grid;
        gap: 12px;
      }
      .project-expand__section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .project-expand__subsystems {
        display: grid;
        gap: 8px;
      }
      .project-subsystem-row {
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: var(--bg-panel);
      }
      .project-subsystem-row strong {
        color: var(--text-heading);
      }
      .project-subsystem-row span {
        font-size: 12px;
        color: var(--text-muted);
      }
      .project-expand__empty {
        color: var(--text-muted);
        font-size: 13px;
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
      @media (max-width: 980px) {
        .project-table__head {
          display: none;
        }
        .project-row {
          grid-template-columns: 1fr;
          gap: 8px;
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

  subsystemRows(projectId: string): Array<{ id: string; name: string; moduleCount: number }> {
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
        moduleCount: moduleCountMap.get(item.id) ?? 0
      }));
  }
}
