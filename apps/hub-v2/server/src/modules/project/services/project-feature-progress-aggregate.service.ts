import { nowIso } from "../../../shared/utils/time";
import { ProjectRepo } from "../project.repo";
import {
  DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS,
  type ProjectEntity,
  type ProjectFeaturePointEntity,
  type ProjectFeaturePointGroupEntity,
  type ProjectFeaturePointGroupUpdateResult,
  type ProjectFeatureProgressIncrementalResult,
  type ProjectFeatureProgressMetric,
  type ProjectFeatureProgressModuleNode,
  type ProjectFeatureProgressNodePatch,
  type ProjectFeatureProgressOverrideEntity,
  type ProjectFeatureProgressSectionPatch,
  type ProjectFeatureProgressSettings,
  type ProjectFeatureProgressView
} from "../project.types";
import { groupName } from "./project-service-utils";

export class ProjectFeatureProgressAggregateService {
  constructor(private readonly repo: ProjectRepo) {}

  resolveSettings(projectId: string): ProjectFeatureProgressSettings {
    const settings = this.repo.getFeatureProgressSettings(projectId);
    if (settings) {
      return settings;
    }
    const now = nowIso();
    return {
      projectId,
      enabled: true,
      statusOptions: DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS,
      createdAt: now,
      updatedAt: now
    };
  }

  buildView(project: ProjectEntity): ProjectFeatureProgressView {
    const settings = { ...this.resolveSettings(project.id), enabled: true };
    const groups = this.repo.listFeaturePointGroups(project.id);
    const featurePoints = this.repo.listFeaturePoints(project.id).filter((item) => item.enabled);
    const overrides = this.repo.listFeatureProgressOverrides(project.id);
    return this.buildFeatureProgressView(project, settings, groups, featurePoints, overrides);
  }

  buildIncrementalResult(
    project: ProjectEntity,
    options: {
      affectedFeaturePoints?: ProjectFeaturePointEntity[];
      removedFeaturePointIds?: string[];
      affectedGroupIds?: string[];
      removedGroupIds?: string[];
      projectOverride?: ProjectFeatureProgressOverrideEntity | null;
    } = {}
  ): ProjectFeatureProgressIncrementalResult {
    const view = this.buildView(project);
    const currentProjectOverride =
      this.repo
        .listFeatureProgressOverrides(project.id)
        .find((override) => override.targetType === "project" && override.targetId === project.id) ?? null;
    return {
      summary: view.summary,
      modules: view.modules,
      sections: this.buildSectionPatches(view),
      affectedFeaturePoints: options.affectedFeaturePoints,
      removedFeaturePointIds: options.removedFeaturePointIds,
      affectedGroupIds: options.affectedGroupIds,
      removedGroupIds: options.removedGroupIds,
      projectOverride: options.projectOverride === undefined ? currentProjectOverride : options.projectOverride
    };
  }

  buildGroupUpdateResult(project: ProjectEntity, group: ProjectFeaturePointGroupEntity): ProjectFeaturePointGroupUpdateResult {
    const view = this.buildView(project);
    const featurePoints = this.repo.listFeaturePoints(project.id).filter((item) => item.enabled);
    const nodeById = new Map(
      view.modules.flatMap((node) => this.collectProgressNodesFromNode(node)).map((node) => [node.id, node])
    );
    const affectedNodeIds = new Set([group.id]);
    if (group.parentId) {
      affectedNodeIds.add(group.parentId);
    }
    const affectedSectionKeys = this.findAffectedSectionKeys(group, featurePoints);
    const sectionPatches = this.buildSectionPatches(view).filter((section) => affectedSectionKeys.has(section.key));

    return {
      group,
      summary: view.summary,
      nodes: Array.from(affectedNodeIds)
        .map((id) => nodeById.get(id))
        .filter((node): node is ProjectFeatureProgressModuleNode => !!node)
        .map((node) => this.toNodePatch(node)),
      modules: view.modules,
      sections: sectionPatches
    };
  }

