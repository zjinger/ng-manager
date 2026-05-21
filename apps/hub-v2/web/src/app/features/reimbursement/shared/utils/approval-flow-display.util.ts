import type { ReimbursementApprovalPreviewNode } from '@app/features/reimbursement/models/reimbursement.model';

export type FlowNodeStatus = 'wait' | 'process' | 'finish' | 'rejected' | 'cancelled';

export interface FlowDisplayNode {
  stageCode: string;
  stageName: string;
  status: FlowNodeStatus;
  assignees: Array<{ userId: string; name: string }>;
  index: number;
}

/** 默认流程节点（用于无数据时的展示） */
export const DEFAULT_FLOW_NODES: FlowDisplayNode[] = [
  {
    stageCode: 'applicant',
    stageName: '报销人/出差人',
    status: 'process',
    assignees: [],
    index: 1,
  },
  {
    stageCode: 'current',
    stageName: '审核',
    status: 'wait',
    assignees: [],
    index: 2,
  },
  {
    stageCode: 'next',
    stageName: '部门主管',
    status: 'wait',
    assignees: [],
    index: 3,
  },
  {
    stageCode: 'next',
    stageName: '会计',
    status: 'wait',
    assignees: [],
    index: 4,
  },
  {
    stageCode: 'next',
    stageName: '出纳',
    status: 'wait',
    assignees: [],
    index: 5,
  },
  {
    stageCode: 'next',
    stageName: '完成',
    status: 'wait',
    assignees: [],
    index: 6,
  },
];

/** 映射节点状态 */
export function mapNodeStatus(status: string): FlowNodeStatus {
  switch (status) {
    case 'approved':
      return 'finish';
    case 'current':
      return 'process';
    case 'pending':
      return 'wait';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'wait';
  }
}

/** 获取状态显示文本 */
export function getStatusText(status: FlowNodeStatus): string {
  switch (status) {
    case 'process':
      return '当前处理节点';
    case 'finish':
      return '已通过';
    case 'rejected':
      return '已驳回';
    case 'cancelled':
      return '已取消';
    case 'wait':
    default:
      return '待处理';
  }
}

/** 获取审批人名称列表 */
export function getAssigneeNames(assignees: Array<{ userId: string; name: string }>): string {
  if (!assignees || assignees.length === 0) return '';
  return assignees.map((assignee) => assignee.name).join(', ');
}

/** 转换预览数据为显示节点 */
export function transformToDisplayNodes(
  nodes: ReimbursementApprovalPreviewNode[] | undefined
): FlowDisplayNode[] {
  if (!nodes || nodes.length === 0) {
    return DEFAULT_FLOW_NODES;
  }

  return nodes
    .filter((node) => node.status !== 'cancelled')
    .map((node, idx) => ({
      stageCode: node.stageCode,
      stageName: node.stageName,
      status: mapNodeStatus(node.status),
      assignees: node.assignees || [],
      index: idx + 1,
    }));
}
