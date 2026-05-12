import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ProjectContextStore } from '@app/core/stores';
import { PageLayoutComponent } from '@app/shared';
import { NgDevtoolComponent } from '@app/shared/devtools/ng-devtool.component';
import * as _ from 'lodash';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { firstValueFrom } from 'rxjs';
import { ConfigNavComponent } from './components/config-nav-component';
import { ConfigPreviewModalComponent } from './components/config-preview-modal.component';
import { ConfigSectionComponent } from './components/config-section-component';
import { ConfigDetectResult, ConfigDocument, ConfigNavNodeVM, ConfigPatch } from './models';
import { ConfApiService } from './services';
import { mapResolvedToNav, pickFirstDocId } from './utils';
import { getByPath } from './utils/path';

@Component({
  selector: 'app-project-conf.component',
  standalone: true,
  imports: [
    CommonModule,
    NzLayoutModule,
    NzMenuModule,
    NzButtonModule,
    NzTooltipModule,
    NgDevtoolComponent,
    NzIconModule,
    NzTagModule,
    ConfigNavComponent,
    ConfigSectionComponent,
    PageLayoutComponent,
  ],
  styleUrl: './project-conf.component.less',
  template: `
    <app-page-layout [title]="'项目配置'" [loading]="loading()">
      <ng-container ngProjectAs="actions">
        <div class="page-actions">
          <button nz-button (click)="openConfig()" [disabled]="!document()?.filePath">
            <nz-icon nzType="folder-open" />
            打开文件
          </button>
          <button nz-button (click)="onDiff()" [disabled]="!canWriteChanged()">
            <nz-icon nzType="diff" />
            变更预览
          </button>
          <button nz-button (click)="onReset()" [disabled]="!canWriteChanged()">
            <nz-icon nzType="rollback" />
            重置
          </button>
          <button nz-button nzType="primary" (click)="saveActive()" [disabled]="!canWriteChanged()">
            <nz-icon nzType="save" />
            保存
          </button>
        </div>
        <app-ng-devtool></app-ng-devtool>
      </ng-container>
      <div class="config-workbench">
        <div class="panel">
        <app-config-nav-component
          [nodes]="navNodes()"
          [activeDomainId]="activeType() ?? ''"
          [activeFilePath]="selectedFilePath() ?? ''"
          (documentSelect)="onDocumentSelect($event)"
        ></app-config-nav-component>
        <div class="content">
          <app-config-section-component
            [schema]="document()?.schema"
            [vm]="editingData()"
            [viewModel]="document()?.viewModel"
            (vmChange)="editingData.set($event)"
          ></app-config-section-component>
        </div>
        </div>
      </div>
    </app-page-layout>
  `
})
export class ProjectConfComponent {
  private api = inject(ConfApiService);
  private projectContext = inject(ProjectContextStore);
  private msg = inject(NzMessageService);
  private modal = inject(NzModalService);

  projectId = computed(() => this.projectContext.currentProjectId() || '');
  loading = signal(false);

  providers = signal<Array<{ type: string; title: string; description?: string }>>([]);
  detects = signal<ConfigDetectResult[]>([]);
  activeType = signal<string | null>(null);
  selectedFilePath = signal<string | null>(null);

  document = signal<ConfigDocument | null>(null);
  editingData = signal<unknown>(null);
  baselineData = signal<unknown>(null);

  navNodes = computed<ConfigNavNodeVM[]>(() => {
    const merged = this.detects().map((detect) => {
      const provider = this.providers().find((item) => item.type === detect.type);
      return {
        ...detect,
        title: provider?.title ?? detect.title
      };
    });
    const activeType = this.activeType();
    const doc = this.document();
    const dirty = this.domainDirty();
    return mapResolvedToNav(merged).map((node) => ({
      ...node,
      readonly: node.id === activeType ? !!doc?.readonly : node.readonly,
      dirty: node.id === activeType ? dirty : node.dirty
    }));
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

  dirtyCount = computed(() => this.buildPatches().length);

  canWriteChanged = computed(() => {
    const doc = this.document();
    return !!doc && !doc.readonly && this.domainDirty();
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

  async onDocumentSelect(input: { type: string; filePath?: string }) {
    this.activeType.set(input.type);
    await this.loadDocument(input.type, input.filePath);
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
        patches.push(...this.buildFieldPatches(field.path, before, after));
      }
    }
    return patches;
  }

  private buildFieldPatches(path: string, before: unknown, after: unknown): ConfigPatch[] {
    if (_.isEqual(before, after)) {
      return [];
    }
    if (after === undefined) {
      return [{ op: 'remove', path }];
    }
    if (before === undefined) {
      return [{ op: 'set', path, value: after }];
    }
    if (this.isPlainObject(before) && this.isPlainObject(after)) {
      return this.diffObject(path, before, after);
    }
    return [{ op: 'set', path, value: after }];
  }

  private diffObject(path: string, before: Record<string, unknown>, after: Record<string, unknown>): ConfigPatch[] {
    const patches: ConfigPatch[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of keys) {
      const childPath = this.joinPatchPath(path, key);
      const childBefore = before[key];
      const childAfter = after[key];
      if (_.isEqual(childBefore, childAfter)) {
        continue;
      }
      if (childAfter === undefined) {
        patches.push({ op: 'remove', path: childPath });
        continue;
      }
      if (childBefore === undefined) {
        patches.push({ op: 'set', path: childPath, value: childAfter });
        continue;
      }
      if (this.isPlainObject(childBefore) && this.isPlainObject(childAfter)) {
        patches.push(...this.diffObject(childPath, childBefore, childAfter));
        continue;
      }
      patches.push({ op: 'set', path: childPath, value: childAfter });
    }

    return patches;
  }

  private isPlainObject(input: unknown): input is Record<string, unknown> {
    return typeof input === 'object' && input !== null && !Array.isArray(input);
  }

  private joinPatchPath(basePath: string, segment: string): string {
    if (basePath.startsWith('/')) {
      const encoded = segment.replace(/~/g, '~0').replace(/\//g, '~1');
      return `${basePath}/${encoded}`;
    }
    return `${basePath}.${segment}`;
  }

  async onDiff() {
    const pid = this.projectId();
    const doc = this.document();
    if (!pid || !doc) return;
    if (doc.readonly) {
      this.msg.warning('当前配置为只读，无法预览写回变更');
      return;
    }

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
        nzContent: ConfigPreviewModalComponent,
        nzData: {
          patches: preview.patches,
          before: preview.before,
          after: preview.after,
          schema: doc.schema,
          providerTitle: this.getActiveProviderTitle(),
          filePath: doc.filePath
        },
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
    if (!pid || !doc) return;
    if (doc.readonly) {
      this.msg.warning('当前配置为只读，无法保存');
      return;
    }

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
      },
      error: (error) => {
        console.error(error);
        this.msg.error('打开配置文件失败');
      }
    });
  }

  private getActiveProviderTitle(): string {
    const type = this.activeType();
    const doc = this.document();
    const provider = this.providers().find((item) => item.type === type);
    return provider?.title ?? doc?.title ?? this.detects().find((item) => item.type === type)?.title ?? '';
  }
}
