import { client } from '@/lib/api/client';
import type {
  FetchMessagesParams,
  MarkMessagesReadInput,
  MarkMessagesReadResult,
  MobileMessageDetail,
  MobileMessagePage,
  MobileMessageType,
} from './types';

const DEFAULT_PAGE_SIZE = 20;

export async function fetchMessages(params: FetchMessagesParams = {}): Promise<MobileMessagePage> {
  return client.get<MobileMessagePage>('/admin/mobile/messages', {
    params: {
      category: params.category ?? 'all',
      unreadOnly: params.unreadOnly,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    },
  });
}

export async function fetchMessageDetail(
  messageType: MobileMessageType,
  id: string
): Promise<MobileMessageDetail> {
  return client.get<MobileMessageDetail>(`/admin/mobile/messages/${messageType}/${id}`);
}

export async function markMessagesRead(input: MarkMessagesReadInput): Promise<MarkMessagesReadResult> {
  return client.post<MarkMessagesReadResult, MarkMessagesReadInput>(
    '/admin/mobile/messages/read',
    input
  );
}
