import type { DashboardDocV1 } from "@yinuo-ngm/core";
import type { FastifyInstance } from "fastify";

export default async function dashboardRoutes(fastify: FastifyInstance) {
    // GET /dashboard/:projectId
    fastify.get("/getInfo/:projectId", async (req,) => {
        const { projectId } = req.params as any;
        return await fastify.core.dashboard.getOrCreate(projectId);
    });

    // post /dashboard/update/:projectId
    fastify.post("/update/:projectId", async (req,) => {
        const { projectId } = req.params as any;
        const body = req.body as DashboardDocV1;
        return await fastify.core.dashboard.saveWithConflictCheck(projectId, body);
    });

    // post /dashboard/widgets
    fastify.get("/widgets/:projectId", async (req,) => {
        const { projectId } = req.params as any;
        return await fastify.core.dashboard.getAvailableWidgets(projectId);
    });

    // post /dashboard/widgets/:projectId
    fastify.get("/addWidget/:projectId/:widgetKey/:x/:y", async (req,) => {
        let { projectId, widgetKey, x, y } = req.params as any;
        x = Number(x) || 0;
        y = Number(y) || 0;
        return await fastify.core.dashboard.addWidget(projectId, widgetKey, x, y);
    });

    // delete /dashboard/widgets/:projectId/:widgetId
    fastify.delete("/removeWidget/:projectId/:widgetId", async (req,) => {
        const { projectId, widgetId } = req.params as {
            projectId: string;
            widgetId: string;
        };
        return await fastify.core.dashboard.removeWidget(projectId, widgetId);
    });

    fastify.post("/updateItemConfig/:projectId/:widgetId", async (req,) => {
        const { projectId, widgetId } = req.params as {
            projectId: string;
            widgetId: string;
        };
        const config = req.body as any;
        return await fastify.core.dashboard.updateItemConfig(projectId, widgetId, config);
    });

    fastify.get("/killPort/:port", async (req,) => {
        const { port } = req.params as { port: string };
        return await fastify.core.dashboard.killPort(Number(port));
    })
}
