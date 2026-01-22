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
import { ConfigNavComponent } from './components/config-nav-component';
import { ConfigSectionComponent } from './components/config-section-component';
import { ConfApiService } from './conf-api.service';
import { ConfigCatalogDocV1, ConfigFileType, ConfigSchema, ConfigTreeNode } from './models';

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
    ConfigSectionComponent
  ],
  templateUrl: './project-conf.component.html',
  styleUrls: ['./project-conf.component.less'],
})
export class ProjectConfComponent {
  private api = inject(ConfApiService);
  private projectState = inject(ProjectStateService);

  projectId = computed(() => this.projectState.currentProjectId() || '');

  loading = signal(false);

  catalog = signal<ConfigCatalogDocV1 | null>(null);

  nodes = computed<ConfigTreeNode[]>(() => this.catalog()?.tree ?? []);

  schemas = computed<Record<ConfigFileType, ConfigSchema> | null>(() => this.catalog()?.schemas ?? null);

  activeNodeId = signal<string | null>(null);

  /** 当前选中的（递归）节点 */
  selectedNode = computed<ConfigTreeNode | null>(() => {
    const id = this.activeNodeId();
    if (!id) return null;
    return this.findNodeById(this.nodes(), id);
  });

  /** 右侧展示：选中节点下所有 file 节点（递归扁平化） */
  contentFileNodes = computed<ConfigTreeNode[]>(() => {
    const root = this.selectedNode();
    if (!root) return [];
    return this.collectFileNodes(root);
  });

  /** 表单 values：先按 type 存一份（后续 patch 用） */
  valuesByType = signal<Record<string, Record<string, any>>>({});
  vmOptionsByType = signal<Record<string, any>>({});

  /** 当前文件 schema（右侧渲染入口） */
  curSchema = computed<ConfigSchema | null>(() => {
    const node = this.selectedNode();
    const type = node?.file?.type;
    if (!type) return null;
    return this.schemas()?.[type] ?? null;
  });

  /** 用于 patch.before（来自 /workspace） */
  baseRaw = signal<any>(null);

  /** 右侧上下文：后续 Project/Target/Configuration 选择框时用 */
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
        this.activeNodeId.set(this.nodes()[0]?.id ?? null);
        const firstFile = this.findFirstFileNode(catalog.tree);
        // 触发加载右侧数据
        if (firstFile) this.loadNodeData(firstFile);
      },
      error: (err) => {
        // TODO: toast
        console.error(err);
      },
      complete: () => this.loading.set(false),
    });
  }

  /** 左侧点击节点 */
  onNodeSelect(node: ConfigTreeNode) {
    if (!node.file) return;
    this.activeNodeId.set(node.id);
    this.loadNodeData(node);
  }

  /** 拉取 workspace + view-model，写入 baseRaw/values */
  private async loadNodeData(node: ConfigTreeNode) {
    console.log('loadNodeData', node);
    const pid = this.projectId();
    const type = node.file?.type;
    if (!pid || !type) return;

    // MVP：目前只对 angular 做表单（其他可以先显示“未实现/Raw 模式”）
    if (type !== 'angular') {
      this.baseRaw.set(null);
      this.valuesByType.update(prev => ({
        ...prev,
        [type]: {},
      }));
      this.vmOptionsByType.update(prev => ({
        ...prev,
        [type]: {},
      }));
      return;
    }

    this.loading.set(true);
    try {
      // 1) workspace.raw（before 的基线）
      const ws = await this.api.getWorkspacePromise(pid, type);
      this.baseRaw.set(ws.raw);
      // 2) view-model.values（表单值）
      const ctx = this.vmCtx();
      const vm = await this.api.getViewModelPromise(pid, {
        type,
        project: ctx.project,
        target: ctx.target,
        configuration: ctx.configuration,
      });
      // 约定：vm.values
      this.valuesByType.update(prev => ({
        ...prev,
        [type]: vm?.values ?? {},
      }));
      this.vmOptionsByType.update(prev => ({
        ...prev,
        [type]: (vm as any)?.options ?? {},
      }));

    } finally {
      this.loading.set(false);
    }
  }

  /** 右侧表单变化回传 */
  onValuesChange(e: { type: string; values: Record<string, any> }) {
    this.valuesByType.update(prev => ({
      ...prev,
      [e.type]: e.values,
    }));
  }

  openConfig() {
    // TODO：后端有 open editor 的 api，可根据 selectedNode().file.relPath 打开
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

  /** 把某个节点下所有 file 节点扁平化收集出来 */
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
