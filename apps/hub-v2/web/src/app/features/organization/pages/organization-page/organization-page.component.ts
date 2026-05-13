import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import type { DepartmentEntity, DepartmentStatus, FinanceRoleEntity, FinanceRoleStatus } from '../../models/organization.model';
import { OrganizationApiService } from '../../services/organization-api.service';

type DepartmentDraft = {
  id: string | null;
  code: string;
  name: string;
  parentId: string;
  externalFinanceCode: string;
  status: DepartmentStatus;
  sort: number;
};

type FinanceRoleDraft = {
  id: string | null;
  code: string;
  name: string;
  description: string;
  status: FinanceRoleStatus;
  sort: number;
};

const DEFAULT_DEPARTMENT_DRAFT: DepartmentDraft = {
  id: null,
  code: '',
  name: '',
  parentId: '',
  externalFinanceCode: '',
  status: 'active',
  sort: 0,
};

const DEFAULT_FINANCE_ROLE_DRAFT: FinanceRoleDraft = {
  id: null,
  code: '',
  name: '',
  description: '',
  status: 'active',
  sort: 0,
};

@Component({
  selector: 'app-organization-page',
  imports: [FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzTabsModule, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent],
  template: `
    <app-page-header title="组织管理" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="resetDrafts()">
        <nz-icon nzType="plus" nzTheme="outline" />
        新建
      </button>
      <app-search-box
        toolbar-search
        placeholder="搜索编码或名称"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="loadAll()"
      />
    </app-page-toolbar>

    <nz-tabset>
      <nz-tab nzTitle="部门">
        <section class="org-layout">
          <form class="org-panel" (ngSubmit)="saveDepartment()">
            <h3>{{ departmentDraft().id ? '编辑部门' : '新建部门' }}</h3>
            <label>
              <span>部门编码</span>
              <input nz-input name="departmentCode" [ngModel]="departmentDraft().code" (ngModelChange)="updateDepartmentDraft('code', $event)" />
            </label>
            <label>
              <span>部门名称</span>
              <input nz-input name="departmentName" [ngModel]="departmentDraft().name" (ngModelChange)="updateDepartmentDraft('name', $event)" />
            </label>
            <label>
              <span>上级部门</span>
              <nz-select nzAllowClear name="departmentParent" [ngModel]="departmentDraft().parentId" (ngModelChange)="updateDepartmentDraft('parentId', $event || '')">
                <nz-option nzLabel="无上级部门" nzValue=""></nz-option>
                @for (department of departments(); track department.id) {
                  @if (department.id !== departmentDraft().id) {
                    <nz-option [nzLabel]="department.name" [nzValue]="department.id"></nz-option>
                  }
                }
              </nz-select>
            </label>
            <label>
              <span>财务部门编码</span>
              <input nz-input name="externalFinanceCode" [ngModel]="departmentDraft().externalFinanceCode" (ngModelChange)="updateDepartmentDraft('externalFinanceCode', $event)" />
            </label>
            <div class="org-form-row">
              <label>
                <span>状态</span>
                <nz-select name="departmentStatus" [ngModel]="departmentDraft().status" (ngModelChange)="updateDepartmentDraft('status', $event)">
                  <nz-option nzLabel="启用" nzValue="active"></nz-option>
                  <nz-option nzLabel="停用" nzValue="inactive"></nz-option>
                </nz-select>
              </label>
              <label>
                <span>排序</span>
                <input nz-input type="number" name="departmentSort" [ngModel]="departmentDraft().sort" (ngModelChange)="updateDepartmentDraft('sort', +$event || 0)" />
              </label>
            </div>
            <button nz-button nzType="primary" [disabled]="!departmentDraft().code.trim() || !departmentDraft().name.trim()">保存部门</button>
          </form>

          <div class="org-list">
            @for (department of departments(); track department.id) {
              <article class="org-item">
                <div>
                  <h3>{{ department.name }}</h3>
                  <p>{{ department.code }} · {{ department.externalFinanceCode || '未设置财务编码' }}</p>
                </div>
                <span class="status" [class.status--inactive]="department.status === 'inactive'">{{ department.status === 'active' ? '启用' : '停用' }}</span>
                <button nz-button nzType="link" (click)="editDepartment(department)">编辑</button>
              </article>
            } @empty {
              <div class="org-empty">当前没有部门</div>
            }
          </div>
        </section>
      </nz-tab>

      <nz-tab nzTitle="财务角色">
        <section class="org-layout">
          <form class="org-panel" (ngSubmit)="saveFinanceRole()">
            <h3>{{ financeRoleDraft().id ? '编辑财务角色' : '新建财务角色' }}</h3>
            <label>
              <span>角色编码</span>
              <input nz-input name="financeRoleCode" [ngModel]="financeRoleDraft().code" (ngModelChange)="updateFinanceRoleDraft('code', $event)" />
            </label>
            <label>
              <span>角色名称</span>
              <input nz-input name="financeRoleName" [ngModel]="financeRoleDraft().name" (ngModelChange)="updateFinanceRoleDraft('name', $event)" />
            </label>
            <label>
              <span>描述</span>
              <input nz-input name="financeRoleDescription" [ngModel]="financeRoleDraft().description" (ngModelChange)="updateFinanceRoleDraft('description', $event)" />
            </label>
            <div class="org-form-row">
              <label>
                <span>状态</span>
                <nz-select name="financeRoleStatus" [ngModel]="financeRoleDraft().status" (ngModelChange)="updateFinanceRoleDraft('status', $event)">
                  <nz-option nzLabel="启用" nzValue="active"></nz-option>
                  <nz-option nzLabel="停用" nzValue="inactive"></nz-option>
                </nz-select>
              </label>
              <label>
                <span>排序</span>
                <input nz-input type="number" name="financeRoleSort" [ngModel]="financeRoleDraft().sort" (ngModelChange)="updateFinanceRoleDraft('sort', +$event || 0)" />
              </label>
            </div>
            <button nz-button nzType="primary" [disabled]="!financeRoleDraft().code.trim() || !financeRoleDraft().name.trim()">保存角色</button>
          </form>

          <div class="org-list">
            @for (role of financeRoles(); track role.id) {
              <article class="org-item">
                <div>
                  <h3>{{ role.name }}</h3>
                  <p>{{ role.code }} · {{ role.description || '无描述' }}</p>
                </div>
                <span class="status" [class.status--inactive]="role.status === 'inactive'">{{ role.status === 'active' ? '启用' : '停用' }}</span>
                <button nz-button nzType="link" (click)="editFinanceRole(role)">编辑</button>
              </article>
            } @empty {
              <div class="org-empty">当前没有财务角色</div>
            }
          </div>
        </section>
      </nz-tab>
    </nz-tabset>
  `,
  styles: [
    `
      .org-layout {
        display: grid;
        grid-template-columns: minmax(280px, 360px) 1fr;
        gap: 16px;
        margin-top: 16px;
      }
      .org-panel,
      .org-list {
        border: 1px solid var(--border-color-soft);
        background: var(--bg-surface);
        border-radius: 8px;
      }
      .org-panel {
        display: grid;
        gap: 12px;
        align-content: start;
        padding: 16px;
      }
      .org-panel h3,
      .org-item h3 {
        margin: 0;
        color: var(--text-heading);
        font-size: 15px;
        font-weight: 700;
      }
      .org-panel label {
        display: grid;
        gap: 6px;
      }
      .org-panel span,
      .org-item p {
        color: var(--text-muted);
        font-size: 12px;
      }
      .org-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .org-list {
        min-height: 320px;
        overflow: hidden;
      }
      .org-item {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .status {
        color: var(--color-success);
        font-size: 12px;
        font-weight: 700;
      }
      .status--inactive {
        color: var(--text-muted);
      }
      .org-empty {
        padding: 24px;
        color: var(--text-muted);
      }
      @media (max-width: 900px) {
        .org-layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPageComponent {
  private readonly api = inject(OrganizationApiService);
  private readonly message = inject(NzMessageService);

  readonly keyword = signal('');
  readonly departments = signal<DepartmentEntity[]>([]);
  readonly financeRoles = signal<FinanceRoleEntity[]>([]);
  readonly departmentDraft = signal<DepartmentDraft>({ ...DEFAULT_DEPARTMENT_DRAFT });
  readonly financeRoleDraft = signal<FinanceRoleDraft>({ ...DEFAULT_FINANCE_ROLE_DRAFT });
  readonly subtitle = computed(() => `${this.departments().length} 个部门 · ${this.financeRoles().length} 个财务角色`);

  constructor() {
    this.loadAll();
  }

  loadAll(): void {
    const query = { keyword: this.keyword().trim() };
    this.api.listDepartments(query).subscribe({ next: (items) => this.departments.set(items) });
    this.api.listFinanceRoles(query).subscribe({ next: (items) => this.financeRoles.set(items) });
  }

  resetDrafts(): void {
    this.departmentDraft.set({ ...DEFAULT_DEPARTMENT_DRAFT });
    this.financeRoleDraft.set({ ...DEFAULT_FINANCE_ROLE_DRAFT });
  }

  updateDepartmentDraft<K extends keyof DepartmentDraft>(key: K, value: DepartmentDraft[K]): void {
    this.departmentDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateFinanceRoleDraft<K extends keyof FinanceRoleDraft>(key: K, value: FinanceRoleDraft[K]): void {
    this.financeRoleDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  editDepartment(department: DepartmentEntity): void {
    this.departmentDraft.set({
      id: department.id,
      code: department.code,
      name: department.name,
      parentId: department.parentId || '',
      externalFinanceCode: department.externalFinanceCode || '',
      status: department.status,
      sort: department.sort,
    });
  }

  saveDepartment(): void {
    const draft = this.departmentDraft();
    const input = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      parentId: draft.parentId || null,
      externalFinanceCode: draft.externalFinanceCode.trim() || null,
      status: draft.status,
      sort: draft.sort,
    };
    const request = draft.id ? this.api.updateDepartment(draft.id, input) : this.api.createDepartment(input);
    request.subscribe({
      next: () => {
        this.message.success('部门已保存');
        this.departmentDraft.set({ ...DEFAULT_DEPARTMENT_DRAFT });
        this.loadAll();
      },
      error: () => this.message.error('保存部门失败'),
    });
  }

  editFinanceRole(role: FinanceRoleEntity): void {
    this.financeRoleDraft.set({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description || '',
      status: role.status,
      sort: role.sort,
    });
  }

  saveFinanceRole(): void {
    const draft = this.financeRoleDraft();
    const input = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      status: draft.status,
      sort: draft.sort,
    };
    const request = draft.id ? this.api.updateFinanceRole(draft.id, input) : this.api.createFinanceRole(input);
    request.subscribe({
      next: () => {
        this.message.success('财务角色已保存');
        this.financeRoleDraft.set({ ...DEFAULT_FINANCE_ROLE_DRAFT });
        this.loadAll();
      },
      error: () => this.message.error('保存财务角色失败'),
    });
  }
}
