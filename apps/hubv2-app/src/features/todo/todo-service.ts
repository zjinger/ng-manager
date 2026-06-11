import { client } from '@/lib/api/client';
import type {
  FetchTodoListParams,
  IssueTodoAction,
  MobileTargetType,
  MobileTimelineItem,
  MobileTodoAction,
  MobileTodoDetail,
  MobileTodoPage,
  RdTodoAction,
} from './types';

const DEFAULT_PAGE_SIZE = 20;

export async function fetchTodoList(params: FetchTodoListParams = {}): Promise<MobileTodoPage> {
  return client.get<MobileTodoPage>('/admin/mobile/todos', {
    params: {
      category: params.category ?? 'all',
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
      projectId: params.projectId,
      status: params.status,
      priority: params.priority,
      keyword: params.keyword,
    },
  });
}

export async function fetchTodoDetail(
  targetType: MobileTargetType,
  targetId: string
): Promise<MobileTodoDetail> {
  return client.get<MobileTodoDetail>(`/admin/mobile/todos/${targetType}/${targetId}`);
}

export async function addIssueComment(
  issueId: string,
  content: string
): Promise<MobileTimelineItem> {
  return client.post<MobileTimelineItem, { content: string }>(
    `/admin/mobile/issues/${issueId}/comments`,
    { content }
  );
}

export async function runTodoAction(
  targetType: MobileTargetType,
  targetId: string,
  action: MobileTodoAction
): Promise<MobileTodoDetail | unknown> {
  if (targetType === 'issue') {
    return client.post<unknown, { action: IssueTodoAction }>(
      `/admin/mobile/issues/${targetId}/actions`,
      { action: action as IssueTodoAction }
    );
  }

  return client.post<unknown, { action: RdTodoAction }>(
    `/admin/mobile/rd-items/${targetId}/actions`,
    { action: action as RdTodoAction }
  );
}

export async function updateRdProgress(params: {
  itemId: string;
  progress: number;
  note?: string;
  stageTaskId?: string;
}): Promise<unknown> {
  return client.post<
    unknown,
    { progress: number; note?: string; stageTaskId?: string }
  >(`/admin/mobile/rd-items/${params.itemId}/progress`, {
    progress: params.progress,
    note: params.note,
    stageTaskId: params.stageTaskId,
  });
}
