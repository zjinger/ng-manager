import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DialogShellComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { DepartmentFormDialogComponent } from '../../dialogs/department-form-dialog/department-form-dialog.component';
import type {
  CreateDepartmentInput,
  DepartmentEntity,
  DepartmentTitleEntity,
  DepartmentTitleInput,
  DepartmentTreeNode,
  UpdateDepartmentInput
} from '../../models/organization.model';
import { OrganizationApiService } from '../../services/organization-api.service';
import type { UserEntity } from '../../../users/models/user.model';
import { UserApiService } from '../../../users/services/user-api.service';
import { TitleFormDialogComponent } from '../../../admin/components/title-form-dialog/title-form-dialog.component';
import { SystemTitleApiService } from '../../../admin/services/system-title-api.service';
import type { CreateSystemTitleInput, SystemTitleEntity, UpdateSystemTitleInput } from '../../../admin/models/system-title.model';

type FlatDepartmentNode = DepartmentTreeNode & {
  level: number;
};

@Component({
  selector: 'app-department-title-attach-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell [open]="open()" [width]="520" title="关联已有岗位" icon="link" (cancel)="cancel.emit()">
      <div dialog-body>
        <form nz-form [nzLayout]="'vertical'" class="title-attach-form">
          <nz-form-item>
            <nz-form-label nzRequired nzFor="existingTitleCode">岗位</nz-form-label>
            <nz-form-control nzErrorTip="请选择岗位">
              <nz-select
                nzShowSearch
                nzPlaceHolder="请选择全局职务"
                [ngModel]="titleCode()"
                name="existingTitleCode"
                (ngModelChange)="titleCode.set($event || '')"
              >
                @for (item of options(); track item.code) {
                  <nz-option [nzLabel]="item.name + ' / ' + item.code" [nzValue]="item.code"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzFor="existingTitleSort">排序</nz-form-label>
            <nz-form-control>
              <input
                id="existingTitleSort"
                nz-input
                type="number"
                [ngModel]="sort()"
                name="existingTitleSort"
                (ngModelChange)="sort.set(+$event || 0)"
              />
            </nz-form-control>
          </nz-form-item>
        </form>
      </div>
      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" type="button" [disabled]="!titleCode()" (click)="submit()">关联</button>
      </ng-container>
    </app-dialog-shell>
  `,
})
export class DepartmentTitleAttachDialogComponent {
  readonly open = input(false);
  readonly options = input<SystemTitleEntity[]>([]);
  readonly cancel = output<void>();
  readonly save = output<DepartmentTitleInput>();

  readonly titleCode = signal('');
  readonly sort = signal(0);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.titleCode.set('');
      this.sort.set(0);
    });
  }

  submit(): void {
    const titleCode = this.titleCode().trim();
    if (!titleCode) {
      return;
    }
    this.save.emit({
      titleCode,
      sort: this.sort(),
    });
  }
}

@Component({
  selector: 'app-organization-page',
  imports: [
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTagModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    DepartmentFormDialogComponent,
    DepartmentTitleAttachDialogComponent,
    TitleFormDialogComponent
  ],
  template: `
    <app-page-header title="部门组织" subtitle="管理公司组织架构、部门层级和人员分配" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="startCreateDepartment()">
        <nz-icon nzType="plus" nzTheme="outline" />
        新建部门
      </button>
      <app-search-box
        toolbar-search
        placeholder="搜索部门名称或编码"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="loadDepartments()"
      />
    </app-page-toolbar>

    <section class="department-layout">
      <aside class="department-card department-tree-card">
        <header class="department-card__header">
          <h2>组织架构</h2>
          <span>{{ flatTree().length }} 个部门</span>
        </header>
        <div class="department-tree">
          @for (node of flatTree(); track node.id) {
            <button
              type="button"
              class="tree-item"
              [class.is-active]="selectedDepartmentId() === node.id"
              [style.padding-left.px]="12 + node.level * 18"
              (click)="selectDepartment(node.id)"
            >
              <span class="tree-item__icon" nz-icon [nzType]="node.children.length ? 'cluster' : 'apartment'"></span>
              <span class="tree-item__name">{{ node.name }}</span>
              <span class="tree-item__meta">{{ childCount(node.id) }}</span>
            </button>
          } @empty {
            <div class="empty-state">当前没有部门</div>
          }
        </div>
      </aside>

      <div class="department-main">
        <section class="department-card">
          <header class="department-card__header">
            <h2>
              <span nz-icon nzType="bank"></span>
              {{ selectedDepartment()?.name || '请选择部门' }}
            </h2>
            <div class="department-actions">
              @if (selectedDepartment()) {
                <button nz-button (click)="editDepartment(selectedDepartment()!)">
                  <span nz-icon nzType="edit"></span>
                  编辑
                </button>
                <button nz-button nzType="primary" (click)="startCreateChildDepartment(selectedDepartment()!)">
                  <span nz-icon nzType="plus"></span>
                  添加子部门
                </button>
              }
            </div>
          </header>

          @if (selectedDepartment(); as department) {
            <div class="department-info-grid">
              <div class="department-info-item">
                <span>部门编号</span>
                <strong>{{ department.code }}</strong>
              </div>
              <div class="department-info-item">
                <span>成员总数</span>
                <strong>{{ memberTotal() }} 人</strong>
              </div>
              <div class="department-info-item">
                <span>下级部门</span>
                <strong>{{ childCount(department.id) }} 个</strong>
              </div>
              <div class="department-info-item">
                <span>创建时间</span>
                <strong>{{ formatDate(department.createdAt) }}</strong>
              </div>
              <div class="department-info-item">
                <span>状态</span>
                <strong class="status-text" [class.status-text--inactive]="department.status === 'inactive'">
                  {{ department.status === 'active' ? '启用' : '停用' }}
                </strong>
              </div>
              <div class="department-info-item">
                <span>部门负责人</span>
                <strong>{{ department.managerUser?.displayName || department.managerUser?.username || '未设置' }}</strong>
              </div>
              <div class="department-info-item department-info-item--wide">
                <span>部门描述</span>
                <strong>{{ department.description || '未填写' }}</strong>
              </div>
            </div>
          } @else {
            <div class="empty-state">从左侧选择一个部门查看详情</div>
          }
        </section>

        <section class="department-card">
          <header class="department-card__header">
            <h2>部门岗位 <span>{{ departmentTitles().length }}</span></h2>
            <div class="department-actions">
              @if (selectedDepartment()) {
                <button nz-button (click)="openAttachTitleDialog()">
                  <span nz-icon nzType="link"></span>
                  关联岗位
                </button>
                <button nz-button nzType="primary" (click)="openQuickCreateTitleDialog()">
                  <span nz-icon nzType="plus"></span>
                  新增岗位
                </button>
              }
              <a nz-button routerLink="/admin/titles">查看全部职务</a>
            </div>
          </header>

          @if (!selectedDepartment()) {
            <div class="empty-state">先选择部门，再维护该部门岗位</div>
          } @else if (departmentTitles().length === 0) {
            <div class="empty-state">当前部门还没有关联岗位</div>
          } @else {
            <div class="members-table-wrap">
              <table class="members-table">
                <thead>
                  <tr>
                    <th>岗位名称</th>
                    <th>岗位编码</th>
                    <th>状态</th>
                    <th>部门成员数</th>
                    <th>排序</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  @for (title of departmentTitles(); track title.id) {
                    <tr>
                      <td>{{ title.titleName }}</td>
                      <td class="mono">{{ title.titleCode }}</td>
                      <td>
                        <nz-tag [nzColor]="title.status === 'active' ? 'green' : 'default'">
                          {{ title.status === 'active' ? '启用' : '停用' }}
                        </nz-tag>
                      </td>
                      <td>{{ title.memberCount }} 人</td>
                      <td>{{ title.sort }}</td>
                      <td>
                        <div class="actions">
                          <button nz-button nzSize="small" (click)="filterMembersByTitle(title.titleCode)">查看成员</button>
                          <button
                            nz-button
                            nzSize="small"
                            nzDanger
                            nz-popconfirm
                            nzPopconfirmTitle="确认从当前部门移除该岗位？"
                            (nzOnConfirm)="removeDepartmentTitle(title)"
                          >
                            移除
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="department-card">
          <header class="department-card__header department-members__header">
            <h2>
              部门成员
              <span>{{ memberTotal() }}</span>
              @if (memberTitleFilterLabel()) {
                <nz-tag nzColor="blue">{{ memberTitleFilterLabel() }}</nz-tag>
              }
            </h2>
            <div class="department-members__actions">
              @if (memberTitleFilterCode()) {
                <button nz-button nzSize="small" (click)="clearMemberTitleFilter()">清除岗位筛选</button>
              }
            </div>
            <app-search-box
              placeholder="搜索成员"
              [value]="memberKeyword()"
              (valueChange)="memberKeyword.set($event)"
              (submitted)="loadMembers()"
            />
          </header>
          <div class="members-table-wrap">
            <table class="members-table">
              <thead>
                <tr>
                  <th>成员</th>
                  <th>职位</th>
                  <th>归属关系</th>
                  <th>账号状态</th>
                </tr>
              </thead>
              <tbody>
                @for (member of members(); track member.id) {
                  <tr>
                    <td>
                      <div class="member-cell">
                        <div class="member-avatar">{{ userInitial(member) }}</div>
                        <div>
                          <strong>{{ member.displayName || member.username }}</strong>
                          <small>{{ member.email || member.username }}</small>
                        </div>
                      </div>
                    </td>
                    <td>{{ titleLabel(member.titleCode) }}</td>
                    <td>{{ relationLabel(member) }}</td>
                    <td>
                      <span class="status-text" [class.status-text--inactive]="member.status === 'inactive'">
                        {{ member.status === 'active' ? '活跃' : '停用' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4">
                      <div class="empty-state">当前部门没有匹配成员</div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>

    <app-department-form-dialog
      [open]="dialogOpen()"
      [busy]="dialogBusy()"
      [mode]="dialogMode()"
      [department]="editingDepartment()"
      [parentId]="dialogParentId()"
      [departments]="allDepartments()"
      [userOptions]="allUsers()"
      (cancel)="closeDepartmentDialog()"
      (create)="createDepartment($event)"
      (update)="updateDepartment($event)"
    />

    <app-department-title-attach-dialog
      [open]="attachTitleDialogOpen()"
      [options]="availableTitleOptions()"
      (cancel)="closeAttachTitleDialog()"
      (save)="attachExistingTitle($event)"
    />

    <app-title-form-dialog
      [open]="quickCreateTitleDialogOpen()"
      mode="create"
      [initial]="null"
      (cancel)="closeQuickCreateTitleDialog()"
      (save)="createDepartmentTitle($event)"
    />
  `,
  styles: [
    `
      .department-layout {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 20px;
      }

      .department-main {
        display: grid;
        gap: 20px;
        min-width: 0;
      }

      .department-card {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-container);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
      }

      .department-card__header {
        min-height: 52px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color-soft);
      }

      .department-card__header h2 {
        margin: 0;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-heading);
        font-size: 15px;
        font-weight: 600;
      }

      .department-card__header > span,
      .department-card__header h2 span {
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 500;
      }

      .department-tree {
        padding: 8px;
        max-height: calc(100vh - 260px);
        overflow: auto;
      }

      .tree-item {
        width: 100%;
        min-height: 36px;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        font: inherit;
        text-align: left;
      }

      .tree-item:hover {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }

      .tree-item.is-active {
        background: var(--color-info-light);
        color: var(--color-info);
      }

      .tree-item__icon {
        width: 18px;
        text-align: center;
        flex: 0 0 18px;
      }

      .tree-item__name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tree-item__meta {
        min-width: 22px;
        border-radius: 999px;
        padding: 1px 7px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        text-align: center;
      }

      .department-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .department-info-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0;
        padding: 16px;
      }

      .department-info-item {
        display: grid;
        gap: 6px;
        padding: 12px;
      }

      .department-info-item--wide {
        grid-column: span 3;
      }

      .department-info-item span,
      .members-table th,
      .member-cell small {
        color: var(--text-muted);
        font-size: 12px;
      }

      .department-info-item strong {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }

      .department-members__header app-search-box {
        width: 220px;
      }

      .department-members__actions {
        margin-left: auto;
      }

      .members-table-wrap {
        overflow-x: auto;
      }

      .members-table {
        width: 100%;
        border-collapse: collapse;
      }

      .members-table th {
        padding: 10px 16px;
        background: var(--bg-subtle);
        font-weight: 600;
        text-align: left;
      }

      .members-table td {
        padding: 14px 16px;
        border-top: 1px solid var(--border-color-soft);
        color: var(--text-secondary);
      }

      .member-cell {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .member-cell strong,
      .member-cell small {
        display: block;
      }

      .member-cell strong {
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 600;
      }

      .member-avatar {
        width: 32px;
        height: 32px;
        flex: 0 0 32px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--gradient-user-avatar);
        color: var(--text-inverse);
        font-size: 13px;
        font-weight: 600;
      }

      .status-text {
        color: var(--color-success);
        font-size: 12px;
        font-weight: 700;
      }

      .status-text--inactive {
        color: var(--text-muted);
      }

      .empty-state {
        padding: 24px;
        color: var(--text-muted);
        text-align: center;
      }

      @media (max-width: 1080px) {
        .department-layout {
          grid-template-columns: 1fr;
        }

        .department-tree {
          max-height: none;
        }
      }

      @media (max-width: 760px) {
        .department-card__header,
        .department-members__header {
          align-items: flex-start;
          flex-direction: column;
        }

        .department-actions,
        .department-members__header app-search-box {
          width: 100%;
        }

        .department-info-grid {
          grid-template-columns: 1fr;
        }

        .department-info-item--wide {
          grid-column: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPageComponent {
  private readonly organizationApi = inject(OrganizationApiService);
  private readonly userApi = inject(UserApiService);
  private readonly systemTitleApi = inject(SystemTitleApiService);
  private readonly message = inject(NzMessageService);

  readonly keyword = signal('');
  readonly memberKeyword = signal('');
  readonly memberTitleFilterCode = signal('');
  readonly departmentTree = signal<DepartmentTreeNode[]>([]);
  readonly allDepartments = signal<DepartmentEntity[]>([]);
  readonly allUsers = signal<UserEntity[]>([]);
  readonly departmentTitles = signal<DepartmentTitleEntity[]>([]);
  readonly allTitleLibrary = signal<SystemTitleEntity[]>([]);
  readonly selectedDepartmentId = signal('');
  readonly members = signal<UserEntity[]>([]);
  readonly memberTotal = signal(0);
  readonly dialogOpen = signal(false);
  readonly dialogBusy = signal(false);
  readonly dialogMode = signal<'create' | 'edit'>('create');
  readonly dialogParentId = signal('');
  readonly editingDepartment = signal<DepartmentEntity | null>(null);
  readonly attachTitleDialogOpen = signal(false);
  readonly quickCreateTitleDialogOpen = signal(false);

  readonly flatTree = computed(() => this.flattenTree(this.departmentTree()));
  readonly selectedDepartment = computed(() => this.allDepartments().find((department) => department.id === this.selectedDepartmentId()) ?? null);
  readonly titleLabelMap = computed<Record<string, string>>(() =>
    Object.fromEntries(this.allTitleLibrary().map((item) => [item.code, item.name]))
  );
  readonly memberTitleFilterLabel = computed(() => {
    const code = this.memberTitleFilterCode();
    return code ? this.titleLabelMap()[code] ?? code : '';
  });
  readonly availableTitleOptions = computed(() => {
    const attachedCodes = new Set(this.departmentTitles().map((item) => item.titleCode));
    return this.allTitleLibrary().filter((item) => !attachedCodes.has(item.code));
  });

  constructor() {
    this.loadDepartments();
    this.loadTitleLibrary();
    this.loadUserOptions();
  }

  loadDepartments(): void {
    const query = { keyword: this.keyword().trim() };
    this.organizationApi.listDepartmentTree(query).subscribe({
      next: (tree) => {
        this.departmentTree.set(tree);
        const flat = this.flattenTree(tree);
        if (!flat.some((department) => department.id === this.selectedDepartmentId())) {
          this.selectedDepartmentId.set(flat[0]?.id ?? '');
        }
        this.loadMembers();
        this.loadDepartmentTitles();
      },
      error: () => this.message.error('加载部门树失败'),
    });
    this.organizationApi.listDepartments().subscribe({
      next: (items) => this.allDepartments.set(items),
      error: () => this.allDepartments.set([]),
    });
  }

  selectDepartment(departmentId: string): void {
    this.selectedDepartmentId.set(departmentId);
    this.memberTitleFilterCode.set('');
    this.loadMembers();
    this.loadDepartmentTitles();
  }

  startCreateDepartment(): void {
    this.dialogMode.set('create');
    this.dialogParentId.set('');
    this.editingDepartment.set(null);
    this.dialogOpen.set(true);
  }

  startCreateChildDepartment(parent: DepartmentEntity): void {
    this.dialogMode.set('create');
    this.dialogParentId.set(parent.id);
    this.editingDepartment.set(null);
    this.dialogOpen.set(true);
  }

  editDepartment(department: DepartmentEntity): void {
    this.dialogMode.set('edit');
    this.dialogParentId.set('');
    this.editingDepartment.set(department);
    this.dialogOpen.set(true);
  }

  closeDepartmentDialog(): void {
    this.dialogOpen.set(false);
    this.dialogBusy.set(false);
    this.dialogParentId.set('');
    this.editingDepartment.set(null);
  }

  createDepartment(input: CreateDepartmentInput): void {
    this.dialogBusy.set(true);
    this.organizationApi.createDepartment(input).subscribe({
      next: (department) => this.handleDepartmentSaved(department),
      error: () => {
        this.dialogBusy.set(false);
        this.message.error('保存部门失败');
      },
    });
  }

  updateDepartment(input: UpdateDepartmentInput): void {
    const department = this.editingDepartment();
    if (!department) {
      return;
    }
    this.dialogBusy.set(true);
    this.organizationApi.updateDepartment(department.id, input).subscribe({
      next: (updatedDepartment) => this.handleDepartmentSaved(updatedDepartment),
      error: () => {
        this.dialogBusy.set(false);
        this.message.error('保存部门失败');
      },
    });
  }

  loadUserOptions(): void {
    this.userApi
      .list({
        page: 1,
        pageSize: 200,
        keyword: '',
      })
      .subscribe({
        next: (result) => this.allUsers.set(result.items),
        error: () => this.allUsers.set([]),
      });
  }

  loadMembers(): void {
    const departmentId = this.selectedDepartmentId();
    if (!departmentId) {
      this.members.set([]);
      this.memberTotal.set(0);
      return;
    }
    this.userApi
      .list({
        page: 1,
        pageSize: 100,
        departmentId,
        keyword: this.memberKeyword().trim(),
      })
      .subscribe({
        next: (result) => {
          const titleCode = this.memberTitleFilterCode().trim();
          const items = titleCode ? result.items.filter((item) => item.titleCode === titleCode) : result.items;
          this.members.set(items);
          this.memberTotal.set(items.length);
        },
        error: () => {
          this.members.set([]);
          this.memberTotal.set(0);
        },
      });
  }

  childCount(departmentId: string): number {
    return this.allDepartments().filter((department) => department.parentId === departmentId).length;
  }

  formatDate(value: string): string {
    return value ? value.slice(0, 10) : '-';
  }

  userInitial(user: UserEntity): string {
    return (user.displayName || user.username).trim().charAt(0).toUpperCase() || 'U';
  }

  titleLabel(titleCode: string | null): string {
    if (!titleCode) {
      return '未设置';
    }
    return this.titleLabelMap()[titleCode] ?? titleCode;
  }

  relationLabel(user: UserEntity): string {
    const relation = user.departments.find((department) => department.departmentId === this.selectedDepartmentId());
    if (!relation) {
      return '-';
    }
    return user.primaryDepartment?.departmentId === relation.departmentId ? '主部门' : '关联部门';
  }

  openAttachTitleDialog(): void {
    this.attachTitleDialogOpen.set(true);
  }

  closeAttachTitleDialog(): void {
    this.attachTitleDialogOpen.set(false);
  }

  attachExistingTitle(input: DepartmentTitleInput): void {
    const departmentId = this.selectedDepartmentId();
    if (!departmentId) {
      return;
    }
    this.organizationApi.addDepartmentTitle(departmentId, input).subscribe({
      next: () => {
        this.message.success('岗位已关联到当前部门');
        this.closeAttachTitleDialog();
        this.loadDepartmentTitles();
      },
      error: () => this.message.error('关联岗位失败'),
    });
  }

  openQuickCreateTitleDialog(): void {
    this.quickCreateTitleDialogOpen.set(true);
  }

  closeQuickCreateTitleDialog(): void {
    this.quickCreateTitleDialogOpen.set(false);
  }

  createDepartmentTitle(payload: CreateSystemTitleInput | UpdateSystemTitleInput): void {
    const departmentId = this.selectedDepartmentId();
    if (!departmentId) {
      return;
    }
    this.systemTitleApi.createTitle(payload as CreateSystemTitleInput).subscribe({
      next: (title) => {
        this.organizationApi.addDepartmentTitle(departmentId, { titleCode: title.code, sort: title.sort }).subscribe({
          next: () => {
            this.message.success('岗位已创建并关联到当前部门');
            this.closeQuickCreateTitleDialog();
            this.loadTitleLibrary();
            this.loadDepartmentTitles();
          },
          error: () => this.message.error('岗位创建成功，但关联到部门失败'),
        });
      },
      error: () => this.message.error('新建岗位失败'),
    });
  }

  removeDepartmentTitle(item: DepartmentTitleEntity): void {
    const departmentId = this.selectedDepartmentId();
    if (!departmentId) {
      return;
    }
    this.organizationApi.removeDepartmentTitle(departmentId, item.titleCode).subscribe({
      next: () => {
        if (this.memberTitleFilterCode() === item.titleCode) {
          this.memberTitleFilterCode.set('');
          this.loadMembers();
        }
        this.message.success('岗位已从当前部门移除');
        this.loadDepartmentTitles();
      },
      error: () => this.message.error('移除岗位失败'),
    });
  }

  filterMembersByTitle(titleCode: string): void {
    this.memberTitleFilterCode.set(titleCode);
    this.loadMembers();
  }

  clearMemberTitleFilter(): void {
    this.memberTitleFilterCode.set('');
    this.loadMembers();
  }

  private loadDepartmentTitles(): void {
    const departmentId = this.selectedDepartmentId();
    if (!departmentId) {
      this.departmentTitles.set([]);
      return;
    }
    this.organizationApi.listDepartmentTitles(departmentId).subscribe({
      next: (items) => this.departmentTitles.set(items),
      error: () => this.departmentTitles.set([]),
    });
  }

  private loadTitleLibrary(): void {
    this.systemTitleApi.listTitles().subscribe({
      next: (items) => this.allTitleLibrary.set(items),
      error: () => this.allTitleLibrary.set([]),
    });
  }

  private flattenTree(nodes: DepartmentTreeNode[], level = 0): FlatDepartmentNode[] {
    return nodes.flatMap((node) => [{ ...node, level }, ...this.flattenTree(node.children, level + 1)]);
  }

  private handleDepartmentSaved(department: DepartmentEntity): void {
    this.message.success('部门已保存');
    this.selectedDepartmentId.set(department.id);
    this.closeDepartmentDialog();
    this.loadDepartments();
  }
}
