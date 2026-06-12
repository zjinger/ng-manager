import type { AdminProfile } from '@/features/auth/types';

export interface MobileProjectSummary {
  id: string;
  projectKey: string;
  name: string;
  displayCode: string | null;
  avatarUrl: string | null;
}

export interface MobileConnectionStatus {
  app: 'hub-v2';
  env: string;
  authenticated: boolean;
  profile: AdminProfile;
  projectCount: number;
  currentProject: MobileProjectSummary | null;
}
