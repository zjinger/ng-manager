import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import type { SystemRoleDetail } from '../models/system-rbac.model';
import { getSystemRoleBadgeClass } from '../utils/system-rbac-ui';

@Component({
  selector: 'app-system-role-summary',
  imports: [NzIconModule, NzTagModule],
  template: `
    @if (role(); as currentRole) {
      <div class="role-summary" [class.role-summary--compact]="compact()">
        <div class="role-summary__meta">
          <div class="role-summary__title">
            <span class="role-badge" [class]="'role-badge--' + getBadgeClass(currentRole.code)">
              {{ currentRole.name }}
            </span>
            @if (currentRole.isBuiltin) {
              <nz-tag nzColor="blue">系统内置</nz-tag>
            } @else {
              <nz-tag nzColor="orange">自定义</nz-tag>
            }
            @if (showStatus()) {
              <nz-tag [nzColor]="currentRole.status === 'active' ? 'green' : 'default'">
                {{ currentRole.status === 'active' ? '启用中' : '已停用' }}
              </nz-tag>
            }
          </div>

          @if (showDescription() && currentRole.description) {
            <p class="role-summary__desc">{{ currentRole.description }}</p>
          } @else if (showDescription() && fallbackDescription()) {
            <p class="role-summary__desc">{{ fallbackDescription() }}</p>
          }
        </div>

        @if (summaryText() || currentRole.userCount >= 0) {
          <div class="role-summary__aside">
            @if (summaryText()) {
              <span>{{ summaryText() }}</span>
            }
            <span class="role-summary__count">
              <nz-icon nzType="team" /> {{ currentRole.userCount }} 名成员
            </span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .role-summary {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .role-summary--compact {
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color-soft);
      margin-bottom: 16px;
    }

    .role-summary__title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .role-badge {
      font-size: 13px;
      padding: 3px 12px;
      border-radius: 4px;
      font-weight: 600;
    }

    .role-badge--super-admin {
      background: var(--color-danger-light, var(--bg-subtle));
      color: var(--color-danger);
    }

    .role-badge--admin {
      background: var(--color-info-light, var(--primary-50));
      color: var(--color-info, var(--primary-600));
    }

    .role-badge--member {
      background: var(--bg-subtle);
      color: var(--text-secondary);
    }

    .role-badge--custom {
      background: var(--primary-50);
      color: var(--primary-600);
    }

    .role-summary__desc {
      margin: 8px 0 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.6;
    }

    .role-summary__aside {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      color: var(--text-muted);
      font-size: 12px;
      white-space: nowrap;
    }

    .role-summary__count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    @media (max-width: 960px) {
      .role-summary {
        flex-direction: column;
      }

      .role-summary__aside {
        align-items: flex-start;
        white-space: normal;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemRoleSummaryComponent {
  readonly role = input<SystemRoleDetail | null>(null);
  readonly compact = input(false);
  readonly showStatus = input(true);
  readonly showDescription = input(true);
  readonly summaryText = input('');
  readonly fallbackDescription = input('');

  getBadgeClass(roleCode: string): string {
    return getSystemRoleBadgeClass(roleCode);
  }
}
