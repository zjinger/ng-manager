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

import { NginxService } from '../../../services/nginx.service';
import type { NginxUpstream, NginxUpstreamStrategy } from '../../../models/nginx.types';

interface UpstreamEditRow {
  id: string;
  name: string;
  strategy: NginxUpstreamStrategy;
  nodesText: string;
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
    <div class="panel-header-row">
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

    <nz-spin [nzSpinning]="loading()">
      <div class="upstream-list">
        @if (!rows().length) {
          <div class="empty-row">暂无 Upstream，点击“新增 Upstream”开始配置</div>
        } @else {
          @for (row of rows(); track row.id) {
            <div class="upstream-row">
              <div class="row-main">
                <div class="row-title-wrap">
                  <span class="row-title mono">{{ row.name }}</span>
                  <span class="strategy-pill">{{ row.strategy }}</span>
                  <span class="node-count">节点 {{ nodeCount(row) }}</span>
                </div>
                <div class="node-lines mono">{{ row.nodesText }}</div>
              </div>

              <div class="row-actions">
                <button nz-button nzType="default" nzSize="small" (click)="openEditDrawer(row)">编辑</button>
                <button nz-button nzType="default" nzDanger nzSize="small" (click)="removeRow(row.id)">删除</button>
              </div>
            </div>
          }
        }
      </div>
    </nz-spin>

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
              <nz-form-label nzRequired>节点（逗号分隔）</nz-form-label>
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

    .panel-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .panel-tip {
      font-size: var(--nginx-font-size-sm, 12px);
      color: var(--text-3);
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .upstream-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .upstream-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--border-light);
      border-radius: 6px;
      padding: 10px;
      background: #fff;
    }

    .row-main {
      flex: 1;
      min-width: 0;
    }

    .row-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      min-height: 24px;
      flex-wrap: wrap;
    }

    .row-title {
      font-size: var(--nginx-font-size-base, 14px);
      font-weight: 600;
      color: var(--text-1);
    }

    .strategy-pill,
    .node-count {
      display: inline-flex;
      align-items: center;
      height: 22px;
      border-radius: 11px;
      padding: 0 10px;
      font-size: var(--nginx-font-size-sm, 12px);
      line-height: 22px;
      color: var(--text-3);
      background: var(--bg-input);
      border: 1px solid var(--border-light);
    }

    .node-lines {
      color: var(--text-2);
      font-size: var(--nginx-font-size-sm, 12px);
      line-height: 1.6;
      white-space: normal;
      word-break: break-all;
    }

    .row-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
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

    .empty-row {
      border: 1px dashed var(--border);
      border-radius: 6px;
      color: var(--text-3);
      font-size: var(--nginx-font-size-sm, 12px);
      text-align: center;
      padding: 20px 12px;
      background: #fff;
    }

    @media (max-width: 992px) {
      .panel-header-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-actions {
        width: 100%;
      }
    }
  `],
})
export class NginxSecondaryUpstreamTabComponent implements OnInit {
  private nginxService = inject(NginxService);
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
      const res = await this.nginxService.getUpstreams();
      if (res.success && res.upstreams) {
        this.rows.set(
          res.upstreams.map(item => ({
            id: item.id,
            name: item.name,
            strategy: item.strategy,
            nodesText: item.nodes.join(', '),
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
    this.editingId.set(row.id);
    this.drawerForm = {
      name: row.name,
      strategy: row.strategy,
      nodesText: row.nodesText,
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
      nodesText: nodes.join(', '),
    };

    if (this.editingId()) {
      this.rows.update(rows => rows.map(item => (item.id === normalizedRow.id ? normalizedRow : item)));
    } else {
      this.rows.update(rows => [...rows, normalizedRow]);
    }

    this.markDirty();
    this.closeDrawer();
  }

  removeRow(id: string) {
    this.rows.update(rows => rows.filter(row => row.id !== id));
    this.markDirty();
  }

  markDirty() {
    this.dirty.set(true);
  }

  nodeCount(row: UpstreamEditRow): number {
    return this.parseNodes(row.nodesText).length;
  }

  async saveAll() {
    const payload: NginxUpstream[] = [];

    for (const row of this.rows()) {
      const name = row.name.trim();
      if (!name) {
        this.message.warning('Upstream 名称不能为空');
        return;
      }

      const nodes = this.parseNodes(row.nodesText);

      if (!nodes.length) {
        this.message.warning(`Upstream "${name}" 至少需要一个节点`);
        return;
      }

      payload.push({
        id: row.id,
        name,
        strategy: row.strategy,
        nodes,
      });
    }

    this.saving.set(true);
    try {
      const res = await this.nginxService.saveUpstreams(payload);
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
}


