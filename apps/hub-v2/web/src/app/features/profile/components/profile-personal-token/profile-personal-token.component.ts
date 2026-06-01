import { CommonModule, DatePipe } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PanelCardComponent } from '@shared/ui';
import type { PersonalApiTokenAuditLogItem, PersonalApiTokenEntity, PersonalTokenScope } from '../../models/profile.model';
import { ProfileApiService } from '../../services/profile-api.service';

type ScopeOption = {
  value: PersonalTokenScope;
  label: string;
  desc: string;
};

@Component({
  selector: 'app-profile-personal-token',
  standalone: true,
  imports: [
    CommonModule,
    ClipboardModule,
    FormsModule,
    DatePipe,
    NzButtonModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTagModule,
    PanelCardComponent,
  ],
  template: `
    <app-panel-card title="开发访问令牌 (Personal Token)">
      <div class="token-header">
        <p class="token-hint">用于以你的身份调用 Hub v2 写接口。新建后只会展示一次完整 Token，请立即保存。</p>
        <div class="token-header__actions">
          <button
            nz-button
            nzShape="circle"
            [title]="auditVisible() ? '收起 Token 使用记录' : '查看 Token 使用记录'"
            (click)="toggleAuditLogs()"
          >
            <nz-icon [nzType]="auditVisible() ? 'up' : 'history'" />
          </button>
          <button nz-button nzType="primary" (click)="openCreateModal()">
            <nz-icon nzType="plus" />
            新建 Token
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="token-empty">正在加载 Token 列表...</div>
      } @else if (items().length === 0) {
        <div class="token-empty">暂无 Token，可点击“新建 Token”。</div>
      } @else {
        <div class="token-list">
          @for (item of items(); track item.id) {
            <div class="token-row">
              <div class="token-row__main">
                <div class="token-row__title">
                  <strong>{{ item.name }}</strong>
                  <nz-tag [nzColor]="item.status === 'active' ? 'success' : 'default'">
                    {{ item.status === 'active' ? '生效中' : '已撤销' }}
                  </nz-tag>
                </div>
                <div class="token-row__prefix">{{ item.tokenPrefix }}</div>
                <div class="token-row__scopes">{{ scopeSummary(item.scopes) }}</div>
                <div class="token-row__meta">
                  <span>过期: {{ item.expiresAt ? (item.expiresAt | date: 'yyyy-MM-dd HH:mm') : '永不过期' }}</span>
                  <span>最近使用: {{ item.lastUsedAt ? (item.lastUsedAt | date: 'yyyy-MM-dd HH:mm') : '-' }}</span>
                  <span>创建: {{ item.createdAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                </div>
              </div>
              <div class="token-row__actions">
                @if (item.status === 'active') {
                  <button
                    nz-button
                    nzDanger
                    nz-popconfirm
                    nzPopconfirmTitle="确认撤销该 Token？撤销后不可恢复。"
                    (nzOnConfirm)="revoke(item.id)"
                  >
                    撤销
                  </button>
                } @else {
                  <button
                    nz-button
                    nzDanger
                    nz-popconfirm
                    nzPopconfirmTitle="确认删除该已撤销 Token 记录？删除后不可恢复。"
                    (nzOnConfirm)="deleteRevoked(item.id)"
                  >
                    删除记录
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (auditVisible()) {
        <div class="audit-section">
          <div class="audit-section__header">
            <div>
              <h3>Token 使用记录</h3>
              <p>展示通过你的 Personal Token 发起的调用记录。</p>
            </div>
            <button nz-button (click)="loadAuditLogs()">
              <nz-icon nzType="reload" />
              刷新
            </button>
          </div>

          <div class="audit-filters">
            <nz-select class="audit-filter" nzPlaceHolder="全部 Token" [ngModel]="auditTokenId()" (ngModelChange)="setAuditToken($event)">
              <nz-option nzLabel="全部 Token" nzValue="" />
              @for (item of items(); track item.id) {
                <nz-option [nzLabel]="item.name" [nzValue]="item.id" />
              }
            </nz-select>
            <nz-select class="audit-filter" nzPlaceHolder="全部动作" [ngModel]="auditAction()" (ngModelChange)="setAuditAction($event)">
              <nz-option nzLabel="全部动作" nzValue="" />
              @for (action of auditActionOptions; track action.value) {
                <nz-option [nzLabel]="action.label" [nzValue]="action.value" />
              }
            </nz-select>
            <input
              nz-input
              class="audit-project-input"
              [ngModel]="auditProjectKey()"
              (ngModelChange)="auditProjectKey.set($event)"
              (keyup.enter)="searchAuditLogs()"
              placeholder="projectKey"
            />
            <nz-date-picker
              class="audit-date"
              nzPlaceHolder="开始日期"
              [ngModel]="auditDateFrom()"
              (ngModelChange)="setAuditDateFrom($event)"
            />
            <nz-date-picker
              class="audit-date"
              nzPlaceHolder="结束日期"
              [ngModel]="auditDateTo()"
              (ngModelChange)="setAuditDateTo($event)"
            />
            <button nz-button (click)="searchAuditLogs()">筛选</button>
          </div>

          @if (auditLoading()) {
            <div class="token-empty">正在加载使用记录...</div>
          } @else if (auditItems().length === 0) {
            <div class="token-empty">暂无 Token 使用记录。</div>
          } @else {
            <div class="audit-list">
              @for (log of auditItems(); track log.id) {
                <div class="audit-row">
                  <div class="audit-row__main">
                    <div class="audit-row__title">
                      <strong>{{ actionLabel(log.action) }}</strong>
                      <nz-tag nzColor="blue">{{ log.projectKey || '-' }}</nz-tag>
                    </div>
                    <div class="audit-row__meta">
                      <span>{{ tokenDisplay(log) }}</span>
                      <span>{{ log.createdAt | date: 'yyyy-MM-dd HH:mm:ss' }}</span>
                      <span>IP: {{ log.ip || '-' }}</span>
                    </div>
                    <div class="audit-row__summary">{{ metadataSummary(log) }}</div>
                  </div>
                  <div class="audit-row__side">
                    <span>{{ log.resourceType }}</span>
                    <span class="mono">{{ log.resourceId || '-' }}</span>
                  </div>
                </div>
              }
            </div>
            <div class="audit-pagination">
              <span>共 {{ auditTotal() }} 条记录</span>
              <nz-pagination
                [nzPageIndex]="auditPage()"
                [nzPageSize]="auditPageSize()"
                [nzTotal]="auditTotal()"
                [nzShowSizeChanger]="true"
                (nzPageIndexChange)="changeAuditPage($event)"
                (nzPageSizeChange)="changeAuditPageSize($event)"
              />
            </div>
          }
        </div>
      }
    </app-panel-card>

    <nz-modal
      [nzVisible]="createOpen()"
      nzTitle="新建 Personal Token"
      [nzOkLoading]="creating()"
      nzOkText="创建"
      nzCancelText="取消"
      (nzOnOk)="submitCreate()"
      (nzOnCancel)="createOpen.set(false)"
    >
      <ng-container *nzModalContent>
        <div class="create-form">
          <label>名称</label>
          <input nz-input [ngModel]="createName()" (ngModelChange)="createName.set($event)" placeholder="例如：NGM UI" />

          <label>权限范围</label>
          <div class="scope-list">
            @for (scope of scopeOptions; track scope.value) {
              <label
                nz-checkbox
                class="scope-item"
                [ngModel]="selectedScopes().includes(scope.value)"
                (ngModelChange)="toggleScope(scope.value, $event)"
              >
                <div class="scope-item__text">
                  <strong>{{ scope.label }}</strong>
                  <span>{{ scope.desc }}</span>
                </div>
              </label>
            }
          </div>

          <label>过期时间 (可选)</label>
          <nz-date-picker
            nzShowTime
            nzFormat="yyyy-MM-dd HH:mm"
            nzPlaceHolder="不设置则永不过期"
            [ngModel]="expiresAt()"
            (ngModelChange)="expiresAt.set($event)"
          />
        </div>
      </ng-container>
    </nz-modal>

    <nz-modal
      [nzVisible]="revealOpen()"
      nzTitle="Token 创建成功（仅展示一次）"
      nzOkText="我已保存,关闭窗口"
      [nzCancelText]="null"
      (nzOnOk)="revealOpen.set(false)"
      (nzOnCancel)="revealOpen.set(false)"
    >
      <ng-container *nzModalContent>
        <p class="token-reveal-hint">请立即复制并妥善保存，关闭后将无法再次查看完整 Token。</p>
        <div class="token-reveal-value">{{ revealToken() }}</div>
        <button nz-button (click)="copyRevealToken()">
          <nz-icon nzType="copy" nzTheme="outline"></nz-icon>
          复制 Token
        </button>
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .token-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px 18px;
      }
      .token-header__actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .token-hint {
        margin: 0;
        color: var(--text-muted);
        font-size: 13px;
      }
      .token-empty {
        color: var(--text-muted);
        padding: 12px 18px;
      }
      .token-list {
        display: grid;
        gap: 12px;
        padding: 12px;
      }
      .token-row {
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 12px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .token-row__main {
        min-width: 0;
        display: grid;
        gap: 6px;
      }
      .token-row__title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .token-row__prefix {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 12px;
        color: var(--text-muted);
      }
      .token-row__scopes {
        font-size: 12px;
      }
      .token-row__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .create-form {
        display: grid;
        gap: 10px;
      }
      .scope-list {
        display: grid;
        gap: 8px;
        max-height: none;
        overflow: visible;
        padding: 0;
      }
      .scope-item {
        display: flex;
        align-items: flex-start;
        width: 100%;
        margin: 0;
        padding: 4px 0;
        border-radius: 8px;
      }
      :host ::ng-deep .scope-item .ant-checkbox + span {
        padding-inline-start: 0;
        padding-inline-end: 0;
        display: block;
        flex: 1;
        min-width: 0;
      }
      :host ::ng-deep .scope-item .ant-checkbox {
        margin-top: 2px;
      }
      :host ::ng-deep .scope-item .scope-item__text {
        margin-left: 10px;
      }
      .scope-item__text {
        display: grid;
        gap: 4px;
      }
      .scope-item__text > strong {
        line-height: 1.25;
      }
      .scope-item__text > span {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.45;
      }
      .token-reveal-hint {
        color: var(--text-muted);
        margin-bottom: 10px;
      }
      .token-reveal-value {
        border: 1px dashed var(--border-color);
        border-radius: 8px;
        background: var(--bg-subtle);
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 13px;
        line-height: 1.5;
        padding: 10px;
        margin-bottom: 10px;
        word-break: break-all;
      }
      .audit-section {
        border-top: 1px solid var(--border-color-soft);
        margin-top: 4px;
        padding: 16px 18px 18px;
      }
      .audit-section__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }
      .audit-section__header h3 {
        margin: 0;
        color: var(--text-heading);
        font-size: 15px;
      }
      .audit-section__header p {
        margin: 4px 0 0;
        color: var(--text-muted);
        font-size: 12px;
      }
      .audit-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .audit-filter {
        width: 180px;
      }
      .audit-project-input {
        width: 180px;
      }
      .audit-date {
        width: 150px;
      }
      .audit-list {
        display: grid;
        gap: 10px;
      }
      .audit-row {
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: var(--bg-container);
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
      }
      .audit-row__main {
        min-width: 0;
        display: grid;
        gap: 6px;
      }
      .audit-row__title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .audit-row__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        color: var(--text-muted);
        font-size: 12px;
      }
      .audit-row__summary {
        color: var(--text-secondary);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .audit-row__side {
        display: grid;
        align-content: center;
        justify-items: end;
        gap: 4px;
        color: var(--text-muted);
        font-size: 12px;
      }
      .audit-pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 12px;
        color: var(--text-muted);
        font-size: 12px;
      }
      .mono {
        font-family: 'SF Mono', 'Fira Code', monospace;
      }
      @media (max-width: 900px) {
        .token-header,
        .token-header__actions,
        .token-row,
        .audit-section__header,
        .audit-row,
        .audit-pagination {
          flex-direction: column;
          align-items: stretch;
        }
        .audit-filter,
        .audit-project-input,
        .audit-date {
          width: 100%;
        }
        .audit-row__side {
          justify-items: start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePersonalTokenComponent {
  private readonly profileApi = inject(ProfileApiService);
  private readonly message = inject(NzMessageService);
  private readonly clipboard = inject(Clipboard);

  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly items = signal<PersonalApiTokenEntity[]>([]);
  readonly createOpen = signal(false);
  readonly revealOpen = signal(false);
  readonly revealToken = signal('');
  readonly createName = signal('');
  readonly selectedScopes = signal<PersonalTokenScope[]>( [ 'issue:comment:write' ] );
  readonly expiresAt = signal<Date | null>(null);
  readonly auditVisible = signal(false);
  readonly auditLoaded = signal(false);
  readonly auditLoading = signal(false);
  readonly auditItems = signal<PersonalApiTokenAuditLogItem[]>([]);
  readonly auditTotal = signal(0);
  readonly auditPage = signal(1);
  readonly auditPageSize = signal(20);
  readonly auditTokenId = signal('');
  readonly auditAction = signal('');
  readonly auditProjectKey = signal('');
  readonly auditDateFrom = signal<Date | null>(null);
  readonly auditDateTo = signal<Date | null>(null);

  readonly scopeOptions: ScopeOption[] = [
    { value: 'issue:comment:write', label: '测试单评论', desc: '创建评论与 @ 提及' },
    { value: 'issue:transition:write', label: '测试单状态流转', desc: '开始、解决、验证、关闭等' },
    { value: 'issue:assign:write', label: '测试单指派', desc: '指派/转派负责人' },
    { value: 'issue:branch:write', label: '测试单协作分支', desc: '创建/删除测试单关联的协作分支' },
    { value: 'issue:participant:write', label: '测试单协作人', desc: '添加或移除协作人' },
    { value: 'doc:create:write', label: '文档创建', desc: '通过 Token API 新建项目文档' },
    { value: 'doc:update:write', label: '文档编辑', desc: '通过 Token API 编辑项目文档内容' },
    { value: 'doc:publish:write', label: '文档发布', desc: '通过 Token API 发布项目文档' },
    { value: 'rd:transition:write', label: '研发项状态流转', desc: '开始、阻塞、恢复、完成' },
    { value: 'rd:edit:write', label: '研发项编辑', desc: '编辑标题、描述、计划时间等' },
    { value: 'rd:delete:write', label: '研发项删除', desc: '删除研发项' },
  ];

  readonly auditActionOptions = [
    { value: 'doc.create', label: '文档创建' },
    { value: 'doc.update', label: '文档编辑' },
    { value: 'doc.publish', label: '文档发布' },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.profileApi.listPersonalTokens().subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.message.error('Token 列表加载失败');
      },
    });
  }

  openCreateModal(): void {
    this.createName.set('');
    this.selectedScopes.set(
      [
        'issue:comment:write',
        'issue:transition:write',
        'issue:assign:write',
        'issue:branch:write',
        'issue:participant:write',
        'doc:create:write',
        'doc:update:write',
        'doc:publish:write',
        'rd:transition:write',
        'rd:edit:write',
        'rd:delete:write'
      ]);
    this.expiresAt.set(null);
    this.createOpen.set(true);
  }

  toggleScope(scope: PersonalTokenScope, checked: boolean): void {
    this.selectedScopes.update((items) => {
      if (checked) {
        return Array.from(new Set([...items, scope]));
      }
      return items.filter((item) => item !== scope);
    });
  }

  submitCreate(): void {
    const name = this.createName().trim();
    const scopes = this.selectedScopes();
    if (!name) {
      this.message.warning('请输入 Token 名称');
      return;
    }
    if (scopes.length === 0) {
      this.message.warning('请至少选择一个权限范围');
      return;
    }
    this.creating.set(true);
    this.profileApi
      .createPersonalToken({
        name,
        scopes,
        expiresAt: this.expiresAt() ? this.expiresAt()!.toISOString() : null,
      })
      .subscribe({
        next: (res) => {
          this.creating.set(false);
          this.createOpen.set(false);
          this.revealToken.set(res.token);
          this.revealOpen.set(true);
          this.load();
        },
        error: () => {
          this.creating.set(false);
          this.message.error('Token 创建失败');
        },
      });
  }

  revoke(tokenId: string): void {
    this.profileApi.revokePersonalToken(tokenId).subscribe({
      next: () => {
        this.message.success('Token 已撤销');
        this.load();
      },
      error: () => {
        this.message.error('Token 撤销失败');
      },
    });
  }

  deleteRevoked(tokenId: string): void {
    this.profileApi.deleteRevokedPersonalToken(tokenId).subscribe({
      next: () => {
        this.message.success('Token 记录已删除');
        this.load();
        if (this.auditVisible()) {
          this.loadAuditLogs();
        }
      },
      error: () => {
        this.message.error('Token 记录删除失败');
      },
    });
  }

  scopeSummary(scopes: PersonalTokenScope[]): string {
    if (scopes.length === 0) {
      return '-';
    }
    const labels = scopes.map((scope) => this.scopeOptions.find((item) => item.value === scope)?.label || scope);
    return labels.join('、');
  }

  toggleAuditLogs(): void {
    const visible = !this.auditVisible();
    this.auditVisible.set(visible);
    if (visible && !this.auditLoaded()) {
      this.loadAuditLogs();
    }
  }

  loadAuditLogs(): void {
    this.auditLoading.set(true);
    this.profileApi
      .listPersonalTokenAuditLogs({
        page: this.auditPage(),
        pageSize: this.auditPageSize(),
        tokenId: this.auditTokenId().trim() || undefined,
        action: this.auditAction().trim() || undefined,
        projectKey: this.auditProjectKey().trim() || undefined,
        dateFrom: this.toStartIso(this.auditDateFrom()),
        dateTo: this.toEndIso(this.auditDateTo()),
      })
      .subscribe({
        next: (result) => {
          this.auditItems.set(result.items);
          this.auditTotal.set(result.total);
          this.auditPage.set(result.page);
          this.auditPageSize.set(result.pageSize);
          this.auditLoaded.set(true);
          this.auditLoading.set(false);
        },
        error: () => {
          this.auditLoading.set(false);
          this.message.error('Token 使用记录加载失败');
        },
      });
  }

  searchAuditLogs(): void {
    this.auditPage.set(1);
    this.loadAuditLogs();
  }

  setAuditToken(value: string): void {
    this.auditTokenId.set(value);
    this.searchAuditLogs();
  }

  setAuditAction(value: string): void {
    this.auditAction.set(value);
    this.searchAuditLogs();
  }

  setAuditDateFrom(value: Date | null): void {
    this.auditDateFrom.set(value);
    this.searchAuditLogs();
  }

  setAuditDateTo(value: Date | null): void {
    this.auditDateTo.set(value);
    this.searchAuditLogs();
  }

  changeAuditPage(page: number): void {
    this.auditPage.set(page);
    this.loadAuditLogs();
  }

  changeAuditPageSize(pageSize: number): void {
    this.auditPageSize.set(pageSize);
    this.auditPage.set(1);
    this.loadAuditLogs();
  }

  actionLabel(action: string): string {
    return this.auditActionOptions.find((item) => item.value === action)?.label || action;
  }

  tokenDisplay(log: PersonalApiTokenAuditLogItem): string {
    const name = log.tokenName?.trim() || '已删除 Token';
    const prefix = log.tokenPrefix?.trim() || log.tokenId;
    return `${name} · ${prefix}`;
  }

  metadataSummary(log: PersonalApiTokenAuditLogItem): string {
    const metadata = log.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return '无附加信息';
    }
    const value = metadata as Record<string, unknown>;
    const parts = [
      this.textPart('标题', value['title']),
      this.textPart('分类', value['categoryId'] ?? value['category']),
      this.textPart('状态', value['status']),
      this.textPart('来源', value['source']),
      this.textPart('Slug', value['slug']),
    ].filter(Boolean);
    return parts.join(' · ') || '无附加信息';
  }

  copyRevealToken(): void {
    const token = this.revealToken().trim();
    if (!token) {
      return;
    }
    const ok = this.clipboard.copy(token);
    if (ok) {
      this.message.success('Token 已复制');
    } else {
      this.message.error('复制 Token 失败，请手动复制');
    }
  }

  private textPart(label: string, value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    const text = Array.isArray(value) ? value.join(', ') : String(value);
    return text.trim() ? `${label}: ${text}` : '';
  }

  private toStartIso(value: Date | null): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  private toEndIso(value: Date | null): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }
}
