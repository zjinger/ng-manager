import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PanelCardComponent } from '@shared/ui/panel-card';
import { SystemSettingsApiService, type IntegrationSettings, type IntegrationItem, type ApiKeyItem } from '../../services/system-settings-api.service';

@Component({
  selector: 'app-integration-settings',
  imports: [
    NzButtonModule,
    NzIconModule,
    NzTableModule,
    NzTagModule,
    PanelCardComponent,
  ],
  template: `
    <div class="settings-section">
      <app-panel-card title="第三方集成">
        <div panel-actions class="settings-actions">
          @if (!editable()) {
            <button nz-button (click)="startEdit()">编辑</button>
          } @else {
            <button nz-button (click)="cancel()" [disabled]="saving()">取消</button>
            <button
              nz-button
              nzType="primary"
              (click)="save()"
              [disabled]="!dirty() || saving()"
            >
              {{ saving() ? '保存中…' : '保存' }}
            </button>
          }
        </div>

        <div class="settings-list">
          @for (item of integrations(); track item.name) {
            <div class="settings-item">
              <div class="settings-item__icon">
                <nz-icon [nzType]="item.icon" />
              </div>
              <div class="settings-item__info">
                <div class="settings-item__name">{{ item.name }}</div>
                <div class="settings-item__desc">{{ item.description }}</div>
              </div>
              @if (item.status === 'active') {
                <span class="status-dot status-dot--active">
                  <span class="status-dot__dot"></span>
                  已连接
                </span>
              } @else {
                <span class="status-dot status-dot--inactive">
                  <span class="status-dot__dot"></span>
                  未配置
                </span>
              }
            </div>
          }
        </div>
      </app-panel-card>

      <app-panel-card title="API 密钥">
        <div panel-actions>
          <button nz-button nzType="primary" (click)="generateKey()">
            <nz-icon nzType="plus"></nz-icon> 生成新密钥
          </button>
        </div>

        <nz-table #apiKeysTable [nzData]="apiKeys()" [nzPageSize]="10" [nzShowPagination]="false">
          <thead>
            <tr>
              <th>名称</th>
              <th>密钥</th>
              <th nzAlign="center">权限范围</th>
              <th>创建时间</th>
              <th>最后使用</th>
              <th nzAlign="center">状态</th>
            </tr>
          </thead>
          <tbody>
            @for (key of apiKeysTable.data; track key.name) {
              <tr>
                <td>
                  <strong>{{ key.name }}</strong>
                </td>
                <td>
                  <code class="api-key">{{ key.key }}</code>
                </td>
                <td nzAlign="center">
                  <nz-tag [nzColor]="key.scope === '读写' ? 'blue' : 'default'">{{ key.scope }}</nz-tag>
                </td>
                <td class="text-muted">{{ key.createdAt }}</td>
                <td class="text-muted">{{ key.lastUsed }}</td>
                <td nzAlign="center">
                  @if (key.status === 'active') {
                    <span class="status-dot status-dot--active">
                      <span class="status-dot__dot"></span>
                      活跃
                    </span>
                  } @else {
                    <span class="status-dot status-dot--inactive">
                      <span class="status-dot__dot"></span>
                      已禁用
                    </span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </app-panel-card>
    </div>
  `,
  styles: `
    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .settings-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .settings-list {
      padding: 0 20px;
    }

    .settings-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid var(--border-color-soft);
    }

    .settings-item:last-child {
      border-bottom: none;
    }

    .settings-item__icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--color-primary-light);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .settings-item__info {
      flex: 1;
      min-width: 0;
    }

    .settings-item__name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .settings-item__desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .status-dot {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 999px;
    }

    .status-dot__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot--active {
      background: rgba(34, 197, 94, 0.14);
      color: #16a34a;
    }

    .status-dot--active .status-dot__dot {
      background: #16a34a;
    }

    .status-dot--inactive {
      background: var(--bg-subtle);
      color: var(--text-muted);
    }

    .status-dot--inactive .status-dot__dot {
      background: var(--text-muted);
    }

    .api-key {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg-subtle);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .text-muted {
      font-size: 13px;
      color: var(--text-muted);
    }

    :host-context(html[data-theme='dark']) .status-dot--active {
      background: rgba(34, 197, 94, 0.22);
      color: #86efac;
    }

    :host-context(html[data-theme='dark']) .status-dot--active .status-dot__dot {
      background: #86efac;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrationSettingsComponent implements OnInit {
  private readonly message = inject(NzMessageService);
  private readonly settingsApi = inject(SystemSettingsApiService);

  readonly editable = signal(false);
  readonly dirty = signal(false);
  readonly saving = signal(false);

  readonly integrations = signal<IntegrationItem[]>([]);
  readonly apiKeys = signal<ApiKeyItem[]>([]);

  private savedState: IntegrationSettings = { integrations: [], apiKeys: [] };

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.settingsApi.getIntegrationSettings().subscribe({
      next: (settings) => {
        this.integrations.set(settings.integrations);
        this.apiKeys.set(settings.apiKeys);
        this.savedState = this.getSnapshot();
      },
      error: () => {
        this.message.error('加载设置失败');
      }
    });
  }

  private getSnapshot(): IntegrationSettings {
    return {
      integrations: [...this.integrations()],
      apiKeys: [...this.apiKeys()],
    };
  }

  startEdit(): void {
    this.savedState = this.getSnapshot();
    this.editable.set(true);
    this.dirty.set(false);
  }

  cancel(): void {
    this.integrations.set(this.savedState.integrations);
    this.apiKeys.set(this.savedState.apiKeys);
    this.editable.set(false);
    this.dirty.set(false);
  }

  save(): void {
    this.saving.set(true);
    const data = this.getSnapshot();
    this.settingsApi.updateIntegrationSettings(data).subscribe({
      next: () => {
        this.savedState = this.getSnapshot();
        this.saving.set(false);
        this.editable.set(false);
        this.dirty.set(false);
        this.message.success('集成设置已保存');
      },
      error: () => {
        this.saving.set(false);
        this.message.error('保存失败');
      }
    });
  }

  checkDirty(): void {
    const current = this.getSnapshot();
    this.dirty.set(
      JSON.stringify(current.integrations) !== JSON.stringify(this.savedState.integrations) ||
      JSON.stringify(current.apiKeys) !== JSON.stringify(this.savedState.apiKeys)
    );
  }

  generateKey(): void {
    this.message.info('生成功能开发中');
  }
}
