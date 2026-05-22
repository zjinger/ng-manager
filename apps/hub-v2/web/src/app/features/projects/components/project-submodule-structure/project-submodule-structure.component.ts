import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import type { ProjectMetaItem, ProjectModuleNodeType } from '../../models/project.model';

type StructureMode = 'summary' | 'detail';

type TreeNodeView = {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  projectNo: string | null;
  nodeType: ProjectModuleNodeType;
  description: string | null;
  enabled: boolean;
  level: number;
  children: TreeNodeView[];
};

@Component({
  selector: 'app-project-submodule-structure',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzPopconfirmModule],
  templateUrl: './project-submodule-structure.component.html',
  styleUrls: ['./project-submodule-structure.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectSubmoduleStructureComponent {
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly modulesLoading = input(false);
  readonly busy = input(false);
  readonly canManageModules = input(false);
  readonly mode = input<StructureMode>('summary');
  readonly defaultCollapsed = input(false);

  readonly createModule = output<void>();
  readonly editModuleConfig = output<string>();
  readonly manageModuleMembers = output<string>();
  readonly manageModuleRdItems = output<string>();
  readonly toggleModuleEnabled = output<{ id: string; enabled: boolean }>();
  readonly removeModule = output<string>();

  readonly collapsedNodeIds = new Set<string>();

  nodeInitial(name: string): string {
    return (name || 'S').slice(0, 1).toUpperCase();
  }

  isDetailMode(): boolean {
    return this.mode() === 'detail';
  }

  shouldShowActions(): boolean {
    return this.isDetailMode();
  }

  shouldShowCreate(): boolean {
    return this.isDetailMode();
  }

  toggleNode(nodeId: string, event: Event): void {
    event.stopPropagation();
    if (this.collapsedNodeIds.has(nodeId)) {
      this.collapsedNodeIds.delete(nodeId);
    } else {
      this.collapsedNodeIds.add(nodeId);
    }
  }

  isNodeExpanded(nodeId: string): boolean {
    return this.defaultCollapsed() ? this.collapsedNodeIds.has(nodeId) : !this.collapsedNodeIds.has(nodeId);
  }

  headerCount(): number {
    return this.modules().length;
  }

  topLevelNodes(): TreeNodeView[] {
    return this.buildTree();
  }

  visibleNodes(): TreeNodeView[] {
    const result: TreeNodeView[] = [];
    const walk = (nodes: TreeNodeView[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0 && this.isNodeExpanded(node.id)) {
          walk(node.children);
        }
      }
    };
    walk(this.topLevelNodes());
    return result;
  }

  typeLabel(type: ProjectModuleNodeType): string {
    return type === 'subsystem' ? '子项目' : '模块';
  }

  childCount(node: TreeNodeView): number {
    return this.countDescendantsById(node.id);
  }

  hasChildNodes(node: TreeNodeView): boolean {
    return this.modules().some((item) => item.parentId === node.id);
  }

  private buildTree(): TreeNodeView[] {
    const sortedItems = [...this.modules()].sort((a, b) => this.compareNodes(a, b));
    const nodeMap = new Map<string, TreeNodeView>();
    for (const item of sortedItems) {
      nodeMap.set(item.id, {
        id: item.id,
        parentId: item.parentId ?? null,
        name: item.name,
        code: item.code ?? null,
        projectNo: item.projectNo ?? null,
        nodeType: item.nodeType,
        description: item.description ?? null,
        enabled: item.enabled,
        level: 0,
        children: []
      });
    }

    const roots: TreeNodeView[] = [];
    for (const item of sortedItems) {
      const node = nodeMap.get(item.id);
      if (!node) continue;
      const parent = item.parentId ? nodeMap.get(item.parentId) : null;
      if (parent && parent.id !== node.id) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const setLevel = (nodes: TreeNodeView[], level: number) => {
      for (const node of nodes) {
        node.level = level;
        setLevel(node.children, level + 1);
      }
    };
    setLevel(roots, 0);
    return roots;
  }

  private countDescendantsById(parentId: string): number {
    const children = this.modules().filter((item) => item.parentId === parentId);
    return children.reduce((total, child) => total + 1 + this.countDescendantsById(child.id), 0);
  }

  private compareNodes(a: ProjectMetaItem, b: ProjectMetaItem): number {
    if (a.nodeType !== b.nodeType) {
      return a.nodeType === 'subsystem' ? -1 : 1;
    }
    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }
    return a.createdAt.localeCompare(b.createdAt);
  }
}
