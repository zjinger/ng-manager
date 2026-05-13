import type { PageResult } from "../../shared/http/pagination";

export type DepartmentStatus = "active" | "inactive";
export type DepartmentRelationType = "primary" | "secondary";
export type FinanceRoleStatus = "active" | "inactive";

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

export interface CreateDepartmentInput {
  code: string;
  name: string;
  parentId?: string | null;
  externalFinanceCode?: string | null;
  status?: DepartmentStatus;
  sort?: number;
}

export interface UpdateDepartmentInput {
  code?: string;
  name?: string;
  parentId?: string | null;
  externalFinanceCode?: string | null;
  status?: DepartmentStatus;
  sort?: number;
}

export interface ListDepartmentsQuery {
  keyword?: string;
  status?: DepartmentStatus | "";
}

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

export interface UserFinanceRoleEntity {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  createdAt: string;
}

export interface CreateFinanceRoleInput {
  code: string;
  name: string;
  description?: string | null;
  status?: FinanceRoleStatus;
  sort?: number;
}

export interface UpdateFinanceRoleInput {
  code?: string;
  name?: string;
  description?: string | null;
  status?: FinanceRoleStatus;
  sort?: number;
}

export interface ListFinanceRolesQuery {
  keyword?: string;
  status?: FinanceRoleStatus | "";
}

export type DepartmentListResult = PageResult<DepartmentEntity>;
