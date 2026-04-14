import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { NginxService } from '../../services/nginx.service';
import { NginxServerDrawerComponent } from '../nginx-server-drawer/nginx-server-drawer.component';
import type { NginxServer } from '../../models/nginx.types';

/**
 * Nginx Server 列表组件
 * 对齐设计稿 nginx.html 中 server-block-list 样式
 */
@Component({
  selector: 'app-nginx-server-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSpinModule,
    NzTooltipModule,
    NginxServerDrawerComponent,
  ],
  template: `
    <div class="server-list">
      <!-- 顶部操作栏 -->
      @if (showToolbar) {
        <div class="list-header">
          <div class="header-left">
            <button nz-button nzType="default" (click)="importServer()">
              <nz-icon nzType="upload" nzTheme="outline"></nz-icon>
              导入
            </button>
            <button nz-button nzType="primary" (click)="openDrawer(null)">
              <nz-icon nzType="plus" nzTheme="outline"></nz-icon>
              新增 Server
            </button>
          </div>
        </div>
      }

      <div class="server-grid-shell">
        <div class="server-grid-head">
          <div class="cell status-col">状态</div>
          <div class="cell">Server 名称</div>
          <div class="cell listen-col">监听端口</div>
          <div class="cell domain-col">域名</div>
          <div class="cell root-col">根目录</div>
          <div class="cell action-col">操作</div>
        </div>

        <nz-spin [nzSpinning]="loading()">
          <div class="server-grid-body">
            @if (!loading() && !servers().length) {
              <div class="empty-state">
                <nz-icon nzType="inbox" nzTheme="outline" class="empty-icon"></nz-icon>
                <p>暂无 Server 配置</p>
              </div>
            } @else {
              @for (server of servers(); track server.id) {
                <div class="server-grid-row" [class.disabled-row]="!server.enabled">
                  <div class="cell status-col">
                    <label class="status-toggle">
                      <input
                        type="checkbox"
                        [checked]="server.enabled"
                        (change)="toggleServer(server.id, !server.enabled)"
                      />
                      <div class="toggle-track"></div>
                    </label>
                  </div>

                  <div class="cell">
                    <div class="server-name">
                      <nz-icon nzType="file" nzTheme="outline" class="conf-icon"></nz-icon>
                      {{ server.name }}
                    </div>
                  </div>

                  <div class="cell listen-col">
                    @for (port of server.listen; track $index) {
                      @if (port === '443' || server.ssl) {
                        <span class="server-listen ssl">:{{ port }} ssl</span>
                      } @else {
                        <span class="server-listen">:{{ port }}</span>
                      }
                    }
                  </div>

                  <div class="cell domain-col">
                    <span class="server-domain">{{ (server.domains || []).join(', ') || '—' }}</span>
                  </div>

                  <div class="cell root-col">
                    <span class="server-root" [title]="server.root || ''">{{ server.root || '—' }}</span>
                  </div>

                  <div class="cell action-col">
                    <div class="row-actions">
                      <button class="row-action-btn" title="编辑" (click)="openDrawer(server)">
                        <nz-icon nzType="edit" nzTheme="outline"></nz-icon>
                      </button>
                      <button class="row-action-btn" title="复制" (click)="copyServer(server)">
                        <nz-icon nzType="copy" nzTheme="outline"></nz-icon>
                      </button>
                      <button class="row-action-btn danger" title="删除" (click)="deleteServer(server)">
                        <nz-icon nzType="delete" nzTheme="outline"></nz-icon>
                      </button>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        </nz-spin>
      </div>
    </div>

    <!-- Server 新增/编辑 Drawer -->
    <app-nginx-server-drawer
      [(visible)]="drawerVisible"
      [editingServer]="editingServer()"
      (saved)="onSaved()"
    ></app-nginx-server-drawer>

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
    /* ========== LIST HEADER ========== */
    .server-list {
      .list-header {
        display: flex;
        align-items: center;
        margin-bottom: 16px;

        .header-left {
          display: flex;
          gap: 8px;
        }
      }
    }

    /* ========== SERVER GRID ========== */
    .server-grid-shell {
      border: none;
      border-radius: 0;
      overflow: hidden;
    }

    .server-grid-head,
    .server-grid-row {
      display: grid;
      grid-template-columns: 72px minmax(180px, 1.2fr) minmax(150px, 0.9fr) minmax(180px, 1fr) minmax(180px, 1fr) 120px;
      align-items: center;
      column-gap: 8px;
      padding: 0 12px;
    }

    .server-grid-head {
      min-height: 42px;
      background: #fafafa;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);

      .cell {
        font-size: var(--nginx-font-size-sm, 12px);
        color: rgba(0, 0, 0, 0.45);
        text-transform: uppercase;
        letter-spacing: 0.4px;
        font-weight: 700;
      }
    }

    .server-grid-body {
      background: #fff;
    }

    .server-grid-row {
      min-height: 56px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      transition: background 120ms ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.02);
      }
    }

    .cell {
      min-width: 0;
    }

    .action-col {
      justify-self: end;
    }

    /* ========== STATUS TOGGLE ========== */
    .status-toggle {
      position: relative;
      display: inline-block;
      width: 34px;
      height: 18px;
      cursor: pointer;
    }

    .status-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-track {
      position: absolute;
      inset: 0;
      background: #434343;
      border: 1px solid #434343;
      border-radius: 9px;
      transition: all 200ms ease;
    }

    .toggle-track::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      background: #fff;
      border-radius: 50%;
      transition: all 200ms ease;
    }

    .status-toggle input:checked + .toggle-track {
      background: #3dd68c;
      border-color: #3dd68c;
    }

    .status-toggle input:checked + .toggle-track::after {
      transform: translateX(16px);
    }

    /* ========== SERVER COLUMNS ========== */
    .server-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      font-size: var(--nginx-font-size-base, 14px);
    }

    .conf-icon {
      color: rgba(0, 0, 0, 0.35);
      flex-shrink: 0;
    }

    .server-listen {
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      font-size: var(--nginx-font-size-sm, 12px);
      color: #e5a832;
      background: rgba(229, 168, 50, 0.12);
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 4px;
    }

    .server-listen.ssl {
      color: #5ea6f7;
      background: rgba(94, 166, 247, 0.12);
    }

    .server-domain {
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      font-size: var(--nginx-font-size-sm, 12px);
      color: rgba(0, 0, 0, 0.55);
    }

    .server-root {
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      font-size: var(--nginx-font-size-sm, 12px);
      color: rgba(0, 0, 0, 0.4);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }

    /* ========== ROW ACTIONS ========== */
    .row-actions {
      display: flex;
      gap: 4px;
      justify-content: flex-end;
      opacity: 0.5;
      transition: opacity 120ms ease;
    }

    .server-grid-row:hover .row-actions {
      opacity: 1;
    }

    .row-action-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background: none;
      border: 1px solid transparent;
      color: rgba(0, 0, 0, 0.4);
      cursor: pointer;
      transition: all 120ms ease;
      padding: 0;
    }

    .row-action-btn:hover {
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.1);
      color: rgba(0, 0, 0, 0.75);
    }

    .row-action-btn.danger:hover {
      color: #ef5350;
      border-color: rgba(239, 83, 80, 0.3);
      background: rgba(239, 83, 80, 0.08);
    }

    .disabled-row {
      opacity: 0.5;
    }

    /* ========== EMPTY STATE ========== */
    .empty-state {
      text-align: center;
      padding: 48px 0;

      .empty-icon {
        font-size: 48px;
        color: rgba(0, 0, 0, 0.2);
        margin-bottom: 16px;
      }

      p {
        color: rgba(0, 0, 0, 0.4);
        margin: 0;
      }
    }

    @media (max-width: 1100px) {
      .server-grid-head {
        display: none;
      }

      .server-grid-row {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 12px;
        align-items: stretch;
      }

      .status-col,
      .listen-col,
      .domain-col,
      .root-col,
      .action-col {
        justify-self: start;
      }

      .action-col {
        width: 100%;
      }

      .row-actions {
        opacity: 1;
      }
    }

    /* ========== CONFIG PREVIEW ========== */
    .config-preview {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 4px;
      padding: 16px;
      margin: 0;
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      font-size: var(--nginx-font-size-base, 14px);
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre-wrap;
    }
  `],
})
export class NginxServerListComponent implements OnInit, OnChanges {
  @Input() showToolbar = true;
  @Input() openCreateToken = 0;
  @Output() summaryChange = new EventEmitter<{ total: number; enabled: number }>();
  @Output() serverListMutated = new EventEmitter<void>();

  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  servers = signal<NginxServer[]>([]);
  loading = signal(false);

