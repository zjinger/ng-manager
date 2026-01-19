import { DashboardDocV1 } from "./dashboard.types";

export interface DashboardRepo {
    load(projectId: string): Promise<DashboardDocV1 | null>;
    save(projectId: string, doc: DashboardDocV1): Promise<void>;
}
