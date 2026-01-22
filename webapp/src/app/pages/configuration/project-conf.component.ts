import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgDevtoolComponent } from '@app/shared/devtools/ng-devtool.component';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { ConfigNavComponent } from './components/config-nav-component';
import { ConfigSectionComponent } from './components/config-section-component';
import { ConfigChangeBarComponent } from './components/config-change-bar-component';
import { ConfigCatalogDocV1, ConfigFileType, ConfigSchema, ConfigTreeNode } from './models';
import { ConfApiService, ConfigEditSessionStore } from './services';
import { buildPatch, diffToScopedChanges } from './utils';

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
    NzSwitchModule,
    NzButtonModule,
    NzTypographyModule,
    NzPopoverModule,
    NzTooltipModule,
    NgDevtoolComponent,
    NzIconModule,
    ConfigNavComponent,
    ConfigSectionComponent,
    ConfigChangeBarComponent,
  ],
  templateUrl: './project-conf.component.html',
  styleUrls: ['./project-conf.component.less'],
})
export class ProjectConfComponent {
  private api = inject(ConfApiService);
  private projectState = inject(ProjectStateService);
  private editStore = inject(ConfigEditSessionStore);
  private msg = inject(NzMessageService);
  private modal = inject(NzModalService);

  projectId = computed(() => this.projectState.currentProjectId() || '');

  loading = signal(false);
  catalog = signal<ConfigCatalogDocV1 | null>(null);

  nodes = computed<ConfigTreeNode[]>(() => this.catalog()?.tree ?? []);
  schemas = computed<Record<ConfigFileType, ConfigSchema> | null>(() => this.catalog()?.schemas ?? null);

  /**
   * 拆分：
   * - activeNavId: 左侧“顶层分类”选中（angular / quality）
   * - activeFileId: 当前激活文件（angular/angular.json）
   */
  activeNavId = signal<string | null>(null);
  activeFileId = signal<string | null>(null);

  /** 顶层分类节点 */
  selectedNavNode = computed<ConfigTreeNode | null>(() => {
    const id = this.activeNavId();
    if (!id) return null;
    return this.findNodeById(this.nodes(), id);
  });

  /** 当前激活的 file 节点（用于 load/diff/save/reset/dirty） */
  selectedFileNode = computed<ConfigTreeNode | null>(() => {
    const id = this.activeFileId();
    if (!id) return null;
    return this.findNodeById(this.nodes(), id);
  });

  /** 右侧展示：当前分类下所有 file 节点（扁平化） */
  contentFileNodes = computed<ConfigTreeNode[]>(() => {
    const root = this.selectedNavNode();
    if (!root) return [];
    return this.collectFileNodes(root);
  });

  /** 当前激活文件的 schema */
  curSchema = computed<ConfigSchema | null>(() => {
    const node = this.selectedFileNode();
    const type = node?.file?.type;
    if (!type) return null;
    return this.schemas()?.[type] ?? null;
  });

  /** 当前激活文件类型（change-bar / session key） */
  activeType = computed<string | null>(() => {
    return this.selectedFileNode()?.file?.type ?? null;
  });

  /** change-bar 是否显示：当前类型是否 dirty */
  activeDirty = computed(() => {
    const type = this.activeType();
    if (!type) return false;
    return this.editStore.isDirty(type);
  });

  /** 给 ConfigSectionComponent 用：valuesByType / vmOptionsByType */
  valuesByType = computed<Record<string, Record<string, any>>>(() => {
    const out: Record<string, Record<string, any>> = {};
    const sessions = this.editStore.sessions();
    for (const [type, s] of Object.entries(sessions)) {
      out[type] = s.current ?? {};
    }
    return out;
  });

  vmOptionsByType = computed<Record<string, any>>(() => {
    const out: Record<string, any> = {};
    const sessions = this.editStore.sessions();
    for (const [type, s] of Object.entries(sessions)) {
      out[type] = s.options ?? {};
    }
    return out;
  });

  /**
   * 右侧上下文：Project/Target/Configuration 选择框（后续做 UI 时用）
   * - 注意：schema 里 section.target 已经固定 build/serve，因此保存时不依赖 ctx.target
   */
  vmCtx = signal<{ project?: string; target?: string; configuration?: string }>({
    project: undefined,
    target: undefined,
    configuration: undefined,
  });

  constructor() {
    effect(() => {
      const pid = this.projectId();
      if (pid) this.getCatalog();
    });
  }

