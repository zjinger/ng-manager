import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TitleFormDialogComponent } from '../../components/title-form-dialog/title-form-dialog.component';
import type { CreateSystemTitleInput, SystemTitleEntity, UpdateSystemTitleInput } from '../../models/system-title.model';
import { SystemTitleApiService } from '../../services/system-title-api.service';

@Component({
  selector: 'app-titles-page',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzTagModule,
    RouterLink,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    EmptyStateComponent,
    TitleFormDialogComponent,
  ],
  template: `
    <app-page-header title="全局职务库" [subtitle]="subtitle()" />
    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="openCreate()"> <nz-icon nzType="plus" /> 新建职务 </button>
      <a nz-button routerLink="/admin/departments">前往部门组织</a>
      <nz-select toolbar-filters style="width: 140px" [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)">
        <nz-option nzLabel="全部状态" nzValue="" />
        <nz-option nzLabel="启用中" nzValue="active" />
        <nz-option nzLabel="已停用" nzValue="inactive" />
      </nz-select>
      <app-search-box toolbar-search placeholder="搜索职务名称或编码" [value]="keyword()" (valueChange)="keyword.set($event)" (submitted)="load()" />
    </app-page-toolbar>

    @if (items().length === 0) {
      <app-empty-state title="暂无职务" description="点击新建职务开始维护" icon="idcard" />
    } @else {
      <div class="table">
        <div class="table__head"><span>名称</span><span>编码</span><span>状态</span><span>排序</span><span>更新时间</span><span>操作</span></div>
        @for (item of items(); track item.id) {
          <div class="table__row">
            <span>{{ item.name }}</span>
            <span class="mono">{{ item.code }}</span>
            <span><nz-tag [nzColor]="item.status === 'active' ? 'green' : 'default'">{{ item.status === 'active' ? '启用' : '停用' }}</nz-tag></span>
            <span>{{ item.sort }}</span>
            <span>{{ item.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
            <span class="actions">
              <button nz-button nzSize="small" (click)="openEdit(item)">编辑</button>
              <button nz-button nzSize="small" (click)="toggleStatus(item)">{{ item.status === 'active' ? '停用' : '启用' }}</button>
              <button nz-button nzSize="small" nzDanger nz-popconfirm nzPopconfirmTitle="确认删除该职务？" (nzOnConfirm)="remove(item)">删除</button>
            </span>
          </div>
        }
      </div>
    }

    <app-title-form-dialog
      [open]="dialogOpen()"
      [mode]="dialogMode()"
      [initial]="editing()"
      (cancel)="closeDialog()"
      (save)="saveTitle($event)"
    />
  `,
  styles: [`
    .table { border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: var(--bg-container); }
    .table__head, .table__row { display: grid; grid-template-columns: 1fr 1fr 110px 90px 170px 220px; gap: 12px; align-items: center; padding: 12px 16px; }
    .table__head { font-size: 12px; color: var(--text-muted); background: var(--bg-subtle); font-weight: 700; }
    .table__row { border-top: 1px solid var(--border-color-soft); }
    .actions { display: inline-flex; gap: 8px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitlesPageComponent {
  private readonly api = inject(SystemTitleApiService);
  private readonly message = inject(NzMessageService);

  readonly items = signal<SystemTitleEntity[]>([]);
  readonly keyword = signal('');
  readonly statusFilter = signal('');
  readonly dialogOpen = signal(false);
  readonly dialogMode = signal<'create' | 'edit'>('create');
  readonly editing = signal<SystemTitleEntity | null>(null);
  readonly subtitle = computed(() => `全公司共 ${this.items().length} 个职务，用于部门岗位关联和用户职位选择`);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.listTitles({ keyword: this.keyword().trim() || undefined, status: this.statusFilter() || undefined }).subscribe({
      next: (items) => this.items.set(items),
      error: () => this.message.error('加载职务失败'),
    });
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.load();
  }

  openCreate(): void {
    this.dialogMode.set('create');
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(item: SystemTitleEntity): void {
    this.dialogMode.set('edit');
    this.editing.set(item);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  saveTitle(payload: CreateSystemTitleInput | UpdateSystemTitleInput): void {
    if (this.dialogMode() === 'create') {
      this.api.createTitle(payload as CreateSystemTitleInput).subscribe({
        next: () => {
          this.message.success('职务创建成功');
          this.closeDialog();
          this.load();
        },
        error: () => this.message.error('创建职务失败'),
      });
      return;
    }
    const target = this.editing();
    if (!target) {
      return;
    }
    this.api.updateTitle(target.id, payload as UpdateSystemTitleInput).subscribe({
      next: () => {
        this.message.success('职务更新成功');
        this.closeDialog();
        this.load();
      },
      error: () => this.message.error('更新职务失败'),
    });
  }

  toggleStatus(item: SystemTitleEntity): void {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';
    this.api.updateTitle(item.id, { status: nextStatus }).subscribe({
      next: () => {
        this.message.success(nextStatus === 'active' ? '已启用职务' : '已停用职务');
        this.load();
      },
      error: () => this.message.error('更新职务状态失败'),
    });
  }

  remove(item: SystemTitleEntity): void {
    this.api.deleteTitle(item.id).subscribe({
      next: () => {
        this.message.success('职务已删除');
        this.load();
      },
      error: () => this.message.error('删除职务失败（可能已被用户引用）'),
    });
  }
}
