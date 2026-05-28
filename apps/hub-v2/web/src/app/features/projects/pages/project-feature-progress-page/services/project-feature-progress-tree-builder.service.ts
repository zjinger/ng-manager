import { Injectable } from '@angular/core';

import type {
  ProjectFeaturePoint,
  ProjectFeaturePointStatus,
  ProjectFeatureProgressModuleNode,
  ProjectFeatureProgressSectionPatch,
  ProjectFeatureProgressStatusOption,
  ProjectFeatureProgressView,
} from '../../../models/project.model';
import type {
  FeatureProgressGroupDisplayPatch,
  FeatureProgressModuleGroup,
  FeatureProgressSubGroup,
  FeatureProgressTitleGroup,
} from '../../../components/project-feature-progress-tree/project-feature-progress-tree.component';
import type { FeatureProgressBranchGuide, FeatureProgressFlatNode, FeatureProgressTreeBuildResult } from '../models/project-feature-progress-page.model';

@Injectable({ providedIn: 'root' })
export class ProjectFeatureProgressTreeBuilderService {
  build(input: {
    view: ProjectFeatureProgressView | null;
    keyword: string;
    moduleFilter: string;
    statusFilter: ProjectFeaturePointStatus | '';
    expandedIds: ReadonlySet<string>;
    expandAll: boolean;
    groupPatches: Record<string, FeatureProgressGroupDisplayPatch>;
    sectionPatches: Record<string, ProjectFeatureProgressSectionPatch>;
    statusOptions: ProjectFeatureProgressStatusOption[];
  }): FeatureProgressTreeBuildResult {
    if (!input.view) {
      return { sections: [], allNodes: [], visibleNodes: [], moduleOptions: [], progressStatusByFeatureId: new Map() };
    }

    const allFeatures = this.allFeatures(input.view);
    const progressStatusByFeatureId = this.buildProgressStatusByFeatureId(input.view, input.statusOptions);
    const filteredFeatures = this.filterFeatures(
      allFeatures,
      input.keyword,
      input.moduleFilter,
      input.statusFilter,
      progressStatusByFeatureId
    );
    const sections = this.buildSections(input.view.modules, filteredFeatures, input.groupPatches, input.sectionPatches);
    const allNodes = this.flattenSections(sections, input.expandedIds, input.expandAll, input.statusOptions, input.sectionPatches);
    const visibleNodes = this.visibleNodes(allNodes, input.expandedIds, input.expandAll);
    return {
      sections,
      allNodes,
      visibleNodes,
      moduleOptions: this.buildModuleOptions(input.view, allFeatures),
      progressStatusByFeatureId,
    };
  }

  private allFeatures(view: ProjectFeatureProgressView): ProjectFeaturePoint[] {
    return [
      ...this.collectModuleFeatures(view.modules),
      ...view.ungrouped.featurePoints,
    ].sort((left, right) => left.sort - right.sort || left.createdAt.localeCompare(right.createdAt));
  }

  private filterFeatures(
    features: ProjectFeaturePoint[],
    keywordValue: string,
    moduleName: string,
    status: ProjectFeaturePointStatus | '',
    progressStatusByFeatureId: ReadonlyMap<string, ProjectFeaturePointStatus>
  ): ProjectFeaturePoint[] {
    const keyword = keywordValue.trim().toLowerCase();
    return features.filter((feature) => {
      if (moduleName && this.groupName(feature.moduleName) !== moduleName) return false;
      if (status && progressStatusByFeatureId.get(feature.id) !== status) return false;
      if (!keyword) return true;
      return this.featureSearchText(feature).includes(keyword);
    });
  }

