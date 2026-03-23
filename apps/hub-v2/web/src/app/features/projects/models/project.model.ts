export interface ProjectSummary {
  id: string;
  projectKey: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: 'active' | 'inactive' | '';
}

export interface CreateProjectInput {
  projectKey: string;
  name: string;
  description?: string;
  icon?: string;
  visibility?: 'internal' | 'private';
}

export interface AddProjectMemberInput {
  userId: string;
  roleCode?: string;
  isOwner?: boolean;
}

export interface ProjectMemberEntity {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  roleCode: string;
  isOwner: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}
