import { Directive, TemplateRef, ViewContainerRef, computed, effect, inject, input } from '@angular/core';
import { AuthStore } from './auth.store';
import { hasRequiredPermissions, normalizePermissionList, type PermissionMatchMode } from './permission.utils';

/**
 * 权限指令，根据当前用户的权限码列表来决定是否显示宿主元素。
 * 支持单权限和多权限两种用法：
 * - appHasPermission="'admin.users.manage'"：单权限
 * - appHasPermission="['a', 'b']"：多权限（默认 any，命中任一即可显示）
 * - [appHasPermissionMode]="'all'"：多权限全命中才显示
 * 
 * 使用示例：
 * 1. 单权限
 *  <button *appHasPermission="'admin.users.manage'">用户管理</button>
 *  <button *appHasPermission="'admin.roles.manage'">角色管理</button>
 *
 *  2. 多权限
 *  <a *appHasPermission="['expense.submit','expense.view.self']"
 *     [appHasPermissionMode]="'all'">
 *    报销入口
 *  </a>
 */

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly authStore = inject(AuthStore);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  readonly appHasPermission = input<string | string[] | null | undefined>(undefined);
  readonly appHasPermissionMode = input<PermissionMatchMode>('any');

  private readonly canShow = computed(() => {
    const required = normalizePermissionList(this.appHasPermission());
    const granted = this.authStore.currentUser()?.permissionCodes ?? [];
    return hasRequiredPermissions(granted, required, this.appHasPermissionMode());
  });

  private hasView = false;

  constructor() {
    effect(() => {
      if (this.canShow()) {
        this.show();
      } else {
        this.hide();
      }
    });
  }

  private show(): void {
    if (this.hasView) {
      return;
    }
    this.viewContainer.createEmbeddedView(this.templateRef);
    this.hasView = true;
  }

  private hide(): void {
    if (!this.hasView) {
      return;
    }
    this.viewContainer.clear();
    this.hasView = false;
  }
}
