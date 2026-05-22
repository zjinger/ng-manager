export type ProjectTitleStatus = 'active' | 'inactive';

export interface ProjectTitleEntity {
  id: string;
  code: string;
  name: string;
  status: ProjectTitleStatus;
  sort: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectTitleInput {
  code: string;
  name: string;
  status?: ProjectTitleStatus;
  sort?: number;
  remark?: string | null;
}

export interface UpdateProjectTitleInput {
  code?: string;
  name?: string;
  status?: ProjectTitleStatus;
  sort?: number;
  remark?: string | null;
}
