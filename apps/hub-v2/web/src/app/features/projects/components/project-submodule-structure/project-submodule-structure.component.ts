import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import type { ProjectMetaItem } from '../../models/project.model';

type StructureMode = 'summary' | 'detail';

type ModuleView = {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  projectNo: string | null;
  description: string | null;
  enabled: boolean;
};

type SubsystemView = {
  id: string;
  name: string;
  code: string | null;
  projectNo: string | null;
  description: string | null;
  enabled: boolean;
  modules: ModuleView[];
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

  readonly createModule = output<void>();
  readonly editModuleConfig = output<string>();
  readonly manageModuleMembers = output<string>();
  readonly toggleModuleEnabled = output<{ id: string; enabled: boolean }>();
  readonly removeModule = output<string>();

  readonly expandedSubsystemIds = new Set<string>();

  subsystemInitial(name: string): string {
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

  toggleSubsystem(subsystemId: string, event: Event): void {
    event.stopPropagation();
    if (this.expandedSubsystemIds.has(subsystemId)) {
      this.expandedSubsystemIds.delete(subsystemId);
    } else {
      this.expandedSubsystemIds.add(subsystemId);
    }
  }

  isSubsystemExpanded(subsystemId: string): boolean {
    return !this.expandedSubsystemIds.has(subsystemId);
  }

  headerCount(): number {
    return this.isDetailMode() ? this.modules().length : this.subsystems().length;
  }

  subsystems(): SubsystemView[] {
    const items = this.modules();
    const subsystemItems = items.filter((item) => item.nodeType === 'subsystem');
    const subsystemIdSet = new Set(subsystemItems.map((item) => item.id));
    const modulesByParent = new Map<string, ModuleView[]>();
    for (const item of items) {
      if (item.nodeType !== 'module') {
        continue;
      }
      if (!item.parentId || !subsystemIdSet.has(item.parentId)) {
        continue;
      }
      const list = modulesByParent.get(item.parentId) ?? [];
      list.push({
        id: item.id,
        parentId: item.parentId,
        name: item.name,
        code: item.code ?? null,
        projectNo: item.projectNo ?? null,
        description: item.description ?? null,
        enabled: item.enabled
      });
      modulesByParent.set(item.parentId, list);
    }
    return subsystemItems.map((sub) => ({
      id: sub.id,
      name: sub.name,
      code: sub.code ?? null,
      projectNo: sub.projectNo ?? null,
      description: sub.description ?? null,
      enabled: sub.enabled,
      modules: modulesByParent.get(sub.id) ?? []
    }));
  }

  standaloneModules(): ModuleView[] {
    const items = this.modules();
    const subsystemIdSet = new Set(items.filter((item) => item.nodeType === 'subsystem').map((item) => item.id));
    return items
      .filter((item) => item.nodeType === 'module' && (!item.parentId || !subsystemIdSet.has(item.parentId)))
      .map((item) => ({
        id: item.id,
        parentId: item.parentId ?? null,
        name: item.name,
        code: item.code ?? null,
        projectNo: item.projectNo ?? null,
        description: item.description ?? null,
        enabled: item.enabled
      }));
  }
}
