import { DashboardDocV1 } from "./dashboard.types";
import { makeWidgetItem, WIDGETS } from "./dashboard.widgets";


export function defaultDashboard(projectId: string): DashboardDocV1 {
    const meta = WIDGETS["welcome"];
    const welcomeItem = makeWidgetItem(projectId, meta);
    return {
        version: 1,
        projectId,
        updatedAt: Date.now(),
        items: [
            welcomeItem
        ],
    };
}
