import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateReleaseInput,
  ListReleasesQuery,
  ReleaseEntity,
  ReleaseListResult,
  UpdateReleaseInput
} from "./release.types";

export interface ReleaseCommandContract {
  create(input: CreateReleaseInput, ctx: RequestContext): Promise<ReleaseEntity>;
  update(id: string, input: UpdateReleaseInput, ctx: RequestContext): Promise<ReleaseEntity>;
  publish(id: string, ctx: RequestContext): Promise<ReleaseEntity>;
}

export interface ReleaseQueryContract {
  list(query: ListReleasesQuery, ctx: RequestContext): Promise<ReleaseListResult>;
  getById(id: string, ctx: RequestContext): Promise<ReleaseEntity>;
  listPublic(query: ListReleasesQuery, ctx: RequestContext): Promise<ReleaseListResult>;
}
