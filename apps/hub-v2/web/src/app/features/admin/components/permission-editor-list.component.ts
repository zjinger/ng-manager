import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import type { SystemPermissionEntity } from '../models/system-rbac.model';
import { groupSystemPermissions } from '../utils/system-rbac-ui';

@Component({
  selector: 'app-permission-editor-list',
  imports: [NzButtonModule, NzCheckboxModule, NzIconModule, NzSpinModule],
  template: `
    @if (saving()) {
      <div class="saving-overlay">
        <nz-spin nzSimple />
      </div>
    }

    @for (group of permissionGroups(); track group.groupCode) {
      <div class="perm-group">
        <div class="perm-group__header">{{ group.groupName }}</div>
        <div class="perm-group__items">
          @for (perm of group.items; track perm.id) {
            <div class="perm-row">
              <label
                nz-checkbox
                [nzChecked]="checkedPermissionIds().has(perm.id)"
                [nzDisabled]="disabled()"
                (nzCheckedChange)="toggle.emit({ permissionId: perm.id, checked: $event })"
              ></label>
              <div class="perm-content">
                <span class="perm-name">{{ perm.name }}</span>
                <span class="perm-code">{{ perm.code }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    }

    @if (showSaveAction() && !disabled()) {
      <div class="perm-actions">
        <button nz-button nzType="primary" [nzLoading]="saving()" (click)="save.emit()">
          <nz-icon nzType="save" /> 保存权限配置
        </button>
      </div>
    }
  `,
  styles: [`
    .perm-group {
      margin-bottom: 20px;
    }

    .perm-group__header {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-heading);
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color-soft);
    }

    .perm-group__items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .perm-row {
      display: grid;
      grid-template-columns: 24px 1fr;
      align-items: center;
      gap: 8px;
      min-height: 32px;
      padding: 2px 0;
    }

    .perm-content {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .perm-name {
      font-size: 13px;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .perm-code {
      font-size: 11px;
      color: var(--text-muted);
      font-family: monospace;
      white-space: nowrap;
    }

    .perm-actions {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color-soft);
    }

    .saving-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.7);
      z-index: 10;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionEditorListComponent {
  readonly permissions = input<SystemPermissionEntity[]>([]);
  readonly checkedPermissionIds = input<Set<string>>(new Set());
  readonly disabled = input(false);
  readonly saving = input(false);
  readonly showSaveAction = input(true);

  readonly toggle = output<{ permissionId: string; checked: boolean }>();
  readonly save = output<void>();

  readonly permissionGroups = computed(() => groupSystemPermissions(this.permissions()));
}
