import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { NginxService } from '../../services/nginx.service';
import type { NginxServer, NginxLocation, CreateNginxServerRequest } from '../../models/nginx.types';

/**
 * Nginx Server 列表组件
 */
@Component({
  selector: 'app-nginx-server-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzModalModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    NzSwitchModule,
    NzInputModule,
    NzFormModule,
    NzSelectModule,
    NzCheckboxModule,
  ],
  template: `
    <div class="server-list">
      <div class="list-header">
        <h3>Server 列表</h3>
        <button nz-button nzType="primary" (click)="showCreateModal()">
          <nz-icon nzType="plus" nzTheme="outline"></nz-icon>
          新增 Server
        </button>
      </div>

      <nz-table
        #serverTable
        [nzData]="servers()"
        [nzLoading]="loading()"
        nzSize="middle"
      >
        <thead>
          <tr>
            <th nzWidth="80px">状态</th>
            <th>名称</th>
            <th>监听</th>
            <th>Locations</th>
            <th nzWidth="200px">操作</th>
          </tr>
        </thead>
        <tbody>
          @for (server of serverTable.data; track server.id) {
            <tr>
              <td>
                <nz-switch
                  [ngModel]="server.enabled"
                  (ngModelChange)="toggleServer(server.id, $event)"
                  nzCheckedChildren="启用"
                  nzUnCheckedChildren="禁用"
                ></nz-switch>
              </td>
              <td>
                <strong>{{ server.name }}</strong>
                @if (server.ssl) {
                  <nz-tag nzColor="blue">SSL</nz-tag>
                }
              </td>
              <td>
                @for (port of server.listen; track $index) {
                  <nz-tag>{{ port }}</nz-tag>
                }
              </td>
              <td>
                <span class="location-count">
                  {{ server.locations.length }} 个 location
                </span>
              </td>
              <td>
                <button
                  nz-button
                  nzType="text"
                  nz-tooltip
                  nzTooltipTitle="编辑"
                  (click)="editServer(server)"
                >
                  <nz-icon nzType="edit" nzTheme="outline"></nz-icon>
                </button>
                <button
                  nz-button
                  nzType="text"
                  nz-tooltip
                  nzTooltipTitle="查看配置"
                  (click)="viewConfig(server)"
                >
                  <nz-icon nzType="file-text" nzTheme="outline"></nz-icon>
                </button>
                <button
                  nz-button
                  nzType="text"
                  nzDanger
                  nz-tooltip
                  nzTooltipTitle="删除"
                  (click)="deleteServer(server)"
                >
                  <nz-icon nzType="delete" nzTheme="outline"></nz-icon>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </nz-table>

      @if (servers().length === 0 && !loading()) {
        <div class="empty-state">
          <nz-icon nzType="inbox" nzTheme="outline" class="empty-icon"></nz-icon>
          <p>暂无 Server 配置</p>
          <button nz-button nzType="primary" (click)="showCreateModal()">
            创建第一个 Server
          </button>
        </div>
      }
    </div>

    <!-- 创建/编辑 Server 模态框 -->
    <nz-modal
      [(nzVisible)]="modalVisible"
      [nzTitle]="editingServer() ? '编辑 Server' : '新增 Server'"
      (nzOnOk)="saveServer()"
      (nzOnCancel)="modalVisible = false"
      [nzOkLoading]="saving()"
      nzWidth="700px"
    >
      <ng-container *nzModalContent>
        <form nz-form [nzLayout]="'vertical'">
          <nz-form-item>
            <nz-form-label nzRequired>Server Name</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                [(ngModel)]="formData.name"
                name="name"
                placeholder="例如: example.com"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>监听端口</nz-form-label>
            <nz-form-control>
              <nz-select
                [(ngModel)]="formData.listen"
                name="listen"
                nzMode="tags"
                nzPlaceHolder="输入端口号，按回车确认"
              >
                <nz-option nzValue="80" nzLabel="80 (HTTP)"></nz-option>
                <nz-option nzValue="443" nzLabel="443 (HTTPS)"></nz-option>
                <nz-option nzValue="8080" nzLabel="8080"></nz-option>
                <nz-option nzValue="3000" nzLabel="3000"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>SSL</nz-form-label>
            <nz-form-control>
              <label nz-checkbox [(ngModel)]="formData.ssl" name="ssl">
                启用 SSL
              </label>
            </nz-form-control>
          </nz-form-item>

          <div class="locations-section">
            <div class="locations-header">
              <h4>Location 配置</h4>
              <button nz-button nzType="dashed" (click)="addLocation()">
                <nz-icon nzType="plus" nzTheme="outline"></nz-icon>
                添加 Location
              </button>
            </div>

            @for (location of formData.locations; track $index; let i = $index) {
              <div class="location-item">
                <div class="location-fields">
                  <input
                    nz-input
                    [(ngModel)]="location.path"
                    [name]="'path_' + i"
                    placeholder="路径，例如: / 或 /api"
                  />
                  <input
                    nz-input
                    [(ngModel)]="location.proxyPass"
                    [name]="'proxy_' + i"
                    placeholder="代理目标，例如: http://localhost:3000"
                  />
                  <input
                    nz-input
                    [(ngModel)]="location.root"
                    [name]="'root_' + i"
                    placeholder="根目录（可选）"
                  />
                </div>
                <button
                  nz-button
                  nzType="text"
                  nzDanger
                  (click)="removeLocation(i)"
                >
                  <nz-icon nzType="delete" nzTheme="outline"></nz-icon>
                </button>
              </div>
            }
          </div>
        </form>
      </ng-container>
    </nz-modal>

    <!-- 查看配置模态框 -->
    <nz-modal
      [(nzVisible)]="configModalVisible"
      nzTitle="Server 配置"
      (nzOnCancel)="configModalVisible = false"
      [nzFooter]="null"
      nzWidth="800px"
    >
      <ng-container *nzModalContent>
        <pre class="config-preview">{{ viewingConfig() }}</pre>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    .server-list {
      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }
      }

      .location-count {
        color: rgba(0, 0, 0, 0.45);
        font-size: 13px;
      }
    }

    .empty-state {
      text-align: center;
      padding: 48px 0;

      .empty-icon {
        font-size: 48px;
        color: rgba(0, 0, 0, 0.25);
        margin-bottom: 16px;
      }

      p {
        color: rgba(0, 0, 0, 0.45);
        margin-bottom: 16px;
      }
    }

    .locations-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;

      .locations-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h4 {
          margin: 0;
        }
      }

      .location-item {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        align-items: flex-start;

        .location-fields {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }
      }
    }

    .config-preview {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 4px;
      padding: 16px;
      margin: 0;
      font-family: monospace;
      font-size: 13px;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre-wrap;
    }
  `],
})
export class NginxServerListComponent implements OnInit {
  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  servers = signal<NginxServer[]>([]);
  loading = signal(false);
  saving = signal(false);

