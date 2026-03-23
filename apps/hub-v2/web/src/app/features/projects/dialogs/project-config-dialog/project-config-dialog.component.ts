import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { DialogShellComponent } from '@shared/ui';
import type {
  CreateProjectMetaItemInput,
  CreateProjectVersionItemInput,
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
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSwitchModule,
    NzTabsModule,
    DialogShellComponent
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="1040"
      [title]="project() ? project()!.name + ' · 项目配置' : '项目配置'"
      [subtitle]="'维护模块、环境和版本。'"
      [icon]="'setting'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body class="config-dialog">
        <nz-tabset nzSize="small">
          <nz-tab nzTitle="模块">
            <ng-template nz-tab>
              <section class="section">
                <div class="creator">
                  <input nz-input placeholder="新增模块名称" [ngModel]="moduleDraft()" (ngModelChange)="moduleDraft.set($event)" />
                  <button nz-button nzType="primary" [disabled]="!moduleDraft().trim() || busy()" (click)="submitModuleCreate()">
                    <nz-icon nzType="plus" nzTheme="outline" />新增
                  </button>
                </div>
                <div class="list">
                  @for (item of modules(); track item.id) {
                    <div class="row">
                      <input #nameRef nz-input [ngModel]="item.name" />
                      <input #codeRef nz-input [ngModel]="item.code || ''" placeholder="编码（可选）" />
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
                        (click)="saveModule(item, nameRef.value, codeRef.value, descRef.value, asNumber(sortRef.value))"
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
            </ng-template>
          </nz-tab>

          <nz-tab nzTitle="环境">
            <ng-template nz-tab>
              <section class="section">
                <div class="creator">
                  <input nz-input placeholder="新增环境名称" [ngModel]="environmentDraft()" (ngModelChange)="environmentDraft.set($event)" />
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
                      <input #codeRef nz-input [ngModel]="item.code || ''" placeholder="编码（可选）" />
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
                        (click)="saveEnvironment(item, nameRef.value, codeRef.value, descRef.value, asNumber(sortRef.value))"
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
            </ng-template>
          </nz-tab>

          <nz-tab nzTitle="版本">
            <ng-template nz-tab>
              <section class="section">
                <div class="creator">
                  <input nz-input placeholder="新增版本号" [ngModel]="versionDraft()" (ngModelChange)="versionDraft.set($event)" />
                  <button nz-button nzType="primary" [disabled]="!versionDraft().trim() || busy()" (click)="submitVersionCreate()">
                    <nz-icon nzType="plus" nzTheme="outline" />新增
                  </button>
                </div>
                <div class="list">
                  @for (item of versions(); track item.id) {
                    <div class="row">
                      <input #versionRef nz-input [ngModel]="item.version" />
                      <input #codeRef nz-input [ngModel]="item.code || ''" placeholder="编码（可选）" />
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
                        (click)="saveVersion(item, versionRef.value, codeRef.value, descRef.value, asNumber(sortRef.value))"
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
            </ng-template>
          </nz-tab>
        </nz-tabset>
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
        grid-template-columns: 1.2fr 1fr 1fr 110px 72px auto auto;
        gap: 10px;
        align-items: center;
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
  readonly pendingModuleIds = input<string[]>([]);
  readonly pendingEnvironmentIds = input<string[]>([]);
  readonly pendingVersionIds = input<string[]>([]);

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

  readonly moduleDraft = signal('');
  readonly environmentDraft = signal('');
  readonly versionDraft = signal('');

  isModulePending(id: string): boolean {
    return this.pendingModuleIds().includes(id);
  }

  isEnvironmentPending(id: string): boolean {
    return this.pendingEnvironmentIds().includes(id);
  }

  isVersionPending(id: string): boolean {
    return this.pendingVersionIds().includes(id);
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

  saveModule(item: ProjectMetaItem, name: string, code: string, description: string, sort: number): void {
    const patch: UpdateProjectMetaItemInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if ((code.trim() || null) !== item.code) patch.code = code.trim() || null;
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateModule.emit({ id: item.id, patch });
    }
  }

  saveEnvironment(item: ProjectMetaItem, name: string, code: string, description: string, sort: number): void {
    const patch: UpdateProjectMetaItemInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if ((code.trim() || null) !== item.code) patch.code = code.trim() || null;
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateEnvironment.emit({ id: item.id, patch });
    }
  }

  saveVersion(item: ProjectVersionItem, version: string, code: string, description: string, sort: number): void {
    const patch: UpdateProjectVersionItemInput = {};
    if (version.trim() !== item.version) patch.version = version.trim();
    if ((code.trim() || null) !== item.code) patch.code = code.trim() || null;
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateVersion.emit({ id: item.id, patch });
    }
  }
}