  buildSectionPatches(view: ProjectFeatureProgressView): ProjectFeatureProgressSectionPatch[] {
    const nodeById = new Map(
      view.modules.flatMap((node) => this.collectProgressNodesFromNode(node)).map((node) => [node.id, node])
    );
    const sectionMap = new Map<string, Map<string, { progress: number; featureCount: number }>>();
    const features = [
      ...view.modules.flatMap((node) => this.collectFeaturePointsFromNode(node)),
      ...view.ungrouped.featurePoints
    ];

    for (const feature of features) {
      const sectionKey = groupName(feature.groupTitle);
      const moduleKey = `${sectionKey}::${feature.moduleGroupId || groupName(feature.moduleName)}`;
      const moduleProgress = feature.moduleGroupId ? nodeById.get(feature.moduleGroupId)?.displayProgress ?? 0 : 0;
      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, new Map());
      }
      const moduleMap = sectionMap.get(sectionKey)!;
      const current = moduleMap.get(moduleKey);
      moduleMap.set(moduleKey, {
        progress: current?.progress ?? moduleProgress,
        featureCount: (current?.featureCount ?? 0) + 1
      });
    }

    return Array.from(sectionMap.entries()).map(([title, moduleMap]) => {
      const groups = Array.from(moduleMap.values());
      return {
        key: title,
        title,
        progress: this.averageProgressValues(groups.map((group) => group.progress)),
        completedCount: groups.filter((group) => group.progress >= 100).length,
        featureCount: groups.reduce((sum, group) => sum + group.featureCount, 0),
        groupCount: groups.length
      };
    });
  }

  normalizeProgress(progress: number | null | undefined): number {
    const value = Number(progress ?? 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  }

  normalizeStatusOptions(
    options: ProjectFeatureProgressSettings["statusOptions"] | null | undefined
  ): ProjectFeatureProgressSettings["statusOptions"] {
    const fallbackByKey = new Map(DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS.map((option) => [option.key, option]));
    const inputByKey = new Map((options ?? []).map((option) => [option.key, option]));
    return DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS
      .map((defaultOption) => {
        const option = inputByKey.get(defaultOption.key) ?? fallbackByKey.get(defaultOption.key)!;
        const label = option.label.trim() || defaultOption.label;
        return {
          key: defaultOption.key,
          label: label.slice(0, 24),
          progress: this.normalizeProgress(option.progress)
        };
      })
      .sort((left, right) => left.progress - right.progress);
  }

  private buildFeatureProgressView(
    project: ProjectEntity,
    settings: ProjectFeatureProgressSettings,
    groups: ProjectFeaturePointGroupEntity[],
    featurePoints: ProjectFeaturePointEntity[],
    overrides: ProjectFeatureProgressOverrideEntity[]
  ): ProjectFeatureProgressView {
    const overrideMap = new Map(overrides.map((item) => [`${item.targetType}:${item.targetId}`, item]));
    const featuresByGroup = new Map<string, ProjectFeaturePointEntity[]>();
    const knownGroupIds = new Set(groups.map((item) => item.id));
    const ungroupedFeatures: ProjectFeaturePointEntity[] = [];

    for (const feature of featurePoints) {
      const groupId =
        feature.submoduleGroupId && knownGroupIds.has(feature.submoduleGroupId)
          ? feature.submoduleGroupId
          : feature.moduleGroupId && knownGroupIds.has(feature.moduleGroupId)
            ? feature.moduleGroupId
            : null;
      if (groupId) {
        featuresByGroup.set(groupId, [...(featuresByGroup.get(groupId) ?? []), feature]);
      } else {
        ungroupedFeatures.push(feature);
      }
    }

    const childGroups = new Map<string, ProjectFeaturePointGroupEntity[]>();
    const roots: ProjectFeaturePointGroupEntity[] = [];
    for (const group of [...groups].sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name))) {
      if (group.parentId && knownGroupIds.has(group.parentId)) {
        childGroups.set(group.parentId, [...(childGroups.get(group.parentId) ?? []), group]);
      } else {
        roots.push(group);
      }
    }

    const buildNode = (group: ProjectFeaturePointGroupEntity): ProjectFeatureProgressModuleNode => {
      const children = (childGroups.get(group.id) ?? []).map(buildNode).filter((child) => child.featureCount > 0);
      const directFeatures = featuresByGroup.get(group.id) ?? [];
      const descendantFeatures = [
        ...directFeatures,
        ...children.flatMap((child) => this.collectFeaturePointsFromNode(child))
      ];
      const computedProgress =
        children.length > 0 ? this.averageProgressValues(children.map((child) => child.displayProgress)) : 0;
      const metric = this.applyFeatureGroupManualProgress(computedProgress, group.manualProgress, group.remark);
      return {
        ...metric,
        id: group.id,
        projectId: group.projectId,
        name: group.name,
        code: null,
        nodeType: group.parentId ? "module" : "subsystem",
        parentId: group.parentId,
        parentName: group.parentId ? groups.find((item) => item.id === group.parentId)?.name ?? null : null,
        sort: group.sort,
        featureCount: descendantFeatures.length,
        children,
        featurePoints: directFeatures
      };
    };

    const moduleNodes = roots.map(buildNode).filter((node) => node.featureCount > 0);
    const progressNodes = moduleNodes.flatMap((node) => this.collectProgressNodesFromNode(node));
    const computedProgress = this.averageProgressValues(progressNodes.map((node) => node.displayProgress));
    const summaryMetric = this.applyFeatureProgressOverride(computedProgress, overrideMap.get(`project:${project.id}`) ?? null);

    return {
      projectId: project.id,
      enabled: settings.enabled,
      settings,
      summary: {
        projectId: project.id,
        totalCount: featurePoints.length,
        completedCount: progressNodes.filter((item) => item.displayProgress >= 100).length,
        inProgressCount: progressNodes.filter((item) => item.displayProgress > 0 && item.displayProgress < 100).length,
        notStartedCount: progressNodes.filter((item) => item.displayProgress <= 0).length,
        ...summaryMetric
      },
      modules: moduleNodes,
      ungrouped: {
        id: "ungrouped",
        name: "未分组",
        computedProgress: 0,
        manualProgress: null,
        overrideProgress: null,
        displayProgress: 0,
        overrideRemark: null,
        featureCount: ungroupedFeatures.length,
        featurePoints: ungroupedFeatures
      }
    };
  }

  private findAffectedSectionKeys(
    group: ProjectFeaturePointGroupEntity,
    featurePoints: ProjectFeaturePointEntity[]
  ): Set<string> {
    const isSubmodule = !!group.parentId;
    return new Set(
      featurePoints
        .filter((feature) => (isSubmodule ? feature.submoduleGroupId === group.id : feature.moduleGroupId === group.id))
        .map((feature) => groupName(feature.groupTitle))
    );
  }

  private toNodePatch(node: ProjectFeatureProgressModuleNode): ProjectFeatureProgressNodePatch {
    return {
      id: node.id,
      name: node.name,
      computedProgress: node.computedProgress,
      manualProgress: node.manualProgress,
      displayProgress: node.displayProgress,
      overrideRemark: node.overrideRemark,
      sort: node.sort
    };
  }

  private collectFeaturePointsFromNode(node: ProjectFeatureProgressModuleNode): ProjectFeaturePointEntity[] {
    return [...node.featurePoints, ...node.children.flatMap((child) => this.collectFeaturePointsFromNode(child))];
  }

  private collectProgressNodesFromNode(node: ProjectFeatureProgressModuleNode): ProjectFeatureProgressModuleNode[] {
    return [node, ...node.children.flatMap((child) => this.collectProgressNodesFromNode(child))];
  }

  private averageProgressValues(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return Math.round(values.reduce((sum, value) => sum + this.normalizeProgress(value), 0) / values.length);
  }

  private applyFeatureProgressOverride(
    computedProgress: number,
    override: ProjectFeatureProgressOverrideEntity | null
  ): ProjectFeatureProgressMetric {
    const overrideProgress = override ? this.normalizeProgress(override.progress) : null;
    return {
      computedProgress,
      manualProgress: overrideProgress,
      overrideProgress,
      displayProgress: overrideProgress ?? computedProgress,
      overrideRemark: override?.remark ?? null
    };
  }

  private applyFeatureGroupManualProgress(
    computedProgress: number,
    manualProgress: number | null,
    remark: string | null
  ): ProjectFeatureProgressMetric {
    const normalizedManualProgress = manualProgress === null ? null : this.normalizeProgress(manualProgress);
    return {
      computedProgress,
      manualProgress: normalizedManualProgress,
      overrideProgress: normalizedManualProgress,
      displayProgress: normalizedManualProgress ?? computedProgress,
      overrideRemark: normalizedManualProgress === null ? null : remark
    };
  }
}