  getCatalog() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.api.getCatalog(pid).subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);

        // 1) 初始化选中第一个顶层分类（用于左侧高亮 + 右侧展示 fileNodes）
        const firstNav = catalog.tree?.[0] ?? null;
        if (firstNav) this.activeNavId.set(firstNav.id);

        // 2) 初始化激活第一个 file（用于右侧加载表单 & change-bar/dirty）
        const firstFile = this.findFirstFileNode(catalog.tree);
        if (firstFile) {
          this.activeFileId.set(firstFile.id);
          this.loadNodeData(firstFile);
        } else {
          this.activeFileId.set(null);
        }
      },
      error: (err) => {
        console.error(err);
        this.msg.error('加载配置目录失败');
      },
      complete: () => this.loading.set(false),
    });
  }

  /**
   * 左侧点击顶层分类节点
   * - 设置 activeNavId
   * - 自动选中该分类下第一个 file 为 activeFileId 并加载
   */
  onNodeSelect(navNode: ConfigTreeNode) {
    this.activeNavId.set(navNode.id);

    const files = this.collectFileNodes(navNode);
    const firstFile = files[0] ?? null;

    if (firstFile?.file) {
      this.activeFileId.set(firstFile.id);
      this.loadNodeData(firstFile);
    } else {
      this.activeFileId.set(null);
    }
  }

  /** 拉取 view-model，开启 edit session（baseline/current） */
  private async loadNodeData(node: ConfigTreeNode) {
    const pid = this.projectId();
    const type = node.file?.type;
    if (!pid || !type) return;

    // MVP：目前只对 angular 做表单（其他先占位/不处理）
    if (type !== 'angular') {
      this.editStore.discard(type);
      return;
    }

    this.loading.set(true);
    try {
      const ctx = this.vmCtx();
      const vm = await this.api.getViewModelPromise(pid, {
        type,
        project: ctx.project,
        target: ctx.target,
        configuration: ctx.configuration,
      });

      // 切文件/ctx：强制新会话，避免串写
      this.editStore.start(type, vm as any, { keepCurrent: false });
    } catch (err) {
      console.error(err);
      this.msg.error('加载配置失败');
    } finally {
      this.loading.set(false);
    }
  }

  /** 右侧表单变化回传（整包 values） */
  onValuesChange(e: { type: string; values: Record<string, any> }) {
    this.editStore.setCurrent(e.type, e.values);
  }

  /** change-bar: Diff */
  onDiff() {
    const type = this.activeType();
    if (!type) return;

    const schema = this.curSchema();
    if (!schema) return;

    const s = this.editStore.getSession(type);
    if (!s) return;

    const { workspace, project } = diffToScopedChanges(s.baseline, s.current, schema, s.ctx);

    const lines: string[] = [];
    if (workspace.length) {
      lines.push('[workspace]');
      for (const c of workspace) lines.push(`${c.path}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
      lines.push('');
    }
    if (project.length) {
      lines.push('[project]');
      for (const c of project) lines.push(`${c.path}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
    }

    const text = lines.join('\n') || '无变更';
    this.modal.info({
      nzTitle: '配置变更 Diff',
      nzContent: `<pre style="max-height:60vh;overflow:auto;white-space:pre-wrap;">${escapeHtml(text)}</pre>`,
      nzMaskClosable: true,
      nzWidth: 760,
    });
  }

  /** change-bar: Reset */
  onReset() {
    const type = this.activeType();
    if (!type) return;

    const s = this.editStore.getSession(type);
    if (!s) return;

    this.editStore.setCurrent(type, deepClone(s.baseline));
  }

  /** change-bar: Save（方案 A：workspace patch + project patch 串行 apply） */
  async saveActive() {
    const pid = this.projectId();
    const type = this.activeType();

    if (!pid || !type) return;
    if (type !== 'angular') return;

    const schema = this.curSchema();
    if (!schema) return;

    const s = this.editStore.getSession(type);
    if (!s) return;

    const { workspace, project } = diffToScopedChanges(s.baseline, s.current, schema, s.ctx);

    if (workspace.length === 0 && project.length === 0) {
      this.msg.info('没有变更');
      return;
    }

    this.loading.set(true);
    try {
      // 1) workspace patch
      if (workspace.length > 0) {
        const patch = buildPatch('workspace', s.ctx, workspace);
        await this.api.applyConfigPromise(pid, { type, patch });
      }

      // 2) project patch
      if (project.length > 0) {
        const patch = buildPatch('project', s.ctx, project);
        await this.api.applyConfigPromise(pid, { type, patch });
      }

      this.editStore.commit(type);
      this.msg.success('保存成功');
    } catch (err) {
      console.error(err);
      this.msg.error('保存失败');
    } finally {
      this.loading.set(false);
    }
  }

  /** 打开配置文件（后续可接 open editor api） */
  openConfig() {
    // TODO：后端有 open editor 的 api，可根据 selectedFileNode().file.relPath 打开
  }

  // ---------------- utils ----------------

  private findNodeById(nodes: ConfigTreeNode[], id: string): ConfigTreeNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children?.length) {
        const hit = this.findNodeById(n.children, id);
        if (hit) return hit;
      }
    }
    return null;
  }

  private collectFileNodes(root: ConfigTreeNode): ConfigTreeNode[] {
    const out: ConfigTreeNode[] = [];
    const walk = (n: ConfigTreeNode) => {
      if (n.file) out.push(n);
      if (n.children?.length) n.children.forEach(walk);
    };
    walk(root);
    return out;
  }

  private findFirstFileNode(nodes: ConfigTreeNode[]): ConfigTreeNode | null {
    for (const n of nodes) {
      if (n.file) return n;
      if (n.children?.length) {
        const hit = this.findFirstFileNode(n.children);
        if (hit) return hit;
      }
    }
    return null;
  }
}

function deepClone<T>(v: T): T {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
