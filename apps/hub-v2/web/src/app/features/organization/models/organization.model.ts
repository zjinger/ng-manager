export type DepartmentStatus = 'active' | 'inactive';
export type DepartmentRelationType = 'primary' | 'secondary';
export type FinanceRoleStatus = 'active' | 'inactive';

export interface DepartmentEntity {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  externalFinanceCode: string | null;
  status: DepartmentStatus;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentTreeNode extends DepartmentEntity {
  children: DepartmentTreeNode[];
}

export interface UserDepartmentEntity {
  id: string;
  userId: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  relationType: DepartmentRelationType;
  roleCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDepartmentInput {
  departmentId: string;
  relationType?: DepartmentRelationType;
  roleCode?: string | null;
}

export interface DepartmentTitleEntity {
  id: string;
  departmentId: string;
  titleCode: string;
  titleName: string;
  status: 'active' | 'inactive';
  sort: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentTitleInput {
  titleCode: string;
  sort?: number;
}

export interface CreateDepartmentInput {
  code: string;
  name: string;
  parentId?: string | null;
  externalFinanceCode?: string | null;
  status?: DepartmentStatus;
  sort?: number;
}

export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;

export interface FinanceRoleEntity {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: FinanceRoleStatus;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinanceRoleInput {
  code: string;
  name: string;
  description?: string | null;
  status?: FinanceRoleStatus;
  sort?: number;
}

export type UpdateFinanceRoleInput = Partial<CreateFinanceRoleInput>;
