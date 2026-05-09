import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgDevtoolComponent } from '@app/shared/devtools/ng-devtool.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import * as _ from 'lodash';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { firstValueFrom } from 'rxjs';
import { ConfigChangeBarComponent } from './components/config-change-bar-component';
import { ConfigNavComponent } from './components/config-nav-component';
import { ConfigSectionComponent } from './components/config-section-component';
import { ConfigDetectResult, ConfigDocument, ConfigNavNodeVM, ConfigPatch } from './models';
import { ConfApiService } from './services';
import { mapResolvedToNav, pickFirstDocId } from './utils';
import { PageLayoutComponent } from '@app/shared';
import { ProjectContextStore } from '@app/core/stores';
import { getByPath } from './utils/path';

@Component({
  selector: 'app-project-conf.component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzLayoutModule,
    NzMenuModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzButtonModule,
    NzTypographyModule,
    NzPopoverModule,
    NzTooltipModule,
    NgDevtoolComponent,
    NzIconModule,
    ConfigNavComponent,
    ConfigChangeBarComponent,
    NzModalModule,
    ConfigSectionComponent,
    PageLayoutComponent,
  ],
  styleUrl: './project-conf.component.less',
  template: `
    <app-page-layout [title]="'项目配置'" [loading]="loading()">
      <ng-container ngProjectAs="actions">
        <button nz-button nzType="primary" (click)="isModalVisible.set(true)">打开配置文件</button>
        <app-ng-devtool></app-ng-devtool>
      </ng-container>
      <div class="panel">
        <app-config-nav-component
          [nodes]="navNodes()"
          [activeDomainId]="activeType() ?? ''"
          (domainSelect)="onTypeSelect($event)"
        ></app-config-nav-component>
        <div class="content">
          <app-config-section-component
            [schema]="document()?.schema"
            [vm]="editingData()"
            (vmChange)="editingData.set($event)"
          ></app-config-section-component>
          <app-config-change-bar-component
            [dirty]="domainDirty()"
            (diff)="onDiff()"
            (reset)="onReset()"
            (save)="saveActive()"
          ></app-config-change-bar-component>
        </div>
      </div>
    </app-page-layout>
    <nz-modal
      [(nzVisible)]="isModalVisible"
      nzTitle="配置文件"
      (nzOnCancel)="isModalVisible.set(false)"
      [nzMaskClosable]="false"
    >
      <ng-container *nzModalContent>
        <div class="modal-body">
          <label>选择配置文件</label>
          <nz-select style="width: 100%" [(ngModel)]="selectedFilePath" nzPlaceHolder="请选择配置文件">
            @for (file of activeFiles() || []; track file.filePath) {
              <nz-option [nzLabel]="file.title" [nzValue]="file.filePath"></nz-option>
            }
          </nz-select>
        </div>
      </ng-container>
      <ng-container *nzModalFooter>
        <button nz-button nzType="primary" (click)="openConfig()" [disabled]="!selectedFilePath()">
          打开配置文件
        </button>
      </ng-container>
    </nz-modal>
  `
})
export class ProjectConfComponent {
  private api = inject(ConfApiService);
  private projectContext = inject(ProjectContextStore);
  private msg = inject(NzMessageService);
  private modal = inject(NzModalService);

  projectId = computed(() => this.projectContext.currentProjectId() || '');
  loading = signal(false);
  isModalVisible = signal(false);

  providers = signal<Array<{ type: string; title: string; description?: string }>>([]);
  detects = signal<ConfigDetectResult[]>([]);
  activeType = signal<string | null>(null);
  selectedFilePath = signal<string | null>(null);

  document = signal<ConfigDocument | null>(null);
  editingData = signal<any | null>(null);
  baselineData = signal<any | null>(null);

  navNodes = computed<ConfigNavNodeVM[]>(() => {
    const merged = this.detects().map((detect) => {
      const provider = this.providers().find((item) => item.type === detect.type);
      return {
        ...detect,
        title: provider?.title ?? detect.title
      };
    });
    return mapResolvedToNav(merged);
  });

  activeDetect = computed(() => {
    const type = this.activeType();
    return this.detects().find((item) => item.type === type && item.available) ?? null;
  });

  activeFiles = computed(() => {
    const detect = this.activeDetect();
    if (!detect) return [];
    return detect.filePaths.map((filePath) => ({ filePath, title: filePath, exists: true }));
  });

  domainDirty = computed(() => {
    const doc = this.document();
    if (!doc || doc.readonly) return false;
    return !_.isEqual(this.baselineData(), this.editingData());
  });

  constructor() {
    effect(() => {
      const pid = this.projectId();
      if (pid) {
        this.loadCatalog();
      }
    });
  }

