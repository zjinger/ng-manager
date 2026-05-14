import { ChangeDetectionStrategy, Component, effect, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DialogShellComponent } from '@shared/ui/dialog';
import type { SystemRoleWithCounts, CreateSystemRoleInput, UpdateSystemRoleInput } from '../../models/system-rbac.model';

interface RoleDraft {
  code: string;
  name: string;
  description: string;
  permissionTemplateRoleId: string;
}

const DEFAULT_DRAFT: RoleDraft = {
  code: '',
  name: '',
  description: '',
  permissionTemplateRoleId: ''
};

@Component({
  selector: 'app-role-form-dialog',
  imports: [FormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule, NzIconModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [title]="mode() === 'create' ? '新建角色' : '编辑角色'"
      [subtitle]="mode() === 'create' ? '定义新的权限角色' : '修改角色信息'"
      [icon]="mode() === 'create' ? 'plus-square' : 'edit'"
      [width]="520"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form nz-form [nzLayout]="'vertical'">
          <nz-form-item>
            <nz-form-label nzRequired>角色名称</nz-form-label>
            <nz-form-control nzErrorTip="请输入角色名称">
              <input nz-input [ngModel]="draft().name" (ngModelChange)="updateField('name', $event)" name="name" placeholder="如：QA 负责人" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>角色标识</nz-form-label>
            <nz-form-control nzErrorTip="2-48位，仅支持字母、数字、下划线、连字符">
              <input nz-input [ngModel]="draft().code" (ngModelChange)="updateField('code', $event)" name="code" placeholder="如：qa_lead" [readonly]="mode() === 'edit'" [style.font-family]="'monospace'" />
            </nz-form-control>
            @if (mode() === 'create') {
              <div class="form-hint">用于 API 和系统内部识别，创建后不可修改</div>
            }
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>角色描述</nz-form-label>
            <nz-form-control>
              <textarea nz-input [ngModel]="draft().description" (ngModelChange)="updateField('description', $event)" name="description" placeholder="描述该角色的职责和适用场景…" [nzAutosize]="{ minRows: 3, maxRows: 6 }"></textarea>
            </nz-form-control>
          </nz-form-item>

          @if (mode() === 'create') {
            <nz-form-item>
              <nz-form-label>权限模板</nz-form-label>
              <nz-form-control>
                <nz-select [ngModel]="draft().permissionTemplateRoleId" (ngModelChange)="updateField('permissionTemplateRoleId', $event)" nzAllowClear nzPlaceHolder="从空白角色开始" name="permissionTemplateRoleId">
                  <nz-option nzLabel="从空白角色开始" nzValue="" />
                  @for (role of templateRoles(); track role.id) {
                    <nz-option [nzLabel]="'复制自「' + role.name + '」'" [nzValue]="role.id" />
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          }
        </form>
      </div>

      <div dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="!canSubmit()" (click)="submitForm()">
          <nz-icon nzType="check" nzTheme="outline" />
          {{ mode() === 'create' ? '创建角色' : '保存修改' }}
        </button>
      </div>
    </app-dialog-shell>
  `,
  styles: [`
    .form-hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleFormDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly role = input<SystemRoleWithCounts | null>(null);
  readonly roles = input<SystemRoleWithCounts[]>([]);

  readonly cancel = output<void>();
  readonly create = output<CreateSystemRoleInput>();
  readonly update = output<UpdateSystemRoleInput>();

  readonly draft = signal<RoleDraft>({ ...DEFAULT_DRAFT });

  readonly templateRoles = computed(() => this.roles().filter((r) => !r.isBuiltin || r.code !== 'super_admin'));

  readonly canSubmit = computed(() => {
    const d = this.draft();
    return !!d.code.trim() && !!d.name.trim();
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const r = this.role();
      this.draft.set(r
        ? { code: r.code, name: r.name, description: r.description || '', permissionTemplateRoleId: '' }
        : { ...DEFAULT_DRAFT }
      );
    });
  }

  updateField<K extends keyof RoleDraft>(key: K, value: RoleDraft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  submitForm(): void {
    if (!this.canSubmit()) return;
    const d = this.draft();
    if (this.mode() === 'create') {
      this.create.emit({
        code: d.code.trim(),
        name: d.name.trim(),
        description: d.description.trim() || null,
        permissionTemplateRoleId: d.permissionTemplateRoleId || undefined
      });
    } else {
      this.update.emit({
        name: d.name.trim(),
        description: d.description.trim() || null
      });
    }
  }
}
