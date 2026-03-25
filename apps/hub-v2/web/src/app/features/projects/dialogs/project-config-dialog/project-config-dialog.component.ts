import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { DialogShellComponent } from '@shared/ui';
import { NzTooltipDirective } from "ng-zorro-antd/tooltip";
import type { CreateRdStageInput, RdStageEntity, UpdateRdStageInput } from '../../../rd/models/rd.model';
import type {
  CreateProjectApiTokenInput,
  CreateProjectMetaItemInput,
  CreateProjectVersionItemInput,
  ProjectApiTokenEntity,
  ProjectApiTokenScope,
  ProjectMetaItem,
  ProjectSummary,
  ProjectVersionItem,
  UpdateProjectMetaItemInput,
  UpdateProjectVersionItemInput
} from '../../models/project.model';

@Component({
  selector: 'app-project-config-dialog',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzSwitchModule,
    NzTabsModule,
    DialogShellComponent,
    NzTooltipDirective
],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="1040"
      [title]="project() ? project()!.name + ' · 项目配置' : '项目配置'"
      [subtitle]="'维护模块、环境、版本和研发阶段。'"
      [icon]="'setting'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body class="config-dialog">
        <nz-tabs nzSize="small" [nzDestroyInactiveTabPane]="true">
          <nz-tab nzTitle="模块">
            <section class="section">
              <div class="creator">
                <input nz-input placeholder="新增模块名称，如用户管理" [ngModel]="moduleDraft()" (ngModelChange)="moduleDraft.set($event)" />
                <button nz-button nzType="primary" [disabled]="!moduleDraft().trim() || busy()" (click)="submitModuleCreate()">
                  <nz-icon nzType="plus" nzTheme="outline" />新增
                </button>
              </div>
              <div class="list">
                @for (item of modules(); track item.id) {
                  <div class="row">
                    <input #nameRef nz-input [ngModel]="item.name" />
                    <input #descRef nz-input [ngModel]="item.description || ''" placeholder="描述（可选）" />
                    <input #sortRef nz-input type="number" [ngModel]="item.sort" min="0" />
                    <nz-switch
                      [ngModel]="item.enabled"
                      [nzDisabled]="busy() || isModulePending(item.id)"
                      (ngModelChange)="updateModule.emit({ id: item.id, patch: { enabled: !!$event } })"
                    ></nz-switch>
                    <button
                      nz-button
                      nzType="default"
                      [disabled]="busy() || isModulePending(item.id)"
                      [nzLoading]="isModulePending(item.id)"
                      (click)="saveModule(item, nameRef.value, descRef.value, asNumber(sortRef.value))"
                    >
                      保存
                    </button>
                    <button
                      nz-button
                      nzType="default"
                      nzDanger
                      [disabled]="busy() || isModulePending(item.id)"
                      [nzLoading]="isModulePending(item.id)"
                      nz-popconfirm
                      nzPopconfirmTitle="确认删除该模块？"
                      (nzOnConfirm)="removeModule.emit(item.id)"
                    >
                      删除
                    </button>
                  </div>
                } @empty {
                  <div class="empty">暂无模块配置</div>
                }
              </div>
            </section>
          </nz-tab>

          <nz-tab nzTitle="环境">
            <section class="section">
              <div class="creator">
                <input nz-input placeholder="新增环境名称，如19号机测试环境" [ngModel]="environmentDraft()" (ngModelChange)="environmentDraft.set($event)" />
                <button
                  nz-button
                  nzType="primary"
                  [disabled]="!environmentDraft().trim() || busy()"
                  (click)="submitEnvironmentCreate()"
                >
                  <nz-icon nzType="plus" nzTheme="outline" />新增
                </button>
              </div>
              <div class="list">
                @for (item of environments(); track item.id) {
                  <div class="row">
                    <input #nameRef nz-input [ngModel]="item.name" />
                    <input #descRef nz-input [ngModel]="item.description || ''" placeholder="描述（可选）" />
                    <input #sortRef nz-input type="number" [ngModel]="item.sort" min="0" />
                    <nz-switch
                      [ngModel]="item.enabled"
                      [nzDisabled]="busy() || isEnvironmentPending(item.id)"
                      (ngModelChange)="updateEnvironment.emit({ id: item.id, patch: { enabled: !!$event } })"
                    ></nz-switch>
                    <button
                      nz-button
                      nzType="default"
                      [disabled]="busy() || isEnvironmentPending(item.id)"
                      [nzLoading]="isEnvironmentPending(item.id)"
                      (click)="saveEnvironment(item, nameRef.value, descRef.value, asNumber(sortRef.value))"
                    >
                      保存
                    </button>
                    <button
                      nz-button
                      nzType="default"
                      nzDanger
                      [disabled]="busy() || isEnvironmentPending(item.id)"
                      [nzLoading]="isEnvironmentPending(item.id)"
                      nz-popconfirm
                      nzPopconfirmTitle="确认删除该环境？"
                      (nzOnConfirm)="removeEnvironment.emit(item.id)"
                    >
                      删除
                    </button>
                  </div>
                } @empty {
                  <div class="empty">暂无环境配置</div>
                }
              </div>
            </section>
          </nz-tab>

          <nz-tab nzTitle="版本">
            <section class="section">
              <div class="creator">
                <input nz-input placeholder="新增版本号，如v1.0.0" [ngModel]="versionDraft()" (ngModelChange)="versionDraft.set($event)" />
                <button nz-button nzType="primary" [disabled]="!versionDraft().trim() || busy()" (click)="submitVersionCreate()">
                  <nz-icon nzType="plus" nzTheme="outline" />新增
                </button>
              </div>
              <div class="list">
                @for (item of versions(); track item.id) {
                  <div class="row">
                    <input #versionRef nz-input [ngModel]="item.version" />
                    <input #descRef nz-input [ngModel]="item.description || ''" placeholder="描述（可选）" />
                    <input #sortRef nz-input type="number" [ngModel]="item.sort" min="0" />
                    <nz-switch
                      [ngModel]="item.enabled"
                      [nzDisabled]="busy() || isVersionPending(item.id)"
                      (ngModelChange)="updateVersion.emit({ id: item.id, patch: { enabled: !!$event } })"
                    ></nz-switch>
                    <button
                      nz-button
                      nzType="default"
                      [disabled]="busy() || isVersionPending(item.id)"
                      [nzLoading]="isVersionPending(item.id)"
                      (click)="saveVersion(item, versionRef.value, descRef.value, asNumber(sortRef.value))"
                    >
                      保存
                    </button>
                    <button
                      nz-button
                      nzType="default"
                      nzDanger
                      [disabled]="busy() || isVersionPending(item.id)"
                      [nzLoading]="isVersionPending(item.id)"
                      nz-popconfirm
                      nzPopconfirmTitle="确认删除该版本？"
                      (nzOnConfirm)="removeVersion.emit(item.id)"
                    >
                      删除
                    </button>
                  </div>
                } @empty {
                  <div class="empty">暂无版本配置</div>
                }
              </div>
            </section>
          </nz-tab>

          <nz-tab nzTitle="研发阶段">
            <section class="section">
              <div class="creator">
                <input nz-input placeholder="新增阶段名称，如开发阶段" [ngModel]="stageDraft()" (ngModelChange)="stageDraft.set($event)" />
                <button nz-button nzType="primary" [disabled]="!stageDraft().trim() || busy()" (click)="submitStageCreate()">
                  <nz-icon nzType="plus" nzTheme="outline" />新增
                </button>
              </div>
              <div class="list">
                @for (item of stages(); track item.id) {
                  <div class="row row--stage">
                    <input #nameRef nz-input [ngModel]="item.name" />
                    <input #sortRef nz-input type="number" [ngModel]="item.sort" min="0" />
                    <nz-switch
                      [ngModel]="item.enabled"
                      [nzDisabled]="busy() || isStagePending(item.id)"
                      (ngModelChange)="updateStage.emit({ id: item.id, patch: { enabled: !!$event } })"
                    ></nz-switch>
                    <button
                      nz-button
                      nzType="default"
                      [disabled]="busy() || isStagePending(item.id)"
                      [nzLoading]="isStagePending(item.id)"
                      (click)="saveStage(item, nameRef.value, asNumber(sortRef.value))"
                    >
                      保存
                    </button>
                    <button
                      nz-button
                      nzType="default"
                      nzDanger
                      [disabled]="busy() || isStagePending(item.id)"
                      [nzLoading]="isStagePending(item.id)"
                      nz-popconfirm
                      nzPopconfirmTitle="确认停用该阶段？"
                      (nzOnConfirm)="removeStage.emit(item.id)"
                    >
                      停用
                    </button>
                  </div>
                } @empty {
                  <div class="empty">暂无研发阶段配置</div>
                }
              </div>
            </section>
          </nz-tab>

          <nz-tab nzTitle="API Token">
            <section class="section">
              @if (latestCreatedToken()) {
                <div class="token-once">
                  <div class="token-once__title">新 Token（仅展示一次）</div>
                  <div class="token-once__value">{{ latestCreatedToken() }}
                    <a (click)="copyLatestToken.emit(latestCreatedToken()!)" nz-tooltip="点击复制token">
                      <nz-icon nzType="copy" nzTheme="outline" />
                    </a></div>
                  <div class="token-once__actions">
                    <button nz-button nzType="default" (click)="clearLatestToken.emit()">
                      <nz-icon nzType="check" nzTheme="outline" />
                      已保存，关闭展示
                    </button>
                  </div>
                </div>
              }

              <div class="token-creator">
                <input
                  nz-input
                  placeholder="Token 名称，如 webapp-readonly"
                  [ngModel]="tokenNameDraft()"
                  (ngModelChange)="tokenNameDraft.set($event)"
                />
                <nz-select
                  nzMode="multiple"
                  nzPlaceHolder="选择读取权限"
                  [ngModel]="tokenScopesDraft()"
                  (ngModelChange)="tokenScopesDraft.set($event)"
                >
                  <nz-option nzLabel="Issue 读取" nzValue="issues:read"></nz-option>
                  <nz-option nzLabel="研发项读取" nzValue="rd:read"></nz-option>
                  <nz-option nzLabel="反馈读取" nzValue="feedbacks:read"></nz-option>
                </nz-select>
                <nz-date-picker
                  nzShowTime
                  nzPlaceHolder="过期时间（可选）"
                  [ngModel]="tokenExpiresAt()"
                  (ngModelChange)="tokenExpiresAt.set($event)"
                ></nz-date-picker>
                <button nz-button nzType="primary" [disabled]="busy() || !canSubmitTokenCreate()" (click)="submitTokenCreate()">
                  <nz-icon nzType="plus" nzTheme="outline" />生成 Token
                </button>
              </div>

              <div class="token-list">
                <div class="token-list__head">
                  <div>名称</div>
                  <div>权限</div>
                  <div>状态</div>
                  <div>过期时间</div>
                  <div>最近使用</div>
                  <div>前缀</div>
                  <div>操作</div>
                </div>
                @for (item of apiTokens(); track item.id) {
                  <div class="token-list__row">
                    <div>{{ item.name }}</div>
                    <div>{{ renderScopes(item.scopes) }}</div>
                    <div>{{ item.status === 'active' ? '生效中' : '已吊销' }}</div>
                    <div>{{ item.expiresAt ? (item.expiresAt | date: 'yyyy-MM-dd HH:mm') : '永不过期' }}</div>
                    <div>{{ item.lastUsedAt ? (item.lastUsedAt | date: 'MM-dd HH:mm') : '-' }}</div>
                    <div class="token-list__prefix">{{ item.tokenPrefix }}</div>
                    <div>
                      @if(item.status=='active') {
                         <button
                        nz-button
                        nzType="default"
                        nzDanger
                        [disabled]="busy()  || isTokenPending(item.id)"
                        [nzLoading]="isTokenPending(item.id)"
                        nz-popconfirm
                        nzPopconfirmTitle="确认注销该 Token？吊销后不可恢复。"
                        (nzOnConfirm)="revokeApiToken.emit(item.id)"
                      >
                        <nz-icon nzType="minus" nzTheme="outline" />
                      </button>
                      }@else {
                          <span style="color: var(--text-muted)">已注销</span>
                      }
                     
                    </div>
                  </div>
                } @empty {
                  <div class="empty">暂无 API Token</div>
                }
              </div>
            </section>
          </nz-tab>
        </nz-tabs>
      </div>
      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">关闭</button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .config-dialog {
        min-height: 420px;
      }
      .section {
        display: grid;
        gap: 14px;
      }
      .creator {
        display: flex;
        gap: 10px;
      }
      .creator input {
        flex: 1;
      }
      .list {
        display: grid;
        gap: 8px;
      }
      .row {
        display: grid;
        grid-template-columns: 1.4fr 1.2fr 110px 72px auto auto;
        gap: 10px;
        align-items: center;
      }
      .row--stage {
        grid-template-columns: 1.6fr 110px 72px auto auto;
      }
      .token-once {
        border: 1px solid var(--primary-300);
        border-radius: 10px;
        padding: 12px;
        background: color-mix(in srgb, var(--primary-100) 36%, transparent);
        display: grid;
        gap: 8px;
      }
      .token-once__title {
        font-size: 12px;
        color: var(--text-muted);
      }
      .token-once__value {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 13px;
        word-break: break-all;
      }
      .token-once__actions {
        display: flex;
        gap: 8px;
      }
      .token-creator {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) minmax(220px, 1fr) 220px auto;
        gap: 10px;
        align-items: center;
      }
      .token-list {
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        overflow: hidden;
      }
      .token-list__head,
      .token-list__row {
        display: grid;
        grid-template-columns: 1fr 1fr 90px 150px 110px 150px 88px;
        gap: 10px;
        padding: 10px 12px;
        align-items: center;
      }
      .token-list__head {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-color-soft);
      }
      .token-list__row {
        border-bottom: 1px solid var(--border-color-soft);
      }
      .token-list__row:last-child {
        border-bottom: 0;
      }
      .token-list__prefix {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 12px;
      }
      .empty {
        color: var(--text-muted);
        padding: 12px 0;
      }
      @media (max-width: 1200px) {
        .row {
          grid-template-columns: 1fr 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectConfigDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly environments = input<ProjectMetaItem[]>([]);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly apiTokens = input<ProjectApiTokenEntity[]>([]);
  readonly latestCreatedToken = input<string | null>(null);
  readonly pendingModuleIds = input<string[]>([]);
  readonly pendingEnvironmentIds = input<string[]>([]);
  readonly pendingVersionIds = input<string[]>([]);
  readonly pendingStageIds = input<string[]>([]);
  readonly pendingTokenIds = input<string[]>([]);

  readonly cancel = output<void>();
  readonly createModule = output<CreateProjectMetaItemInput>();
  readonly updateModule = output<{ id: string; patch: UpdateProjectMetaItemInput }>();
  readonly removeModule = output<string>();
  readonly createEnvironment = output<CreateProjectMetaItemInput>();
  readonly updateEnvironment = output<{ id: string; patch: UpdateProjectMetaItemInput }>();
  readonly removeEnvironment = output<string>();
  readonly createVersion = output<CreateProjectVersionItemInput>();
  readonly updateVersion = output<{ id: string; patch: UpdateProjectVersionItemInput }>();
  readonly removeVersion = output<string>();
  readonly createStage = output<CreateRdStageInput>();
  readonly updateStage = output<{ id: string; patch: UpdateRdStageInput }>();
  readonly removeStage = output<string>();
  readonly createApiToken = output<CreateProjectApiTokenInput>();
  readonly revokeApiToken = output<string>();
  readonly copyLatestToken = output<string>();
  readonly clearLatestToken = output<void>();

  readonly moduleDraft = signal('');
  readonly environmentDraft = signal('');
  readonly versionDraft = signal('');
  readonly stageDraft = signal('');
  readonly tokenNameDraft = signal('');
  readonly tokenScopesDraft = signal<ProjectApiTokenScope[]>(['issues:read', 'rd:read', 'feedbacks:read']);
  readonly tokenExpiresAt = signal<Date | null>(null);

  isModulePending(id: string): boolean {
    return this.pendingModuleIds().includes(id);
  }

  isEnvironmentPending(id: string): boolean {
    return this.pendingEnvironmentIds().includes(id);
  }

  isVersionPending(id: string): boolean {
    return this.pendingVersionIds().includes(id);
  }

  isStagePending(id: string): boolean {
    return this.pendingStageIds().includes(id);
  }

  isTokenPending(id: string): boolean {
    return this.pendingTokenIds().includes(id);
  }

  asNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  submitModuleCreate(): void {
    const name = this.moduleDraft().trim();
    if (!name) {
      return;
    }
    this.createModule.emit({ name });
    this.moduleDraft.set('');
  }

  submitEnvironmentCreate(): void {
    const name = this.environmentDraft().trim();
    if (!name) {
      return;
    }
    this.createEnvironment.emit({ name });
    this.environmentDraft.set('');
  }

  submitVersionCreate(): void {
    const version = this.versionDraft().trim();
    if (!version) {
      return;
    }
    this.createVersion.emit({ version });
    this.versionDraft.set('');
  }

  submitStageCreate(): void {
    const name = this.stageDraft().trim();
    const projectId = this.project()?.id;
    if (!name || !projectId) {
      return;
    }
    this.createStage.emit({ projectId, name });
    this.stageDraft.set('');
  }

  saveModule(item: ProjectMetaItem, name: string, description: string, sort: number): void {
    const patch: UpdateProjectMetaItemInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateModule.emit({ id: item.id, patch });
    }
  }

  saveEnvironment(item: ProjectMetaItem, name: string, description: string, sort: number): void {
    const patch: UpdateProjectMetaItemInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateEnvironment.emit({ id: item.id, patch });
    }
  }

  saveVersion(item: ProjectVersionItem, version: string, description: string, sort: number): void {
    const patch: UpdateProjectVersionItemInput = {};
    if (version.trim() !== item.version) patch.version = version.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateVersion.emit({ id: item.id, patch });
    }
  }

  saveStage(item: RdStageEntity, name: string, sort: number): void {
    const patch: UpdateRdStageInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateStage.emit({ id: item.id, patch });
    }
  }

  canSubmitTokenCreate(): boolean {
    return this.tokenNameDraft().trim().length > 0 && this.tokenScopesDraft().length > 0;
  }

  submitTokenCreate(): void {
    if (!this.canSubmitTokenCreate()) {
      return;
    }
    this.createApiToken.emit({
      name: this.tokenNameDraft().trim(),
      scopes: this.tokenScopesDraft(),
      expiresAt: this.tokenExpiresAt() ? this.tokenExpiresAt()!.toISOString() : null
    });
    this.tokenNameDraft.set('');
    this.tokenExpiresAt.set(null);
  }

  renderScopes(scopes: ProjectApiTokenScope[]): string {
    return scopes
      .map((scope) => {
        if (scope === 'issues:read') return 'Issue读取';
        if (scope === 'rd:read') return '研发项读取';
        return '反馈读取';
      })
      .join(' / ');
  }
}
