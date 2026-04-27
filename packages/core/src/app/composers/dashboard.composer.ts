import { DashboardServiceImpl } from "../../domain/dashboard";
import { JsonDashboardRepo } from "../../infra/dashboard";

export function createDashboardDomain(dataDir: string) {
    const repo = new JsonDashboardRepo(dataDir);
    return new DashboardServiceImpl(repo);
}
