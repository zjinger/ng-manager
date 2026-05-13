import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DepartmentFormDialogComponent } from '../../dialogs/department-form-dialog/department-form-dialog.component';
import type { CreateDepartmentInput, DepartmentEntity, DepartmentTreeNode, UpdateDepartmentInput } from '../../models/organization.model';
import { OrganizationApiService } from '../../services/organization-api.service';
import { USER_TITLE_OPTIONS, type UserEntity, type UserTitleCode } from '../../../users/models/user.model';
import { UserApiService } from '../../../users/services/user-api.service';

type FlatDepartmentNode = DepartmentTreeNode & {
  level: number;
};

@Component({
  selector: 'app-organization-page',
  imports: [NzButtonModule, NzIconModule, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent, DepartmentFormDialogComponent],
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
          <h2>组织架构树</h2>
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
            </div>
          } @else {
            <div class="empty-state">从左侧选择一个部门查看详情</div>
          }
        </section>

        <section class="department-card">
          <header class="department-card__header department-members__header">
            <h2>部门成员 <span>{{ memberTotal() }}</span></h2>
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
                  <th>部门关系</th>
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
      (cancel)="closeDepartmentDialog()"
      (create)="createDepartment($event)"
      (update)="updateDepartment($event)"
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
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPageComponent {
  private readonly organizationApi = inject(OrganizationApiService);
  private readonly userApi = inject(UserApiService);
  private readonly message = inject(NzMessageService);

  readonly keyword = signal('');
  readonly memberKeyword = signal('');
  readonly departmentTree = signal<DepartmentTreeNode[]>([]);
  readonly allDepartments = signal<DepartmentEntity[]>([]);
  readonly selectedDepartmentId = signal('');
  readonly members = signal<UserEntity[]>([]);
  readonly memberTotal = signal(0);
  readonly dialogOpen = signal(false);
  readonly dialogBusy = signal(false);
  readonly dialogMode = signal<'create' | 'edit'>('create');
  readonly dialogParentId = signal('');
  readonly editingDepartment = signal<DepartmentEntity | null>(null);

  readonly flatTree = computed(() => this.flattenTree(this.departmentTree()));
  readonly selectedDepartment = computed(() => this.allDepartments().find((department) => department.id === this.selectedDepartmentId()) ?? null);

  constructor() {
    this.loadDepartments();
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
    this.loadMembers();
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
          this.members.set(result.items);
          this.memberTotal.set(result.total);
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

  titleLabel(titleCode: UserTitleCode | null): string {
    return USER_TITLE_OPTIONS.find((option) => option.value === titleCode)?.label ?? '未设置';
  }

  relationLabel(user: UserEntity): string {
    const relation = user.departments.find((department) => department.departmentId === this.selectedDepartmentId());
    if (!relation) {
      return '-';
    }
    return relation.relationType === 'primary' ? '主部门' : '兼职部门';
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