  async loadCatalog() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    try {
      const [providers, detects] = await Promise.all([
        firstValueFrom(this.api.getProviders()),
        firstValueFrom(this.api.detect(pid))
      ]);
      this.providers.set(providers);
      this.detects.set(detects);

      const firstType = pickFirstDocId(detects);
      if (firstType) {
        this.activeType.set(firstType);
        await this.loadDocument(firstType);
      } else {
        this.activeType.set(null);
        this.document.set(null);
        this.editingData.set(null);
        this.baselineData.set(null);
        this.selectedFilePath.set(null);
      }
    } catch (error) {
      console.error(error);
      this.msg.error('加载配置目录失败');
    } finally {
      this.loading.set(false);
    }
  }

  async onTypeSelect(type: string) {
    this.activeType.set(type);
    await this.loadDocument(type);
  }

  async loadDocument(type: string, filePath?: string) {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    try {
      const resolvedFilePath = filePath ?? this.activeDetect()?.filePaths?.[0];
      const doc = await firstValueFrom(this.api.getDoc(pid, type, resolvedFilePath));
      this.document.set(doc);
      this.selectedFilePath.set(doc.filePath);

      const editableSource = doc.readonly ? doc.viewModel : doc.raw;
      const cloned = _.cloneDeep(editableSource);
      this.editingData.set(cloned);
      this.baselineData.set(_.cloneDeep(cloned));
    } catch (error) {
      console.error(error);
      this.msg.error('加载配置文档失败');
      this.document.set(null);
      this.editingData.set(null);
      this.baselineData.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private buildPatches(): ConfigPatch[] {
    const doc = this.document();
    const baseline = this.baselineData();
    const current = this.editingData();
    if (!doc || doc.readonly || !doc.schema) return [];

    const patches: ConfigPatch[] = [];
    for (const group of doc.schema.groups ?? []) {
      for (const field of group.fields ?? []) {
        if (!field.path || field.readonly) continue;
        const before = getByPath(baseline, field.path);
        const after = getByPath(current, field.path);
        if (_.isEqual(before, after)) continue;

        if (after === undefined) {
          patches.push({ op: 'remove', path: field.path });
        } else {
          patches.push({ op: 'set', path: field.path, value: after });
        }
      }
    }
    return patches;
  }

  async onDiff() {
    const pid = this.projectId();
    const doc = this.document();
    if (!pid || !doc || doc.readonly) return;

    const patches = this.buildPatches();
    if (patches.length === 0) {
      this.msg.info('没有可写回的变更');
      return;
    }

    this.loading.set(true);
    try {
      const preview = await firstValueFrom(
        this.api.preview(pid, {
          type: doc.type,
          filePath: doc.filePath,
          patches
        })
      );

      this.modal.create({
        nzTitle: '变更预览',
        nzContent: `
          <div style="max-height:60vh; overflow:auto;">
            ${preview.patches
              .map(
                (item) => `
                <div style="padding:8px 0; border-bottom:1px solid #f0f0f0;">
                  <div style="font-weight:600;">${item.op}</div>
                  <div style="opacity:.85; margin-top:4px;">${item.path}</div>
                  <pre style="margin:6px 0;">value : ${this.safeStringify(item.value)}</pre>
                </div>
              `
              )
              .join('')}
          </div>
        `,
        nzFooter: null,
        nzWidth: 900,
      });
    } catch (error) {
      console.error(error);
      this.msg.error('生成预览失败');
    } finally {
      this.loading.set(false);
    }
  }

  onReset() {
    const base = this.baselineData();
    if (!base) return;
    this.editingData.set(_.cloneDeep(base));
    this.msg.success('已重置为未修改状态');
  }

  async saveActive() {
    const pid = this.projectId();
    const doc = this.document();
    if (!pid || !doc || doc.readonly) return;

    const patches = this.buildPatches();
    if (patches.length === 0) {
      this.msg.info('没有可保存的变更');
      return;
    }

    this.loading.set(true);
    try {
      await firstValueFrom(
        this.api.write(pid, {
          type: doc.type,
          filePath: doc.filePath,
          patches
        })
      );
      this.msg.success('保存成功');
      await this.loadDocument(doc.type, doc.filePath);
    } catch (error) {
      console.error(error);
      this.msg.error('保存失败');
    } finally {
      this.loading.set(false);
    }
  }

  openConfig() {
    const filePath = this.selectedFilePath();
    if (!filePath) {
      this.msg.warning('请先选择配置文件');
      return;
    }
    this.api.openInEditor(this.projectId()!, filePath).subscribe({
      next: () => {
        this.msg.success('已在默认编辑器中打开该配置文件');
        this.isModalVisible.set(false);
      },
      error: (error) => {
        console.error(error);
        this.msg.error('打开配置文件失败');
      }
    });
  }

  private safeStringify(v: any): string {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
}