  private buildSections(
    nodes: ProjectFeatureProgressModuleNode[],
    features: ProjectFeaturePoint[],
    groupPatches: Record<string, FeatureProgressGroupDisplayPatch>,
    sectionPatches: Record<string, ProjectFeatureProgressSectionPatch>
  ): FeatureProgressTitleGroup[] {
    const nodeById = new Map<string, ProjectFeatureProgressModuleNode>();
    this.collectModuleNodes(nodes).forEach((node) => nodeById.set(node.id, node));
    const sectionMap = new Map<string, Map<string, Map<string, ProjectFeaturePoint[]>>>();

    for (const feature of this.sortFeatures(features)) {
      const sectionKey = this.groupName(feature.groupTitle);
      const moduleKey = `${sectionKey}::${feature.moduleGroupId || this.groupName(feature.moduleName)}`;
      const submoduleKey = `${moduleKey}::${feature.submoduleGroupId || this.groupName(feature.submoduleName)}`;
      if (!sectionMap.has(sectionKey)) sectionMap.set(sectionKey, new Map());
      const moduleMap = sectionMap.get(sectionKey)!;
      if (!moduleMap.has(moduleKey)) moduleMap.set(moduleKey, new Map());
      const submoduleMap = moduleMap.get(moduleKey)!;
      if (!submoduleMap.has(submoduleKey)) submoduleMap.set(submoduleKey, []);
      submoduleMap.get(submoduleKey)!.push(feature);
    }

    return Array.from(sectionMap.entries()).map(([title, moduleMap]) => {
      const groups = Array.from(moduleMap.entries()).map(([moduleKey, submoduleMap]) => {
        const moduleFeatures = Array.from(submoduleMap.values()).flat();
        const firstFeature = moduleFeatures[0]!;
        const moduleNode = firstFeature.moduleGroupId ? nodeById.get(firstFeature.moduleGroupId) ?? null : null;
        const modulePatch = moduleNode ? groupPatches[moduleNode.id] : undefined;
        const subgroups = Array.from(submoduleMap.entries()).map(([submoduleKey, subgroupFeatures]) => {
          const subgroupFirst = subgroupFeatures[0]!;
          const submoduleNode = subgroupFirst.submoduleGroupId ? nodeById.get(subgroupFirst.submoduleGroupId) ?? null : null;
          const patch = submoduleNode ? groupPatches[submoduleNode.id] : undefined;
          const progress = patch?.progress ?? submoduleNode?.displayProgress ?? 0;
          return {
            id: subgroupFirst.submoduleGroupId || submoduleKey,
            key: submoduleKey,
            name: patch?.name ?? this.groupName(subgroupFirst.submoduleName),
            progress,
            computedProgress: patch?.computedProgress ?? submoduleNode?.computedProgress ?? progress,
            manualProgress: patch ? patch.manualProgress : submoduleNode?.manualProgress ?? null,
            completedCount: progress >= 100 ? 1 : 0,
            featureCount: subgroupFeatures.length,
            sort: patch?.sort ?? submoduleNode?.sort ?? subgroupFirst.sort,
            remark: patch?.remark ?? submoduleNode?.overrideRemark ?? null,
            virtual: !subgroupFirst.submoduleGroupId,
            features: this.sortFeatures(subgroupFeatures),
          };
        }).sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'zh-Hans-CN'));
        const computedProgress = this.averageProgressValues(subgroups.map((subgroup) => subgroup.progress));
        const progress = modulePatch?.progress ?? moduleNode?.manualProgress ?? computedProgress;
        return {
          id: firstFeature.moduleGroupId || moduleKey,
          key: moduleKey,
          name: modulePatch?.name ?? this.groupName(firstFeature.moduleName),
          progress,
          computedProgress: modulePatch?.computedProgress ?? computedProgress,
          manualProgress: modulePatch ? modulePatch.manualProgress : moduleNode?.manualProgress ?? null,
          completedCount: subgroups.filter((subgroup) => subgroup.progress >= 100).length,
          featureCount: moduleFeatures.length,
          sort: modulePatch?.sort ?? moduleNode?.sort ?? firstFeature.sort,
          remark: modulePatch?.remark ?? moduleNode?.overrideRemark ?? null,
          virtual: !firstFeature.moduleGroupId,
          subgroups,
        };
      }).sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'zh-Hans-CN'));
      const patch = sectionPatches[title];
      const sectionFeatures = groups.flatMap((group) => group.subgroups.flatMap((subgroup) => subgroup.features));
      return {
        key: title,
        title,
        progress: patch?.progress ?? this.averageProgressValues(groups.map((group) => group.progress)),
        completedCount: patch?.completedCount ?? groups.filter((group) => group.progress >= 100).length,
        featureCount: patch?.featureCount ?? sectionFeatures.length,
        groups,
      };
    });
  }

  private flattenSections(
    sections: FeatureProgressTitleGroup[],
    expandedIds: ReadonlySet<string>,
    expandAll: boolean,
    statusOptions: ProjectFeatureProgressStatusOption[],
    sectionPatches: Record<string, ProjectFeatureProgressSectionPatch>
  ): FeatureProgressFlatNode[] {
    const rows: FeatureProgressFlatNode[] = [];
    sections.forEach((section) => {
      rows.push({
        id: `section:${section.key}`,
        rawId: section.key,
        key: section.key,
        parentId: null,
        type: 'section',
        level: 0,
        branchGuides: [],
        name: section.title,
        expanded: expandAll || expandedIds.has(section.key),
        expandable: section.groups.length > 0,
        childrenCount: section.groups.length,
        sort: 0,
        progress: section.progress,
        completedCount: section.completedCount,
        featureCount: section.featureCount,
        section,
        sectionPatch: sectionPatches[section.key],
        progressText: this.progressText(section.progress, statusOptions),
        typeText: '分组标题',
      });
      section.groups.forEach((group, groupIndex) => {
        const groupHasNextSibling = groupIndex < section.groups.length - 1;
        rows.push({
          id: `module:${group.key}`,
          rawId: group.id,
          key: group.key,
          parentId: section.key,
          type: 'module',
          level: 1,
          branchGuides: [this.currentBranchGuide(groupHasNextSibling)],
          name: group.name,
          expanded: expandAll || expandedIds.has(group.key),
          expandable: group.subgroups.length > 0,
          childrenCount: group.subgroups.length,
          sort: group.sort,
          progress: group.progress,
          computedProgress: group.computedProgress,
          manualProgress: group.manualProgress,
          completedCount: group.completedCount,
          featureCount: group.featureCount,
          remark: group.remark,
          group,
          progressText: this.progressText(group.progress, statusOptions),
          typeText: '模块',
        });
        group.subgroups.forEach((subgroup, subgroupIndex) => {
          const subgroupHasNextSibling = subgroupIndex < group.subgroups.length - 1;
          rows.push({
            id: `submodule:${subgroup.key}`,
            rawId: subgroup.id,
            key: subgroup.key,
            parentId: group.key,
            type: 'submodule',
            level: 2,
            branchGuides: [
              this.ancestorBranchGuide(groupHasNextSibling),
              this.currentBranchGuide(subgroupHasNextSibling),
            ],
            name: subgroup.name,
            expanded: expandAll || expandedIds.has(subgroup.key),
            expandable: subgroup.features.length > 0,
            childrenCount: subgroup.features.length,
            sort: subgroup.sort,
            progress: subgroup.progress,
            computedProgress: subgroup.computedProgress,
            manualProgress: subgroup.manualProgress,
            completedCount: subgroup.completedCount,
            featureCount: subgroup.featureCount,
            remark: subgroup.remark,
            group: subgroup,
            parentGroup: group,
            progressText: this.progressText(subgroup.progress, statusOptions),
            typeText: '子模块',
          });
          subgroup.features.forEach((feature, featureIndex) => {
            const featureHasNextSibling = featureIndex < subgroup.features.length - 1;
            rows.push({
              id: `feature:${feature.id}`,
              rawId: feature.id,
              key: feature.id,
              parentId: subgroup.key,
              type: 'feature',
              level: 3,
              branchGuides: [
                this.ancestorBranchGuide(groupHasNextSibling),
                this.ancestorBranchGuide(subgroupHasNextSibling),
                this.currentBranchGuide(featureHasNextSibling),
              ],
              name: feature.name,
              expanded: false,
              expandable: false,
              childrenCount: 0,
              sort: feature.sort,
              progress: 0,
              feature,
              moduleGroupId: feature.moduleGroupId,
              submoduleGroupId: feature.submoduleGroupId,
              progressText: '',
              typeText: '功能点',
            });
          });
        });
      });
    });
    return rows;
  }

  private ancestorBranchGuide(hasNextSibling: boolean): FeatureProgressBranchGuide {
    return hasNextSibling ? 'line' : 'blank';
  }

  private currentBranchGuide(hasNextSibling: boolean): FeatureProgressBranchGuide {
    return hasNextSibling ? 'tee' : 'elbow';
  }

  private visibleNodes(
    nodes: FeatureProgressFlatNode[],
    expandedIds: ReadonlySet<string>,
    expandAll: boolean
  ): FeatureProgressFlatNode[] {
    if (expandAll) return nodes;
    const nodeByKey = new Map(nodes.map((node) => [node.key, node]));
    return nodes.filter((node) => this.isVisible(node, nodeByKey, expandedIds));
  }

  private isVisible(
    node: FeatureProgressFlatNode,
    nodeByKey: ReadonlyMap<string, FeatureProgressFlatNode>,
    expandedIds: ReadonlySet<string>
  ): boolean {
    let parentId = node.parentId;
    while (parentId) {
      if (!expandedIds.has(parentId)) return false;
      parentId = nodeByKey.get(parentId)?.parentId ?? null;
    }
    return true;
  }

  private buildProgressStatusByFeatureId(
    view: ProjectFeatureProgressView,
    statusOptions: ProjectFeatureProgressStatusOption[]
  ): Map<string, ProjectFeaturePointStatus> {
    const result = new Map<string, ProjectFeaturePointStatus>();
    const visitNode = (node: ProjectFeatureProgressModuleNode): void => {
      const status = this.progressStatusKey(node.displayProgress, statusOptions);
      node.featurePoints.forEach((feature) => result.set(feature.id, status));
      node.children.forEach(visitNode);
    };
    view.modules.forEach(visitNode);
    const ungroupedStatus = this.progressStatusKey(0, statusOptions);
    view.ungrouped.featurePoints.forEach((feature) => result.set(feature.id, ungroupedStatus));
    return result;
  }

  private buildModuleOptions(view: ProjectFeatureProgressView, allFeatures: ProjectFeaturePoint[]): string[] {
    const names = new Set<string>();
    for (const module of view.modules) {
      names.add(module.name);
    }
    for (const feature of allFeatures) {
      if (!feature.moduleGroupId) names.add(this.groupName(feature.moduleName));
    }
    return Array.from(names).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
  }

  private collectModuleFeatures(nodes: ProjectFeatureProgressModuleNode[]): ProjectFeaturePoint[] {
    return nodes.flatMap((node) => [
      ...node.featurePoints,
      ...this.collectModuleFeatures(node.children),
    ]);
  }

  private collectModuleNodes(nodes: ProjectFeatureProgressModuleNode[]): ProjectFeatureProgressModuleNode[] {
    return nodes.flatMap((node) => [node, ...this.collectModuleNodes(node.children)]);
  }

  private sortFeatures(features: ProjectFeaturePoint[]): ProjectFeaturePoint[] {
    return [...features].sort((left, right) => left.sort - right.sort || left.createdAt.localeCompare(right.createdAt));
  }

  private groupName(value: string | null | undefined): string {
    return value?.trim() || '未分组';
  }

  private featureSearchText(feature: ProjectFeaturePoint): string {
    return [
      feature.groupTitle,
      feature.moduleName,
      feature.submoduleName,
      feature.name,
      feature.ownerName,
      ...(feature.ownerNames ?? []),
      feature.remark,
    ]
      .filter((value): value is string => !!value)
      .join('\n')
      .toLowerCase();
  }

  private averageProgressValues(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + Math.max(0, Math.min(100, value)), 0) / values.length);
  }

  private progressStatusKey(
    progress: number,
    options: ProjectFeatureProgressStatusOption[]
  ): ProjectFeaturePointStatus {
    const normalized = Math.max(0, Math.min(100, Math.round(progress)));
    const option = [...options]
      .sort((left, right) => right.progress - left.progress)
      .find((item) => normalized >= item.progress);
    return option?.key ?? 'todo';
  }

  private progressText(progress: number, options: ProjectFeatureProgressStatusOption[]): string {
    const key = this.progressStatusKey(progress, options);
    return options.find((option) => option.key === key)?.label ?? '未开始';
  }
}