  // 模态框状态
  modalVisible = false;
  editingServer = signal<NginxServer | null>(null);
  formData: CreateNginxServerRequest = {
    name: '',
    listen: ['80'],
    locations: [],
    ssl: false,
  };

  // 查看配置
  configModalVisible = false;
  viewingConfig = signal('');

  ngOnInit() {
    this.loadServers();
  }

  async loadServers() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.getServers();
      if (res.success && res.servers) {
        this.servers.set(res.servers);
      } else {
        this.message.error(res.error || '加载失败');
      }
    } catch (err: any) {
      this.message.error('加载失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  showCreateModal() {
    this.editingServer.set(null);
    this.formData = {
      name: '',
      listen: ['80'],
      locations: [{ path: '/' }],
      ssl: false,
    };
    this.modalVisible = true;
  }

  editServer(server: NginxServer) {
    this.editingServer.set(server);
    this.formData = {
      name: server.name,
      listen: [...server.listen],
      locations: server.locations.map((l) => ({ ...l })),
      ssl: server.ssl,
    };
    this.modalVisible = true;
  }

  async saveServer() {
    if (!this.formData.name.trim()) {
      this.message.warning('请输入 Server Name');
      return;
    }

    if (this.formData.listen.length === 0) {
      this.message.warning('请至少添加一个监听端口');
      return;
    }

    this.saving.set(true);

    try {
      if (this.editingServer()) {
        // 更新
        const res = await this.nginxService.updateServer(this.editingServer()!.id, this.formData);
        if (res.success) {
          this.message.success('更新成功');
          this.modalVisible = false;
          this.loadServers();
        } else {
          this.message.error(res.error || '更新失败');
        }
      } else {
        // 创建
        const res = await this.nginxService.createServer(this.formData);
        if (res.success) {
          this.message.success('创建成功');
          this.modalVisible = false;
          this.loadServers();
        } else {
          this.message.error(res.error || '创建失败');
        }
      }
    } catch (err: any) {
      this.message.error('操作失败: ' + err.message);
    } finally {
      this.saving.set(false);
    }
  }

  deleteServer(server: NginxServer) {
    this.modal.confirm({
      nzTitle: '确认删除',
      nzContent: `确定要删除 Server "${server.name}" 吗？`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOnOk: async () => {
        try {
          const res = await this.nginxService.deleteServer(server.id);
          if (res.success) {
            this.message.success('删除成功');
            this.loadServers();
          } else {
            this.message.error(res.error || '删除失败');
          }
        } catch (err: any) {
          this.message.error('删除失败: ' + err.message);
        }
      },
    });
  }

  async toggleServer(id: string, enabled: boolean) {
    try {
      const res = enabled
        ? await this.nginxService.enableServer(id)
        : await this.nginxService.disableServer(id);

      if (res.success) {
        this.message.success(enabled ? '启用成功' : '禁用成功');
        this.loadServers();
      } else {
        this.message.error(res.error || '操作失败');
      }
    } catch (err: any) {
      this.message.error('操作失败: ' + err.message);
    }
  }

  viewConfig(server: NginxServer) {
    this.viewingConfig.set(server.configText);
    this.configModalVisible = true;
  }

  addLocation() {
    this.formData.locations.push({ path: '/' });
  }

  removeLocation(index: number) {
    this.formData.locations.splice(index, 1);
  }
}
