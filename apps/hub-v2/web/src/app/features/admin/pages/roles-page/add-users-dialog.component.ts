import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DialogShellComponent } from '@shared/ui/dialog';
import { UserApiService } from '../../../users/services/user-api.service';
import { SystemRbacApiService } from '../../services/system-rbac-api.service';
import type { UserEntity } from '../../../users/models/user.model';
import type { UserSystemRoleEntity } from '../../models/system-rbac.model';

interface UserWithRoles extends UserEntity {
  systemRoles: UserSystemRoleEntity[];
}

@Component({
  selector: 'app-add-users-dialog',
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzCheckboxModule,
    NzTagModule,
    NzSpinModule,
    DialogShellComponent
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      title="添加用户到角色"
      subtitle="选择要添加的用户"
      icon="user-add"
      [width]="640"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <div class="search-bar">
          <nz-input-group [nzPrefix]="searchPrefix">
            <input nz-input placeholder="搜索用户名或显示名…" [ngModel]="keyword()" (ngModelChange)="keyword.set($event)" (keyup.enter)="searchUsers()" name="keyword" />
          </nz-input-group>
          <ng-template #searchPrefix>
            <nz-icon nzType="search" />
          </ng-template>
          <button nz-button nzType="primary" (click)="searchUsers()">搜索</button>
        </div>

        @if (searching()) {
          <div class="searching">
            <nz-spin nzSimple />
          </div>
        } @else if (searchResults().length === 0 && searched()) {
          <div class="empty-hint">未找到匹配的用户</div>
        } @else if (searchResults().length > 0) {
          <div class="user-list">
            @for (user of searchResults(); track user.id) {
              <div class="user-item" [class.user-item--disabled]="isAlreadyInRole(user.id)">
                <div class="user-item__checkbox">
                  <label nz-checkbox [nzChecked]="isSelected(user.id)" [nzDisabled]="isAlreadyInRole(user.id)" (nzCheckedChange)="toggleUser(user.id, $event)"></label>
                </div>
                <div class="user-item__avatar">{{ getInitial(user.displayName || user.username) }}</div>
                <div class="user-item__info">
                  <div class="user-item__name">
                    {{ user.displayName || user.username }}
                    @if (isAlreadyInRole(user.id)) {
                      <nz-tag nzColor="default">已在角色中</nz-tag>
                    }
                  </div>
                  <div class="user-item__meta">
                    {{ user.email || user.username }}
                    @if (user.systemRoles.length > 0) {
                      <span class="user-item__roles">
                        @for (sr of user.systemRoles; track sr.id) {
                          <nz-tag nzColor="blue">{{ sr.roleName }}</nz-tag>
                        }
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }

        @if (selectedIds().size > 0) {
          <div class="selection-bar">
            已选择 {{ selectedIds().size }} 名用户
          </div>
        }
      </div>

      <div dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="selectedIds().size === 0" (click)="submitAdd()">
          <nz-icon nzType="user-add" /> 添加 {{ selectedIds().size }} 名用户
        </button>
      </div>
    </app-dialog-shell>
  `,
  styles: [`
    .search-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .search-bar nz-input-group {
      flex: 1;
    }

    .searching, .empty-hint {
      text-align: center;
      padding: 32px 0;
      color: var(--text-muted);
    }

    .user-list {
      max-height: 360px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 6px;
      transition: var(--transition);
    }

    .user-item:hover:not(.user-item--disabled) {
      background: var(--bg-subtle);
    }

    .user-item--disabled {
      opacity: 0.5;
    }

    .user-item__avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-400), var(--primary-600));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .user-item__info {
      flex: 1;
      min-width: 0;
    }

    .user-item__name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-item__meta {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 2px;
    }

    .user-item__roles {
      display: inline-flex;
      gap: 4px;
    }

    .selection-bar {
      margin-top: 12px;
      padding: 8px 12px;
      background: var(--primary-50);
      border: 1px solid var(--primary-200);
      border-radius: 6px;
      font-size: 13px;
      color: var(--primary-700);
      font-weight: 500;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddUsersDialogComponent {
  private readonly userApi = inject(UserApiService);
  private readonly rbacApi = inject(SystemRbacApiService);
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly roleId = input('');
  readonly existingUserIds = input<string[]>([]);

  readonly cancel = output<void>();
  readonly add = output<string[]>();

  readonly keyword = signal('');
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly searchResults = signal<UserWithRoles[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.keyword.set('');
        this.searchResults.set([]);
        this.selectedIds.set(new Set());
        this.searched.set(false);
      }
    });
  }

  searchUsers(): void {
    const kw = this.keyword().trim();
    if (!kw) return;
    this.searching.set(true);
    this.searched.set(true);

    this.userApi.list({ keyword: kw, pageSize: 20, page: 1 }).subscribe({
      next: (result) => {
        const users = result.items || [];
        const enriched: UserWithRoles[] = users.map((u) => ({ ...u, systemRoles: [] }));
        this.searchResults.set(enriched);
        this.searching.set(false);

        for (const user of enriched) {
          this.rbacApi.listUserSystemRoles(user.id).subscribe({
            next: (roles) => {
              this.searchResults.update((list) =>
                list.map((u) => u.id === user.id ? { ...u, systemRoles: roles } : u)
              );
            }
          });
        }
      },
      error: () => { this.searching.set(false); this.message.error('搜索用户失败'); }
    });
  }

  isAlreadyInRole(userId: string): boolean {
    return this.existingUserIds().includes(userId);
  }

  isSelected(userId: string): boolean {
    return this.selectedIds().has(userId);
  }

  toggleUser(userId: string, checked: boolean): void {
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  submitAdd(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.add.emit(ids);
  }
}
