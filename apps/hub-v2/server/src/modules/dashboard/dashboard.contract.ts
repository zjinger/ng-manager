import type { RequestContext } from "../../shared/context/request-context";
import type { DashboardHomeData } from "./dashboard.types";

export interface DashboardQueryContract {
  getHomeData(ctx: RequestContext): Promise<DashboardHomeData>;
}
