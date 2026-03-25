import { DatePipe } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { DataTableComponent } from '@shared/ui';
import type { ProjectSummary } from '../../models/project.model';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzButtonComponent, NzButtonModule } from "ng-zorro-antd/button";
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-project-list-table',
  standalone: true,
  imports: [DatePipe, ClipboardModule, DataTableComponent, NzButtonModule, NzIconModule, NzTooltipModule, NzButtonComponent, NzPopconfirmModule],
  template: `
    <app-data-table>
      <div table-head class="project-table__head">
        <div>项目</div>
        <div>可见性</div>
        <div>状态</div>
        <div>更新时间</div>
        <div>操作</div>
      </div>
      <div table-body class="project-table__body">
        @for (item of items(); track item.id) {
          <div class="project-row">
            <div class="project-cell project-cell--project">
              <div class="project-avatar">
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
                <nz-icon nzType="setting" nzTheme="outline"/>
              </a> 
              @if(item.status === 'active'){
                <a nz-button nz-tooltip="归档" nz-popconfirm="确定要归档该项目吗？" nzType="text" class="project-action" type="button" (nzOnConfirm)="archive.emit(item)">
                  <nz-icon nzType="delete" nzTheme="outline" />
                </a> 
              }@else {
                <a nz-button nz-tooltip="恢复" nz-popconfirm="确定要恢复该项目吗？" nzType="text" class="project-action" type="button" (nzOnConfirm)="restore.emit(item)">  
                  <nz-icon nzType="reload" nzTheme="outline" />
                </a>
              }
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
        grid-template-columns: 2fr 0.9fr 0.8fr 0.8fr 0.9fr 0.6fr;
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
      .project-avatar {
        width: 38px;
        height: 36px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        flex-shrink: 0;
        box-shadow: 0 12px 24px rgba(79, 70, 229, 0.24);
        overflow: hidden;
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
      :host-context(html[data-theme='dark']) .project-tag {
        border-color: rgba(148, 163, 184, 0.16);
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
  readonly manageMembers = output<ProjectSummary>();
  readonly edit = output<ProjectSummary>();
  readonly manageConfig = output<ProjectSummary>();
  readonly archive = output<ProjectSummary>();
  readonly restore = output<ProjectSummary>();
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
}
