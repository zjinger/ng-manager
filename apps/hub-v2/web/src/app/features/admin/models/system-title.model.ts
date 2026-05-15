export type SystemTitleStatus = 'active' | 'inactive';

export interface SystemTitleEntity {
  id: string;
  code: string;
  name: string;
  status: SystemTitleStatus;
  sort: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemTitleInput {
  code: string;
  name: string;
  status?: SystemTitleStatus;
  sort?: number;
  remark?: string | null;
}

export interface UpdateSystemTitleInput {
  code?: string;
  name?: string;
  status?: SystemTitleStatus;
  sort?: number;
  remark?: string | null;
}
