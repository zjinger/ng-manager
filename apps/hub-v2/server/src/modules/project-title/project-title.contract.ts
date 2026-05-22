import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateProjectTitleInput,
  ListProjectTitlesQuery,
  ProjectTitleEntity,
  UpdateProjectTitleInput
} from "./project-title.types";

export interface ProjectTitleCommandContract {
  createProjectTitle(input: CreateProjectTitleInput, ctx: RequestContext): Promise<ProjectTitleEntity>;
  updateProjectTitle(titleId: string, input: UpdateProjectTitleInput, ctx: RequestContext): Promise<ProjectTitleEntity>;
  deleteProjectTitle(titleId: string, ctx: RequestContext): Promise<void>;
}

export interface ProjectTitleQueryContract {
  listProjectTitles(query: ListProjectTitlesQuery, ctx: RequestContext): Promise<ProjectTitleEntity[]>;
  getProjectTitleByCode(code: string): ProjectTitleEntity | null;
}
