import type { PageResult } from "../../shared/http/pagination";

export type DepartmentStatus = "active" | "inactive";

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
  description: string | null;
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
  roleCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDepartmentInput {
  departmentId: string;
  roleCode?: string | null;
}

export interface DepartmentTitleEntity {
  id: string;
  departmentId: string;
  titleCode: string;
  titleName: string;
  status: "active" | "inactive";
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
  description?: string | null;
  parentId?: string | null;
  externalFinanceCode?: string | null;
  managerUserId?: string | null;
  status?: DepartmentStatus;
  sort?: number;
}

export interface UpdateDepartmentInput {
  code?: string;
  name?: string;
  description?: string | null;
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
