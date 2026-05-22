export type OrganizationTitleStatus = "active" | "inactive";

export interface OrganizationTitleEntity {
  id: string;
  code: string;
  name: string;
  status: OrganizationTitleStatus;
  sort: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListOrganizationTitlesQuery {
  keyword?: string;
  status?: OrganizationTitleStatus | "";
}

export interface CreateOrganizationTitleInput {
  code: string;
  name: string;
  status?: OrganizationTitleStatus;
  sort?: number;
  remark?: string | null;
}

export interface UpdateOrganizationTitleInput {
  code?: string;
  name?: string;
  status?: OrganizationTitleStatus;
  sort?: number;
  remark?: string | null;
}
