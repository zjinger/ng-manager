import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateDepartmentInput,
  DepartmentEntity,
  DepartmentTreeNode,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
  UserDepartmentEntity,
  UserDepartmentInput
} from "./organization.types";

export interface OrganizationCommandContract {
  createDepartment(input: CreateDepartmentInput, ctx: RequestContext): Promise<DepartmentEntity>;
  updateDepartment(id: string, input: UpdateDepartmentInput, ctx: RequestContext): Promise<DepartmentEntity>;
  addUserDepartment(userId: string, input: UserDepartmentInput, ctx: RequestContext): Promise<UserDepartmentEntity>;
  removeUserDepartment(userId: string, departmentId: string, ctx: RequestContext): Promise<void>;
}

export interface OrganizationQueryContract {
  listDepartments(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentEntity[]>;
  listDepartmentTree(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentTreeNode[]>;
  listUserDepartments(userId: string, ctx: RequestContext): Promise<UserDepartmentEntity[]>;
}
