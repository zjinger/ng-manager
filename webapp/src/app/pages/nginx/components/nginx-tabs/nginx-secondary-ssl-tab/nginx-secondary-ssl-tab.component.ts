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
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { NginxService } from '../../../services/nginx.service';
import type { NginxSslCertificate, NginxSslStatus } from '../../../models/nginx.types';

interface SslEditRow extends NginxSslCertificate {}

interface SslDrawerForm {
  domain: string;
  certPath: string;
  keyPath: string;
  expireAt: string;
  status: NginxSslStatus;
  autoRenew: boolean;
}

@Component({
  selector: 'app-nginx-secondary-ssl-tab',
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
    NzSwitchModule,
  ],
  template: `
    <div class="panel-header-row">
      <span class="panel-tip">管理 SSL 证书与到期状态</span>
      <div class="header-actions">
        <button nz-button nzType="default" (click)="openCreateDrawer()">
          <nz-icon nzType="plus" nzTheme="outline"></nz-icon>
          新增证书
        </button>
        <button nz-button nzType="primary" (click)="saveAll()" [nzLoading]="saving()" [disabled]="!dirty()">
          <nz-icon nzType="save" nzTheme="outline"></nz-icon>
          保存
        </button>
      </div>
    </div>

    <nz-spin [nzSpinning]="loading()">
      <div class="ssl-cards">
        @if (!rows().length) {
          <div class="empty-row">暂无 SSL 证书配置，点击“新增证书”开始维护</div>
        } @else {
          @for (row of rows(); track row.id) {
            <div class="ssl-card">
              <div class="card-head">
                <div class="card-domain mono">{{ row.domain }}</div>
                <span class="status-badge" [ngClass]="row.status">{{ statusText(row.status) }}</span>
              </div>

              <div class="meta-list">
                <div class="meta-item">
                  <span class="meta-label">到期时间</span>
                  <span class="meta-value mono">{{ row.expireAt || '-' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">自动续期</span>
                  <span class="meta-value">{{ row.autoRenew ? '已启用' : '未启用' }}</span>
                </div>
                <div class="meta-item block">
                  <span class="meta-label">证书路径</span>
                  <span class="meta-value mono">{{ row.certPath || '-' }}</span>
                </div>
                <div class="meta-item block">
                  <span class="meta-label">私钥路径</span>
                  <span class="meta-value mono">{{ row.keyPath || '-' }}</span>
                </div>
              </div>

              <div class="card-actions">
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
      [nzTitle]="editingId() ? '编辑证书' : '新增证书'"
      [nzWidth]="500"
      [nzPlacement]="'right'"
      (nzOnClose)="closeDrawer()"
    >
      <ng-container *nzDrawerContent>
        <div class="drawer-body">
          <form nz-form nzLayout="vertical">
            <nz-form-item>
              <nz-form-label nzRequired>域名</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  [(ngModel)]="drawerForm.domain"
                  name="sslDomain"
                  placeholder="example.com"
                  class="mono"
                />
              </nz-form-control>
            </nz-form-item>

            <div class="form-grid">
              <nz-form-item>
                <nz-form-label>状态</nz-form-label>
                <nz-form-control>
                  <nz-select [(ngModel)]="drawerForm.status" name="sslStatus">
                    <nz-option nzValue="valid" nzLabel="有效"></nz-option>
                    <nz-option nzValue="expiring" nzLabel="即将过期"></nz-option>
                    <nz-option nzValue="expired" nzLabel="已过期"></nz-option>
                    <nz-option nzValue="pending" nzLabel="待接入"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label>到期时间</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    [(ngModel)]="drawerForm.expireAt"
                    name="sslExpireAt"
                    placeholder="YYYY-MM-DD"
                    class="mono"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>

            <nz-form-item>
              <nz-form-label>自动续期</nz-form-label>
              <nz-form-control>
                <nz-switch [(ngModel)]="drawerForm.autoRenew" name="sslAutoRenew"></nz-switch>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>证书路径</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  [(ngModel)]="drawerForm.certPath"
                  name="sslCertPath"
                  placeholder="/etc/nginx/ssl/fullchain.pem"
                  class="mono"
                />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>私钥路径</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  [(ngModel)]="drawerForm.keyPath"
                  name="sslKeyPath"
                  placeholder="/etc/nginx/ssl/privkey.pem"
                  class="mono"
                />
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

    .ssl-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 10px;
    }

    .ssl-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border: 1px solid var(--border-light);
      border-radius: 6px;
      padding: 10px;
      background: #fff;
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 8px;
    }

    .card-domain {
      font-size: var(--nginx-font-size-base, 14px);
      color: var(--text-1);
      font-weight: 600;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      height: 24px;
      border-radius: 12px;
      padding: 0 10px;
      font-size: var(--nginx-font-size-sm, 12px);
      line-height: 24px;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .status-badge.valid {
      color: var(--green);
      border-color: rgba(0, 180, 42, 0.2);
      background: var(--green-bg);
    }

    .status-badge.expiring {
      color: var(--orange);
      border-color: rgba(255, 125, 0, 0.2);
      background: var(--orange-bg);
    }

    .status-badge.expired {
      color: var(--red);
      border-color: rgba(245, 63, 63, 0.2);
      background: var(--red-bg);
    }

    .status-badge.pending {
      color: var(--text-2);
      border-color: var(--border);
      background: var(--bg-input);
    }

    .meta-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .meta-item {
      display: grid;
      grid-template-columns: 80px 1fr;
      gap: 8px;
      min-width: 0;
    }

    .meta-item.block {
      grid-template-columns: 1fr;
    }

    .meta-label {
      font-size: var(--nginx-font-size-sm, 12px);
      color: var(--text-3);
      font-weight: 600;
    }

    .meta-value {
      color: var(--text-1);
      font-size: var(--nginx-font-size-sm, 12px);
      min-width: 0;
      word-break: break-all;
    }

    .mono {
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .drawer-body {
      padding: 0 24px 16px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
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
      grid-column: 1 / -1;
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

      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class NginxSecondarySslTabComponent implements OnInit {
  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);

  loading = signal(false);
  saving = signal(false);
  dirty = signal(false);
  rows = signal<SslEditRow[]>([]);
  drawerVisible = signal(false);
  editingId = signal<string | null>(null);

  drawerForm: SslDrawerForm = this.createEmptyForm();

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.getSslCertificates();
      if (res.success && res.certificates) {
        this.rows.set(res.certificates.map(item => ({ ...item })));
        this.dirty.set(false);
      } else {
        this.message.error(res.error || '加载 SSL 配置失败');
      }
    } catch (err: any) {
      this.message.error('加载 SSL 配置失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  openCreateDrawer() {
    this.editingId.set(null);
    this.drawerForm = this.createEmptyForm();
    this.drawerVisible.set(true);
  }

  openEditDrawer(row: SslEditRow) {
    this.editingId.set(row.id);
    this.drawerForm = {
      domain: row.domain,
      certPath: row.certPath,
      keyPath: row.keyPath,
      expireAt: row.expireAt,
      status: row.status,
      autoRenew: row.autoRenew,
    };
    this.drawerVisible.set(true);
  }

  closeDrawer() {
    this.drawerVisible.set(false);
  }

  submitDrawer() {
    const domain = this.drawerForm.domain.trim();
    if (!domain) {
      this.message.warning('证书域名不能为空');
      return;
    }

    if (!this.drawerForm.certPath.trim()) {
      this.message.warning('证书路径不能为空');
      return;
    }

    if (!this.drawerForm.keyPath.trim()) {
      this.message.warning('私钥路径不能为空');
      return;
    }

    const normalized: SslEditRow = {
      id: this.editingId() || this.makeId(),
      domain,
      certPath: this.drawerForm.certPath.trim(),
      keyPath: this.drawerForm.keyPath.trim(),
      expireAt: this.drawerForm.expireAt.trim(),
      status: this.normalizeStatus(this.drawerForm.status),
      autoRenew: this.drawerForm.autoRenew,
    };

    if (this.editingId()) {
      this.rows.update(rows => rows.map(item => (item.id === normalized.id ? normalized : item)));
    } else {
      this.rows.update(rows => [...rows, normalized]);
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

  statusText(status: NginxSslStatus): string {
    switch (status) {
      case 'valid':
        return '有效';
      case 'expiring':
        return '即将过期';
      case 'expired':
        return '已过期';
      default:
        return '待接入';
    }
  }

  async saveAll() {
    const payload: NginxSslCertificate[] = [];

    for (const row of this.rows()) {
      const domain = row.domain.trim();
      if (!domain) {
        this.message.warning('证书域名不能为空');
        return;
      }

      payload.push({
        ...row,
        id: row.id || this.makeId(),
        domain,
        certPath: row.certPath.trim(),
        keyPath: row.keyPath.trim(),
        expireAt: row.expireAt.trim(),
        status: this.normalizeStatus(row.status),
      });
    }

    this.saving.set(true);
    try {
      const res = await this.nginxService.saveSslCertificates(payload);
      if (res.success) {
        this.message.success('SSL 配置已保存');
        this.dirty.set(false);
        await this.loadData();
      } else {
        this.message.error(res.error || '保存 SSL 配置失败');
      }
    } catch (err: any) {
      this.message.error('保存 SSL 配置失败: ' + err.message);
    } finally {
      this.saving.set(false);
    }
  }

  private normalizeStatus(status: NginxSslStatus): NginxSslStatus {
    if (status === 'valid' || status === 'expiring' || status === 'expired' || status === 'pending') {
      return status;
    }
    return 'pending';
  }

  private makeId(): string {
    return `ssl-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private createEmptyForm(): SslDrawerForm {
    return {
      domain: '',
      certPath: '',
      keyPath: '',
      expireAt: '',
      status: 'pending',
      autoRenew: false,
    };
  }
}


