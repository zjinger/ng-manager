import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import type { NginxUpstream, NginxUpstreamStrategy } from '../../../models/nginx.types';
import { NginxModuleStore } from '../../../services/nginx-module.store';

interface UpstreamEditRow {
  id: string;
  name: string;
  strategy: NginxUpstreamStrategy;
  nodes: string[];
  sourceFile: string;
  managed: boolean;
  readonly: boolean;
}

interface UpstreamDrawerForm {
  name: string;
  strategy: NginxUpstreamStrategy;
  nodesText: string;
}

@Component({
  selector: 'app-nginx-secondary-upstream-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDrawerModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzSpinModule,
  ],
  template: `
    <div class="list-header">
      <span class="panel-tip">管理后端服务集群的负载均衡配置</span>
      <div class="header-actions">
        <button nz-button nzType="default" (click)="openCreateDrawer()">
          <nz-icon nzType="plus" nzTheme="outline"></nz-icon>
          新增 Upstream
        </button>
        <button nz-button nzType="primary" (click)="saveAll()" [nzLoading]="saving()" [disabled]="!dirty()">
          <nz-icon nzType="save" nzTheme="outline"></nz-icon>
          保存
        </button>
      </div>
    </div>

    <div class="upstream-grid-shell">
      <div class="upstream-grid-head">
        <div class="cell name-col">UPSTREAM 名称</div>
        <div class="cell source-col">来源</div>
        <div class="cell strategy-col">策略</div>
        <div class="cell nodes-col">节点</div>
        <div class="cell count-col">节点数</div>
        <div class="cell action-col">操作</div>
      </div>

      <nz-spin [nzSpinning]="loading()">
        <div class="upstream-grid-body">
          @if (!loading() && !rows().length) {
            <div class="empty-state">
              <nz-icon nzType="cluster" nzTheme="outline" class="empty-icon"></nz-icon>
              <p>暂无 Upstream 配置</p>
            </div>
          } @else {
            @for (row of rows(); track row.id) {
              <div class="upstream-grid-row" [class.readonly-row]="row.readonly">
                <div class="cell name-col">
                  <span class="upstream-name mono">{{ row.name }}</span>
                </div>

                <div class="cell source-col">
                  <span class="source-badge" [class.managed]="row.managed" [title]="sourceHint(row)">
                    {{ sourceLabel(row) }}
                  </span>
                </div>

                <div class="cell strategy-col">
                  <span class="strategy-pill mono">{{ row.strategy }}</span>
                </div>

                <div class="cell nodes-col">
                  <div class="nodes-wrap">
                    @for (node of row.nodes; track node + '-' + $index) {
                      <span class="node-chip mono">{{ node }}</span>
                    }
                  </div>
                </div>

                <div class="cell count-col">
                  <span class="node-count">{{ row.nodes.length }}</span>
                </div>

                <div class="cell action-col">
                  <div class="row-actions">
                    <button nz-button nzSize="small" nzType="link" (click)="openEditDrawer(row)" [disabled]="row.readonly">
                      <nz-icon nzType="edit" nzTheme="outline"></nz-icon>
                    </button>
                    <button nz-button nzSize="small" nzType="link" nzDanger (click)="removeRow(row.id)" [disabled]="row.readonly">
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

    <nz-drawer
      [nzVisible]="drawerVisible()"
      [nzTitle]="editingId() ? '编辑 Upstream' : '新增 Upstream'"
      [nzWidth]="460"
      [nzPlacement]="'right'"
      (nzOnClose)="closeDrawer()"
    >
      <ng-container *nzDrawerContent>
        <div class="drawer-body">
          <form nz-form nzLayout="vertical">
            <nz-form-item>
              <nz-form-label nzRequired>名称</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  [(ngModel)]="drawerForm.name"
                  name="upstreamName"
                  placeholder="例如 backend_cluster"
                  class="mono"
                />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>策略</nz-form-label>
              <nz-form-control>
                <nz-select [(ngModel)]="drawerForm.strategy" name="upstreamStrategy">
                  <nz-option nzValue="round-robin" nzLabel="round-robin"></nz-option>
                  <nz-option nzValue="least_conn" nzLabel="least_conn"></nz-option>
                  <nz-option nzValue="ip_hash" nzLabel="ip_hash"></nz-option>
                  <nz-option nzValue="hash" nzLabel="hash"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>节点（逗号或换行分隔）</nz-form-label>
              <nz-form-control>
                <textarea
                  nz-input
                  rows="5"
                  [(ngModel)]="drawerForm.nodesText"
                  name="upstreamNodes"
                  placeholder="127.0.0.1:3001, 127.0.0.1:3002"
                  class="mono"
                ></textarea>
              </nz-form-control>
            </nz-form-item>
          </form>
        </div>

        <div class="drawer-footer">
          <button nz-button nzType="default" (click)="closeDrawer()">取消</button>
          <button nz-button nzType="primary" (click)="submitDrawer()">确定</button>
        </div>
      </ng-container>
    </nz-drawer>
  `,
  styles: [`
    :host {
      display: block;
    }

    .list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }

    .panel-tip {
      font-size: var(--nginx-font-size-sm, 12px);
      color: var(--text-3);
    }

    .header-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .upstream-grid-shell {
      border: none;
      border-radius: 0;
      overflow: hidden;
    }

    .upstream-grid-head,
    .upstream-grid-row {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) minmax(150px, 0.9fr) minmax(130px, 0.7fr) minmax(220px, 1.6fr) 88px 116px;
      align-items: center;
      column-gap: 8px;
      padding: 0 12px;
    }

    .upstream-grid-head {
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

    .upstream-grid-body {
      background: #fff;
    }

    .upstream-grid-row {
      min-height: 58px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      transition: background 120ms ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.02);
      }
    }

    .readonly-row {
      background: rgba(0, 0, 0, 0.015);
    }

    .cell {
      min-width: 0;
    }
    .row-actions{
      display: flex;
      gap: 4px;
      justify-content: flex-end;
    }
    .upstream-name {
      display: inline-block;
      font-size: var(--nginx-font-size-base, 14px);
      font-weight: 600;
      color: var(--text-1);
      word-break: break-all;
    }

    .strategy-pill {
      display: inline-flex;
      align-items: center;
      height: 22px;
      border-radius: 11px;
      padding: 0 10px;
      font-size: var(--nginx-font-size-sm, 12px);
      line-height: 22px;
      color: var(--text-2);
      background: var(--bg-input);
      border: 1px solid var(--border-light);
    }

    .source-badge {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      height: 22px;
      padding: 0 8px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.04);
      color: var(--text-3);
      border: 1px solid rgba(0, 0, 0, 0.08);
      font-size: var(--nginx-font-size-sm, 12px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .source-badge.managed {
      background: rgba(22, 93, 255, 0.08);
      color: #165dff;
      border-color: rgba(22, 93, 255, 0.2);
    }

    .nodes-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 0;
    }

    .node-chip {
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 8px;
      border-radius: 4px;
      border: 1px solid rgba(22, 93, 255, 0.2);
      background: rgba(22, 93, 255, 0.08);
      color: #165dff;
      font-size: var(--nginx-font-size-sm, 12px);
      max-width: 100%;
      word-break: break-all;
    }

    .node-count {
      font-size: var(--nginx-font-size-base, 14px);
      color: var(--text-2);
      font-weight: 600;
    }

    .action-col {
      justify-self: end;
    }

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

    .mono {
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
    }

    .drawer-body {
      padding: 0 24px 16px;
    }

    .drawer-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      background: #fff;
    }
  `],
})
export class NginxSecondaryUpstreamTabComponent implements OnInit {
  private moduleStore = inject(NginxModuleStore);
  private message = inject(NzMessageService);

