import type { DashboardDocV1 } from "@core/domain/dashboard";
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
    fastify.get("/addWidget/:projectId/:widgetKey", async (req,) => {
        const { projectId, widgetKey } = req.params as any;
        return await fastify.core.dashboard.addWidget(projectId, widgetKey);
    });

    // delete /dashboard/widgets/:projectId/:widgetKey
    fastify.delete("/removeWidget/:projectId/:widgetId", async (req,) => {
        const { projectId, widgetId } = req.params as any;
        return await fastify.core.dashboard.removeWidget(projectId, widgetId);
    });
}
