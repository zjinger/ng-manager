import { client } from '@/lib/api/client';
import type { AdminProfile } from '@/features/auth/types';
import type { MobileConnectionStatus } from './types';

export async function fetchCurrentProfile(): Promise<AdminProfile> {
  return client.get<AdminProfile>('/admin/auth/me');
}

export async function fetchConnectionStatus(): Promise<MobileConnectionStatus> {
  return client.get<MobileConnectionStatus>('/admin/mobile/connection');
}
