import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogShellComponent, EmptyStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import type {
  CreateSystemPermissionInput,
  SystemPermissionEntity,
  UpdateSystemPermissionInput
} from '../../models/system-rbac.model';
import { SystemRbacApiService } from '../../services/system-rbac-api.service';

@Component({
  selector: 'app-permission-item-form-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell [open]="open()" [width]="620" [title]="mode() === 'create' ? '新建权限项' : '编辑权限项'" icon="key" (cancel)="cancel.emit()">
      <div dialog-body class="permission-form-dialog">
        <form nz-form [nzLayout]="'vertical'">
          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>权限名称</nz-form-label>
                <nz-form-control>
                  <input nz-input [ngModel]="draftName()" name="name" (ngModelChange)="draftName.set($event || '')" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>权限编码</nz-form-label>
                <nz-form-control>
                  <input nz-input [ngModel]="draftCode()" name="code" [disabled]="mode() === 'edit'" (ngModelChange)="draftCode.set($event || '')" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>分组编码</nz-form-label>
                <nz-form-control>
                  <input nz-input [ngModel]="draftGroupCode()" name="groupCode" (ngModelChange)="draftGroupCode.set($event || '')" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzRequired>分组名称</nz-form-label>
                <nz-form-control>
                  <input nz-input [ngModel]="draftGroupName()" name="groupName" (ngModelChange)="draftGroupName.set($event || '')" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label>状态</nz-form-label>
                <nz-form-control>
                  <nz-select [ngModel]="draftStatus()" name="status" (ngModelChange)="draftStatus.set($event || 'active')">
                    <nz-option nzLabel="启用" nzValue="active" />
                    <nz-option nzLabel="停用" nzValue="inactive" />
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label>排序</nz-form-label>
                <nz-form-control>
                  <input nz-input type="number" [ngModel]="draftSort()" name="sort" (ngModelChange)="draftSort.set(+$event || 0)" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <nz-form-item>
            <nz-form-label>描述</nz-form-label>
            <nz-form-control>
              <textarea rows="3" nz-input [ngModel]="draftDescription()" name="description" (ngModelChange)="draftDescription.set($event || '')"></textarea>
            </nz-form-control>
          </nz-form-item>
        </form>
      </div>
      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" type="button" [disabled]="!canSubmit()" (click)="submit()">保存</button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [`
    .permission-form-dialog {
      display: grid;
      gap: 8px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionItemFormDialogComponent {
  readonly open = input(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly initial = input<SystemPermissionEntity | null>(null);
  readonly cancel = output<void>();
  readonly save = output<CreateSystemPermissionInput | UpdateSystemPermissionInput>();

  readonly draftCode = signal('');
  readonly draftName = signal('');
  readonly draftStatus = signal<'active' | 'inactive'>('active');
  readonly draftGroupCode = signal('');
  readonly draftGroupName = signal('');
  readonly draftDomainCode = signal('admin');
  readonly draftDomainName = signal('后台管理');
  readonly draftDescription = signal('');
  readonly draftSort = signal(0);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const p = this.initial();
      this.draftCode.set(p?.code ?? '');
      this.draftName.set(p?.name ?? '');
      this.draftStatus.set(p?.status ?? 'active');
      this.draftGroupCode.set(p?.groupCode ?? '');
      this.draftGroupName.set(p?.groupName ?? '');
      this.draftDomainCode.set(p?.domainCode ?? 'admin');
      this.draftDomainName.set(p?.domainName ?? '后台管理');
      this.draftDescription.set(p?.description ?? '');
      this.draftSort.set(p?.sort ?? 0);
    });
  }

  canSubmit(): boolean {
    return !!this.draftName().trim() && !!this.draftCode().trim() && !!this.draftGroupCode().trim() && !!this.draftGroupName().trim();
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.save.emit({
      code: this.draftCode().trim(),
      name: this.draftName().trim(),
      status: this.draftStatus(),
      groupCode: this.draftGroupCode().trim(),
      groupName: this.draftGroupName().trim(),
      domainCode: this.draftDomainCode().trim() || 'admin',
      domainName: this.draftDomainName().trim() || '后台管理',
      description: this.draftDescription().trim() || null,
      sort: this.draftSort()
    });
  }
}

@Component({
  selector: 'app-permission-items-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzTagModule,
    NzPopconfirmModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    EmptyStateComponent,
    PermissionItemFormDialogComponent
  ],
  template: `
    <app-page-header title="权限项管理" [subtitle]="'共 ' + items().length + ' 项权限'" />
    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="openCreate()"><nz-icon nzType="plus" /> 新建权限项</button>
      <nz-select toolbar-filters style="width: 140px" [ngModel]="status()" (ngModelChange)="setStatus($event)">
        <nz-option nzLabel="全部状态" nzValue="" />
        <nz-option nzLabel="启用中" nzValue="active" />
        <nz-option nzLabel="已停用" nzValue="inactive" />
      </nz-select>
      <app-search-box toolbar-search placeholder="搜索权限名称、编码、分组" [value]="keyword()" (valueChange)="keyword.set($event)" (submitted)="load()" />
    </app-page-toolbar>

    @if (items().length === 0) {
      <app-empty-state title="暂无权限项" description="请新建权限项" icon="key" />
    } @else {
      <div class="table">
        <div class="head"><span>权限项</span><span>编码</span><span>分组</span><span>状态</span><span>操作</span></div>
        @for (item of items(); track item.id) {
          <div class="row">
            <span>{{ item.name }}</span>
            <span class="mono">{{ item.code }}</span>
            <span>{{ item.groupName }}</span>
            <span><nz-tag [nzColor]="item.status === 'active' ? 'green' : 'default'">{{ item.status === 'active' ? '启用' : '停用' }}</nz-tag></span>
            <span class="actions">
              <button nz-button nzSize="small" (click)="openEdit(item)">编辑</button>
              <button nz-button nzSize="small" (click)="toggleStatus(item)" [disabled]="item.isBuiltin">{{ item.status === 'active' ? '停用' : '启用' }}</button>
              <button nz-button nzDanger nzSize="small" nz-popconfirm nzPopconfirmTitle="确认删除该权限项？" [disabled]="item.isBuiltin" (nzOnConfirm)="remove(item)">删除</button>
            </span>
          </div>
        }
      </div>
    }

    <app-permission-item-form-dialog
      [open]="dialogOpen()"
      [mode]="dialogMode()"
      [initial]="editing()"
      (cancel)="closeDialog()"
      (save)="save($event)"
    />
  `,
  styles: [`
    .table { border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: var(--bg-container); }
    .head,.row { display: grid; grid-template-columns: 1.1fr 1.4fr 1fr 120px 220px; gap: 10px; align-items: center; padding: 12px 16px; }
    .head { font-size: 12px; color: var(--text-muted); font-weight: 700; background: var(--bg-subtle); }
    .row { border-top: 1px solid var(--border-color-soft); }
    .actions { display: inline-flex; gap: 8px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionItemsPageComponent {
  private readonly api = inject(SystemRbacApiService);
  private readonly message = inject(NzMessageService);

  readonly items = signal<SystemPermissionEntity[]>([]);
  readonly keyword = signal('');
  readonly status = signal('');
  readonly dialogOpen = signal(false);
  readonly dialogMode = signal<'create' | 'edit'>('create');
  readonly editing = signal<SystemPermissionEntity | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.listPermissions({ keyword: this.keyword().trim() || undefined, status: this.status() || undefined }).subscribe({
      next: (items) => this.items.set(items),
      error: () => this.message.error('加载权限项失败')
    });
  }

  setStatus(status: string): void {
    this.status.set(status);
    this.load();
  }

  openCreate(): void {
    this.dialogMode.set('create');
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(item: SystemPermissionEntity): void {
    this.dialogMode.set('edit');
    this.editing.set(item);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  save(payload: CreateSystemPermissionInput | UpdateSystemPermissionInput): void {
    if (this.dialogMode() === 'create') {
      this.api.createPermission(payload as CreateSystemPermissionInput).subscribe({
        next: () => {
          this.message.success('权限项创建成功');
          this.closeDialog();
          this.load();
        },
        error: () => this.message.error('创建权限项失败')
      });
      return;
    }
    const target = this.editing();
    if (!target) return;
    this.api.updatePermission(target.id, payload as UpdateSystemPermissionInput).subscribe({
      next: () => {
        this.message.success('权限项更新成功');
        this.closeDialog();
        this.load();
      },
      error: () => this.message.error('更新权限项失败')
    });
  }

  toggleStatus(item: SystemPermissionEntity): void {
    const status = item.status === 'active' ? 'inactive' : 'active';
    this.api.updatePermission(item.id, { status }).subscribe({
      next: () => {
        this.message.success(status === 'active' ? '权限项已启用' : '权限项已停用');
        this.load();
      },
      error: () => this.message.error('更新权限项状态失败')
    });
  }

  remove(item: SystemPermissionEntity): void {
    this.api.deletePermission(item.id).subscribe({
      next: () => {
        this.message.success('权限项已删除');
        this.load();
      },
      error: () => this.message.error('删除权限项失败（可能已被角色使用）')
    });
  }
}