  drawerVisible = false;
  editingServer = signal<NginxServer | null>(null);

  configModalVisible = false;
  viewingConfig = signal('');

  ngOnInit() {
    this.loadServers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const openCreate = changes['openCreateToken'];
    if (openCreate && !openCreate.firstChange) {
      this.openDrawer(null);
    }
  }

  async loadServers(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.nginxService.getServers();
      if (res.success && res.servers) {
        this.servers.set(res.servers);
        this.summaryChange.emit({
          total: res.servers.length,
          enabled: res.servers.filter(server => server.enabled).length,
        });
      }
    } catch (err: any) {
      this.message.error('加载失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  openDrawer(server: NginxServer | null): void {
    this.editingServer.set(server);
    this.drawerVisible = true;
  }

  onSaved(): void {
    this.loadServers();
    this.serverListMutated.emit();
  }

  importServer(): void {
    this.message.info('导入功能开发中');
  }

  async toggleServer(id: string, enabled: boolean): Promise<void> {
    try {
      const res = enabled
        ? await this.nginxService.enableServer(id)
        : await this.nginxService.disableServer(id);

      if (res.success) {
        this.message.success(enabled ? '已启用' : '已禁用');
        this.loadServers();
      } else {
        this.message.error(res.error || '操作失败');
      }
    } catch (err: any) {
      this.message.error('操作失败: ' + err.message);
    }
  }

  copyServer(server: NginxServer): void {
    this.editingServer.set(server);
    this.drawerVisible = true;
    this.message.info('复制 Server - 请修改名称后保存');
  }

  deleteServer(server: NginxServer): void {
    this.modal.confirm({
      nzTitle: '确认删除',
      nzContent: `确定要删除 Server "${server.name}" 吗？`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOnOk: async () => {
        try {
          const res = await this.nginxService.deleteServer(server.id);
          if (res.success) {
            this.message.success('已删除');
            this.loadServers();
            this.serverListMutated.emit();
          } else {
            this.message.error(res.error || '删除失败');
          }
        } catch (err: any) {
          this.message.error('删除失败: ' + err.message);
        }
      },
    });
  }
}

