import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import type {
  CreateRdTaskSheetDefaultRouteInput,
  RdTaskSheetDefaultRouteEntity,
  RdTaskSheetDefaultRouteStatus,
  UpdateRdTaskSheetDefaultRouteInput,
} from '../../models/rd-task-sheet-config.model';
import { RdTaskSheetConfigApiService } from '../../services/rd-task-sheet-config-api.service';
import { TaskSheetDefaultRouteDialogComponent } from '../../dialogs/task-sheet-default-route-dialog/task-sheet-default-route-dialog.component';

@Component({
  selector: 'app-task-sheet-resources-page',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTagModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    EmptyStateComponent,
    TaskSheetDefaultRouteDialogComponent,
  ],
  template: `
    <app-page-header title="任务单配置" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="openCreate()">
        <nz-icon nzType="plus" />
        新建默认关系
      </button>
      <nz-select toolbar-filters style="width: 140px" [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)">
        <nz-option nzLabel="全部状态" nzValue="" />
        <nz-option nzLabel="启用中" nzValue="active" />
        <nz-option nzLabel="已停用" nzValue="inactive" />
      </nz-select>
      <app-search-box
        toolbar-search
        placeholder="搜索发起人、接收人或部门"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="loadRoutes()"
      />
    </app-page-toolbar>

    @if (routes().length === 0) {
      <app-empty-state title="暂无任务单配置" description="维护发起人到默认接收人的带入关系" icon="schedule" />
    } @else {
      <div class="table">
        <div class="table__head">
          <span>发起信息</span>
          <span>默认接收信息</span>
          <span>状态</span>
          <span>排序</span>
          <span>更新时间</span>
          <span>操作</span>
        </div>
        @for (item of routes(); track item.id) {
          <div class="table__row">
            <span class="cell-main">
              <strong>{{ item.issuerName || '-' }}</strong>
              <small>{{ item.issuerDepartment || '-' }}</small>
            </span>
            <span class="cell-main">
              <strong>{{ item.receiverName || '-' }}</strong>
              <small>{{ item.receiverDepartment || '-' }}{{ item.receiverPhone ? ' / ' + item.receiverPhone : '' }}</small>
            </span>
            <span>
              <nz-tag [nzColor]="item.status === 'active' ? 'green' : 'default'">{{ item.status === 'active' ? '启用' : '停用' }}</nz-tag>
            </span>
            <span>{{ item.sort }}</span>
            <span>{{ item.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
            <span class="actions">
              <button nz-button nzSize="small" (click)="openEdit(item)">编辑</button>
              <button nz-button nzSize="small" (click)="toggleStatus(item)">{{ item.status === 'active' ? '停用' : '启用' }}</button>
              <button
                nz-button
                nzSize="small"
                nzDanger
                nz-popconfirm
                nzPopconfirmTitle="确认删除该默认关系？"
                (nzOnConfirm)="remove(item)"
              >
                删除
              </button>
            </span>
          </div>
        }
      </div>
    }

    <app-task-sheet-default-route-dialog
      [open]="dialogOpen()"
      [busy]="busy()"
      [initial]="editing()"
      (cancel)="closeDialog()"
      (save)="saveRoute($event)"
    />
  `,
  styles: [
    `
      .table {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
        background: var(--bg-container);
      }
      .table__head,
      .table__row {
        display: grid;
        grid-template-columns: minmax(180px, 1.2fr) minmax(220px, 1.4fr) 90px 80px 170px 220px;
        gap: 12px;
        align-items: center;
        padding: 12px 16px;
      }
      .table__head {
        font-size: 12px;
        color: var(--text-muted);
        background: var(--bg-subtle);
        font-weight: 700;
      }
      .table__row {
        border-top: 1px solid var(--border-color-soft);
      }
      .cell-main {
        display: grid;
        gap: 4px;
        min-width: 0;
      }
      .cell-main strong,
      .cell-main small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cell-main small {
        color: var(--text-muted);
      }
      .actions {
        display: inline-flex;
        gap: 8px;
      }
      @media (max-width: 980px) {
        .table__head {
          display: none;
        }
        .table__row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskSheetResourcesPageComponent {
  private readonly api = inject(RdTaskSheetConfigApiService);
  private readonly message = inject(NzMessageService);

  readonly routes = signal<RdTaskSheetDefaultRouteEntity[]>([]);
  readonly keyword = signal('');
  readonly statusFilter = signal<RdTaskSheetDefaultRouteStatus | ''>('');
  readonly dialogOpen = signal(false);
  readonly editing = signal<RdTaskSheetDefaultRouteEntity | null>(null);
  readonly busy = signal(false);
  readonly subtitle = computed(() => `共 ${this.routes().length} 条默认关系，用于新建任务单时自动带入接收信息`);

  constructor() {
    this.loadRoutes();
  }

  loadRoutes(): void {
    this.api
      .listDefaultRoutes({
        keyword: this.keyword().trim() || undefined,
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: (items) => this.routes.set(items),
        error: () => this.message.error('加载任务单配置失败'),
      });
  }

  setStatusFilter(value: RdTaskSheetDefaultRouteStatus | ''): void {
    this.statusFilter.set(value);
    this.loadRoutes();
  }

  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(item: RdTaskSheetDefaultRouteEntity): void {
    this.editing.set(item);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  saveRoute(payload: CreateRdTaskSheetDefaultRouteInput | UpdateRdTaskSheetDefaultRouteInput): void {
    const editing = this.editing();
    this.busy.set(true);
    const request = editing
      ? this.api.updateDefaultRoute(editing.id, payload as UpdateRdTaskSheetDefaultRouteInput)
      : this.api.createDefaultRoute(payload as CreateRdTaskSheetDefaultRouteInput);
    request.subscribe({
      next: () => {
        this.message.success(editing ? '任务单配置已更新' : '任务单配置已创建');
        this.busy.set(false);
        this.closeDialog();
        this.loadRoutes();
      },
      error: () => {
        this.busy.set(false);
        this.message.error(editing ? '更新任务单配置失败' : '创建任务单配置失败');
      },
    });
  }

  toggleStatus(item: RdTaskSheetDefaultRouteEntity): void {
    const nextStatus: RdTaskSheetDefaultRouteStatus = item.status === 'active' ? 'inactive' : 'active';
    this.api.updateDefaultRoute(item.id, { status: nextStatus }).subscribe({
      next: () => {
        this.message.success(nextStatus === 'active' ? '已启用默认关系' : '已停用默认关系');
        this.loadRoutes();
      },
      error: () => this.message.error('更新任务单配置状态失败'),
    });
  }

  remove(item: RdTaskSheetDefaultRouteEntity): void {
    this.api.deleteDefaultRoute(item.id).subscribe({
      next: () => {
        this.message.success('任务单配置已删除');
        this.loadRoutes();
      },
      error: () => this.message.error('删除任务单配置失败'),
    });
  }

}
