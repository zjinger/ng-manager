import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogShellComponent, EmptyStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import type { CreateSystemTitleInput, SystemTitleEntity, UpdateSystemTitleInput } from '../../models/system-title.model';
import { SystemTitleApiService } from '../../services/system-title-api.service';

@Component({
  selector: 'app-title-form-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell [open]="open()" [width]="560" [title]="mode() === 'create' ? '新建职务' : '编辑职务'" icon="idcard" (cancel)="cancel.emit()">
      <div dialog-body class="title-form">
        <label>职务名称 *</label>
        <input nz-input [ngModel]="draftName()" (ngModelChange)="draftName.set($event || '')" />
        <label>职务编码 *</label>
        <input nz-input [ngModel]="draftCode()" [disabled]="mode() === 'edit'" (ngModelChange)="draftCode.set(($event || '').toLowerCase())" />
        <div class="title-form__grid">
          <div>
            <label>状态</label>
            <nz-select [ngModel]="draftStatus()" (ngModelChange)="draftStatus.set($event || 'active')">
              <nz-option nzLabel="启用" nzValue="active" />
              <nz-option nzLabel="停用" nzValue="inactive" />
            </nz-select>
          </div>
          <div>
            <label>排序</label>
            <input nz-input type="number" [ngModel]="draftSort()" (ngModelChange)="draftSort.set(+$event || 0)" />
          </div>
        </div>
        <label>备注</label>
        <input nz-input [ngModel]="draftRemark()" (ngModelChange)="draftRemark.set($event || '')" />
      </div>
      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" type="button" [disabled]="!canSubmit()" (click)="submit()">{{ mode() === 'create' ? '创建' : '保存' }}</button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [`
    .title-form { display: grid; gap: 10px; }
    .title-form label { font-size: 12px; color: var(--text-muted); }
    .title-form__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleFormDialogComponent {
  readonly open = input(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly initial = input<SystemTitleEntity | null>(null);
  readonly cancel = output<void>();
  readonly save = output<CreateSystemTitleInput | UpdateSystemTitleInput>();

  readonly draftCode = signal('');
  readonly draftName = signal('');
  readonly draftStatus = signal<'active' | 'inactive'>('active');
  readonly draftSort = signal(0);
  readonly draftRemark = signal('');

  constructor() {
    effect(() => {
      const source = this.initial();
      const open = this.open();
      const mode = this.mode();
      if (!open) {
        return;
      }
      this.draftCode.set(source?.code ?? '');
      this.draftName.set(source?.name ?? '');
      this.draftStatus.set(source?.status ?? 'active');
      this.draftSort.set(source?.sort ?? 0);
      this.draftRemark.set(source?.remark ?? '');
      if (mode === 'create' && !source) {
        this.draftStatus.set('active');
      }
    });
  }

  canSubmit(): boolean {
    return !!this.draftName().trim() && !!this.draftCode().trim();
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.save.emit({
      code: this.draftCode().trim(),
      name: this.draftName().trim(),
      status: this.draftStatus(),
      sort: this.draftSort(),
      remark: this.draftRemark().trim() || null,
    });
  }
}

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
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    EmptyStateComponent,
    TitleFormDialogComponent,
  ],
  template: `
    <app-page-header title="职务管理" [subtitle]="subtitle()" />
    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="openCreate()"> <nz-icon nzType="plus" /> 新建职务 </button>
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
  readonly subtitle = computed(() => `共 ${this.items().length} 个职务`);

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