  loading = signal(false);
  saving = signal(false);
  dirty = signal(false);
  rows = signal<UpstreamEditRow[]>([]);
  drawerVisible = signal(false);
  editingId = signal<string | null>(null);

  drawerForm: UpstreamDrawerForm = this.createEmptyForm();

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const res = await this.moduleStore.loadUpstreams();
      if (res.success && res.upstreams) {
        this.rows.set(
          this.moduleStore.upstreams().map(item => ({
            id: item.id,
            name: item.name,
            strategy: item.strategy,
            nodes: (item.nodes || []).map(node => node.trim()).filter(Boolean),
            sourceFile: item.sourceFile || '',
            managed: item.managed !== false,
            readonly: item.readonly === true || item.managed === false,
          })),
        );
        this.dirty.set(false);
      } else {
        this.message.error(res.error || '加载 Upstream 失败');
      }
    } catch (err: any) {
      this.message.error('加载 Upstream 失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  openCreateDrawer() {
    this.editingId.set(null);
    this.drawerForm = this.createEmptyForm();
    this.drawerVisible.set(true);
  }

  openEditDrawer(row: UpstreamEditRow) {
    if (row.readonly) {
      this.message.info('该 Upstream 来自外部配置文件，当前为只读展示');
      return;
    }
    this.editingId.set(row.id);
    this.drawerForm = {
      name: row.name,
      strategy: row.strategy,
      nodesText: row.nodes.join(', '),
    };
    this.drawerVisible.set(true);
  }

  closeDrawer() {
    this.drawerVisible.set(false);
  }

  submitDrawer() {
    const name = this.drawerForm.name.trim();
    if (!name) {
      this.message.warning('Upstream 名称不能为空');
      return;
    }

    const nodes = this.parseNodes(this.drawerForm.nodesText);
    if (!nodes.length) {
      this.message.warning(`Upstream "${name}" 至少需要一个节点`);
      return;
    }

    const normalizedRow: UpstreamEditRow = {
      id: this.editingId() || this.makeId(),
      name,
      strategy: this.drawerForm.strategy,
      nodes,
      sourceFile: '',
      managed: true,
      readonly: false,
    };

    if (this.editingId()) {
      this.rows.update(rows =>
        rows.map(item =>
          item.id === normalizedRow.id
            ? {
                ...normalizedRow,
                sourceFile: item.sourceFile,
                managed: item.managed,
                readonly: item.readonly,
              }
            : item,
        ),
      );
    } else {
      this.rows.update(rows => [...rows, normalizedRow]);
    }

    this.markDirty();
    this.closeDrawer();
  }

  removeRow(id: string) {
    const target = this.rows().find(row => row.id === id);
    if (target?.readonly) {
      this.message.info('该 Upstream 来自外部配置文件，当前不可删除');
      return;
    }
    this.rows.update(rows => rows.filter(row => row.id !== id));
    this.markDirty();
  }

  markDirty() {
    this.dirty.set(true);
  }

  async saveAll() {
    const payload: NginxUpstream[] = [];

    for (const row of this.rows()) {
      if (row.readonly) {
        continue;
      }

      const name = row.name.trim();
      if (!name) {
        this.message.warning('Upstream 名称不能为空');
        return;
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
        this.message.warning(`Upstream 名称不合法: ${name}`);
        return;
      }

      const nodes = (row.nodes || []).map(item => item.trim()).filter(Boolean);
      if (!nodes.length) {
        this.message.warning(`Upstream "${name}" 至少需要一个节点`);
        return;
      }

      payload.push({
        id: row.id,
        name,
        strategy: row.strategy,
        nodes,
        sourceFile: row.sourceFile,
        managed: true,
        readonly: false,
      });
    }

    this.saving.set(true);
    try {
      const res = await this.moduleStore.saveUpstreams(payload);
      if (res.success) {
        this.message.success('Upstream 配置已保存');
        this.dirty.set(false);
        await this.loadData();
      } else {
        this.message.error(res.error || '保存 Upstream 失败');
      }
    } catch (err: any) {
      this.message.error('保存 Upstream 失败: ' + err.message);
    } finally {
      this.saving.set(false);
    }
  }

  private makeId(): string {
    return `upstream-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private parseNodes(nodesText: string): string[] {
    return nodesText
      .split(/[,;\n]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  private createEmptyForm(): UpstreamDrawerForm {
    return {
      name: '',
      strategy: 'round-robin',
      nodesText: '',
    };
  }

  sourceLabel(row: UpstreamEditRow): string {
    const raw = row.sourceFile || '';
    const normalized = raw.replace(/\\/g, '/');
    const name = normalized.split('/').pop() || normalized;
    return name || (row.managed ? '托管文件' : '外部文件');
  }

  sourceHint(row: UpstreamEditRow): string {
    if (!row.sourceFile) {
      return row.managed ? '托管 upstream（来源未解析）' : '外部 upstream（来源未解析）';
    }
    return `${row.managed ? '托管' : '外部'}: ${row.sourceFile}`;
  }
}
