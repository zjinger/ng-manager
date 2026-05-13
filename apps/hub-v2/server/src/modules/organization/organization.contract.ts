import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateDepartmentInput,
  CreateFinanceRoleInput,
  DepartmentEntity,
  DepartmentTreeNode,
  FinanceRoleEntity,
  ListDepartmentsQuery,
  ListFinanceRolesQuery,
  UpdateDepartmentInput,
  UpdateFinanceRoleInput,
  UserDepartmentEntity,
  UserDepartmentInput,
  UserFinanceRoleEntity
} from "./organization.types";

export interface OrganizationCommandContract {
  createDepartment(input: CreateDepartmentInput, ctx: RequestContext): Promise<DepartmentEntity>;
  updateDepartment(id: string, input: UpdateDepartmentInput, ctx: RequestContext): Promise<DepartmentEntity>;
  addUserDepartment(userId: string, input: UserDepartmentInput, ctx: RequestContext): Promise<UserDepartmentEntity>;
  removeUserDepartment(userId: string, departmentId: string, ctx: RequestContext): Promise<void>;
  createFinanceRole(input: CreateFinanceRoleInput, ctx: RequestContext): Promise<FinanceRoleEntity>;
  updateFinanceRole(id: string, input: UpdateFinanceRoleInput, ctx: RequestContext): Promise<FinanceRoleEntity>;
  deleteFinanceRole(id: string, ctx: RequestContext): Promise<void>;
  addUserFinanceRole(userId: string, roleId: string, ctx: RequestContext): Promise<UserFinanceRoleEntity>;
  removeUserFinanceRole(userId: string, roleId: string, ctx: RequestContext): Promise<void>;
}

export interface OrganizationQueryContract {
  listDepartments(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentEntity[]>;
  listDepartmentTree(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentTreeNode[]>;
  listFinanceRoles(query: ListFinanceRolesQuery, ctx: RequestContext): Promise<FinanceRoleEntity[]>;
  listUserDepartments(userId: string, ctx: RequestContext): Promise<UserDepartmentEntity[]>;
  listUserFinanceRoles(userId: string, ctx: RequestContext): Promise<UserFinanceRoleEntity[]>;
}
