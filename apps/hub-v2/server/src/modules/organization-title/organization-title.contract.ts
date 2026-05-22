import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateOrganizationTitleInput,
  ListOrganizationTitlesQuery,
  OrganizationTitleEntity,
  UpdateOrganizationTitleInput
} from "./organization-title.types";

export interface OrganizationTitleCommandContract {
  createOrganizationTitle(input: CreateOrganizationTitleInput, ctx: RequestContext): Promise<OrganizationTitleEntity>;
  updateOrganizationTitle(titleId: string, input: UpdateOrganizationTitleInput, ctx: RequestContext): Promise<OrganizationTitleEntity>;
  deleteOrganizationTitle(titleId: string, ctx: RequestContext): Promise<void>;
}

export interface OrganizationTitleQueryContract {
  listOrganizationTitles(query: ListOrganizationTitlesQuery, ctx: RequestContext): Promise<OrganizationTitleEntity[]>;
  getOrganizationTitleByCode(code: string): OrganizationTitleEntity | null;
}
