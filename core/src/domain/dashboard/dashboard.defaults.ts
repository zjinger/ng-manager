import { uid } from "../../common/id";
import { DashboardDocV1 } from "./dashboard.types";


export function defaultDashboard(projectId: string): DashboardDocV1 {
    return {
        version: 1,
        projectId,
        updatedAt: Date.now(),
        items: [
            { id: uid("dashboard"), title: '欢迎', key: "welcome", x: 0, y: 0, cols: 6, rows: 10, resizeEnabled: false },
            // { id: uid("dashboard"), title: '运行任务', key: "quickTasks", x: 0, y: 0, cols: 4, rows: 3 },
            // { id: uid("dashboard"), title: '终止端口', key: "killPort", x: 0, y: 0, cols: 4, rows: 3 },
            // {
            //     id: uid("dashboard"),
            //     title: '订阅',
            //     key: "newsFeed", x: 0, y: 0, cols: 4, rows: 12,
            //     resizeEnabled: true,
            //     maxItemCols: 16,
            //     maxItemRows: 20,
            //     minItemCols: 4,
            //     minItemRows: 6,
            //     config: { rssUrl: "https://hnrss.org/frontpage" }
            // },
        ],
    };
}
