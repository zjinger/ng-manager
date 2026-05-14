import type { PageResult } from "../../shared/http/pagination";

export type DepartmentStatus = "active" | "inactive";
export type DepartmentRelationType = "primary";

export interface OrganizationUserRef {
  id: string;
  username: string;
  displayName: string | null;
}

export interface DepartmentEntity {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  externalFinanceCode: string | null;
  managerUserId: string | null;
  managerUser: OrganizationUserRef | null;
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
  managerUserId?: string | null;
  status?: DepartmentStatus;
  sort?: number;
}

export interface UpdateDepartmentInput {
  code?: string;
  name?: string;
  parentId?: string | null;
  externalFinanceCode?: string | null;
  managerUserId?: string | null;
  status?: DepartmentStatus;
  sort?: number;
}

export interface ListDepartmentsQuery {
  keyword?: string;
  status?: DepartmentStatus | "";
}

export type DepartmentListResult = PageResult<DepartmentEntity>;
