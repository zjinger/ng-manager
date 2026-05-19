import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateDepartmentInput,
  DepartmentEntity,
  DepartmentTitleEntity,
  DepartmentTitleInput,
  DepartmentTreeNode,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
  UserDepartmentEntity,
  UserDepartmentInput
} from "./organization.types";

export interface OrganizationCommandContract {
  createDepartment(input: CreateDepartmentInput, ctx: RequestContext): Promise<DepartmentEntity>;
  updateDepartment(id: string, input: UpdateDepartmentInput, ctx: RequestContext): Promise<DepartmentEntity>;
  addDepartmentTitle(departmentId: string, input: DepartmentTitleInput, ctx: RequestContext): Promise<DepartmentTitleEntity>;
  removeDepartmentTitle(departmentId: string, titleCode: string, ctx: RequestContext): Promise<void>;
  addUserDepartment(userId: string, input: UserDepartmentInput, ctx: RequestContext): Promise<UserDepartmentEntity>;
  removeUserDepartment(userId: string, departmentId: string, ctx: RequestContext): Promise<void>;
}

export interface OrganizationQueryContract {
  listDepartments(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentEntity[]>;
  listAllDepartments(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentEntity[]>;
  listDepartmentTree(query: ListDepartmentsQuery, ctx: RequestContext): Promise<DepartmentTreeNode[]>;
  listDepartmentTitles(departmentId: string, ctx: RequestContext): Promise<DepartmentTitleEntity[]>;
  listUserDepartments(userId: string, ctx: RequestContext): Promise<UserDepartmentEntity[]>;
}
