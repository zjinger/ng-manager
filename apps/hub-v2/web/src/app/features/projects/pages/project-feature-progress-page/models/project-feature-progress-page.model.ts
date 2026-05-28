import type {
  ProjectFeaturePoint,
  ProjectFeaturePointStatus,
  ProjectFeatureProgressSectionPatch,
} from '../../../models/project.model';
import type {
  FeatureProgressModuleGroup,
  FeatureProgressSubGroup,
  FeatureProgressTitleGroup,
} from '../../../components/project-feature-progress-tree/project-feature-progress-tree.component';

export type FeatureProgressFlatNodeType = 'section' | 'module' | 'submodule' | 'feature';
export type FeatureProgressBranchGuide = 'blank' | 'line' | 'tee' | 'elbow';

export interface FeatureProgressFlatNode {
  id: string;
  rawId: string;
  key: string;
  parentId: string | null;
  type: FeatureProgressFlatNodeType;
  level: number;
  branchGuides: FeatureProgressBranchGuide[];
  name: string;
  expanded: boolean;
  expandable: boolean;
  childrenCount: number;
  sort: number;
  progress: number;
  computedProgress?: number;
  manualProgress?: number | null;
  completedCount?: number;
  featureCount?: number;
  remark?: string | null;
  feature?: ProjectFeaturePoint;
  group?: FeatureProgressModuleGroup | FeatureProgressSubGroup;
  parentGroup?: FeatureProgressModuleGroup;
  section?: FeatureProgressTitleGroup;
  sectionPatch?: ProjectFeatureProgressSectionPatch;
  moduleGroupId?: string | null;
  submoduleGroupId?: string | null;
  status?: ProjectFeaturePointStatus;
  statusText?: string;
  statusClass?: string;
  progressText: string;
  typeText: string;
}

export interface FeatureProgressTreeBuildResult {
  sections: FeatureProgressTitleGroup[];
  allNodes: FeatureProgressFlatNode[];
  visibleNodes: FeatureProgressFlatNode[];
  moduleOptions: string[];
  progressStatusByFeatureId: Map<string, ProjectFeaturePointStatus>;
}
