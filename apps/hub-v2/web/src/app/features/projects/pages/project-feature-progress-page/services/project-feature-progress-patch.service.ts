import { Injectable } from '@angular/core';

import type {
  ProjectFeaturePoint,
  ProjectFeatureProgressIncrementalResult,
  ProjectFeatureProgressView,
} from '../../../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectFeatureProgressPatchService {
  applyIncrementalResult(
    current: ProjectFeatureProgressView,
    result: ProjectFeatureProgressIncrementalResult
  ): ProjectFeatureProgressView {
    const removedFeatureIds = new Set(result.removedFeaturePointIds ?? []);
    for (const feature of result.affectedFeaturePoints ?? []) {
      removedFeatureIds.add(feature.id);
    }

    const ungroupedFeatures = current.ungrouped.featurePoints
      .filter((feature) => !removedFeatureIds.has(feature.id));

    for (const feature of result.affectedFeaturePoints ?? []) {
      if (!feature.moduleGroupId && !feature.submoduleGroupId) {
        ungroupedFeatures.push(feature);
      }
    }

    return {
      ...current,
      summary: result.summary,
      modules: result.modules,
      ungrouped: {
        ...current.ungrouped,
        featureCount: ungroupedFeatures.length,
        featurePoints: this.sortFeatures(ungroupedFeatures),
      },
    };
  }

  private sortFeatures(features: ProjectFeaturePoint[]): ProjectFeaturePoint[] {
    return [...features].sort((left, right) => left.sort - right.sort || left.createdAt.localeCompare(right.createdAt));
  }
}
